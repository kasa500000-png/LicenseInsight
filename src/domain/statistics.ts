import { failure, success, type DomainResult, type DomainWarning } from "./result";

export type StatisticsErrorCode = "INVALID_INPUT" | "INVALID_GROUP" | "GROUP_MISMATCH" | "INVALID_RECORD" | "INVALID_COVERAGE" | "INVALID_RATE" | "INVALID_PRECISION" | "INVALID_COMPARISON";
export type StatisticsGroup = Readonly<{
  qualificationId: string; acquisitionTrack: string; stage: "written" | "practical"; year: number; population: string;
}>;
export type StatisticRecord = Readonly<{
  group: StatisticsGroup;
  sourceId: string; logicalKey: string; revision: string;
  aggregationLevel: "round" | "official_annual"; round: string | null;
  examinees: string | null; passed: string | null;
  publishedRate: string | null; sourceRateText: string | null; sourcePrecision: number | null;
  roundingMethod: "half_up" | "truncate" | "unknown";
  verification: "verified" | "pending" | "review_required";
  completeness: "complete" | "partial" | "unknown";
}>;
/** Exact percentage rational, not a probability and not a rounded display value. */
export type ExactRate = Readonly<{ numerator: string; denominator: string }>;
export type StatisticIssue = "NEGATIVE_COUNT" | "PASSED_EXCEEDS_EXAMINEES" | "MISSING_COUNT" | "ZERO_DENOMINATOR" | "SOURCE_IDENTITY_CONFLICT" | "NATURAL_KEY_CONFLICT" | "ROUNDING_EVIDENCE_REQUIRED" | "RATE_MISMATCH" | "SOURCE_NOT_VERIFIED" | "FUTURE_YEAR";
export type StatisticRow = StatisticRecord & Readonly<{
  calculatedRate: ExactRate | null;
  rateVerification: "not_provided" | "verified" | "review_required" | "unverifiable";
  effectiveVerification: "verified" | "pending" | "review_required";
  issues: readonly StatisticIssue[];
}>;
export type AnnualAggregate = Readonly<{
  kind: "derived_annual";
  examinees: string | null; passed: string | null; rate: ExactRate | null;
  rounds: readonly string[]; expectedRounds: readonly string[] | null; missingRounds: readonly string[] | null;
  completeness: "complete" | "partial" | "unknown";
  verification: "verified" | "pending" | "review_required";
  labelCode: "DERIVED_COMPLETE_YEAR" | "COLLECTED_ROUNDS";
  recordCount: number;
}>;
export type StatisticsSummary = Readonly<{
  group: StatisticsGroup;
  referenceYear: number;
  completedYear: boolean;
  coverageConfirmed: boolean;
  rounds: readonly StatisticRow[];
  /** Official totals remain separate. They are never added to round counts. */
  officialAnnual: readonly StatisticRow[];
  derivedAnnual: AnnualAggregate;
  duplicateCount: number;
  reviewRequired: boolean;
}>;
export type SummarizeStatisticsInput = Readonly<{
  group: StatisticsGroup; records: readonly StatisticRecord[];
  coverage: Readonly<{ expectedRounds: readonly string[] | null; confirmed: boolean }>;
  /** Explicit Seoul calendar year supplied by the caller; no ambient clock. */
  referenceYear: number;
}>;
export type StatisticsComparison = Readonly<{
  status: "comparable" | "withheld";
  reason: "CONTINUITY_UNCONFIRMED" | "GROUP_MISMATCH" | "YEAR_GAP" | "INCOMPLETE_YEAR" | "COVERAGE_MISMATCH" | "REVIEW_REQUIRED" | "RATE_UNAVAILABLE" | "OFFICIAL_TOTAL_AMBIGUOUS" | null;
  series: "derived" | "official_annual";
  delta: ExactRate | null;
  formatted: string | null;
  unit: "percentage_point";
}>;

const MAX_RECORDS = 10_000;
const MAX_COUNT = 9223372036854775807n;
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value: unknown, max = 256): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const isYear = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= 9999;
const ordinal = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

