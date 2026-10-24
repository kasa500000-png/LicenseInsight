import { describe, expect, it } from "vitest";
import {
  addDays, dDay, daysBetween, evaluateSchedule, parseInstant, parseLocalDate, selectNextEvent, suggestPlanTarget,
  todayInSeoul, weekday, type ScheduleEvent,
} from "@/domain/date";
import type { DomainResult } from "@/domain/result";

function value<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(result.code);
  return result.value;
}
const clock = { now: "2026-10-20T15:00:00.000000Z" };
function event(change: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id: "SYNTHETIC-registration", stage: "written", eventType: "registration", scheduleStatus: "announced",
    verification: "verified", lastValidatedAt: "2026-10-20T14:00:00Z", pendingChange: false,
    dateStart: "2026-10-21", dateEnd: "2026-10-23", temporalPrecision: "date", extent: "range", timezone: "Asia/Seoul",
    ...change,
  };
}

describe("validated proleptic Gregorian LocalDate", () => {
  it.each(["0001-01-01", "9999-12-31", "2000-02-29", "2028-02-29", "2026-10-20"])("accepts calendar date %s", date => {
    expect(value(parseLocalDate(date))).toBe(date);
  });
  it.each([undefined, null, 20261020, {}, "", "2026-1-01", "2026-01-1", " 2026-01-01", "2026-01-01T00:00:00Z",
    "0000-01-01", "10000-01-01", "2026-00-01", "2026-13-01", "2026-01-00", "2026-04-31", "2027-02-29", "1900-02-29", "2100-02-29"])("rejects invalid date %# without echoing it", date => {
    expect(parseLocalDate(date)).toEqual({ ok: false, code: "INVALID_DATE", fieldErrors: [{ field: "date", code: "INVALID_DATE" }] });
  });
  it.each([
    ["2028-02-28", "2028-03-01", 2], ["2027-02-28", "2027-03-01", 1],
    ["2026-12-31", "2027-01-01", 1], ["2027-01-01", "2026-12-31", -1],
    ["1999-03-01", "2000-03-01", 366], ["1899-03-01", "1900-03-01", 365],
    ["0001-01-01", "9999-12-31", 3652058],
  ] as const)("calculates calendar delta %s→%s", (a, b, expected) => expect(value(daysBetween(a, b))).toBe(expected));
  it.each([
    ["2028-02-28", 2, "2028-03-01"], ["2027-01-01", -1, "2026-12-31"], ["0001-01-01", 3652058, "9999-12-31"],
  ] as const)("adds whole calendar days %s %s", (date, count, expected) => expect(value(addDays(date, count))).toBe(expected));
  it.each([["0001-01-01", -1], ["9999-12-31", 1], ["2026-01-01", Number.MAX_SAFE_INTEGER]] as const)("rejects date overflow %s %s", (date, count) => {
    expect(addDays(date, count)).toMatchObject({ ok: false, code: "DATE_OUT_OF_RANGE" });
  });
  it.each([0.5, NaN, Infinity, "1", null, undefined])("rejects noninteger offset %#", offset => {
    expect(addDays("2026-01-01", offset)).toMatchObject({ ok: false, code: "INVALID_INTEGER" });
  });
  it.each([["0001-01-01", 1], ["1970-01-01", 4], ["2026-10-19", 1], ["2026-10-25", 7]] as const)("returns ISO weekday for %s", (date, expected) => {
    expect(value(weekday(date))).toBe(expected);
  });
  it("preserves add/subtract and weekday invariants across seeded calendar intervals", () => {
    let seed = 431;
    for (let n = 0; n < 1000; n++) {
      seed = (seed * 48271) % 2147483647;
      const day = seed % 3652059;
      const date = value(addDays("0001-01-01", day));
      expect(value(daysBetween("0001-01-01", date))).toBe(day);
      expect(value(addDays(date, -day))).toBe("0001-01-01");
      expect(value(weekday(date))).toBe(day % 7 + 1);
    }
  });
});

