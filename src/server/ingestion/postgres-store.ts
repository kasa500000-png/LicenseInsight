import "server-only";
import type { Pool, PoolClient } from "pg";
import type { CollectionScope, CollectionStore, RunLease, StageInput } from "./contracts";

export class IngestionStoreError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "IngestionStoreError";
  }
}

export interface ReviewPreparation {
  state: "unchanged" | "review_required";
  reviewId?: string;
  revisionHash: string;
  expectedRevision: string | null;
}

type Pools = { ingestion: Pool; publisher: Pool };
type Role = "qi_ingestion" | "qi_admin_server";

/** Separate restricted server pools; this module never loads a URL from env.
 * The caller must verify the user's session before using publisher methods.
 * These methods are not an HTTP/RPC auth boundary and are never browser exports.
 */
export class PostgresIngestionStore implements CollectionStore {
  constructor(private readonly pools: Pools) {}

  private async transaction<T>(role: Role, action: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = role === "qi_ingestion" ? this.pools.ingestion : this.pools.publisher;
    let client: PoolClient;
    try { client = await pool.connect(); }
    catch { throw new IngestionStoreError("DATABASE_UNAVAILABLE"); }
    try {
      await client.query("begin");
      // Constant role selection, never an identifier from a request or JWT.
      await client.query(role === "qi_ingestion" ? "set local role qi_ingestion" : "set local role qi_admin_server");
      await client.query("set local statement_timeout = '15s'");
      const value = await action(client);
      await client.query("commit");
      return value;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      // No raw pg error detail, SQL, URL, payload or parameter values escape.
      const message = error instanceof Error ? error.message : "";
      throw new IngestionStoreError(/^[A-Z][A-Z0-9_]{0,63}$/.test(message) ? message : "DATABASE_ERROR");
    } finally {
      client.release();
    }
  }

  async startRun(scope: CollectionScope, leaseSeconds = 120): Promise<RunLease> {
    return this.transaction("qi_ingestion", async (client) => {
      const result = await client.query<{ value: { run_id: string; scope_key: string } }>(
        "select internal.start_ingestion($1::jsonb,$2::integer) as value",
        [JSON.stringify({ source_id: scope.sourceId, operation: scope.operation, qualification_id: scope.qualificationId,
          year: scope.year, acquisition_track: scope.acquisitionTrack, dataset_type: scope.datasetType }), leaseSeconds],
      );
      return { runId: result.rows[0].value.run_id, scopeKey: result.rows[0].value.scope_key };
    });
  }

  /** Reserve before every HTTP attempt, including failed requests/retries. */
  async reserveCalls(lease: RunLease, count = 1): Promise<void> {
    await this.transaction("qi_ingestion", async (client) => {
      await client.query("select internal.reserve_ingestion_calls($1::uuid,$2::integer)", [lease.runId, count]);
    });
  }

  async stageRun(lease: RunLease, input: StageInput): Promise<{ state: "staged" | "empty" | "quarantined" }> {
    return this.transaction("qi_ingestion", async (client) => {
      const result = await client.query<{ state: "staged" | "empty" | "quarantined" }>(
        "select internal.stage_ingestion($1::uuid,$2::jsonb,$3::jsonb,$4::integer,$5::integer) as state",
        [lease.runId, JSON.stringify(input.records), JSON.stringify(input.snapshots), input.calls, input.pages],
      );
      return { state: result.rows[0].state };
    });
  }

  async failRun(lease: RunLease, safeCode: string, attemptedCalls?: number): Promise<void> {
    const code = /^[A-Z0-9_]{1,64}$/.test(safeCode) ? safeCode : "INGESTION_FAILED";
    await this.transaction("qi_ingestion", async (client) => {
      await client.query("select internal.fail_ingestion($1::uuid,$2::text,$3::integer)", [lease.runId, code, attemptedCalls ?? null]);
    });
  }

  /** Queue changes with the restricted trusted publisher, without changing data. */
  async prepareReview(runId: string): Promise<ReviewPreparation> {
    return this.transaction("qi_admin_server", async (client) => {
      const result = await client.query<{ value: { state: ReviewPreparation["state"]; review_id?: string;
        revision_hash: string; expected_revision: string | null } }>(
        "select internal.prepare_ingestion_review($1::uuid) as value", [runId],
      );
      const value = result.rows[0].value;
      return { state: value.state, reviewId: value.review_id, revisionHash: value.revision_hash, expectedRevision: value.expected_revision };
    });
  }

  async approveRun(runId: string, verifiedActorId: string, expectedVersion: string | number = 1): Promise<void> {
    await this.transaction("qi_admin_server", async (client) => {
      await client.query("select internal.approve_ingestion($1::uuid,$2::uuid,$3::bigint)", [runId, verifiedActorId, expectedVersion]);
    });
  }

  async publishRun(runId: string, verifiedActorId: string, expectedRevision: string | null): Promise<{ revisionHash: string; count: number }> {
    return this.transaction("qi_admin_server", async (client) => {
      const result = await client.query<{ value: { revision_hash: string; count: number } }>(
        "select internal.publish_ingestion($1::uuid,$2::uuid,$3::text) as value", [runId, verifiedActorId, expectedRevision],
      );
      return { revisionHash: result.rows[0].value.revision_hash, count: result.rows[0].value.count };
    });
  }
}
