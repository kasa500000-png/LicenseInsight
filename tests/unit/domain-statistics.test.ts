import { describe, expect, it } from "vitest";
import { compareStatistics, formatRate, summarizeStatistics, type StatisticRecord, type StatisticsGroup, type StatisticsSummary } from "@/domain/statistics";
import type { DomainResult } from "@/domain/result";

const group: StatisticsGroup = { qualificationId: "SYNTHETIC-0007", acquisitionTrack: "synthetic", stage: "written", year: 2025, population: "same-confirmed-population" };
function record(round: string | null = "1", examinees: string | null = "100", passed: string | null = "20", changes: Partial<StatisticRecord> = {}): StatisticRecord {
  return { group, sourceId: "SYNTHETIC", logicalKey: `synthetic-${round ?? "annual"}`, revision: "revision-1", aggregationLevel: round === null ? "official_annual" : "round", round,
    examinees, passed, publishedRate: null, sourceRateText: null, sourcePrecision: null, roundingMethod: "unknown", verification: "verified", completeness: "complete", ...changes };
}
function value<T>(result: DomainResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  return result.value;
}
function summarize(records: readonly StatisticRecord[], changes: Record<string, unknown> = {}): StatisticsSummary {
  return value(summarizeStatistics({ group, records, coverage: { expectedRounds: ["1", "2"], confirmed: true }, referenceYear: 2026, ...changes }));
}
function rate(summary: StatisticsSummary, precision = 1): string | null { return value(formatRate(summary.derivedAnnual.rate, precision)); }
const pair = () => [record("1", "100", "20"), record("2", "900", "450")];
function completeYear(year: number, passed: string, expectedRounds = ["1"]): StatisticsSummary {
  const g = { ...group, year };
  return summarize([record("1", "100", passed, { group: g })], { group: g, coverage: { expectedRounds, confirmed: true } });
}

describe("statistics exact counts and nullable rates", () => {
  it("uses 470/1000 =47.0%, never average35.0", () => {
    const s = summarize(pair());
    expect(s.derivedAnnual).toMatchObject({ examinees: "1000", passed: "470", completeness: "complete", labelCode: "DERIVED_COMPLETE_YEAR" });
    expect(rate(s)).toBe("47.0"); expect(rate(s)).not.toBe("35.0");
  });
  it("returns a reduced exact percentage rational without rounding the source", () => {
    const s = summarize([record("1", "3", "1")], { coverage: { expectedRounds: ["1"], confirmed: true } });
    expect(s.derivedAnnual.rate).toEqual({ numerator: "100", denominator: "3" });
    expect(rate(s, 10)).toBe("33.3333333333");
  });
  it.each([
    ["0", "0", null, "ZERO_DENOMINATOR"], [null, "0", null, "MISSING_COUNT"], ["100", null, null, "MISSING_COUNT"], ["100", "0", "0.0", undefined],
  ])("keeps null/zero separate (%s,%s)", (examinees, passed, expected, issue) => {
    const s = summarize([record("1", examinees, passed)], { coverage: { expectedRounds: ["1"], confirmed: true } });
    expect(rate(s)).toBe(expected);
    if (issue) expect(s.rounds[0].issues).toContain(issue);
  });
  it("does not hide a missing numerator in a partial aggregate", () => {
    const s = summarize([record("1", "100", "20"), record("2", "900", null)]);
    expect(s.derivedAnnual.examinees).toBe("1000"); expect(s.derivedAnnual.passed).toBeNull();
    expect(s.derivedAnnual.rate).toBeNull(); expect(s.derivedAnnual.completeness).toBe("partial");
  });
  it.each([["-1", "0"], ["100", "-1"], ["100", "101"]])("requires review for impossible counts %s/%s", (examinees, passed) => {
    const s = summarize([record("1", examinees, passed)]);
    expect(s.reviewRequired).toBe(true); expect(s.rounds[0].effectiveVerification).toBe("review_required");
    expect(s.rounds[0].calculatedRate).toBeNull(); expect(s.derivedAnnual.rate).toBeNull();
  });
  it("preserves bigint beyond Number safe range and sum beyond a SQL bigint", () => {
    const n = "9223372036854775807";
    const s = summarize([record("1", n, n), record("2", n, "0")]);
    expect(s.derivedAnnual.examinees).toBe("18446744073709551614");
    expect(s.derivedAnnual.passed).toBe(n); expect(rate(s)).toBe("50.0");
  });
  it("does not infer counts from an official percentage", () => {
    const s = summarize([record("1", null, null, { publishedRate: "47.0", sourceRateText: "47.0%", sourcePrecision: 1, roundingMethod: "half_up" })]);
    expect(s.derivedAnnual.examinees).toBeNull(); expect(s.derivedAnnual.passed).toBeNull();
    expect(s.rounds[0]).toMatchObject({ publishedRate: "47.0", sourceRateText: "47.0%", rateVerification: "unverifiable" });
  });
});

