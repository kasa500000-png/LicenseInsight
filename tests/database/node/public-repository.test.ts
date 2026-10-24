import { randomUUID } from "node:crypto";
import { resolve, join } from "node:path";

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PublicRepository } from "../../../src/data/repositories/public-repository";

// This suite must be launched by the dedicated ephemeral-DB runner. It never
// accepts a URI, credentials, TCP host, or a production database name.
const socket = process.env.QI_TEST_PG_SOCKET;
if (!socket || !socket.startsWith(join(process.cwd(), "test-results", "pg-step05-")) || resolve(socket) !== socket) {
  throw new Error("LOCAL_TEST_SOCKET_REQUIRED");
}
const readPool = new Pool({ host: socket, database: "qi_node", user: "qi_test_readonly", max: 1,
  connectionTimeoutMillis: 3000, idleTimeoutMillis: 1000 });
const ownerPool = new Pool({ host: socket, database: "qi_node", user: "postgres", max: 1,
  connectionTimeoutMillis: 3000, idleTimeoutMillis: 1000 });
const repository = new PublicRepository(readPool);
const seededQualification = "10000000-0000-0000-0000-000000005001";
const ownQualification = randomUUID();
const ownEvent = randomUUID();
const ownStatistics = [randomUUID(), randomUUID()];
const ownDetail = randomUUID();
const unique = randomUUID();
const fetchedAt = "2025-12-31T16:02:03.123456Z";
const validatedAt = "2026-01-02T04:05:06.654321Z";
const reviewedAt = "2026-01-03T07:08:09.000001Z";

