import { randomUUID } from "node:crypto";
import { resolve, join } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { collectAndStage, publishReviewedRun } from "@/server/ingestion/service";
import { PostgresIngestionStore } from "@/server/ingestion/postgres-store";
import { PublicRepository } from "@/data/repositories/public-repository";
import type { CandidateRecord, CollectionScope } from "@/server/ingestion/contracts";
import type { TransportContract } from "@/server/ingestion/transport";

// Runner creates this socket and fresh DB. No DATABASE_URL or remote option.
const socket = process.env.QI_TEST_PG_SOCKET;
if (!socket || resolve(socket) !== socket || !socket.startsWith(join(process.cwd(), "test-results", "pg-step05-"))) throw new Error("LOCAL_TEST_SOCKET_REQUIRED");
const owner = new Pool({ host: socket, user: "postgres", database: "qi_node", max: 2 });
const worker = new Pool({ host: socket, user: "qi_test_worker", database: "qi_node", max: 4 });
const publisher = new Pool({ host: socket, user: "qi_test_publisher", database: "qi_node", max: 2 });
const reader = new Pool({ host: socket, user: "qi_test_readonly", database: "qi_node", max: 2 });
const store = new PostgresIngestionStore({ ingestion: worker, publisher });
const repository = new PublicRepository(reader);
const actor = randomUUID();
const key = "SYNTHETIC/KEY+ONLY";
const contractTemplate: TransportContract = {
  sourceId: "synthetic", operation: "synthetic-operation", endpoint: "https://synthetic.invalid/synthetic-operation",
  allowedHost: "synthetic.invalid", allowedPath: "/synthetic-operation", allowedParameters: ["year"], keyParameter: "serviceKey",
  keyEncoding: "raw", pageParameter: "pageNo", pageSizeParameter: "pageSize", format: "json", successCodes: ["SYNTHETIC_OK"],
  evidence: "synthetic", approval: "unknown", responsePaths: { header: ["response", "header"], resultCode: ["response", "header", "code"],
    items: ["response", "body", "items", "item"], totalCount: ["response", "body", "totalCount"],
    pageNo: ["response", "body", "pageNo"], pageSize: ["response", "body", "pageSize"] },
};
function response(records: CandidateRecord[], pageNo = 1, totalCount = records.length, pageSize = 100) {
  return new Response(JSON.stringify({ response: { header: { code: "SYNTHETIC_OK", ServiceKey: key,
    echo: "SYNTHETIC%2fKEY%2bONLY" }, body: { items: { item: records }, totalCount, pageNo, pageSize } } }));
}
async function world(): Promise<CollectionScope> {
  const id = randomUUID(), sourceId = `SYNTHETIC-${id}`, name = `SYNTHETIC ONLY ${id}`;
  await owner.query("insert into internal.source_registry(source_id,catalog_url,approval_state,daily_quota,adapter_version) values($1,'https://www.data.go.kr/','approved',100,'synthetic-only')", [sourceId]);
  await owner.query(`insert into public.qualifications(id,provider,qualification_type,acquisition_track,source_code,canonical_name,grade,domain,slug,active_state,
    publication_state,source_id,source_url,fetched_at,validated_at,reviewed_at,verification,revision_hash)
    values($1,$2,'synthetic','synthetic','0007',$3,'synthetic','synthetic',$4,'unknown','published',$2,'https://www.q-net.or.kr/',now(),now(),now(),'verified',repeat('a',64))`, [id, sourceId, name, `synthetic-${id}`]);
  await owner.query(`insert into internal.source_crosswalks(source_id,source_code,source_name,source_grade,valid_from,valid_to,qualification_id,evidence_url,reviewed_by,reviewed_at)
    values($1,'0007',$2,'synthetic','2025-01-01','2027-12-31',$3,'https://www.q-net.or.kr/',$4,now())`, [sourceId, name, id, actor]);
  return { sourceId, operation: "synthetic-operation", qualificationId: id, year: 2026, acquisitionTrack: "synthetic", datasetType: "events" };
}
function event(scope: CollectionScope, date = "2026-12-01", logicalKey = "synthetic-stable-event"): CandidateRecord {
  return { entityType: "event", logicalKey, sourceCode: "0007", sourceName: `SYNTHETIC ONLY ${scope.qualificationId}`, sourceGrade: "synthetic", payload: {
    year: "2026", round: "1", stage: "written", event_type: "exam", subtype: "ordinary", ordinal: "1", date_start: date, date_end: date,
    temporal_precision: "date", extent: "single", timezone: "Asia/Seoul",
  } };
}
async function collect(scope: CollectionScope, records = [event(scope)], fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response(records)), pageSize = 100) {
  const logs: unknown[] = [];
  const result = await collectAndStage({ scope, store, sourceUrl: "https://www.q-net.or.kr/", mapRecord: raw => raw as unknown as CandidateRecord,
    transport: { contract: { ...contractTemplate, sourceId: scope.sourceId }, parameters: { year: "2026" }, key, appEnv: "test", fetch,
      budget: { remaining: 10 }, sleep: async () => undefined, limits: { maxAttemptsPerPage: 1, pageSize } }, log: e => logs.push(e),
  });
  expect(JSON.stringify(logs)).not.toContain(key);
  return result;
}
async function publish(runId: string, invalidate: () => Promise<void> = vi.fn(async () => undefined)) {
  const review = await store.prepareReview(runId);
  await store.approveRun(runId, actor);
  return publishReviewedRun({ publisher: store, runId, verifiedActorId: actor, expectedRevision: review.expectedRevision,
    appEnv: "test", evidence: "synthetic", invalidate });
}
beforeAll(async () => {
  await owner.query("insert into internal.admin_roles(user_id,role) values($1,'publisher')", [actor]);
});
afterAll(async () => { await Promise.all([owner.end(), worker.end(), publisher.end(), reader.end()]); });