describe("statistic identity, official totals and completeness", () => {
  it("removes exact source/logical/revision duplicates", () => {
    const rows = pair(); const s = summarize([rows[0], rows[1], rows[0], { ...rows[1] }]);
    expect(s.duplicateCount).toBe(2); expect(s.rounds).toHaveLength(2); expect(rate(s)).toBe("47.0");
  });
  it("does not choose an arbitrary newer revision", () => {
    const s = summarize([record("1"), record("1", "100", "21", { revision: "revision-2" })]);
    expect(s.rounds).toHaveLength(2); expect(s.reviewRequired).toBe(true); expect(s.derivedAnnual.rate).toBeNull();
    expect(s.rounds.every(r => r.issues.includes("SOURCE_IDENTITY_CONFLICT"))).toBe(true);
  });
  it("does not double count a natural round under different logical keys", () => {
    const s = summarize([record("1"), record("1", "100", "20", { logicalKey: "different-source-key" })]);
    expect(s.derivedAnnual.examinees).toBeNull(); expect(s.derivedAnnual.rate).toBeNull();
    expect(s.rounds.every(r => r.issues.includes("NATURAL_KEY_CONFLICT"))).toBe(true);
  });
  it("keeps an official annual total separate instead of adding it twice", () => {
    const s = summarize([...pair(), record(null, "1000", "470")]);
    expect(s.officialAnnual).toHaveLength(1); expect(s.officialAnnual[0].calculatedRate).toEqual({ numerator: "47", denominator: "1" });
    expect(s.derivedAnnual.examinees).toBe("1000"); expect(s.derivedAnnual.passed).toBe("470"); expect(rate(s)).toBe("47.0");
  });
  it("does not silently select between two annual total sources", () => {
    const s = summarize([record(null, "1000", "470"), record(null, "1000", "480", { sourceId: "OTHER" })]);
    expect(s.officialAnnual).toHaveLength(2); expect(s.reviewRequired).toBe(true); expect(s.derivedAnnual.rate).toBeNull();
  });
  it("labels a missing round as collected rounds, never official/complete", () => {
    const s = summarize([record("1")]);
    expect(s.derivedAnnual).toMatchObject({ completeness: "partial", labelCode: "COLLECTED_ROUNDS", missingRounds: ["2"] });
    expect(rate(s)).toBe("20.0");
  });
  it("requires explicit expected-round evidence, not only row completeness", () => {
    const s = summarize(pair(), { coverage: { expectedRounds: ["1", "2"], confirmed: false } });
    expect(s.derivedAnnual.completeness).toBe("partial");
  });
  it("keeps an ongoing year partial despite complete claims", () => {
    const s = summarize(pair(), { referenceYear: 2025 });
    expect(s.completedYear).toBe(false); expect(s.derivedAnnual.completeness).toBe("partial");
  });
  it("requires review for an unexpected round", () => {
    const s = summarize(pair(), { coverage: { expectedRounds: ["1"], confirmed: true } });
    expect(s.reviewRequired).toBe(true); expect(s.derivedAnnual.rate).toBeNull();
  });
  it("withholds pending and future data from a trusted aggregate", () => {
    const pending = summarize([record("1", "100", "20", { verification: "pending" })]);
    expect(pending.derivedAnnual.verification).toBe("pending"); expect(pending.derivedAnnual.rate).toBeNull();
    const future = summarize(pair(), { referenceYear: 2024 });
    expect(future.reviewRequired).toBe(true); expect(future.derivedAnnual.rate).toBeNull();
  });
});

