import { describe, expect, it } from "vitest";
import { normalizeRecord, stableEventKey } from "@/server/ingestion/normalize";
import { sanitize, hashJson } from "@/server/ingestion/safety";
import type { CandidateRecord, CollectionScope } from "@/server/ingestion/contracts";

const scope: CollectionScope = { sourceId: "SYNTHETIC-STEP05", operation: "synthetic-operation", qualificationId: "00000000-0000-0000-0000-000000000001", year: 2026, acquisitionTrack: "synthetic", datasetType: "events" };
const metadata = { fetchedAt: "2026-10-20T00:00:00Z", validatedAt: "2026-10-20T00:01:00Z", sourceUrl: "https://www.q-net.or.kr/" };
const event = (): CandidateRecord => ({ entityType: "event", logicalKey: "synthetic-written-exam-round-1", sourceCode: "0007", sourceName: "SYNTHETIC ONLY", sourceGrade: "synthetic", payload: {
  year: "2026", round: "1", stage: "written", event_type: "exam", subtype: "ordinary", ordinal: "1",
  date_start: "2026-12-01", date_end: "2026-12-01", temporal_precision: "date", extent: "single", timezone: "Asia/Seoul",
} });
const statistic = (): CandidateRecord => ({ ...event(), entityType: "statistic", logicalKey: "synthetic-written-statistic-round-1", payload: {
  year: "2026", round: "1", stage: "written", acquisition_track: "synthetic", aggregation_level: "round",
  examinees: "100", passed: "47", published_rate: "47", source_rate_text: "47%", source_precision: 0, completeness: "unknown",
} });
const statScope = { ...scope, datasetType: "statistics" as const };

describe("normalized projection safety", () => {
  it("preserves leading zeros and distinct provenance, never invents time/review", () => {
    const r = normalizeRecord(event(), scope, metadata);
    expect(r.sourceCode).toBe("0007"); expect(r.payload.starts_at).toBeNull();
    expect(r.payload.source_published_at).toBeNull(); expect(r.payload.fetched_at).not.toBe(r.payload.validated_at);
    expect(r.payload).not.toHaveProperty("reviewed_at");
  });
  it.each([
    { date_start: "2026-02-30" }, { date_end: "2026-11-30" }, { year: "2027" },
    { starts_at: "2026-12-01T09:00:00+09:00" }, { stage: "oral" },
    { reviewed_at: "2026-10-20T00:00:00Z" }, { verification: "verified" },
    { qualification_id: "00000000-0000-0000-0000-000000000999" },
    { source_url: "https://www.q-net.or.kr.evil.invalid/" },
  ])("rejects inconsistent/untrusted projection %j", change => {
    const e = event(); Object.assign(e.payload, change); expect(() => normalizeRecord(e, scope, metadata)).toThrow();
  });
  it("checks Korean calendar dates for exact timestamp boundaries", () => {
    const e = event(); Object.assign(e.payload, { temporal_precision: "datetime", starts_at: "2026-11-30T23:59:59Z", ends_at: "2026-12-01T00:30:00Z" });
    expect(normalizeRecord(e, scope, metadata).payload.starts_at).toBe("2026-11-30T23:59:59.000Z");
    e.payload.starts_at = "2026-11-30T12:00:00Z"; expect(() => normalizeRecord(e, scope, metadata)).toThrow("TIMESTAMP_DATE_MISMATCH");
  });
  it("retains bigint beyond JavaScript safe range and null", () => {
    const s = statistic(); Object.assign(s.payload, { examinees: "9007199254740993", passed: null, published_rate: null });
    const p = normalizeRecord(s, statScope, metadata).payload;
    expect(p.examinees).toBe("9007199254740993"); expect(p.passed).toBeNull();
  });
  it.each([{ passed: "101" }, { examinees: -1 }, { published_rate: "48" }, { published_rate: "100.1" },
    { examinees: 9007199254740992 }, { aggregation_level: "official_annual" }, { source_precision: null }])("rejects bad statistics %j", change => {
    const s = statistic(); Object.assign(s.payload, change); expect(() => normalizeRecord(s, statScope, metadata)).toThrow();
  });
  it("accepts documented half-unit rounding tolerance", () => {
    const s = statistic(); Object.assign(s.payload, { examinees: "3", passed: "1", published_rate: "33.3", source_precision: 1 });
    expect(normalizeRecord(s, statScope, metadata).payload.published_rate).toBe("33.3");
    s.payload.published_rate = "33.4"; expect(() => normalizeRecord(s, statScope, metadata)).toThrow("RATE_MISMATCH");
  });
  it("keeps a stable event key independent of corrected dates", () => {
    const identity = { qualificationCode: "0007", year: 2026, round: "1", stage: "written", eventType: "exam", subtype: "ordinary", ordinal: "1" };
    expect(stableEventKey(identity)).toBe(stableEventKey({ ...identity }));
    expect(stableEventKey({ ...identity, ordinal: "2" })).not.toBe(stableEventKey(identity));
  });
  it("redacts nested credential fields and echoed credential content", () => {
    const secret = "SYNTHETIC-KEY+ONLY/=";
    const value = sanitize({ body: { ServiceKey: secret, echo: `url?serviceKey=${encodeURIComponent(secret)}`, message: `returned ${secret}` }, db: "postgres://user:synthetic@localhost/db" }, [secret]);
    const saved = JSON.stringify(value); expect(saved).not.toContain(secret); expect(saved).not.toContain(encodeURIComponent(secret)); expect(saved).not.toContain("user:");
  });
  it("rejects secret echoes in normalized public fields", () => {
    const e = event(); e.payload.ordinal = "SYNTHETIC-KEY";
    expect(() => normalizeRecord(e, scope, { ...metadata, secrets: ["SYNTHETIC-KEY"] })).toThrow("SECRET_IN_RECORD");
  });
  it("redacts mixed-case percent escapes, double encoding and echoed object keys", () => {
    const key = "SYNTHETIC/KEY+";
    const value = sanitize({ message: "SYNTHETIC%2fKEY%2b SYNTHETIC%252FKEY%252b", ["SYNTHETIC%2FKEY%2b"]: true }, [key]);
    expect(JSON.stringify(value)).not.toMatch(/SYNTHETIC/);
  });
  it("hashes object key order consistently", () => expect(hashJson({ a: 1, b: 2 })).toBe(hashJson({ b: 2, a: 1 })));
});