function validGroup(value: unknown): value is StatisticsGroup {
  return isObject(value) && isText(value.qualificationId) && isText(value.acquisitionTrack) && isText(value.population)
    && (value.stage === "written" || value.stage === "practical") && isYear(value.year);
}
function sameGroup(a: StatisticsGroup, b: StatisticsGroup, includeYear = true): boolean {
  return a.qualificationId === b.qualificationId && a.acquisitionTrack === b.acquisitionTrack && a.stage === b.stage
    && a.population === b.population && (!includeYear || a.year === b.year);
}
function copyGroup(group: StatisticsGroup): StatisticsGroup {
  return { qualificationId: group.qualificationId, acquisitionTrack: group.acquisitionTrack,
    stage: group.stage, year: group.year, population: group.population };
}
function copyRecord(record: StatisticRecord): StatisticRecord {
  return { group: copyGroup(record.group), sourceId: record.sourceId, logicalKey: record.logicalKey, revision: record.revision,
    aggregationLevel: record.aggregationLevel, round: record.round, examinees: record.examinees, passed: record.passed,
    publishedRate: record.publishedRate, sourceRateText: record.sourceRateText, sourcePrecision: record.sourcePrecision,
    roundingMethod: record.roundingMethod, verification: record.verification, completeness: record.completeness };
}
function countValue(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || value === "-0" || value.length > 20 || !/^-?(0|[1-9]\d*)$/.test(value)) return false;
  const n = BigInt(value);
  return n >= -MAX_COUNT - 1n && n <= MAX_COUNT;
}
function decimalValue(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || value.length > 14 || !/^(0|[1-9]\d*)(?:\.\d{1,10})?$/.test(value)) return false;
  const [whole, fractional = ""] = value.split(".");
  return BigInt(whole + fractional) <= 100n * 10n ** BigInt(fractional.length);
}
function validRecord(value: unknown): value is StatisticRecord {
  if (!isObject(value) || !validGroup(value.group) || !isText(value.sourceId) || !isText(value.logicalKey, 1024) || !isText(value.revision)) return false;
  if (value.aggregationLevel !== "round" && value.aggregationLevel !== "official_annual") return false;
  if (value.aggregationLevel === "round" ? !isText(value.round) : value.round !== null) return false;
  return countValue(value.examinees) && countValue(value.passed) && decimalValue(value.publishedRate)
    && (value.sourceRateText === null || typeof value.sourceRateText === "string" && value.sourceRateText.length <= 128)
    && (value.sourcePrecision === null || typeof value.sourcePrecision === "number" && Number.isInteger(value.sourcePrecision) && value.sourcePrecision >= 0 && value.sourcePrecision <= 10)
    && ["half_up", "truncate", "unknown"].includes(value.roundingMethod as string)
    && ["verified", "pending", "review_required"].includes(value.verification as string)
    && ["complete", "partial", "unknown"].includes(value.completeness as string);
}
function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a, y = b;
  while (y !== 0n) { const remainder = x % y; x = y; y = remainder; }
  return x || 1n;
}
function rational(numerator: bigint, denominator: bigint): ExactRate {
  const divisor = gcd(numerator, denominator);
  return { numerator: (numerator / divisor).toString(), denominator: (denominator / divisor).toString() };
}
function parseFraction(value: unknown, signed = false): { n: bigint; d: bigint } | null {
  if (!isObject(value) || typeof value.numerator !== "string" || typeof value.denominator !== "string"
    || value.numerator.length > 128 || value.denominator.length > 128
    || !(signed ? /^-?(0|[1-9]\d*)$/ : /^(0|[1-9]\d*)$/).test(value.numerator)
    || !/^[1-9]\d*$/.test(value.denominator)) return null;
  const n = BigInt(value.numerator), d = BigInt(value.denominator);
  if (n > 100n * d || n < (signed ? -100n * d : 0n)) return null;
  return { n, d };
}
function render(n: bigint, d: bigint, precision: number): string {
  const absolute = n < 0n ? -n : n;
  const factor = 10n ** BigInt(precision);
  let scaled = absolute * factor / d;
  if (absolute * factor % d * 2n >= d) scaled++;
  const sign = n < 0n && scaled !== 0n ? "-" : "";
  if (precision === 0) return sign + scaled.toString();
  const digits = scaled.toString().padStart(precision + 1, "0");
  return `${sign}${digits.slice(0, -precision)}.${digits.slice(-precision)}`;
}

