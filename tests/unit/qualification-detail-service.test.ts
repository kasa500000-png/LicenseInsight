import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { DatasetStatusDto, ExamEventDto, Page, PassStatisticDto, QualificationDto } from "../../src/data/repositories/public-repository";
import type { DetailLoadResult, DetailRepository, DetailServiceOptions, SyntheticStatisticsEvidence } from "../../src/features/qualification-detail/model";
import { isOfficialUrl } from "../../src/features/qualification-detail/official-url";
import { createQualificationDetailService } from "../../src/features/qualification-detail/service";

// Deliberately synthetic: no actual qualification code, population or official API result.
const id = "00000000-0000-0000-0000-000000000801";
const hash = "a".repeat(64);
const clock = { now: "2026-10-21T03:00:00Z" };
const provenance = { sourceId: "SYNTHETIC-STEP08", sourceUrl: "https://www.q-net.or.kr/", sourcePublishedAt: null, dataAsOf: null,
  fetchedAt: "2026-10-21T00:00:00.000000Z", validatedAt: "2026-10-21T00:00:00.000000Z", reviewedAt: "2026-10-21T00:00:00.000000Z",
  verification: "verified" as const, revisionHash: hash };
const qualification: QualificationDto = { ...provenance, id, provider: "SYNTHETIC", qualificationType: "synthetic", acquisitionTrack: "synthetic",
  sourceCode: "0007", canonicalName: "SYNTHETIC ONLY", grade: "synthetic", domain: "synthetic", slug: "synthetic-only", activeState: "unknown",
  createdAt: provenance.fetchedAt, updatedAt: provenance.fetchedAt };
const event: ExamEventDto = { ...provenance, id: "00000000-0000-0000-0000-000000000802", qualificationId: id,
  logicalKey: "synthetic-event", year: 2026, round: "01", stage: "written", eventType: "registration", subtype: "ordinary", ordinal: "1",
  dateStart: "2026-10-22", dateEnd: "2026-10-24", startsAt: null, endsAt: null, temporalPrecision: "date", extent: "range", timezone: "Asia/Seoul" };
const statistic: PassStatisticDto = { ...provenance, id: "00000000-0000-0000-0000-000000000803", qualificationId: id,
  year: 2025, round: "1", stage: "written", acquisitionTrack: "synthetic", aggregationLevel: "round", examinees: "100", passed: "20",
  publishedRate: "20.0", calculatedRate: "99.9", sourceRateText: "20.0", sourcePrecision: 1, completeness: "complete" };
const statistics: PassStatisticDto[] = [statistic, { ...statistic, id: "00000000-0000-0000-0000-000000000804", round: "2", examinees: "900", passed: "450", publishedRate: "50.0" },
  { ...statistic, id: "00000000-0000-0000-0000-000000000805", aggregationLevel: "official_annual", round: null, examinees: "1000", passed: "470", publishedRate: "47.0" }];
const evidence: SyntheticStatisticsEvidence = { synthetic: true, groups: [{ qualificationId: id, acquisitionTrack: "synthetic", year: 2025,
  stage: "written", population: "SYNTHETIC-POPULATION-NOT-OFFICIAL", revisionHashes: [hash], expectedRounds: ["1", "2"], coverageConfirmed: true, roundingMethod: "half_up" }] };
