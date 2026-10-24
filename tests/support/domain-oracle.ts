import { dates, planner, statistics, type DomainResult } from "../../src/domain";

function unwrap<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(result.code);
  return result.value;
}

// Shared execution probe, with a separate fixed expected oracle. No official data.
export function calculateDomainOracle() {
  const group = { qualificationId: "SYNTHETIC", acquisitionTrack: "synthetic", stage: "written" as const, year: 2025, population: "synthetic-same-population" };
  const records = [["1", "100", "20"], ["2", "900", "450"]].map(([round, examinees, passed]) => ({
    group, sourceId: "SYNTHETIC", logicalKey: `round-${round}`, revision: "1", aggregationLevel: "round" as const, round,
    examinees, passed, publishedRate: null, sourceRateText: null, sourcePrecision: null,
    roundingMethod: "unknown" as const, verification: "verified" as const, completeness: "complete" as const,
  }));
  const summary = unwrap(statistics.summarizeStatistics({ group, records, coverage: { expectedRounds: ["1", "2"], confirmed: true }, referenceYear: 2026 }));
  const input = {
    qualificationId: "SYNTHETIC", stage: "written", startDate: "2026-10-19", targetDate: "2026-10-26",
    weekdayMinutes: { 1: 60, 2: 60, 3: 60, 4: 60, 5: 60, 6: 180, 7: 180 }, excludedDates: [] as string[],
    phases: [{ id: "learn", label: "합성 학습", weight: 1, items: [{ id: "one", label: "합성 항목", weight: 1 }] }],
  };
  const clock = { now: "2026-10-18T15:00:00Z" };
  const week = unwrap(planner.createPlan(input, clock));
  const excluded = unwrap(planner.createPlan({ ...input, excludedDates: ["2026-10-21"] }, clock));
  return {
    beforeMidnight: unwrap(dates.dDay("2026-10-21", { now: "2026-10-20T14:59:00Z" })),
    afterMidnight: unwrap(dates.dDay("2026-10-21", { now: "2026-10-20T15:00:00Z" })),
    leapDays: unwrap(dates.daysBetween("2028-02-28", "2028-03-01")),
    rate: unwrap(statistics.formatRate(summary.derivedAnnual.rate)),
    examinees: summary.derivedAnnual.examinees, passed: summary.derivedAnnual.passed,
    weekMinutes: week.totalMinutes, excludedMinutes: excluded.totalMinutes,
    lastStudyDate: week.days.at(-1)!.date,
    targetExcluded: week.days.every(day => day.date < week.targetDate),
    officialRequiredHours: week.assumptions.officialRequiredHours,
  };
}

export const domainOracleExpected = {
  beforeMidnight: 1, afterMidnight: 0, leapDays: 2, rate: "47.0", examinees: "1000", passed: "470",
  weekMinutes: 660, excludedMinutes: 600, lastStudyDate: "2026-10-25", targetExcluded: true, officialRequiredHours: null,
};
