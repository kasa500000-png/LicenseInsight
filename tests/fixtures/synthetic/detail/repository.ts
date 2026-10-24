import "server-only";
import type { DatasetStatusDto, ExamEventDto, Page, PageOptions, PassStatisticDto, ProvenanceDto, QualificationDetailDto, QualificationDto } from "../../../../src/data/repositories/public-repository";
import type { DetailRepository, SyntheticStatisticsEvidence } from "../../../../src/features/qualification-detail/model";
import { DETAIL_DEMO_SLUG, type DetailDemoScenario } from "../../../../src/features/qualification-detail/demo-policy";

// Isolated test records. Never official codes, captured API responses, or a live fallback.
export const demoClock = { now: "2026-10-21T03:00:00.000000Z" } as const;
const id = "00000000-0000-4000-8000-000000000008";
const revision = "8".repeat(64);
const provenance: ProvenanceDto = {
  sourceId: "00000000-0000-4000-8000-000000000001", sourceUrl: "https://www.q-net.or.kr/",
  sourcePublishedAt: null, dataAsOf: null,
  fetchedAt: "2026-10-21T01:00:00.000000Z", validatedAt: "2026-10-21T02:00:00.000000Z",
  reviewedAt: "2026-10-21T02:30:00.000000Z", verification: "verified", revisionHash: revision,
};
function page<T>(items: readonly T[], options?: PageOptions): Page<T> {
  const number = options?.page ?? 1, limit = options?.limit ?? 50;
  return { items: structuredClone(items.slice((number - 1) * limit, number * limit)), page: number, limit, hasMore: number * limit < items.length };
}
export function createSyntheticDetailFixture(scenario: DetailDemoScenario = "normal"): { repository: DetailRepository; evidence: SyntheticStatisticsEvidence } {
  const stamp = { ...provenance, ...(scenario === "stale" ? { validatedAt: "2026-10-17T02:00:00.000000Z" } : {}) };
  const qualification: QualificationDto = { ...stamp, id, provider: "SYNTHETIC", qualificationType: "synthetic",
    acquisitionTrack: "exam", sourceCode: "SYNTHETIC-ONLY", canonicalName: "합성 전기설비 자격", grade: "합성 등급",
    domain: "전기 분야 UI 검증", slug: DETAIL_DEMO_SLUG, activeState: "unknown", createdAt: stamp.fetchedAt, updatedAt: stamp.reviewedAt };
  const events: ExamEventDto[] = [];
  function event(stage: "written" | "practical", eventType: ExamEventDto["eventType"], start: string, end: string, subtype: ExamEventDto["subtype"] = "ordinary", exact = false) {
    const number = events.length + 1;
    events.push({ ...stamp, id: `00000000-0000-4000-8000-${String(number + 100).padStart(12, "0")}`, qualificationId: id,
      logicalKey: `synthetic-event-${number}`, year: Number(start.slice(0, 4)), round: "합성 1", stage, eventType, subtype, ordinal: String(number),
      dateStart: start, dateEnd: end, startsAt: exact ? `${start}T00:00:00.000000Z` : null, endsAt: exact ? `${end}T09:00:00.000000Z` : null,
      temporalPrecision: exact ? "datetime" : "date", extent: start === end ? "single" : "range", timezone: "Asia/Seoul" });
  }
  event("written", "registration", "2026-10-21", "2026-10-23");
  event("written", "registration", "2026-10-24", "2026-10-25", "additional");
  event("written", "exam", "2026-11-10", "2026-11-15");
  event("written", "result", "2026-12-01", "2026-12-01");
  event("practical", "registration", "2026-11-02", "2026-11-02", "ordinary", true);
  event("practical", "document_submission", "2026-11-05", "2026-11-06");
  event("practical", "exam", "2026-12-05", "2026-12-09");
  event("practical", "result", "2026-12-20", "2026-12-20");
  event("written", "registration", "2027-01-05", "2027-01-07");
  if (scenario === "range") events.splice(0, 2);
  const statistics: PassStatisticDto[] = [];
  function statistic(year: number, stage: "written" | "practical", round: string | null, examinees: string | null, passed: string | null, completeness: PassStatisticDto["completeness"] = "complete") {
    statistics.push({ ...stamp, id: `00000000-0000-4000-8000-${String(statistics.length + 200).padStart(12, "0")}`, qualificationId: id,
      year, stage, round, acquisitionTrack: "exam", aggregationLevel: round === null ? "official_annual" : "round", examinees, passed,
      publishedRate: null, calculatedRate: null, sourceRateText: null, sourcePrecision: null, completeness });
  }
  statistic(2025, "written", "1", "100", "20"); statistic(2025, "written", "2", "900", "450");
  statistic(2025, "written", null, "1000", "470");
  statistic(2025, "practical", "1", "80", "40");
  statistic(2024, "written", "1", "100", "40");
  statistic(2026, "written", "1", "100", null, "partial");
  const details: QualificationDetailDto[] = [{ ...stamp, id: "00000000-0000-4000-8000-000000000300", qualificationId: id,
    infoType: "description", safeText: "화면과 계산 연결을 확인하는 합성 설명입니다. 실제 종목의 응시자격·수수료·시험기준은 제공하지 않습니다.",
    numericValue: null, unit: null, validFrom: null, validTo: null }];
  const statuses: DatasetStatusDto[] = (["qualifications", "events", "statistics", "details"] as const).map(datasetType => ({
    scopeKey: `synthetic:${datasetType}`, qualificationId: id, datasetType, publishedRevisionHash: revision,
    availability: scenario === "unsupported" && datasetType === "details" ? "unavailable" : "available",
    freshness: scenario === "stale" ? "stale" : "fresh", verification: "verified",
    lastFetchAt: stamp.fetchedAt, lastValidatedAt: stamp.validatedAt, lastReviewedAt: stamp.reviewedAt, sourceAsOf: null,
    pendingChange: scenario === "pending", publicNotice: null,
  }));
  const evidence: SyntheticStatisticsEvidence = { synthetic: true, groups: scenario === "unconfirmed-population" ? [] : [
    { year: 2025, stage: "written" as const, expectedRounds: ["1", "2"] },
    { year: 2025, stage: "practical" as const, expectedRounds: ["1"] },
    { year: 2024, stage: "written" as const, expectedRounds: ["1"] },
    { year: 2026, stage: "written" as const, expectedRounds: ["1", "2"] },
  ].map(group => ({ ...group, qualificationId: id, acquisitionTrack: "exam", population: "synthetic-exam-sample",
    revisionHashes: [revision], coverageConfirmed: group.year < 2026, roundingMethod: "half_up" })) };
  function fail(): never { throw new Error("SYNTHETIC_PRIVATE_ERROR_DO_NOT_RENDER"); }
  const repository: DetailRepository = {
    async getQualificationBySlug(slug) { return slug === DETAIL_DEMO_SLUG ? structuredClone(qualification) : null; },
    async listEvents(_id, year, options) { if (scenario === "events-error") fail(); return page(events.filter(row => row.year === year), options); },
    async listStatistics(_id, year, options) { if (scenario === "stats-error" || scenario === "stats-partial-error" && year === 2024) fail(); return page(scenario === "no-stats" ? [] : statistics.filter(row => row.year === year), options); },
    async listDetails(_id, options) { if (scenario === "details-error") fail(); return page(scenario === "unsupported" ? [] : details, options); },
    async listDatasetStatuses(_id, options) { if (scenario === "status-error") fail(); return page(statuses, options); },
  };
  return { repository, evidence };
}
