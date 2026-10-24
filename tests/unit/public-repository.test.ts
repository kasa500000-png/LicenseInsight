import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PublicRepository, PublicRepositoryError } from "../../src/data/repositories/public-repository";

const id = "00000000-0000-0000-0000-000000000001";
const recordId = "00000000-0000-0000-0000-000000000201";
const instant = "2026-01-01T00:00:00.000000Z";
const provenance = {
  source_id: "SYNTHETIC-STEP05", source_url: "https://www.q-net.or.kr/",
  source_published_at: null, data_as_of: null, fetched_at: instant,
  validated_at: "2026-01-02T00:00:00.000000Z", reviewed_at: "2026-01-03T00:00:00.000000Z",
  verification: "verified", revision_hash: "a".repeat(64),
};
const qualification = {
  ...provenance, id, provider: "SYNTHETIC", qualification_type: "synthetic", acquisition_track: "synthetic",
  source_code: "0007", canonical_name: "SYNTHETIC ONLY", grade: "synthetic", domain: "synthetic",
  slug: "synthetic-only", active_state: "unknown", created_at: instant, updated_at: instant,
};
const event = {
  ...provenance, id: recordId, qualification_id: id, logical_key: "synthetic-event",
  year: 2026, round: "01", stage: "written", event_type: "exam", subtype: "unknown", ordinal: "1",
  date_start: "2026-02-01", date_end: "2026-02-01", starts_at: null, ends_at: null,
  temporal_precision: "date", extent: "single", timezone: "Asia/Seoul",
};
const statistic = {
  ...provenance, id: recordId, qualification_id: id, year: 2026, round: null, stage: "written",
  acquisition_track: "synthetic", aggregation_level: "official_annual", examinees: "9007199254740993",
  passed: "1", published_rate: null, calculated_rate: "0.0000000000000111",
  source_rate_text: null, source_precision: null, completeness: "partial",
};

function fixturePool(rows: Record<string, unknown>[] = []) {
  const query = vi.fn(async (sql: string, values?: unknown[]) => {
    void values;
    return { rows: sql.startsWith("select ") ? rows : [] };
  });
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query, release }));
  const pool = { connect } as unknown as Pool;
  return { repository: new PublicRepository(pool), query, release, connect };
}