describe("actual PostgreSQL public repository", () => {
  beforeAll(async () => {
    // Own rows avoid relying on execution order with the ingestion suites.
    await ownerPool.query(`insert into public.qualifications
      select (jsonb_populate_record(null::public.qualifications, to_jsonb(q) || $1::jsonb)).*
      from public.qualifications q where q.id = $2`, [JSON.stringify({
      id: ownQualification, provider: `SYNTHETIC-REPOSITORY-${unique}`, slug: `synthetic-repository-${unique}`,
      source_published_at: null, data_as_of: "2026-01-01", fetched_at: fetchedAt,
      validated_at: validatedAt, reviewed_at: reviewedAt,
    }), seededQualification]);
    await ownerPool.query(`insert into public.exam_events
      select (jsonb_populate_record(null::public.exam_events, to_jsonb(e) || $1::jsonb)).*
      from public.exam_events e where e.id = $2`, [JSON.stringify({
      id: ownEvent, qualification_id: ownQualification, logical_key: `synthetic-repository-${unique}`,
      date_start: "2026-02-01", date_end: "2026-02-01", temporal_precision: "date", extent: "single",
      starts_at: null, ends_at: null, fetched_at: fetchedAt, validated_at: validatedAt, reviewed_at: reviewedAt,
    }), "10000000-0000-0000-0000-000000005201"]);
    await ownerPool.query(`insert into public.pass_statistics
      (id,qualification_id,year,round,stage,acquisition_track,aggregation_level,examinees,passed,
       published_rate,source_rate_text,source_precision,completeness,source_id,source_url,
       fetched_at,validated_at,reviewed_at,verification,publication_state,revision_hash)
      values
      ($1,$3,2026,'BIG','written','synthetic','round',$4::bigint,null,null,null,null,'partial',
       'SYNTHETIC-STEP05','https://www.q-net.or.kr/',$5,$6,$7,'verified','published',repeat('a',64)),
      ($2,$3,2026,'ZERO','written','synthetic','round',0,0,0.00,'0.00%',2,'complete',
       'SYNTHETIC-STEP05','https://www.q-net.or.kr/',$5,$6,$7,'verified','published',repeat('a',64))`,
    [ownStatistics[0], ownStatistics[1], ownQualification, "9007199254740993", fetchedAt, validatedAt, reviewedAt]);
    await readPool.query("set datestyle = 'SQL, DMY'");
    await readPool.query("set time zone 'America/New_York'");
    await readPool.query("set search_path = public, pg_catalog");
  });

  afterAll(async () => {
    try {
      // Delete only UUIDs created by this file, in FK-safe order.
      await ownerPool.query("delete from public.qualification_details where id = $1", [ownDetail]);
      await ownerPool.query("delete from public.pass_statistics where id = any($1::uuid[])", [ownStatistics]);
      await ownerPool.query("delete from public.exam_events where id = $1", [ownEvent]);
      await ownerPool.query("delete from public.qualifications where id = $1", [ownQualification]);
    } finally {
      await Promise.all([readPool.end(), ownerPool.end()]);
    }
  });

  it("reads the reviewed seeded qualification through the real pg driver", async () => {
    const qualification = await repository.getQualification(seededQualification);
    expect(qualification).toMatchObject({ id: seededQualification, sourceCode: "0007", verification: "verified" });
  });

  it("preserves exact UTC microseconds and ISO dates despite hostile session defaults", async () => {
    const qualification = await repository.getQualification(ownQualification);
    expect(qualification).toMatchObject({ sourceCode: "0007", sourcePublishedAt: null, dataAsOf: "2026-01-01",
      fetchedAt, validatedAt, reviewedAt });
    const page = await repository.listEvents(ownQualification, 2026);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ id: ownEvent, dateStart: "2026-02-01", dateEnd: "2026-02-01",
      startsAt: null, endsAt: null, fetchedAt, validatedAt, reviewedAt, temporalPrecision: "date" });
  });

  it("preserves bigint beyond JS safe integers and distinguishes null from zero", async () => {
    const page = await repository.listStatistics(ownQualification, 2026);
    expect(page.items).toHaveLength(2);
    const large = page.items.find((row) => row.id === ownStatistics[0]);
    const zero = page.items.find((row) => row.id === ownStatistics[1]);
    expect(large).toMatchObject({ examinees: "9007199254740993", passed: null, calculatedRate: null, publishedRate: null });
    expect(zero).toMatchObject({ examinees: "0", passed: "0", calculatedRate: null });
    expect(zero?.publishedRate).toMatch(/^0(?:\.0+)?$/);
  });

  it("returns bounded real SQL pages with a lookahead row", async () => {
    const first = await repository.listStatistics(ownQualification, 2026, { limit: 1, page: 1 });
    const second = await repository.listStatistics(ownQualification, 2026, { limit: 1, page: 2 });
    expect(first.items).toHaveLength(1);
    expect(first.hasMore).toBe(true);
    expect(second.items).toHaveLength(1);
    expect(second.hasMore).toBe(false);
    expect(first.items[0].id).not.toBe(second.items[0].id);
  });

  it("returns empty detail/status pages without substituting synthetic application data", async () => {
    expect((await repository.listDetails(ownQualification)).items).toEqual([]);
    expect((await repository.listDatasetStatuses(ownQualification)).items).toEqual([]);
  });

  it("casts exact numeric details to text before node-pg decoding", async () => {
    try {
      await ownerPool.query(`insert into public.qualification_details
      (id,qualification_id,info_type,safe_text,numeric_value,unit,source_id,source_url,
       fetched_at,validated_at,reviewed_at,verification,publication_state,revision_hash)
      values ($1,$2,'description','SYNTHETIC REPOSITORY ONLY',$3::numeric,'synthetic',
       'SYNTHETIC-STEP05','https://www.q-net.or.kr/',$4,$5,$6,'verified','published',repeat('b',64))`,
    [ownDetail, ownQualification, "9007199254740993.123456789", fetchedAt, validatedAt, reviewedAt]);
      const page = await repository.listDetails(ownQualification);
      expect(page.items[0]).toMatchObject({ id: ownDetail, numericValue: "9007199254740993.123456789" });
    } finally {
      await ownerPool.query("delete from public.qualification_details where id = $1", [ownDetail]);
    }
  });

  it("keeps the actual reader login unable to access internal data or public writes", async () => {
    await expect(readPool.query("select source_id from internal.source_registry")).rejects.toMatchObject({ code: "42501" });
    await expect(readPool.query("insert into public.qualifications default values")).rejects.toMatchObject({ code: "42501" });
    await expect(readPool.query("set role qi_admin_server")).rejects.toMatchObject({ code: "42501" });
  });

  it("restores the original login role and session settings after pooled reads", async () => {
    // Pool.query releases a client with its error; the preceding intentional
    // permission failures therefore discard their sessions. Establish this
    // test's own session baseline instead of relying on beforeAll's old socket.
    await readPool.query("set datestyle = 'SQL, DMY'");
    await readPool.query("set time zone 'America/New_York'");
    await readPool.query("set search_path = public, pg_catalog");
    const sessionSql = `select current_user, session_user, pg_backend_pid() as backend_pid,
      current_setting('DateStyle') as datestyle, current_setting('TimeZone') as timezone,
      current_setting('search_path') as search_path`;
    const before = await readPool.query(sessionSql);
    expect(before.rows[0]).toMatchObject({ current_user: "qi_test_readonly", session_user: "qi_test_readonly", datestyle: "SQL, DMY" });
    await repository.getQualification(ownQualification);
    const result = await readPool.query(sessionSql);
    expect(result.rows[0]).toMatchObject({ current_user: "qi_test_readonly", session_user: "qi_test_readonly", datestyle: "SQL, DMY" });
    expect(result.rows[0]).toEqual(before.rows[0]);
  });
});