const options: DetailServiceOptions = { mode: "synthetic", eventYears: [2026], statisticsYears: [2025], syntheticEvidence: evidence };
function page<T>(items: T[], current = 1, hasMore = false): Page<T> { return { items, page: current, limit: 50, hasMore }; }
function statuses(): DatasetStatusDto[] {
  return (["qualifications", "events", "statistics", "details"] as const).map(datasetType => ({ scopeKey: `SYNTHETIC:${datasetType}`,
    qualificationId: id, datasetType, publishedRevisionHash: hash, availability: "available", freshness: "fresh", verification: "verified",
    lastFetchAt: provenance.fetchedAt, lastValidatedAt: provenance.validatedAt, lastReviewedAt: provenance.reviewedAt,
    sourceAsOf: null, pendingChange: false, publicNotice: "SYNTHETIC ONLY" }));
}
function fixture(overrides: Partial<DetailRepository> = {}) {
  return { getQualificationBySlug: vi.fn(async () => qualification), listEvents: vi.fn(async () => page([event])),
    listStatistics: vi.fn(async () => page(statistics)), listDetails: vi.fn(async () => page([])),
    listDatasetStatuses: vi.fn(async () => page(statuses())), ...overrides } satisfies DetailRepository;
}
function ok(result: DetailLoadResult) { if (result.kind !== "ok") throw new Error("expected synthetic detail"); return result.value; }

describe("official detail URL boundary", () => {
  it.each(["https://www.q-net.or.kr/", "https://apis.data.go.kr/service?year=2026", "https://data.go.kr/data/1"]) ("allows exact official HTTPS URL %s", url => expect(isOfficialUrl(url)).toBe(true));
  it.each(["http://www.q-net.or.kr/", "https://www.q-net.or.kr.evil.test/", "https://evil.test/?url=https://www.q-net.or.kr", "https://user@www.q-net.or.kr/",
    "https://www.q-net.or.kr:443/", "https://www.q-net.or.kr:8443/", "https://www.q-net.or.kr/#", "https://www.q-net.or.kr/#secret",
    "https://www.q-net.or.kr/?serviceKey=synthetic", "https://www.q-net.or.kr/?%2573erviceKey=synthetic", "https://www.q-net.or.kr/?%25252573erviceKey=synthetic", "https://www.q-net.or.kr/?api_key=synthetic",
    "https://www.q-net.or.kr/?access_token=synthetic", "https://www.q-net.or.kr/?password=synthetic", " https://www.q-net.or.kr/", "https://www.q-net.or.kr\\@evil.test/", "javascript:alert(1)"])("rejects unsafe URL %s", url => expect(isOfficialUrl(url)).toBe(false));
});

