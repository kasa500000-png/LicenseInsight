import { failure, success, type DomainResult, type DomainWarning } from "./result";

declare const localDateBrand: unique symbol;
declare const instantBrand: unique symbol;
export type LocalDate = string & { readonly [localDateBrand]: true };
export type Instant = string & { readonly [instantBrand]: true };
export type Clock = Readonly<{ now: string }>;
export type DateErrorCode = "INVALID_DATE" | "INVALID_INTEGER" | "DATE_OUT_OF_RANGE" | "INVALID_INSTANT" | "INVALID_CLOCK"
  | "INVALID_EVENT" | "INVALID_STAGE" | "INVALID_RANGE" | "EVIDENCE_REQUIRED" | "FUTURE_VALIDATION" | "INVALID_OPTIONS" | "DUPLICATE_EVENT";
type Result<T> = DomainResult<T, DateErrorCode>;
const MONTH_STARTS = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] as const;
const DAY_MICROSECONDS = 86_400_000_000n;
const HOUR_MICROSECONDS = 3_600_000_000n;
const isLeap = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
const daysInMonth = (year: number, month: number) => month === 2 ? isLeap(year) ? 29 : 28 : [4, 6, 9, 11].includes(month) ? 30 : 31;

export function parseLocalDate(value: unknown): Result<LocalDate> {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return failure("INVALID_DATE", "date");
  const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10));
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return failure("INVALID_DATE", "date");
  return success(value as LocalDate);
}

