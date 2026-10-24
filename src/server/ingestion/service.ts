import "server-only";
import type { AppEnvironment } from "@/config/env";
import type { CandidateRecord, CollectionScope, CollectionStore } from "./contracts";
import { normalizeRecord, ValidationError } from "./normalize";
import { buildRequest, collectPages, IngestionError, type CollectOptions } from "./transport";
import { canonicalJson, sanitize } from "./safety";
import { IngestionStoreError } from "./postgres-store";
import { sourceReadiness } from "@/data/adapters/source-registry";

export type SafeCollectionLog = { runId?: string; scopeKey?: string; code: string; records?: number; calls?: number };
export type CollectionResult = {
  status: "staged" | "empty" | "quarantined" | "failed";
  runId?: string; scopeKey?: string; errorCode?: string; records: number; calls: number;
};

function errorCode(error: unknown): string {
  if (error instanceof IngestionError || error instanceof ValidationError || error instanceof IngestionStoreError) return error.code;
  // Database exceptions are deliberately not logged/returned: DETAIL may echo data.
  return "COLLECTION_REJECTED";
}

/** No automatic publication. Review/approval is a separate trusted server flow. */
export async function collectAndStage(options: {
  scope: CollectionScope; store: CollectionStore; transport: CollectOptions;
  sourceUrl: string; mapRecord: (raw: Record<string, unknown>, index: number) => CandidateRecord;
  clock?: () => Date; log?: (event: SafeCollectionLog) => void;
}): Promise<CollectionResult> {
  const { scope, store, transport } = options;
  const log = (event: SafeCollectionLog) => { try { options.log?.(event); } catch { /* Logging cannot mutate collection truth. */ } };
  let lease: Awaited<ReturnType<CollectionStore["startRun"]>> | undefined;
  let attemptedCalls = 0;
  try {
    const readiness = sourceReadiness(scope.sourceId);
    if (transport.contract.evidence === "verified" && !readiness?.enabled ||
      transport.contract.evidence === "synthetic" && readiness) throw new IngestionError("SOURCE_UNVERIFIED");
    if (scope.sourceId !== transport.contract.sourceId || scope.operation !== transport.contract.operation ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scope.qualificationId) ||
      !Number.isInteger(scope.year) || scope.year < 1900 || scope.year > 2200 || !scope.acquisitionTrack.trim()) throw new ValidationError("INVALID_SCOPE");
    buildRequest(transport, 1, transport.limits?.pageSize ?? 100);
    lease = await store.startRun(scope);
    const fetchedAt = (options.clock?.() ?? new Date()).toISOString();
    const collected = await collectPages({ ...transport, onAttempt: async () => {
      await store.reserveCalls(lease!);
      await transport.onAttempt?.();
      attemptedCalls++;
    } });
    const validatedAt = (options.clock?.() ?? new Date()).toISOString();
    const records = collected.records.map((raw, index) => normalizeRecord(options.mapRecord(raw, index), scope, {
      fetchedAt, validatedAt, sourceUrl: options.sourceUrl, secrets: [transport.key],
    }));
    const identities = new Map<string, string>();
    const unique = records.filter(record => {
      const key = `${record.entityType}:${record.logicalKey}`;
      const value = canonicalJson(record.payload);
      const previous = identities.get(key);
      if (previous !== undefined && previous !== value) throw new ValidationError("LOGICAL_KEY_COLLISION");
      identities.set(key, value);
      return previous === undefined;
    });
    const state = await store.stageRun(lease, { records: unique, snapshots: collected.snapshots.map(snapshot => sanitize(snapshot, [transport.key])),
      calls: collected.calls, pages: collected.pages });
    log({ ...lease, code: state.state.toUpperCase(), records: unique.length, calls: collected.calls });
    return { status: state.state, ...lease, records: unique.length, calls: collected.calls };
  } catch (error) {
    const code = errorCode(error);
    if (lease) {
      try { await store.failRun(lease, code, attemptedCalls); } catch { log({ ...lease, code: "RUN_FINALIZATION_REJECTED" }); }
    }
    log({ ...lease, code });
    return { status: "failed", ...lease, errorCode: code, records: 0, calls: attemptedCalls };
  }
}

export interface ReviewedPublisher {
  publishRun(runId: string, verifiedActorId: string, expectedRevision: string | null): Promise<{ revisionHash: string; count: number }>;
}

/** Caller must authenticate actorId on the server; no HTTP/admin UI is exposed here. */
export async function publishReviewedRun(options: {
  publisher: ReviewedPublisher; runId: string; verifiedActorId: string; expectedRevision: string | null;
  appEnv: AppEnvironment; evidence: "verified" | "synthetic";
  invalidate: () => Promise<void>;
}): Promise<{ revisionHash: string; count: number; cacheInvalidated: boolean }> {
  if (options.evidence === "synthetic" && !["test", "local"].includes(options.appEnv)) throw new ValidationError("SYNTHETIC_PUBLICATION_FORBIDDEN");
  const published = await options.publisher.publishRun(options.runId, options.verifiedActorId, options.expectedRevision);
  // Publication already committed. Cache failure must not misreport a rollback.
  try { await options.invalidate(); return { ...published, cacheInvalidated: true }; }
  catch { return { ...published, cacheInvalidated: false }; }
}