describe("published rate evidence and exact rounding", () => {
  it.each([
    ["100", "47", "47.0", 1, "half_up", "verified"],
    ["400", "133", "33.3", 1, "half_up", "verified"],
    ["400", "133", "33.2", 1, "half_up", "review_required"],
    ["2000", "667", "33.4", 1, "half_up", "verified"],
    ["2000", "667", "33.3", 1, "half_up", "review_required"],
    ["400", "133", "33.2", 1, "truncate", "verified"],
    ["400", "133", "33.3", 1, "truncate", "review_required"],
    ["100", "47", "47.0", 1, "unknown", "review_required"],
    ["100", "47", "47.0", null, "half_up", "review_required"],
  ] as const)("checks %s/%s→%s under %s-place %s", (examinees, passed, publishedRate, sourcePrecision, roundingMethod, expected) => {
    const s = summarize([record("1", examinees, passed, { publishedRate, sourceRateText: `${publishedRate}%`, sourcePrecision, roundingMethod })]);
    expect(s.rounds[0].rateVerification).toBe(expected); expect(s.rounds[0].sourceRateText).toBe(`${publishedRate}%`);
  });
  it("does not hide exact rounding errors behind a wider epsilon", () => {
    const s = summarize([record("1", "3", "1", { publishedRate: "33.4", sourcePrecision: 1, roundingMethod: "half_up", sourceRateText: "33.4%" })]);
    expect(s.rounds[0].issues).toContain("RATE_MISMATCH"); expect(s.derivedAnnual.rate).toBeNull();
  });
  it("only rounds for presentation while preserving exact rate", () => {
    const r = { numerator: "133", denominator: "4" };
    expect(value(formatRate(r, 1))).toBe("33.3"); expect(r).toEqual({ numerator: "133", denominator: "4" });
    expect(value(formatRate(null, 1))).toBeNull();
  });
});