describe("explicit instant and Asia/Seoul clock", () => {
  it.each([
    ["2026-10-20T14:59:00Z", "2026-10-20", 1], ["2026-10-20T15:00:00Z", "2026-10-21", 0],
    ["2026-10-21T00:00:00+09:00", "2026-10-21", 0], ["2026-10-20T06:00:00-09:00", "2026-10-21", 0],
    ["2026-10-20T20:30:00+05:30", "2026-10-21", 0],
    ["2026-10-20T14:59:59.999999Z", "2026-10-20", 1], ["2026-10-20T15:00:00.000001Z", "2026-10-21", 0],
  ] as const)("uses Korean calendar for %s", (now, today, expected) => {
    expect(value(todayInSeoul({ now }))).toBe(today);
    expect(value(dDay("2026-10-21", { now }))).toBe(expected);
  });
  it.each(["2026-02-30T00:00:00Z", "2026-01-01T24:00:00Z", "2026-01-01T00:00:60Z", "2026-01-01T00:00:00",
    "2026-01-01", "2026-01-01T00:00:00-00:00", "2026-01-01T00:00:00+24:00", "2026-01-01T00:00:00.1234567Z"])("rejects ambiguous/invalid instant %s", now => {
    expect(parseInstant(now)).toMatchObject({ ok: false, code: "INVALID_INSTANT" });
    expect(todayInSeoul({ now })).toMatchObject({ ok: false, code: "INVALID_CLOCK" });
  });
  it.each([undefined, null, "2026-10-20T15:00:00Z", {}, { now: 0 }])("requires an explicit valid clock %#", invalid => {
    expect(todayInSeoul(invalid)).toMatchObject({ ok: false, code: "INVALID_CLOCK" });
  });
  it("does not assume modern UTC+09 for historical Seoul", () => {
    expect(value(todayInSeoul({ now: "1900-01-01T15:15:00Z" }))).toBe("1900-01-01");
    expect(value(todayInSeoul({ now: "1900-01-01T15:32:08Z" }))).toBe("1900-01-02");
  });
  it("zero-pads ancient years and rejects overflow of supported LocalDate range", () => {
    expect(value(todayInSeoul({ now: "0001-01-01T00:00:00Z" }))).toBe("0001-01-01");
    expect(todayInSeoul({ now: "9999-12-31T23:59:59Z" })).toMatchObject({ ok: false, code: "DATE_OUT_OF_RANGE" });
  });
});