/** Display only: exact calculations remain in the returned rational. */
export function formatRate(rate: unknown, precision: unknown = 1): DomainResult<string | null, StatisticsErrorCode> {
  if (typeof precision !== "number" || !Number.isInteger(precision) || precision < 0 || precision > 10) return failure("INVALID_PRECISION", "precision");
  if (rate === null) return success(null);
  const fraction = parseFraction(rate);
  return fraction ? success(render(fraction.n, fraction.d, precision)) : failure("INVALID_RATE", "rate");
}

function inspect(record: StatisticRecord, future: boolean): StatisticRow {
  const issues: StatisticIssue[] = [];
  const examinees = record.examinees === null ? null : BigInt(record.examinees);
  const passed = record.passed === null ? null : BigInt(record.passed);
  if (examinees !== null && examinees < 0n || passed !== null && passed < 0n) issues.push("NEGATIVE_COUNT");
  if (examinees !== null && passed !== null && passed > examinees) issues.push("PASSED_EXCEEDS_EXAMINEES");
  if (examinees === null || passed === null) issues.push("MISSING_COUNT");
  if (examinees === 0n) issues.push("ZERO_DENOMINATOR");
  if (record.verification !== "verified") issues.push("SOURCE_NOT_VERIFIED");
  if (future) issues.push("FUTURE_YEAR");
  const validCounts = examinees !== null && passed !== null && examinees > 0n && passed >= 0n && passed <= examinees;
  const calculatedRate = validCounts ? rational(passed * 100n, examinees) : null;
  let rateVerification: StatisticRow["rateVerification"] = "not_provided";
  if (record.publishedRate !== null) {
    if (record.roundingMethod === "unknown" || record.sourcePrecision === null) {
      issues.push("ROUNDING_EVIDENCE_REQUIRED"); rateVerification = "review_required";
    } else if (!validCounts) rateVerification = "unverifiable";
    else {
      // Compare the precise published decimal with the exact result of the
      // explicitly confirmed rounding rule. No arbitrary epsilon is added.
      const [whole, fractional = ""] = record.publishedRate.split(".");
      const publishedScale = 10n ** BigInt(fractional.length);
      const publishedInteger = BigInt(whole + fractional);
      const factor = 10n ** BigInt(record.sourcePrecision);
      let expected = passed * 100n * factor / examinees;
      if (record.roundingMethod === "half_up" && passed * 100n * factor % examinees * 2n >= examinees) expected++;
      if (publishedInteger * factor === expected * publishedScale) rateVerification = "verified";
      else { issues.push("RATE_MISMATCH"); rateVerification = "review_required"; }
    }
  }
  const review = issues.some(i => ["NEGATIVE_COUNT", "PASSED_EXCEEDS_EXAMINEES", "ROUNDING_EVIDENCE_REQUIRED", "RATE_MISMATCH", "FUTURE_YEAR"].includes(i)) || record.verification === "review_required";
  return { ...copyRecord(record), calculatedRate, rateVerification,
    effectiveVerification: review ? "review_required" : record.verification, issues };
}
function fingerprint(record: StatisticRecord): string {
  return JSON.stringify([record.sourceId, record.logicalKey, record.revision, record.aggregationLevel, record.round,
    record.examinees, record.passed, record.publishedRate, record.sourceRateText, record.sourcePrecision,
    record.roundingMethod, record.verification, record.completeness]);
}
function appendIssue(row: StatisticRow, issue: StatisticIssue): StatisticRow {
  return row.issues.includes(issue) ? row : { ...row, effectiveVerification: "review_required", issues: [...row.issues, issue] };
}