describe("qualification detail read service", () => {
  it("uses published repository DTOs and pure domains for schedules, weighted rates and separate official annual totals", async () => {
    const repository = fixture();
    const actual = ok(await createQualificationDetailService(repository, options).loadDetail("synthetic-only", clock));
    expect(actual.qualification.sourceCode).toBe("0007");
    expect(actual.qualification).toMatchObject({ sourceId: provenance.sourceId, sourceUrl: provenance.sourceUrl,
      fetchedAt: provenance.fetchedAt, validatedAt: provenance.validatedAt, reviewedAt: provenance.reviewedAt });
    expect(actual.events.nextByStage.written?.evaluation.countdown).toEqual({ days: 1, kind: "registration_start" });
    expect(actual.events.nextByStage.practical).toBeNull();
    expect(actual.events.rows[0].warnings).toContain("OFFICIAL_TIME_REQUIRED");
    expect(actual.events.rows[0].evaluation).toMatchObject({ registrationGuaranteed: false, personalExamDateConfirmed: false });
    const group = actual.statistics.groups[0];
    expect(group.formattedDerivedRate).toBe("47.0");
    expect(group.summary?.derivedAnnual).toMatchObject({ examinees: "1000", passed: "470", completeness: "complete", recordCount: 2 });
    expect(group.summary?.officialAnnual).toHaveLength(1);
    expect(group.rows.map(row => row.formattedRate)).toEqual(["20.0", "50.0", "47.0"]);
    expect(JSON.parse(JSON.stringify(actual))).toEqual(actual);
    expect(repository.listEvents).toHaveBeenCalledWith(id, 2026, { page: 1, limit: 50 });
  });

  it("keeps missing qualification and unavailable read distinct and does not cache either", async () => {
    const getQualificationBySlug = vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("driver credentials SYNTHETIC-ERROR" )).mockResolvedValueOnce(qualification);
    const service = createQualificationDetailService(fixture({ getQualificationBySlug }), options);
    expect(await service.loadDetail("synthetic-only", clock)).toEqual({ kind: "not-found" });
    expect(await service.loadDetail("synthetic-only", clock)).toEqual({ kind: "unavailable" });
    expect((await service.loadDetail("synthetic-only", clock)).kind).toBe("ok");
    expect(getQualificationBySlug).toHaveBeenCalledTimes(3);
  });

  it.each(["", "../secret", "a' or 1=1", "UPPER", "a".repeat(81)])("fails closed before querying invalid slug %s", async slug => {
    const repository = fixture();
    expect(await createQualificationDetailService(repository, options).loadDetail(slug, clock)).toEqual({ kind: "invalid-query" });
    expect(repository.getQualificationBySlug).not.toHaveBeenCalled();
  });

  it("validates explicit clock, query years, and rejects synthetic evidence in live mode", async () => {
    const repository = fixture();
    expect(await createQualificationDetailService(repository, options).loadDetail("synthetic-only", { now: "invalid" })).toEqual({ kind: "invalid-query" });
    expect(await createQualificationDetailService(repository, { ...options, eventYears: [2026, 2026] }).loadDetail("synthetic-only", clock)).toEqual({ kind: "invalid-query" });
    expect(await createQualificationDetailService(repository, { ...options, mode: "live" }).loadDetail("synthetic-only", clock)).toEqual({ kind: "invalid-query" });
    expect(repository.getQualificationBySlug).not.toHaveBeenCalled();
  });

  it("withholds population, coverage and rates absent contract evidence while preserving individual counts", async () => {
    const actual = ok(await createQualificationDetailService(fixture(), { ...options, mode: "live", syntheticEvidence: undefined }).loadDetail("synthetic-only", clock));
    expect(actual.statistics.state).toBe("partial");
    expect(actual.statistics.groups[0]).toMatchObject({ population: null, summary: null, formattedDerivedRate: null, reason: "POPULATION_UNCONFIRMED" });
    expect(actual.statistics.groups[0].rows[0]).toMatchObject({ source: { examinees: "100", passed: "20" }, formattedRate: null, domain: null });
  });

  it("rejects review evidence when source revisions change", async () => {
    const actual = ok(await createQualificationDetailService(fixture({ listStatistics: vi.fn(async () => page([{ ...statistic, revisionHash: "b".repeat(64) }])) }), options).loadDetail("synthetic-only", clock));
    expect(actual.statistics.groups[0]).toMatchObject({ summary: null, reason: "EVIDENCE_MISMATCH" });
  });

  it("does not silently assume a rounding rule even with confirmed population", async () => {
    const unknownRounding = { ...evidence, groups: evidence.groups.map(group => ({ ...group, roundingMethod: "unknown" as const })) };
    const actual = ok(await createQualificationDetailService(fixture(), { ...options, syntheticEvidence: unknownRounding }).loadDetail("synthetic-only", clock));
    expect(actual.statistics.groups[0].summary?.reviewRequired).toBe(true);
    expect(actual.statistics).toMatchObject({ state: "partial", warnings: ["REVIEW_REQUIRED"] });
    expect(actual.statistics.groups[0].formattedDerivedRate).toBeNull();
    expect(actual.statistics.groups[0].rows.every(row => row.formattedRate === null)).toBe(true);
  });

  it("keeps the current year partial despite source complete flags and fixture coverage", async () => {
    const currentEvidence = { ...evidence, groups: evidence.groups.map(group => ({ ...group, year: 2026 })) };
    const actual = ok(await createQualificationDetailService(fixture({ listStatistics: vi.fn(async () => page(statistics.map(row => ({ ...row, year: 2026 })))) }),
      { ...options, statisticsYears: [2026], syntheticEvidence: currentEvidence }).loadDetail("synthetic-only", clock));
    expect(actual.statistics.groups[0].summary).toMatchObject({ completedYear: false, derivedAnnual: { completeness: "partial", labelCode: "COLLECTED_ROUNDS" } });
  });

  it("does not promote pending statistics into a complete total or a verified rate", async () => {
    const actual = ok(await createQualificationDetailService(fixture({ listDatasetStatuses: vi.fn(async () => page(statuses().map(row => row.datasetType === "statistics" ? { ...row, pendingChange: true } : row))) }),
      options).loadDetail("synthetic-only", clock));
    expect(actual.statistics.state).toBe("partial");
    expect(actual.statistics.groups[0]).toMatchObject({ reason: "DATASET_NOT_READY", formattedDerivedRate: null,
      summary: { coverageConfirmed: false, derivedAnnual: { completeness: "partial", verification: "pending" } } });
    expect(actual.statistics.groups[0].rows.every(row => row.formattedRate === null)).toBe(true);
    expect(actual.events.nextByStage.written).not.toBeNull();
  });

  it("isolates statistics/detail failures and excludes raw exception text from all output", async () => {
    const failed = vi.fn(async () => { throw new Error("PRIVATE-CONNECTION-STRING-SYNTHETIC"); });
    const actual = ok(await createQualificationDetailService(fixture({ listStatistics: failed, listDetails: failed }), options).loadDetail("synthetic-only", clock));
    expect(actual.statistics.state).toBe("unavailable");
    expect(actual.details.state).toBe("unavailable");
    expect(actual.events.nextByStage.written).not.toBeNull();
    expect(JSON.stringify(actual)).not.toContain("PRIVATE-CONNECTION");
  });

  it.each(["stale", "pending", "missing", "unavailable"])("suppresses schedule calls to action for %s status", async kind => {
    const listDatasetStatuses = vi.fn(async () => {
      if (kind === "unavailable") throw new Error("SYNTHETIC ONLY");
      return page(kind === "missing" ? [] : statuses().map(row => row.datasetType === "events" ? { ...row,
        freshness: kind === "stale" ? "stale" as const : row.freshness, pendingChange: kind === "pending" } : row));
    });
    const actual = ok(await createQualificationDetailService(fixture({ listDatasetStatuses }), options).loadDetail("synthetic-only", clock));
    expect(actual.events.state).toBe("partial");
    expect(actual.events.nextByStage.written).toBeNull();
    expect(actual.events.rows[0].evaluation).toMatchObject({ countdown: null, currentRegistrationCandidate: false, nextActionEligible: false });
  });

  it("memoizes only request-local raw reads and recalculates Seoul midnight, ending and staleness", async () => {
    const repository = fixture();
    const service = createQualificationDetailService(repository, options);
    const before = ok(await service.loadDetail("synthetic-only", { now: "2026-10-21T14:59:59Z" }));
    const after = ok(await service.loadDetail("synthetic-only", { now: "2026-10-21T15:00:00Z" }));
    const stale = ok(await service.loadDetail("synthetic-only", { now: "2026-10-23T00:00:01Z" }));
    expect(before.events.rows[0].evaluation.countdown?.days).toBe(1);
    expect(after.today).toBe("2026-10-22");
    expect(after.events.rows[0].evaluation).toMatchObject({ state: "DATE_ONLY_START_DAY", currentRegistrationCandidate: true });
    expect(stale.events.rows[0].evaluation).toMatchObject({ state: "STALE", nextActionEligible: false });
    expect(repository.getQualificationBySlug).toHaveBeenCalledTimes(1);
    expect(repository.listEvents).toHaveBeenCalledTimes(1);
    const other = fixture();
    await createQualificationDetailService(other, options).loadDetail("synthetic-only", clock);
    expect(other.getQualificationBySlug).toHaveBeenCalledTimes(1);
    before.qualification.canonicalName = "mutated output";
    expect(ok(await service.loadDetail("synthetic-only", clock)).qualification.canonicalName).toBe("SYNTHETIC ONLY");
  });

  it("retries section failures instead of memoizing failure as an empty success", async () => {
    const listStatistics = vi.fn().mockRejectedValueOnce(new Error("SYNTHETIC" )).mockResolvedValueOnce(page(statistics));
    const service = createQualificationDetailService(fixture({ listStatistics }), options);
    expect(ok(await service.loadDetail("synthetic-only", clock)).statistics.state).toBe("unavailable");
    expect(ok(await service.loadDetail("synthetic-only", clock)).statistics.groups[0].formattedDerivedRate).toBe("47.0");
    expect(listStatistics).toHaveBeenCalledTimes(2);
  });

  it("exhausts every bounded page before claiming completeness", async () => {
    const listDetails = vi.fn(async (_id: string, paging?: { page?: number }) => page([], paging?.page));
    const listStatistics = vi.fn(async (_id: string, _year: number, paging?: { page?: number }) => {
      const current = paging?.page ?? 1;
      return current === 1 ? page(Array.from({ length: 50 }, (_, index) => ({ ...statistic, id: `${statistic.id}-${index}`, round: `r-${index}` })), 1, true) : page([], current);
    });
    const actual = ok(await createQualificationDetailService(fixture({ listStatistics, listDetails }), { ...options, syntheticEvidence: undefined }).loadDetail("synthetic-only", clock));
    expect(actual.statistics.paginationComplete).toBe(true);
    expect(listStatistics.mock.calls.map(call => call[2]?.page)).toEqual([1, 2]);
  });

  it("marks truncation explicitly, bounds reads to ten pages and never reports a complete annual total", async () => {
    const listStatistics = vi.fn(async (_id: string, _year: number, paging?: { page?: number }) => page(Array.from({ length: 50 }, (_, index) => ({ ...statistic, id: `${statistic.id}-${paging?.page}-${index}`, round: `r-${paging?.page}-${index}` })), paging?.page, true));
    const actual = ok(await createQualificationDetailService(fixture({ listStatistics }), options).loadDetail("synthetic-only", clock));
    expect(listStatistics).toHaveBeenCalledTimes(10);
    expect(actual.statistics).toMatchObject({ state: "partial", paginationComplete: false });
    expect(actual.statistics.warnings).toContain("PAGINATION_TRUNCATED");
    expect(actual.statistics.groups[0].summary?.derivedAnnual.completeness).not.toBe("complete");
    expect(actual.statistics.groups[0].formattedDerivedRate).toBeNull();
  });

  it("rejects malformed pagination, injected unsafe source URLs and foreign qualification rows independently", async () => {
    const actual = ok(await createQualificationDetailService(fixture({
      listStatistics: vi.fn(async () => ({ ...page(statistics), limit: 100 })),
      listEvents: vi.fn(async () => page([{ ...event, sourceUrl: "https://evil.test/" }])),
    }), options).loadDetail("synthetic-only", clock));
    expect(actual.statistics.state).toBe("unavailable");
    expect(actual.events.state).toBe("unavailable");
    expect(JSON.stringify(actual)).not.toContain("evil.test");
    const foreign = ok(await createQualificationDetailService(fixture({ listEvents: vi.fn(async () => page([{ ...event, qualificationId: "different" }])) }), options).loadDetail("synthetic-only", clock));
    expect(foreign.events.rows).toHaveLength(0);
  });

  it("fails closed for unsafe qualification links and drops unexpected private DTO properties", async () => {
    expect(await createQualificationDetailService(fixture({ getQualificationBySlug: vi.fn(async () => ({ ...qualification, sourceUrl: "https://www.q-net.or.kr/?apiKey=synthetic" })) }), options).loadDetail("synthetic-only", clock)).toEqual({ kind: "unavailable" });
    const actual = ok(await createQualificationDetailService(fixture({ getQualificationBySlug: vi.fn(async () => ({ ...qualification, privateSecret: "SYNTHETIC-PRIVATE" })) }), options).loadDetail("synthetic-only", clock));
    expect(JSON.stringify(actual)).not.toContain("SYNTHETIC-PRIVATE");
  });
});