describe("schedule facts never invent registration availability", () => {
  it("returns a future start countdown separately from warnings", () => {
    const result = evaluateSchedule(event({ dateStart: "2026-10-22", dateEnd: "2026-10-24" }), clock);
    expect(value(result)).toMatchObject({ state: "UPCOMING", countdown: { days: 1, kind: "registration_start" }, registrationGuaranteed: false });
    expect(result.ok && result.warnings).toContainEqual({ code: "OFFICIAL_TIME_REQUIRED" });
  });
  it.each([
    ["2026-10-21", "2026-10-23", "DATE_ONLY_START_DAY"], ["2026-10-19", "2026-10-21", "DATE_ONLY_END_DAY"],
    ["2026-10-21", "2026-10-21", "DATE_ONLY_SINGLE_DAY"], ["2026-10-20", "2026-10-22", "DATE_ONLY_PERIOD"],
  ] as const)("requires official time on date-only boundary/period %s %s", (dateStart, dateEnd, expected) => {
    const result = evaluateSchedule(event({ dateStart, dateEnd }), clock);
    expect(value(result)).toMatchObject({ state: expected, registrationGuaranteed: false, currentRegistrationCandidate: true, startsAt: null, endsAt: null });
    expect(result.ok && result.warnings).toEqual(expect.arrayContaining([{ code: "OFFICIAL_TIME_REQUIRED" }, { code: "HOLIDAYS_AND_EXCEPTIONS_REQUIRE_CHECK" }, { code: "PERSONAL_ELIGIBILITY_REQUIRES_CHECK" }]));
  });
  it("does not make known exceptions a normal next action", () => {
    const result = evaluateSchedule(event({ calendarExceptions: "exception" }), clock);
    expect(value(result).nextActionEligible).toBe(false);
    expect(result.ok && result.warnings).toContainEqual({ code: "OFFICIAL_EXCEPTION_REQUIRES_CHECK" });
  });
  it("labels range exams as period starts without inferring a personal exam date", () => {
    const result = evaluateSchedule(event({ eventType: "exam", dateStart: "2026-10-22", dateEnd: "2026-10-24" }), clock);
    expect(value(result)).toMatchObject({ countdown: { days: 1, kind: "exam_period_start" }, personalExamDateConfirmed: false });
    expect(result.ok && result.warnings).toContainEqual({ code: "PERSONAL_EXAM_DATE_UNCONFIRMED" });
  });
  it("uses exact microseconds with a half-open verified interval", () => {
    const timed = event({ dateStart: "2026-10-21", dateEnd: "2026-10-21", extent: "single", temporalPrecision: "datetime",
      startsAt: "2026-10-21T00:00:00.000001+09:00", endsAt: "2026-10-21T00:00:00.000003+09:00" });
    expect(value(evaluateSchedule(timed, clock))).toMatchObject({ phase: "before", currentRegistrationCandidate: false });
    expect(value(evaluateSchedule(timed, { now: "2026-10-20T15:00:00.000001Z" }))).toMatchObject({ phase: "during", currentRegistrationCandidate: true, registrationGuaranteed: false });
    expect(value(evaluateSchedule(timed, { now: "2026-10-20T15:00:00.000002Z" }))).toMatchObject({ phase: "during" });
    expect(value(evaluateSchedule(timed, { now: "2026-10-20T15:00:00.000003Z" }))).toMatchObject({ phase: "after", currentRegistrationCandidate: false });
  });
  it.each([
    { dateEnd: "2026-10-20" }, { dateStart: "2027-02-29" }, { extent: "single" },
    { startsAt: "2026-10-21T00:00:00+09:00" }, { stage: "unknown" }, { timezone: "UTC" },
    { temporalPrecision: "datetime" }, { lastValidatedAt: "2026-10-20T15:00:00.000001Z" },
  ])("rejects malformed schedule %# with field errors", change => {
    const result = evaluateSchedule({ ...event(), ...change }, clock);
    expect(result.ok).toBe(false); expect(!result.ok && result.fieldErrors.length).toBeGreaterThan(0);
  });
  it("requires timestamp local dates to agree with the official date range", () => {
    expect(evaluateSchedule(event({ temporalPrecision: "datetime", startsAt: "2026-10-20T10:00:00Z", endsAt: "2026-10-23T00:00:00Z" }), clock)).toMatchObject({ ok: false, code: "INVALID_RANGE" });
  });
  it("keeps exactly48hours fresh and marks the next microsecond stale", () => {
    const input = event({ lastValidatedAt: "2026-10-18T15:00:00.000000Z" });
    expect(value(evaluateSchedule(input, clock)).dataState).toBe("fresh");
    expect(value(evaluateSchedule(input, { now: "2026-10-20T15:00:00.000001Z" }))).toMatchObject({ state: "STALE", currentRegistrationCandidate: false, nextActionEligible: false, countdown: null });
  });
  it("prioritizes pending and retains stale/unverified warnings", () => {
    const result = evaluateSchedule(event({ pendingChange: true, verification: "pending", lastValidatedAt: "2026-10-10T00:00:00Z" }), clock);
    expect(value(result)).toMatchObject({ state: "PENDING_CHANGE", nextActionEligible: false });
    expect(result.ok && result.warnings).toEqual([{ code: "PENDING_CHANGE" }, { code: "STALE_DATA" }, { code: "UNVERIFIED_DATA" },
      { code: "OFFICIAL_TIME_REQUIRED" }, { code: "HOLIDAYS_AND_EXCEPTIONS_REQUIRE_CHECK" }, { code: "PERSONAL_ELIGIBILITY_REQUIRES_CHECK" }]);
  });
  it("does not treat missing validation as fresh", () => {
    expect(value(evaluateSchedule(event({ lastValidatedAt: null }), clock))).toMatchObject({ state: "UNVERIFIED", countdown: null, nextActionEligible: false });
  });
  it.each(["cancelled", "not_announced"] as const)("requires verified evidence for %s", scheduleStatus => {
    expect(evaluateSchedule(event({ scheduleStatus }), clock)).toMatchObject({ ok: false, code: "EVIDENCE_REQUIRED" });
    const result = evaluateSchedule(event({ scheduleStatus, statusEvidence: { verified: true, reference: "SYNTHETIC official evidence" } }), clock);
    expect(value(result)).toMatchObject({ phase: scheduleStatus, dateStart: null, countdown: null, nextActionEligible: false });
  });
  it("unknown does not emit a date/countdown or claim official nonannouncement", () => {
    const result = evaluateSchedule(event({ scheduleStatus: "unknown" }), clock);
    expect(value(result)).toMatchObject({ state: "UNKNOWN", dateStart: null, countdown: null });
    expect(result.ok && result.warnings).not.toContainEqual({ code: "OFFICIAL_NOT_ANNOUNCED_EVIDENCE" });
  });
});