export function summarizeStatistics(input: unknown): DomainResult<StatisticsSummary, StatisticsErrorCode> {
  if (!isObject(input)) return failure("INVALID_INPUT", "statistics");
  if (!validGroup(input.group)) return failure("INVALID_GROUP", "group");
  const group = copyGroup(input.group);
  if (!isYear(input.referenceYear)) return failure("INVALID_INPUT", "referenceYear");
  const referenceYear = input.referenceYear;
  if (!Array.isArray(input.records) || input.records.length > MAX_RECORDS) return failure("INVALID_INPUT", "records");
  if (!isObject(input.coverage) || typeof input.coverage.confirmed !== "boolean") return failure("INVALID_COVERAGE", "coverage");
  const coverage = input.coverage;
  const coverageConfirmed = coverage.confirmed === true;
  if (coverage.expectedRounds !== null && (!Array.isArray(coverage.expectedRounds) || coverage.expectedRounds.length > 1000
    || [...coverage.expectedRounds].some(r => !isText(r)) || new Set(coverage.expectedRounds).size !== coverage.expectedRounds.length)) return failure("INVALID_COVERAGE", "coverage.expectedRounds");
  if (coverage.confirmed && (!Array.isArray(coverage.expectedRounds) || coverage.expectedRounds.length === 0)) return failure("INVALID_COVERAGE", "coverage.expectedRounds");
  const expectedRounds: string[] | null = coverage.expectedRounds === null ? null : [...coverage.expectedRounds] as string[];
  expectedRounds?.sort(ordinal);
  const exact = new Set<string>();
  let duplicateCount = 0;
  let rows: StatisticRow[] = [];
  for (let i = 0; i < input.records.length; i++) {
    const record: unknown = input.records[i];
    if (!validRecord(record)) return failure("INVALID_RECORD", `records.${i}`);
    if (!sameGroup(record.group, group)) return failure("GROUP_MISMATCH", `records.${i}.group`);
    const key = fingerprint(record);
    if (exact.has(key)) { duplicateCount++; continue; }
    exact.add(key);
    rows.push(inspect(record, group.year > referenceYear));
  }
  const identities = new Map<string, number[]>(), naturalKeys = new Map<string, number[]>();
  rows.forEach((row, i) => {
    const identity = JSON.stringify([row.sourceId, row.logicalKey]);
    const identityRows = identities.get(identity) ?? [];
    identityRows.push(i); identities.set(identity, identityRows);
    const natural = JSON.stringify([row.aggregationLevel, row.round]);
    const naturalRows = naturalKeys.get(natural) ?? [];
    naturalRows.push(i); naturalKeys.set(natural, naturalRows);
  });
  for (const indices of identities.values()) if (indices.length > 1) for (const i of indices) rows[i] = appendIssue(rows[i], "SOURCE_IDENTITY_CONFLICT");
  for (const indices of naturalKeys.values()) if (indices.length > 1) for (const i of indices) rows[i] = appendIssue(rows[i], "NATURAL_KEY_CONFLICT");
  rows = rows.sort((a, b) => ordinal(JSON.stringify([a.aggregationLevel, a.round, a.sourceId, a.logicalKey, a.revision]), JSON.stringify([b.aggregationLevel, b.round, b.sourceId, b.logicalKey, b.revision])));
  const rounds = rows.filter(r => r.aggregationLevel === "round");
  const officialAnnual = rows.filter(r => r.aggregationLevel === "official_annual");
  const roundNames = [...new Set(rounds.map(r => r.round!))].sort(ordinal);
  const missingRounds = expectedRounds === null ? null : expectedRounds.filter(r => !roundNames.includes(r));
  const unexpected = expectedRounds !== null && coverageConfirmed && roundNames.some(r => !expectedRounds.includes(r));
  const conflicts = rounds.some(r => r.issues.includes("SOURCE_IDENTITY_CONFLICT") || r.issues.includes("NATURAL_KEY_CONFLICT"));
  const badCounts = rounds.some(r => r.issues.includes("NEGATIVE_COUNT") || r.issues.includes("PASSED_EXCEEDS_EXAMINEES"));
  const total = (key: "examinees" | "passed"): string | null => rounds.length === 0 || conflicts || badCounts || rounds.some(r => r[key] === null)
    ? null : rounds.reduce((sum, r) => sum + BigInt(r[key]!), 0n).toString();
  const examinees = total("examinees"), passed = total("passed");
  const reviewRequired = rows.some(r => r.effectiveVerification === "review_required") || unexpected;
  const roundReview = rounds.some(r => r.effectiveVerification === "review_required") || unexpected;
  const pending = rounds.some(r => r.effectiveVerification === "pending");
  const rate = !roundReview && !pending && examinees !== null && passed !== null && BigInt(examinees) > 0n
    ? rational(BigInt(passed) * 100n, BigInt(examinees)) : null;
  const completedYear = group.year < referenceYear;
  const complete = completedYear && coverageConfirmed && expectedRounds !== null && missingRounds?.length === 0 && !unexpected
    && rounds.length > 0 && examinees !== null && passed !== null && !roundReview && !pending && rounds.every(r => r.completeness === "complete");
  const warnings: DomainWarning[] = [];
  if (duplicateCount) warnings.push({ code: "EXACT_DUPLICATES_REMOVED", field: "records" });
  if (reviewRequired) warnings.push({ code: "REVIEW_REQUIRED", field: "records" });
  if (!completedYear) warnings.push({ code: group.year > referenceYear ? "FUTURE_YEAR" : "CURRENT_YEAR_PARTIAL", field: "group.year" });
  if (!complete) warnings.push({ code: "COLLECTED_ROUNDS_ONLY", field: "coverage" });
  if (unexpected) warnings.push({ code: "UNEXPECTED_ROUND", field: "coverage.expectedRounds" });
  return success({ group, referenceYear, completedYear, coverageConfirmed, rounds, officialAnnual,
    derivedAnnual: { kind: "derived_annual", examinees, passed, rate, rounds: roundNames, expectedRounds, missingRounds,
      completeness: complete ? "complete" : coverageConfirmed || !completedYear || rounds.length > 0 ? "partial" : "unknown",
      verification: roundReview ? "review_required" : pending ? "pending" : "verified",
      labelCode: complete ? "DERIVED_COMPLETE_YEAR" : "COLLECTED_ROUNDS", recordCount: rounds.length },
    duplicateCount, reviewRequired }, warnings);
}