describe("public SQL repository boundaries", () => {
  it("looks up an exact slug with a parameter in the same read-only anon transaction", async () => {
    const { repository, query } = fixturePool([qualification]);
    expect(await repository.getQualificationBySlug("synthetic-only")).toMatchObject({ slug: "synthetic-only", sourceCode: "0007" });
    expect(query.mock.calls.slice(0, 4).map(([sql]) => sql)).toEqual([
      "begin read only", "set local role anon", "set local search_path = pg_catalog", "set local datestyle = 'ISO, YMD'",
    ]);
    expect(query.mock.calls[4][0]).toContain("from public.qualifications where slug = $1 limit 1");
    expect(query.mock.calls[4][0]).not.toContain("synthetic-only");
    expect(query.mock.calls[4][1]).toEqual(["synthetic-only"]);
  });

  it.each(["", "UPPER", "../secret", "a' or true--", "한글", "-a", "a-", "a--b", "a".repeat(81)])("rejects invalid slug %s before opening a connection", async slug => {
    const { repository, connect } = fixturePool();
    await expect(repository.getQualificationBySlug(slug)).rejects.toMatchObject({ code: "INVALID_QUERY" });
    expect(connect).not.toHaveBeenCalled();
  });

  it("returns null for an unpublished slug", async () => {
    expect(await fixturePool().repository.getQualificationBySlug("missing-slug")).toBeNull();
  });

  it("reads through a read-only anon transaction and preserves the code and distinct provenance clocks", async () => {
    const { repository, query, release } = fixturePool([qualification]);
    const actual = await repository.getQualification(id);
    expect(actual).toMatchObject({ sourceCode: "0007", sourcePublishedAt: null, dataAsOf: null,
      fetchedAt: instant, validatedAt: provenance.validated_at, reviewedAt: provenance.reviewed_at });
    expect(actual).not.toHaveProperty("source_code");
    expect(query.mock.calls[0][0]).toBe("begin read only");
    expect(query.mock.calls[1][0]).toBe("set local role anon");
    expect(query.mock.calls[2][0]).toBe("set local search_path = pg_catalog");
    expect(query.mock.calls[3][0]).toBe("set local datestyle = 'ISO, YMD'");
    expect(query.mock.calls[4][1]).toEqual([id]);
    expect(query.mock.calls[4][0]).toContain("from public.qualifications where id = $1");
    expect(query.mock.calls.at(-1)?.[0]).toBe("commit");
    expect(release).toHaveBeenCalledWith(false);
    expect(query.mock.calls.every(([sql]) => !sql.includes("service_role") && !sql.includes("internal.") && !sql.includes("select *"))).toBe(true);
  });

  it("returns null for no published qualification without fixture fallback", async () => {
    const { repository } = fixturePool();
    expect(await repository.getQualification(id)).toBeNull();
  });

  it("passes bounded pagination parameters separately and uses one lookahead row", async () => {
    const { repository, query } = fixturePool([event, event, event]);
    const page = await repository.listEvents(id, 2026, { page: 3, limit: 2 });
    expect(page).toMatchObject({ page: 3, limit: 2, hasMore: true });
    expect(page.items).toHaveLength(2);
    expect(page.items[0]).toMatchObject({ round: "01", dateStart: "2026-02-01", startsAt: null, temporalPrecision: "date" });
    expect(query.mock.calls[4][1]).toEqual([id, 2026, 3, 4]);
    expect(query.mock.calls[4][0]).toContain("order by date_start, id limit $3 offset $4");
  });

  it("keeps bigint and exact decimals as strings before JS decoding", async () => {
    const { repository, query } = fixturePool([statistic]);
    const page = await repository.listStatistics(id, 2026);
    expect(page.items[0]).toMatchObject({ examinees: "9007199254740993", passed: "1",
      publishedRate: null, calculatedRate: "0.0000000000000111", round: null });
    expect(query.mock.calls[4][0]).toContain("examinees::text, passed::text, published_rate::text, calculated_rate::text");
    expect(query.mock.calls[4][1]).toEqual([id, 2026, 51, 0]);
  });

  it("keeps zero distinct from unknown counts and rates", async () => {
    const { repository } = fixturePool([{ ...statistic, examinees: "0", passed: null, calculated_rate: null, published_rate: "0.00" }]);
    const page = await repository.listStatistics(id, 2026);
    expect(page.items[0]).toMatchObject({ examinees: "0", passed: null, calculatedRate: null, publishedRate: "0.00" });
  });

  it("returns plain text details and exact decimal fields", async () => {
    const { repository, query } = fixturePool([{ ...provenance, id: recordId, qualification_id: id,
      info_type: "fee", safe_text: "SYNTHETIC ONLY", numeric_value: "12345.50", unit: "KRW", valid_from: null, valid_to: null }]);
    expect((await repository.listDetails(id)).items[0]).toMatchObject({ safeText: "SYNTHETIC ONLY", numericValue: "12345.50", validTo: null });
    expect(query.mock.calls[4][0]).toContain("numeric_value::text");
  });

  it("exposes public status notices without assuming verified or fresh data", async () => {
    const { repository } = fixturePool([{ scope_key: "synthetic", qualification_id: id, dataset_type: "events",
      published_revision_hash: null, availability: "unavailable", freshness: "unknown", verification: "pending",
      last_fetch_at: null, last_validated_at: null, last_reviewed_at: null, source_as_of: null,
      pending_change: true, public_notice: "검증 대기" }]);
    expect((await repository.listDatasetStatuses(id)).items[0]).toMatchObject({ availability: "unavailable", verification: "pending",
      pendingChange: true, publishedRevisionHash: null, publicNotice: "검증 대기" });
  });

  it.each(["invalid", "' or true --", "00000000-0000-0000-0000-000000000001;select 1"])("rejects invalid identifiers before connecting %#", async (value) => {
    const { repository, connect } = fixturePool();
    await expect(repository.getQualification(value)).rejects.toMatchObject({ code: "INVALID_QUERY" });
    expect(connect).not.toHaveBeenCalled();
  });

  it.each([1899, 2201, 2026.5, Number.NaN, Infinity])("rejects invalid years before connecting %#", (year) => {
    const { repository, connect } = fixturePool();
    expect(() => repository.listEvents(id, year)).toThrow("INVALID_QUERY");
    expect(connect).not.toHaveBeenCalled();
  });

  it.each([{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { page: 0 }, { page: 10001 }, { page: Number.NaN }])("rejects unbounded or invalid pagination %#", async (options) => {
    const { repository, connect } = fixturePool();
    await expect(repository.listStatistics(id, 2026, options)).rejects.toMatchObject({ code: "INVALID_QUERY" });
    expect(connect).not.toHaveBeenCalled();
  });

  it.each([
    { examinees: 900 }, { examinees: "9007199254740993.0" }, { examinees: "-1" },
    { examinees: "9223372036854775808" }, { examinees: "1", passed: "2" },
    { published_rate: 47 }, { published_rate: "NaN" }, { published_rate: "100.01" },
    { published_rate: "-0.1" }, { calculated_rate: Infinity }, { year: "2026" },
    { stage: "oral" }, { source_precision: 1.5 },
  ])("rejects malformed or lossy statistic rows instead of coercing them %#", async (changes) => {
    const { repository, query, release } = fixturePool([{ ...statistic, ...changes }]);
    await expect(repository.listStatistics(id, 2026)).rejects.toBeInstanceOf(PublicRepositoryError);
    expect(query.mock.calls.at(-1)?.[0]).toBe("rollback");
    expect(release).toHaveBeenCalledWith(false);
  });

  it.each([
    { source_code: 7 }, { reviewed_at: null }, { verification: "pending" },
    { created_at: new Date() }, { created_at: "not-a-time" }, { data_as_of: "2026-02-30" },
    { source_url: "http://www.q-net.or.kr/" }, { source_url: "https://www.q-net.or.kr.evil.invalid/" },
    { source_url: "https://www.q-net.or.kr/?serviceKey=SYNTHETIC-NOT-SECRET" },
    { revision_hash: "invalid" },
  ])("rejects malformed or private provenance without returning raw data %#", async (changes) => {
    const { repository } = fixturePool([{ ...qualification, ...changes }]);
    await expect(repository.getQualification(id)).rejects.toMatchObject({ code: "INVALID_PUBLIC_DATA" });
  });

  it("rolls back and releases a failed DB query without exposing the driver error", async () => {
    const { repository, query, release } = fixturePool();
    query.mockImplementation(async (sql) => {
      if (sql.startsWith("select ")) throw new Error("postgres://SYNTHETIC_PASSWORD@localhost/private");
      return { rows: [] };
    });
    try {
      await repository.getQualification(id);
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicRepositoryError);
      expect(String(error)).toBe("PublicRepositoryError: PUBLIC_READ_UNAVAILABLE");
      expect(JSON.stringify(error)).not.toContain("SYNTHETIC_PASSWORD");
    }
    expect(query.mock.calls.at(-1)?.[0]).toBe("rollback");
    expect(release).toHaveBeenCalledWith(false);
  });

  it("destroys an unusable pooled client if rollback also fails", async () => {
    const { repository, query, release } = fixturePool();
    query.mockImplementation(async (sql) => {
      if (sql.startsWith("select ") || sql === "rollback") throw new Error("SYNTHETIC_DB_ERROR");
      return { rows: [] };
    });
    await expect(repository.getQualification(id)).rejects.toMatchObject({ code: "PUBLIC_READ_UNAVAILABLE" });
    expect(release).toHaveBeenCalledWith(true);
  });

  it("sanitizes pool connection failures", async () => {
    const { repository, connect } = fixturePool();
    connect.mockRejectedValue(new Error("SYNTHETIC_CONNECTION_SECRET"));
    await expect(repository.getQualification(id)).rejects.toMatchObject({ code: "PUBLIC_READ_UNAVAILABLE" });
  });
});
