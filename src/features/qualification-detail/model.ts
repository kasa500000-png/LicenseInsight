import type { DatasetStatusDto, ExamEventDto, PassStatisticDto, PublicRepository, QualificationDetailDto, QualificationDto } from "../../data/repositories/public-repository";
import type { Clock, ScheduleEvaluation, Stage } from "../../domain/date";
import type { StatisticRow, StatisticsSummary } from "../../domain/statistics";

export type DetailRepository = Pick<PublicRepository, "getQualificationBySlug" | "listEvents" | "listStatistics" | "listDetails" | "listDatasetStatuses">;
export type SectionState = "available" | "empty" | "partial" | "unavailable";
export type Section<T> = Readonly<{ state: SectionState; paginationComplete: boolean; rows: readonly T[]; warnings: readonly string[] }>;
export type DetailEvent = Readonly<{ source: ExamEventDto; evaluation: ScheduleEvaluation; warnings: readonly string[] }>;
export type DetailStatisticRow = Readonly<{ source: PassStatisticDto; domain: StatisticRow | null; formattedRate: string | null }>;
export type DetailStatisticGroup = Readonly<{
  year: number; stage: Stage; acquisitionTrack: string; population: string | null;
  rows: readonly DetailStatisticRow[]; summary: StatisticsSummary | null; formattedDerivedRate: string | null;
  reason: "POPULATION_UNCONFIRMED" | "EVIDENCE_MISMATCH" | "DATASET_NOT_READY" | "INVALID_STATISTICS" | "REVIEW_REQUIRED" | null;
}>;
export type SyntheticStatisticsEvidence = Readonly<{
  synthetic: true;
  groups: readonly Readonly<{
    qualificationId: string; acquisitionTrack: string; year: number; stage: Stage; population: string;
    /** Exact revision set, so an old fixture review cannot approve a changed source. */
    revisionHashes: readonly string[]; expectedRounds: readonly string[] | null; coverageConfirmed: boolean;
    roundingMethod: "half_up" | "truncate" | "unknown";
  }>[];
}>;
export type DetailServiceOptions = Readonly<{
  mode: "live" | "synthetic";
  eventYears?: readonly number[]; statisticsYears?: readonly number[];
  syntheticEvidence?: SyntheticStatisticsEvidence;
}>;
export type DetailModel = Readonly<{
  mode: "live" | "synthetic"; evaluatedAt: string; today: string;
  qualification: QualificationDto;
  events: Section<DetailEvent> & Readonly<{ nextByStage: Readonly<Record<Stage, DetailEvent | null>> }>;
  statistics: Readonly<{ state: SectionState; paginationComplete: boolean; groups: readonly DetailStatisticGroup[]; warnings: readonly string[] }>;
  details: Section<QualificationDetailDto>;
  statuses: Section<DatasetStatusDto>;
}>;
export type DetailLoadResult = Readonly<{ kind: "ok"; value: DetailModel }> | Readonly<{ kind: "not-found" }> | Readonly<{ kind: "unavailable" }> | Readonly<{ kind: "invalid-query" }>;
export type QualificationDetailService = Readonly<{ loadDetail(slug: string, clock: Clock): Promise<DetailLoadResult> }>;