/** Gregorian ordinal, with 0001-01-01 = 1. No elapsed-time division. */
function ordinal(date: LocalDate): number {
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7)), day = Number(date.slice(8, 10));
  const previousYear = year - 1;
  return previousYear * 365 + Math.floor(previousYear / 4) - Math.floor(previousYear / 100) + Math.floor(previousYear / 400)
    + MONTH_STARTS[month] + (month > 2 && isLeap(year) ? 1 : 0) + day;
}
const EPOCH_ORDINAL = 719_163;
const MAX_ORDINAL = 3_652_059;
function fromOrdinal(value: number): LocalDate {
  let lower = 1, upper = 9999;
  while (lower < upper) {
    const middle = Math.ceil((lower + upper) / 2);
    const start = ordinal(`${String(middle).padStart(4, "0")}-01-01` as LocalDate);
    if (start <= value) lower = middle;
    else upper = middle - 1;
  }
  const year = lower;
  let remaining = value - ordinal(`${String(year).padStart(4, "0")}-01-01` as LocalDate) + 1;
  let month = 1;
  while (remaining > daysInMonth(year, month)) remaining -= daysInMonth(year, month++);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(remaining).padStart(2, "0")}` as LocalDate;
}

export function daysBetween(start: unknown, end: unknown): Result<number> {
  const a = parseLocalDate(start), b = parseLocalDate(end);
  if (!a.ok) return failure(a.code, "startDate");
  if (!b.ok) return failure(b.code, "endDate");
  return success(ordinal(b.value) - ordinal(a.value));
}
export function addDays(date: unknown, days: unknown): Result<LocalDate> {
  const parsed = parseLocalDate(date);
  if (!parsed.ok) return parsed;
  if (typeof days !== "number" || !Number.isSafeInteger(days)) return failure("INVALID_INTEGER", "days");
  const current = ordinal(parsed.value);
  if (days < 1 - current || days > MAX_ORDINAL - current) return failure("DATE_OUT_OF_RANGE", "days");
  return success(fromOrdinal(current + days));
}
/** ISO weekday: Monday=1, ..., Sunday=7. */
export function weekday(date: unknown): Result<1 | 2 | 3 | 4 | 5 | 6 | 7> {
  const parsed = parseLocalDate(date);
  if (!parsed.ok) return parsed;
  return success(((ordinal(parsed.value) - 1) % 7 + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
}

type ParsedInstant = { instant: Instant; microseconds: bigint };
function instantValue(value: unknown): ParsedInstant | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;
  const date = parseLocalDate(match[1]);
  const hour = Number(match[2]), minute = Number(match[3]), second = Number(match[4]);
  const offsetHours = Number(match[8] ?? 0), offsetMinutes = Number(match[9] ?? 0);
  if (!date.ok || hour > 23 || minute > 59 || second > 59 || offsetHours > 23 || offsetMinutes > 59) return null;
  // RFC3339 -00:00 means an unknown local offset, not a verified instant.
  if (match[6] === "-00:00") return null;
  const sign = match[7] === "-" ? -1 : 1;
  const offsetSeconds = sign * (offsetHours * 3600 + offsetMinutes * 60);
  return { instant: value as Instant,
    microseconds: BigInt(ordinal(date.value) - EPOCH_ORDINAL) * DAY_MICROSECONDS
      + BigInt(hour * 3600 + minute * 60 + second - offsetSeconds) * 1_000_000n
      + BigInt((match[5] ?? "").padEnd(6, "0")),
  };
}
export function parseInstant(value: unknown): Result<Instant> {
  const parsed = instantValue(value);
  return parsed ? success(parsed.instant) : failure("INVALID_INSTANT", "instant");
}
function clockValue(clock: unknown): ParsedInstant | null {
  if (!clock || typeof clock !== "object" || Array.isArray(clock)) return null;
  return instantValue((clock as Record<string, unknown>).now);
}
function floorDivide(value: bigint, divisor: bigint): bigint {
  const quotient = value / divisor;
  return value < 0n && value % divisor !== 0n ? quotient - 1n : quotient;
}
const seoulFormatter = new Intl.DateTimeFormat("en-US", {
  // Use Gregorian explicitly: ICU can omit era for the iso8601 formatter.
  timeZone: "Asia/Seoul", calendar: "gregory", numberingSystem: "latn", year: "numeric", month: "2-digit", day: "2-digit", era: "short",
});
function seoulDate(parsed: ParsedInstant): Result<LocalDate> {
  const parts = seoulFormatter.formatToParts(new Date(Number(floorDivide(parsed.microseconds, 1000n))));
  const year = parts.find(p => p.type === "year")?.value;
  if (parts.find(p => p.type === "era")?.value !== "AD" || !year || year.length > 4) return failure("DATE_OUT_OF_RANGE", "clock.now");
  return parseLocalDate(`${year.padStart(4, "0")}-${parts.find(p => p.type === "month")?.value}-${parts.find(p => p.type === "day")?.value}`);
}
export function todayInSeoul(clock: unknown): Result<LocalDate> {
  const parsed = clockValue(clock);
  return parsed ? seoulDate(parsed) : failure("INVALID_CLOCK", "clock.now");
}
export const seoulToday = todayInSeoul;
export function dDay(target: unknown, clock: unknown): Result<number> {
  const today = todayInSeoul(clock);
  return today.ok ? daysBetween(today.value, target) : today;
}

export type Stage = "written" | "practical";
export type ScheduleEventType = "registration" | "exam" | "result" | "document_submission";
export type ScheduleStatus = "announced" | "cancelled" | "unknown" | "not_announced";
export type ScheduleEvent = Readonly<{
  id: string; stage: Stage; eventType: ScheduleEventType; scheduleStatus: ScheduleStatus;
  verification: "verified" | "pending" | "review_required";
  lastValidatedAt: string | null; pendingChange: boolean;
  dateStart?: string | null; dateEnd?: string | null;
  startsAt?: string | null; endsAt?: string | null;
  temporalPrecision?: "date" | "datetime"; extent?: "single" | "range"; timezone?: "Asia/Seoul";
  statusEvidence?: Readonly<{ verified: boolean; reference: string }> | null;
  calendarExceptions?: "unknown" | "checked" | "exception";
}>;
export type SchedulePhase = "unknown" | "not_announced" | "cancelled" | "before" | "start_day" | "end_day" | "single_day" | "during" | "after";
export type ScheduleState = "UNKNOWN" | "NOT_ANNOUNCED" | "CANCELLED" | "UNVERIFIED" | "PENDING_CHANGE" | "STALE"
  | "UPCOMING" | "DATE_ONLY_START_DAY" | "DATE_ONLY_END_DAY" | "DATE_ONLY_SINGLE_DAY" | "DATE_ONLY_PERIOD" | "WITHIN_KNOWN_INTERVAL" | "ENDED";
export type ScheduleEvaluation = Readonly<{
  id: string; stage: Stage; eventType: ScheduleEventType; today: LocalDate;
  phase: SchedulePhase; state: ScheduleState;
  dataState: "fresh" | "stale" | "pending_change" | "unverified";
  dateStart: LocalDate | null; dateEnd: LocalDate | null;
  startsAt: Instant | null; endsAt: Instant | null;
  extent: "single" | "range" | null; temporalPrecision: "date" | "datetime" | null;
  countdown: Readonly<{ days: number; kind: "registration_start" | "exam_start" | "exam_period_start" | "result" | "document_submission" }> | null;
  currentRegistrationCandidate: boolean;
  nextActionEligible: boolean;
  registrationGuaranteed: false;
  personalExamDateConfirmed: false;
}>;
export type ScheduleOptions = Readonly<{ staleAfterHours?: number }>;
function plainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function nonempty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= 1000; }
function stageValue(value: unknown): value is Stage { return value === "written" || value === "practical"; }

/** Pure schedule facts/codes. Exact intervals are half-open [startsAt, endsAt). */
export function evaluateSchedule(event: unknown, clock: unknown, options: ScheduleOptions = {}): Result<ScheduleEvaluation> {
  const now = clockValue(clock), today = todayInSeoul(clock);
  if (!now || !today.ok) return failure("INVALID_CLOCK", "clock.now");
  if (!plainRecord(options) || options.staleAfterHours !== undefined &&
    (typeof options.staleAfterHours !== "number" || !Number.isSafeInteger(options.staleAfterHours) || options.staleAfterHours <= 0 || options.staleAfterHours > 8760)) return failure("INVALID_OPTIONS", "staleAfterHours");
  const staleHours = options.staleAfterHours ?? 48;
  if (!plainRecord(event) || !nonempty(event.id)) return failure("INVALID_EVENT", "event");
  if (!stageValue(event.stage)) return failure("INVALID_STAGE", "event.stage");
  if (!["registration", "exam", "result", "document_submission"].includes(event.eventType as string)
    || !["announced", "cancelled", "unknown", "not_announced"].includes(event.scheduleStatus as string)
    || !["verified", "pending", "review_required"].includes(event.verification as string)
    || typeof event.pendingChange !== "boolean") return failure("INVALID_EVENT", "event");
  const eventType = event.eventType as ScheduleEventType, scheduleStatus = event.scheduleStatus as ScheduleStatus;
  const warnings: DomainWarning[] = [];
  let dataState: ScheduleEvaluation["dataState"] = "fresh";
  let stale = false;
  if (event.lastValidatedAt === null) dataState = "unverified";
  else {
    const validated = instantValue(event.lastValidatedAt);
    if (!validated) return failure("INVALID_INSTANT", "event.lastValidatedAt");
    if (validated.microseconds > now.microseconds) return failure("FUTURE_VALIDATION", "event.lastValidatedAt");
    if (now.microseconds - validated.microseconds > BigInt(staleHours) * HOUR_MICROSECONDS) { dataState = "stale"; stale = true; }
  }
  if (event.verification !== "verified") dataState = "unverified";
  if (event.pendingChange) dataState = "pending_change";
  if (event.pendingChange) warnings.push({ code: "PENDING_CHANGE" });
  if (stale) warnings.push({ code: "STALE_DATA" });
  if (event.verification !== "verified" || event.lastValidatedAt === null) warnings.push({ code: "UNVERIFIED_DATA" });
  const base: ScheduleEvaluation = { id: event.id, stage: event.stage, eventType, today: today.value,
    phase: "unknown", state: "UNKNOWN", dataState, dateStart: null, dateEnd: null, startsAt: null, endsAt: null,
    extent: null, temporalPrecision: null, countdown: null, currentRegistrationCandidate: false,
    nextActionEligible: false, registrationGuaranteed: false, personalExamDateConfirmed: false };
  if (scheduleStatus === "unknown") return success(base, [...warnings, { code: "SCHEDULE_UNCONFIRMED" }]);
  if (scheduleStatus === "cancelled" || scheduleStatus === "not_announced") {
    const evidence = event.statusEvidence;
    if (!plainRecord(evidence) || evidence.verified !== true || !nonempty(evidence.reference)) return failure("EVIDENCE_REQUIRED", "event.statusEvidence");
    return success({ ...base, phase: scheduleStatus, state: scheduleStatus === "cancelled" ? "CANCELLED" : "NOT_ANNOUNCED" },
      [...warnings, { code: scheduleStatus === "cancelled" ? "OFFICIAL_CANCELLATION_EVIDENCE" : "OFFICIAL_NOT_ANNOUNCED_EVIDENCE" }]);
  }
  const start = parseLocalDate(event.dateStart), end = parseLocalDate(event.dateEnd);
  if (!start.ok) return failure("INVALID_DATE", "event.dateStart");
  if (!end.ok) return failure("INVALID_DATE", "event.dateEnd");
  if (event.temporalPrecision !== "date" && event.temporalPrecision !== "datetime" || event.extent !== "single" && event.extent !== "range"
    || event.timezone !== "Asia/Seoul") return failure("INVALID_EVENT", "event.temporalPrecision");
  if (end.value < start.value || event.extent === "single" && start.value !== end.value) return failure("INVALID_RANGE", "event.dateEnd");
  let phase: SchedulePhase, startsAt: Instant | null = null, endsAt: Instant | null = null;
  if (event.temporalPrecision === "date") {
    if (event.startsAt != null || event.endsAt != null) return failure("INVALID_EVENT", "event.startsAt");
    if (today.value < start.value) phase = "before";
    else if (today.value > end.value) phase = "after";
    else if (start.value === end.value) phase = "single_day";
    else if (today.value === start.value) phase = "start_day";
    else if (today.value === end.value) phase = "end_day";
    else phase = "during";
  } else {
    const from = instantValue(event.startsAt), until = instantValue(event.endsAt);
    if (!from) return failure("INVALID_INSTANT", "event.startsAt");
    if (!until) return failure("INVALID_INSTANT", "event.endsAt");
    const fromDate = seoulDate(from), untilDate = seoulDate(until);
    if (!fromDate.ok || !untilDate.ok || fromDate.value !== start.value || untilDate.value !== end.value || until.microseconds < from.microseconds) return failure("INVALID_RANGE", "event.endsAt");
    startsAt = from.instant; endsAt = until.instant;
    phase = now.microseconds < from.microseconds ? "before" : now.microseconds >= until.microseconds ? "after" : "during";
  }
  if (eventType === "registration") {
    if (event.calendarExceptions !== undefined && !["unknown", "checked", "exception"].includes(event.calendarExceptions as string)) return failure("INVALID_EVENT", "event.calendarExceptions");
    if (event.temporalPrecision === "date") warnings.push({ code: "OFFICIAL_TIME_REQUIRED" });
    warnings.push({ code: event.calendarExceptions === "exception" ? "OFFICIAL_EXCEPTION_REQUIRES_CHECK" : "HOLIDAYS_AND_EXCEPTIONS_REQUIRE_CHECK" }, { code: "PERSONAL_ELIGIBILITY_REQUIRES_CHECK" });
  }
  if (eventType === "exam" && event.extent === "range") warnings.push({ code: "PERSONAL_EXAM_DATE_UNCONFIRMED" });
  let state: ScheduleState = phase === "before" ? "UPCOMING" : phase === "after" ? "ENDED"
    : event.temporalPrecision === "datetime" ? "WITHIN_KNOWN_INTERVAL"
      : phase === "start_day" ? "DATE_ONLY_START_DAY" : phase === "end_day" ? "DATE_ONLY_END_DAY"
        : phase === "single_day" ? "DATE_ONLY_SINGLE_DAY" : "DATE_ONLY_PERIOD";
  if (dataState !== "fresh") state = dataState === "pending_change" ? "PENDING_CHANGE" : dataState === "stale" ? "STALE" : "UNVERIFIED";
  const exceptionBlocked = eventType === "registration" && event.calendarExceptions === "exception";
  const currentRegistrationCandidate = dataState === "fresh" && !exceptionBlocked && eventType === "registration" && phase !== "before" && phase !== "after";
  const days = ordinal(start.value) - ordinal(today.value);
  const kind = eventType === "registration" ? "registration_start" : eventType === "exam" ? event.extent === "range" ? "exam_period_start" : "exam_start" : eventType;
  return success({ ...base, phase, state, dateStart: start.value, dateEnd: end.value, startsAt, endsAt,
    extent: event.extent, temporalPrecision: event.temporalPrecision,
    countdown: dataState === "fresh" && phase === "before" ? { days, kind } : null,
    currentRegistrationCandidate, nextActionEligible: dataState === "fresh" && !exceptionBlocked && (currentRegistrationCandidate || phase === "before") }, warnings);
}

export type PlanTargetSuggestion = Readonly<{
  sourceEventId: string;
  stage: Stage;
  targetDate: LocalDate;
  basis: "exam_period_start" | "exam_date";
  personalExamDateConfirmed: false;
  userMayChange: true;
  targetIsPast: boolean;
}>;

/** A period's first date is a suggested study goal, never a personal appointment. */
export function suggestPlanTarget(event: unknown, clock: unknown, options: ScheduleOptions = {}): Result<PlanTargetSuggestion | null> {
  const evaluated = evaluateSchedule(event, clock, options);
  if (!evaluated.ok) return evaluated;
  const schedule = evaluated.value;
  if (schedule.eventType !== "exam" || schedule.dataState !== "fresh" || schedule.dateStart === null) return success(null, evaluated.warnings);
  const targetIsPast = schedule.dateStart < schedule.today;
  const suggestion: PlanTargetSuggestion = {
    sourceEventId: schedule.id, stage: schedule.stage, targetDate: schedule.dateStart,
    basis: schedule.extent === "range" ? "exam_period_start" : "exam_date",
    personalExamDateConfirmed: false, userMayChange: true, targetIsPast,
  };
  return success(suggestion, targetIsPast ? [...evaluated.warnings, { code: "TARGET_DATE_PAST", field: "targetDate" }] : evaluated.warnings);
}

/** Stage-specific next-action candidate, never a claim that registration succeeds. */
export function selectNextEvent(events: unknown, stage: unknown, clock: unknown, options: ScheduleOptions = {}): Result<ScheduleEvaluation | null> {
  if (!stageValue(stage)) return failure("INVALID_STAGE", "stage");
  if (!Array.isArray(events) || events.length > 1000) return failure("INVALID_EVENT", "events");
  if (!todayInSeoul(clock).ok) return failure("INVALID_CLOCK", "clock.now");
  if (!plainRecord(options) || options.staleAfterHours !== undefined &&
    (typeof options.staleAfterHours !== "number" || !Number.isSafeInteger(options.staleAfterHours) || options.staleAfterHours <= 0 || options.staleAfterHours > 8760)) return failure("INVALID_OPTIONS", "staleAfterHours");
  const candidates: { evaluation: ScheduleEvaluation; warnings: readonly DomainWarning[] }[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < events.length; index++) {
    const input = events[index];
    if (!plainRecord(input) || !stageValue(input.stage) || !nonempty(input.id)) return failure("INVALID_EVENT", `events.${index}`);
    if (seen.has(input.id)) return failure("DUPLICATE_EVENT", `events.${index}.id`);
    seen.add(input.id);
    if (input.stage !== stage) continue;
    const result = evaluateSchedule(input, clock, options);
    if (!result.ok) return { ...result, fieldErrors: result.fieldErrors.map(error => ({ ...error, field: `events.${index}.${error.field}` })) };
    if (result.value.nextActionEligible) candidates.push({ evaluation: result.value, warnings: result.warnings });
  }
  candidates.sort((a, b) => {
    const x = a.evaluation, y = b.evaluation;
    if (x.currentRegistrationCandidate !== y.currentRegistrationCandidate) return x.currentRegistrationCandidate ? -1 : 1;
    if (x.dateStart !== y.dateStart) return x.dateStart! < y.dateStart! ? -1 : 1;
    // Unknown times require confirmation; this explicit tie rule is not a claim
    // of chronology and keeps the comparator transitive for mixed precision.
    if (x.temporalPrecision !== y.temporalPrecision) return x.temporalPrecision === "date" ? -1 : 1;
    if (x.startsAt && y.startsAt) {
      const xi = instantValue(x.startsAt)!.microseconds, yi = instantValue(y.startsAt)!.microseconds;
      if (xi !== yi) return xi < yi ? -1 : 1;
    }
    // Unknown times are not replaced with invented midnight timestamps.
    return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
  return candidates.length ? success(candidates[0].evaluation, candidates[0].warnings) : success(null);
}