describe("comparable percentage-point changes", () => {
  it("returns +5.0%p from40 to45, not+5% probability", () => {
    const result = value(compareStatistics(completeYear(2024, "40"), completeYear(2025, "45"), { continuityConfirmed: true }));
    expect(result).toMatchObject({ status: "comparable", delta: { numerator: "5", denominator: "1" }, formatted: "+5.0%p", unit: "percentage_point" });
  });
  it("returns a negative delta and canonical zero", () => {
    expect(value(compareStatistics(completeYear(2024, "45"), completeYear(2025, "40"), { continuityConfirmed: true })).formatted).toBe("-5.0%p");
    expect(value(compareStatistics(completeYear(2024, "45"), completeYear(2025, "45"), { continuityConfirmed: true })).formatted).toBe("0.0%p");
  });
  it("withholds unknown continuity", () => expect(value(compareStatistics(completeYear(2024, "40"), completeYear(2025, "45"), { continuityConfirmed: false })).reason).toBe("CONTINUITY_UNCONFIRMED"));
  it("withholds different populations and non-adjacent years", () => {
    const a = completeYear(2024, "40"), b = completeYear(2025, "45");
    const otherGroup = { ...b.group, population: "different" };
    const other = summarize([record("1", "100", "45", { group: otherGroup })], { group: otherGroup, coverage: { expectedRounds: ["1"], confirmed: true } });
    const laterGroup = { ...b.group, year: 2026 };
    const later = summarize([record("1", "100", "45", { group: laterGroup })], { group: laterGroup, referenceYear: 2027, coverage: { expectedRounds: ["1"], confirmed: true } });
    expect(value(compareStatistics(a, other, { continuityConfirmed: true })).reason).toBe("GROUP_MISMATCH");
    expect(value(compareStatistics(a, later, { continuityConfirmed: true })).reason).toBe("YEAR_GAP");
  });
  it("withholds current or incomplete annual coverage", () => {
    const previous = completeYear(2024, "40");
    const currentYear = summarize([record("1", "100", "45")], { referenceYear: 2025, coverage: { expectedRounds: ["1"], confirmed: true } });
    expect(value(compareStatistics(previous, currentYear, { continuityConfirmed: true })).reason).toBe("INCOMPLETE_YEAR");
    expect(value(compareStatistics(previous, completeYear(2025, "45", ["1", "2"]), { continuityConfirmed: true })).reason).toBe("INCOMPLETE_YEAR");
  });
  it("requires exactly matching completed round coverage", () => {
    const a = completeYear(2024, "40"), g = { ...group, year: 2025 };
    const b = summarize([record("1", "100", "45", { group: g }), record("2", "100", "45", { group: g })], { group: g });
    expect(value(compareStatistics(a, b, { continuityConfirmed: true })).reason).toBe("COVERAGE_MISMATCH");
  });
  it("supports an explicitly selected official annual series without mixing rounds", () => {
    const oldGroup = { ...group, year: 2024 };
    const a = summarize([record(null, "100", "40", { group: oldGroup })], { group: oldGroup });
    const b = summarize([record(null, "100", "45")]);
    const delta = value(compareStatistics(a, b, { continuityConfirmed: true, series: "official_annual" }));
    expect(delta.formatted).toBe("+5.0%p"); expect(delta.series).toBe("official_annual");
  });
});