function sameStrings(value: unknown, expected: readonly string[] | null): boolean {
  if (expected === null) return value === null;
  return Array.isArray(value) && value.length === expected.length && expected.every((item, index) => value[index] === item);
}
function sameRate(value: unknown, expected: ExactRate | null): boolean {
  return expected === null ? value === null : isObject(value) && value.numerator === expected.numerator && value.denominator === expected.denominator;
}
/** Recheck serialized summaries before using their computed fields for a comparison. */
function checkedSummary(value: unknown): StatisticsSummary | null {
  if (!isObject(value) || !validGroup(value.group) || !isYear(value.referenceYear) || typeof value.coverageConfirmed !== "boolean"
    || !isObject(value.derivedAnnual) || !Array.isArray(value.rounds) || !Array.isArray(value.officialAnnual)
    || value.rounds.length + value.officialAnnual.length > MAX_RECORDS
    || typeof value.duplicateCount !== "number" || !Number.isInteger(value.duplicateCount) || value.duplicateCount < 0 || value.duplicateCount > MAX_RECORDS) return null;
  const records: unknown[] = [...value.rounds, ...value.officialAnnual];
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    if (!validRecord(row) || row.aggregationLevel !== (i < value.rounds.length ? "round" : "official_annual")) return null;
  }
  const rebuilt = summarizeStatistics({ group: value.group, records, referenceYear: value.referenceYear,
    coverage: { expectedRounds: value.derivedAnnual.expectedRounds, confirmed: value.coverageConfirmed } });
  if (!rebuilt.ok) return null;
  const expected = rebuilt.value;
  const actual = value.derivedAnnual, derived = expected.derivedAnnual;
  if (value.completedYear !== expected.completedYear || value.reviewRequired !== expected.reviewRequired
    || actual.kind !== derived.kind || actual.examinees !== derived.examinees || actual.passed !== derived.passed
    || !sameRate(actual.rate, derived.rate) || !sameStrings(actual.rounds, derived.rounds)
    || !sameStrings(actual.expectedRounds, derived.expectedRounds) || !sameStrings(actual.missingRounds, derived.missingRounds)
    || actual.completeness !== derived.completeness || actual.verification !== derived.verification
    || actual.labelCode !== derived.labelCode || actual.recordCount !== derived.recordCount
    || value.rounds.length !== expected.rounds.length || value.officialAnnual.length !== expected.officialAnnual.length) return null;
  const expectedRows = [...expected.rounds, ...expected.officialAnnual];
  for (let i = 0; i < records.length; i++) {
    const actualRow = records[i] as StatisticRow, expectedRow = expectedRows[i];
    if (!sameGroup(actualRow.group, expectedRow.group) || fingerprint(actualRow) !== fingerprint(expectedRow)
      || !sameRate(actualRow.calculatedRate, expectedRow.calculatedRate) || actualRow.rateVerification !== expectedRow.rateVerification
      || actualRow.effectiveVerification !== expectedRow.effectiveVerification || !sameStrings(actualRow.issues, expectedRow.issues)) return null;
  }
  return expected;
}