describe("editable study target proposals", () => {
  it("proposes the first date of a range and retains personal-date uncertainty", () => {
    const result = suggestPlanTarget(event({ eventType: "exam", dateStart: "2026-10-22", dateEnd: "2026-10-24" }), clock);
    expect(value(result)).toEqual({ sourceEventId: "SYNTHETIC-registration", stage: "written", targetDate: "2026-10-22",
      basis: "exam_period_start", personalExamDateConfirmed: false, userMayChange: true, targetIsPast: false });
    expect(result.ok && result.warnings).toContainEqual({ code: "PERSONAL_EXAM_DATE_UNCONFIRMED" });
  });
  it("preserves a first day that already passed and asks the caller to change it", () => {
    const result = suggestPlanTarget(event({ eventType: "exam", dateStart: "2026-10-20", dateEnd: "2026-10-24" }), clock);
    expect(value(result)).toMatchObject({ targetDate: "2026-10-20", targetIsPast: true, userMayChange: true });
    expect(result.ok && result.warnings).toContainEqual({ code: "TARGET_DATE_PAST", field: "targetDate" });
  });
  it("distinguishes a single exam date from a range, including a leap day", () => {
    expect(value(suggestPlanTarget(event({ eventType: "exam", extent: "single", dateStart: "2028-02-29", dateEnd: "2028-02-29",
      lastValidatedAt: "2028-02-28T14:00:00Z" }), { now: "2028-02-28T15:00:00Z" }))).toMatchObject({ targetDate: "2028-02-29", basis: "exam_date", targetIsPast: false });
  });
  it.each([
    { eventType: "registration" }, { verification: "pending" }, { pendingChange: true },
    { lastValidatedAt: "2026-01-01T00:00:00Z" }, { scheduleStatus: "unknown" },
    { scheduleStatus: "cancelled", statusEvidence: { verified: true, reference: "SYNTHETIC cancellation" } },
    { scheduleStatus: "not_announced", statusEvidence: { verified: true, reference: "SYNTHETIC nonannouncement" } },
  ])("does not propose a target from an ineligible schedule %#", change => {
    expect(value(suggestPlanTarget({ ...event({ eventType: "exam" }), ...change }, clock))).toBeNull();
  });
  it("preserves typed validation failures", () => {
    expect(suggestPlanTarget(event({ dateStart: "2027-02-29" }), clock)).toMatchObject({ ok: false, code: "INVALID_DATE" });
  });
});

describe("stage-separated deterministic next-action selection", () => {
  it("prefers an ongoing registration candidate but never guarantees registration", () => {
    const input = [event({ id: "later", eventType: "exam", dateStart: "2026-10-22", dateEnd: "2026-10-22", extent: "single" }), event({ id: "ongoing" })];
    expect(value(selectNextEvent(input, "written", clock))).toMatchObject({ id: "ongoing", registrationGuaranteed: false });
    expect(value(selectNextEvent(input, "practical", clock))).toBeNull();
  });
  it("excludes cancelled, stale and pending schedules", () => {
    const input = [event({ id: "cancel", scheduleStatus: "cancelled", statusEvidence: { verified: true, reference: "SYNTHETIC" } }),
      event({ id: "pending", pendingChange: true }), event({ id: "stale", lastValidatedAt: "2026-01-01T00:00:00Z" }),
      event({ id: "future", dateStart: "2026-10-22", dateEnd: "2026-10-22", extent: "single" })];
    expect(value(selectNextEvent(input, "written", clock))?.id).toBe("future");
  });
  it("stably orders mixed precision without guessing unknown times", () => {
    const input = [event({ id: "z-exact", dateStart: "2026-10-22", dateEnd: "2026-10-22", extent: "single", temporalPrecision: "datetime", startsAt: "2026-10-22T09:00:00+09:00", endsAt: "2026-10-22T10:00:00+09:00" }),
      event({ id: "m-date", dateStart: "2026-10-22", dateEnd: "2026-10-22", extent: "single" }),
      event({ id: "a-exact", dateStart: "2026-10-22", dateEnd: "2026-10-22", extent: "single", temporalPrecision: "datetime", startsAt: "2026-10-22T11:00:00+09:00", endsAt: "2026-10-22T12:00:00+09:00" })];
    const before = JSON.stringify(input);
    for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
      expect(value(selectNextEvent(order.map(index => input[index]), "written", clock))?.id).toBe("m-date");
    }
    expect(JSON.stringify(input)).toBe(before);
  });
  it.each([undefined, null, {}, "bad"])("rejects nonarray event input %#", input => expect(selectNextEvent(input, "written", clock)).toMatchObject({ ok: false }));
  it("rejects duplicate IDs, unknown stage and invalid options even on empty lists", () => {
    expect(selectNextEvent([event(), event()], "written", clock)).toMatchObject({ ok: false, code: "DUPLICATE_EVENT" });
    expect(selectNextEvent([], "unknown", clock)).toMatchObject({ ok: false, code: "INVALID_STAGE" });
    expect(selectNextEvent([], "written", clock, { staleAfterHours: 0 })).toMatchObject({ ok: false, code: "INVALID_OPTIONS" });
  });
});