describe("typed boundaries and deterministic properties", () => {
  it.each([null, [], {}, { group }, { group, records: pair(), referenceYear: 2026, coverage: null },
    { group, records: pair(), referenceYear: 2026, coverage: { expectedRounds: null, confirmed: true } },
    { group, records: pair(), referenceYear: 2026, coverage: { expectedRounds: ["1", "1"], confirmed: true } },
  ])("returns field errors without echoing bad input %#", input => {
    const result = summarizeStatistics(input); expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors[0]).toHaveProperty("field");
  });
  it.each(["1.5", "NaN", "Infinity", "01", "-0", "9223372036854775808", 10, undefined])("rejects noncanonical/out-of-range count %s", count => {
    expect(summarizeStatistics({ group, records: [{ ...record(), examinees: count }], coverage: { expectedRounds: ["1"], confirmed: true }, referenceYear: 2026 }).ok).toBe(false);
  });
  it("rejects group mixing and bounded array overflow", () => {
    const other = { ...record(), group: { ...group, stage: "practical" } };
    expect(summarizeStatistics({ group, records: [other], coverage: { expectedRounds: ["1"], confirmed: true }, referenceYear: 2026 })).toMatchObject({ ok: false, code: "GROUP_MISMATCH" });
    expect(summarizeStatistics({ group, records: Array(10001).fill(record()), coverage: { expectedRounds: null, confirmed: false }, referenceYear: 2026 }).ok).toBe(false);
  });
  it("rejects sparse coverage and forged completion flags", () => {
    const sparseRounds = ["1", "2"]; sparseRounds.length = 3;
    expect(summarizeStatistics({ group, records: pair(), coverage: { expectedRounds: sparseRounds, confirmed: true }, referenceYear: 2026 }).ok).toBe(false);
    const a = completeYear(2024, "40"), b = completeYear(2025, "45");
    expect(compareStatistics(a, { ...b, referenceYear: 2025 }, { continuityConfirmed: true }).ok).toBe(false);
  });
  it("rejects forged derived counts/rates and official rows from another scope", () => {
    const a = completeYear(2024, "40"), b = completeYear(2025, "45");
    expect(compareStatistics(a, { ...b, derivedAnnual: { ...b.derivedAnnual, passed: "99" } }, { continuityConfirmed: true })).toMatchObject({ ok: false, code: "INVALID_COMPARISON" });
    expect(compareStatistics(a, { ...b, derivedAnnual: { ...b.derivedAnnual, rate: { numerator: "99", denominator: "1" } } }, { continuityConfirmed: true }).ok).toBe(false);
    const oldGroup = { ...group, year: 2024 };
    const oldOfficial = summarize([record(null, "100", "40", { group: oldGroup })], { group: oldGroup });
    const official = summarize([record(null, "100", "45")]);
    const invalid = { ...official, officialAnnual: [{ ...official.officialAnnual[0], group: oldGroup }] };
    expect(compareStatistics(oldOfficial, invalid, { continuityConfirmed: true, series: "official_annual" })).toMatchObject({ ok: false, code: "INVALID_COMPARISON" });
    expect(compareStatistics(oldOfficial, { ...official, officialAnnual: [{ ...official.officialAnnual[0], aggregationLevel: "round" }] }, { continuityConfirmed: true, series: "official_annual" }).ok).toBe(false);
  });
  it("accepts serialized summaries and emits only contracted primitive fields", () => {
    const a = completeYear(2024, "40"), b = completeYear(2025, "45");
    expect(value(compareStatistics(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), { continuityConfirmed: true })).formatted).toBe("+5.0%p");
    const extra: Record<string, unknown> = { bigint: 1n }; extra.circular = extra;
    const output = summarizeStatistics({ group: { ...group, extra }, records: [{ ...record(), extra }], referenceYear: 2026, coverage: { expectedRounds: ["1"], confirmed: true } });
    expect(() => JSON.stringify(output)).not.toThrow();
    if (output.ok) { expect(output.value.group).not.toHaveProperty("extra"); expect(output.value.rounds[0]).not.toHaveProperty("extra"); }
  });
  it.each([NaN, -1, 11, 1.5, "1"])("rejects display precision %s", precision => expect(formatRate({ numerator: "47", denominator: "1" }, precision).ok).toBe(false));
  it.each([{ numerator: "1", denominator: "0" }, { numerator: "-1", denominator: "1" }, { numerator: "101", denominator: "1" }, {}, undefined])("rejects malformed display rate %#", input => expect(formatRate(input).ok).toBe(false));
  it("has no ambient time, mutation or nonserializable bigint output", () => {
    const input = { group: Object.freeze({ ...group }), records: Object.freeze(pair().map(r => Object.freeze(r))), coverage: Object.freeze({ expectedRounds: Object.freeze(["1", "2"]), confirmed: true }), referenceYear: 2026 };
    const before = JSON.stringify(input);
    const first = summarizeStatistics(input), second = summarizeStatistics(input);
    expect(first).toEqual(second); expect(JSON.stringify(input)).toBe(before); expect(() => JSON.stringify(first)).not.toThrow();
  });
  it("maintains exact totals under deterministic generated cases", () => {
    for (let n = 1; n <= 50; n++) {
      const firstExam = BigInt(2 * n + 1), secondExam = BigInt(3 * n + 2);
      const s = summarize([record("1", firstExam.toString(), n.toString()), record("2", secondExam.toString(), (2 * n).toString())]);
      expect(s.derivedAnnual.examinees).toBe((5 * n + 3).toString()); expect(s.derivedAnnual.passed).toBe((3 * n).toString());
      const r = s.derivedAnnual.rate!;
      expect(BigInt(r.numerator) * BigInt(5 * n + 3)).toBe(300n * BigInt(n) * BigInt(r.denominator));
    }
  });
});