export function compareStatistics(previousInput: unknown, currentInput: unknown, options: unknown): DomainResult<StatisticsComparison, StatisticsErrorCode> {
  const previous = checkedSummary(previousInput), current = checkedSummary(currentInput);
  if (!previous || !current || !isObject(options) || typeof options.continuityConfirmed !== "boolean") return failure("INVALID_COMPARISON", "comparison");
  const series = options.series ?? "derived";
  const precision = options.precision ?? 1;
  if (series !== "derived" && series !== "official_annual") return failure("INVALID_COMPARISON", "series");
  if (typeof precision !== "number" || !Number.isInteger(precision) || precision < 0 || precision > 10) return failure("INVALID_PRECISION", "precision");
  const withheld = (reason: NonNullable<StatisticsComparison["reason"]>): DomainResult<StatisticsComparison, StatisticsErrorCode> => success({
    status: "withheld", reason, series, delta: null, formatted: null, unit: "percentage_point",
  });
  if (!sameGroup(previous.group, current.group, false)) return withheld("GROUP_MISMATCH");
  if (current.group.year !== previous.group.year + 1) return withheld("YEAR_GAP");
  if (!options.continuityConfirmed) return withheld("CONTINUITY_UNCONFIRMED");
  if (previous.completedYear !== true || current.completedYear !== true) return withheld("INCOMPLETE_YEAR");
  let before: unknown, after: unknown;
  if (series === "derived") {
    if (previous.derivedAnnual.completeness !== "complete" || current.derivedAnnual.completeness !== "complete") return withheld("INCOMPLETE_YEAR");
    if (previous.derivedAnnual.verification !== "verified" || current.derivedAnnual.verification !== "verified") return withheld("REVIEW_REQUIRED");
    const a = previous.derivedAnnual.expectedRounds, b = current.derivedAnnual.expectedRounds;
    if (!Array.isArray(a) || !Array.isArray(b) || a.length > 1000 || b.length > 1000 || [...a].some(r => !isText(r)) || [...b].some(r => !isText(r))) return failure("INVALID_COMPARISON", "coverage");
    if (JSON.stringify([...a].sort(ordinal)) !== JSON.stringify([...b].sort(ordinal))) return withheld("COVERAGE_MISMATCH");
    before = previous.derivedAnnual.rate; after = current.derivedAnnual.rate;
  } else {
    if (previous.officialAnnual.length !== 1 || current.officialAnnual.length !== 1) return withheld("OFFICIAL_TOTAL_AMBIGUOUS");
    const a: unknown = previous.officialAnnual[0], b: unknown = current.officialAnnual[0];
    if (!isObject(a) || !isObject(b)) return failure("INVALID_COMPARISON", "officialAnnual");
    if (a.completeness !== "complete" || b.completeness !== "complete") return withheld("INCOMPLETE_YEAR");
    if (a.effectiveVerification !== "verified" || b.effectiveVerification !== "verified") return withheld("REVIEW_REQUIRED");
    before = a.calculatedRate; after = b.calculatedRate;
  }
  if (before === null || after === null) return withheld("RATE_UNAVAILABLE");
  const a = parseFraction(before), b = parseFraction(after);
  if (!a || !b) return failure("INVALID_COMPARISON", "rate");
  const delta = rational(b.n * a.d - a.n * b.d, b.d * a.d);
  const n = BigInt(delta.numerator), d = BigInt(delta.denominator);
  const formatted = render(n, d, precision);
  return success({ status: "comparable", reason: null, series, delta,
    formatted: `${n > 0n && !/^0(?:\.0+)?$/.test(formatted) ? "+" : ""}${formatted}%p`, unit: "percentage_point" });
}