describe("actual HTTP adapter → stage → reviewed PostgreSQL publication → anon repository", () => {
  it("requires explicit review and commits before invalidating cache", async () => {
    const scope = await world(), result = await collect(scope);
    expect(result.status).toBe("staged");
    expect((await repository.listEvents(scope.qualificationId, 2026)).items).toHaveLength(0);
    await expect(store.publishRun(result.runId!, actor, null)).rejects.toThrow();
    const invalidate = vi.fn(async () => {
      expect((await repository.listEvents(scope.qualificationId, 2026)).items[0].dateStart).toBe("2026-12-01");
    });
    const saved = await publish(result.runId!, invalidate);
    expect(saved.count).toBe(1); expect(saved.cacheInvalidated).toBe(true); expect(invalidate).toHaveBeenCalledOnce();
    const snapshot = (await owner.query("select sanitized_payload::text as body from internal.source_snapshots where run_id=$1", [result.runId])).rows[0].body;
    expect(snapshot).not.toContain(key); expect(snapshot).not.toMatch(/SYNTHETIC%2fKEY/i);
    expect((await repository.getQualification(scope.qualificationId))?.sourceCode).toBe("0007");
  });
  it("keeps an event ID and previous data while corrected dates await review", async () => {
    const scope = await world(); await publish((await collect(scope)).runId!);
    const old = (await repository.listEvents(scope.qualificationId, 2026)).items[0];
    const corrected = await collect(scope, [event(scope, "2026-12-02")]);
    const review = await store.prepareReview(corrected.runId!);
    expect(review.state).toBe("review_required");
    expect((await repository.listEvents(scope.qualificationId, 2026)).items[0]).toMatchObject({ id: old.id, dateStart: "2026-12-01" });
    await store.approveRun(corrected.runId!, actor);
    await store.publishRun(corrected.runId!, actor, review.expectedRevision);
    expect((await repository.listEvents(scope.qualificationId, 2026)).items).toEqual([expect.objectContaining({ id: old.id, dateStart: "2026-12-02" })]);
  });
  it("preserves last-good after a failed second page and persists real attempted calls", async () => {
    const scope = await world(); await publish((await collect(scope)).runId!);
    const old = (await repository.listEvents(scope.qualificationId, 2026)).items[0];
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(response([event(scope, "2026-12-02")], 1, 2, 1))
      .mockResolvedValue(new Response("upstream error", { status: 503 }));
    const result = await collect(scope, [], fetch, 1);
    expect(result.status).toBe("failed"); expect(result.calls).toBe(2); expect(fetch).toHaveBeenCalledTimes(2);
    expect((await repository.listEvents(scope.qualificationId, 2026)).items[0]).toEqual(old);
    const run = (await owner.query("select status,calls,collection_complete from internal.sync_runs where id=$1", [result.runId])).rows[0];
    expect(run).toMatchObject({ status: "failed", calls: 2, collection_complete: false });
  });
  it("quarantines ambiguous mappings and never publishes them", async () => {
    const scope = await world();
    await owner.query(`insert into internal.source_crosswalks(source_id,source_code,source_name,source_grade,valid_from,valid_to,qualification_id,evidence_url,reviewed_by,reviewed_at)
      values($1,'0007',$2,'synthetic','2024-01-01','2028-12-31',$3,'https://www.q-net.or.kr/',$4,now())`, [scope.sourceId, `SYNTHETIC ONLY ${scope.qualificationId}`, scope.qualificationId, actor]);
    const result = await collect(scope); expect(result.status).toBe("quarantined");
    await expect(store.prepareReview(result.runId!)).rejects.toThrow();
    expect((await repository.listEvents(scope.qualificationId, 2026)).items).toHaveLength(0);
  });
  it("does not delete last-good after an empty response", async () => {
    const scope = await world(); await publish((await collect(scope)).runId!);
    const result = await collect(scope, []); expect(result.status).toBe("empty");
    expect((await repository.listEvents(scope.qualificationId, 2026)).items).toHaveLength(1);
    await expect(store.prepareReview(result.runId!)).rejects.toThrow();
  });
  it("serializes two actual connections collecting the same scope", async () => {
    const scope = await world();
    const results = await Promise.allSettled([store.startRun(scope), store.startRun(scope)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  });
  it("deduplicates exact records and rejects conflicting logical keys", async () => {
    const scope = await world(); const same = event(scope);
    const duplicate = await collect(scope, [same, same]); expect(duplicate.records).toBe(1);
    await publish(duplicate.runId!);
    const conflict = await collect(scope, [event(scope), event(scope, "2026-12-02")]);
    expect(conflict.errorCode).toBe("LOGICAL_KEY_COLLISION");
    expect((await repository.listEvents(scope.qualificationId, 2026)).items).toHaveLength(1);
  });
  it("treats cache failure after commit as committed data", async () => {
    const scope = await world(), run = await collect(scope);
    const result = await publish(run.runId!, vi.fn(async () => { throw new Error("SYNTHETIC cache failure"); }));
    expect(result.cacheInvalidated).toBe(false);
    expect((await repository.listEvents(scope.qualificationId, 2026)).items).toHaveLength(1);
  });
  it("blocks synthetic production publication before touching SQL", async () => {
    const spy = { publishRun: vi.fn() };
    await expect(publishReviewedRun({ publisher: spy, runId: randomUUID(), verifiedActorId: actor, expectedRevision: null,
      appEnv: "production", evidence: "synthetic", invalidate: async () => undefined })).rejects.toThrow("SYNTHETIC_PUBLICATION_FORBIDDEN");
    expect(spy.publishRun).not.toHaveBeenCalled();
  });
});
