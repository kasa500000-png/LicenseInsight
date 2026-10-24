import { describe, expect, it } from "vitest";
import { ABSOLUTE_MAX_PLAN_DAYS, createPlan, recalculatePlan, type PlanInput, type StudyPlan } from "@/domain/planner";

// All dates and learning templates here are synthetic, never official workload.
const clock = { now: "2026-10-18T15:00:00Z" }; // Seoul Monday 2026-10-19.
const input = (): PlanInput => ({ qualificationId: "synthetic-qualification", stage: "written", startDate: "2026-10-19", targetDate: "2026-10-26",
  weekdayMinutes: { 1: 60, 2: 60, 3: 60, 4: 60, 5: 60, 6: 180, 7: 180 }, excludedDates: [],
  phases: [{ id: "learn", label: "학습", weight: 2, items: [{ id: "concept", label: "개념", weight: 1 }, { id: "practice", label: "연습", weight: 1 }] },
    { id: "review", label: "복습", weight: 1, items: [{ id: "summary", label: "정리", weight: 1 }] }],
});
function value(result: ReturnType<typeof createPlan>): StudyPlan {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  return result.value;
}
function assertConserved(plan: StudyPlan) {
  expect(plan.days.reduce((s, d) => s + d.capacityMinutes, 0)).toBe(plan.capacityMinutes);
  expect(plan.days.reduce((s, d) => s + d.allocatedMinutes, 0)).toBe(plan.totalMinutes);
  expect(plan.phases.reduce((s, p) => s + p.minutes, 0)).toBe(plan.totalMinutes);
  expect(plan.totalMinutes + plan.unusedMinutes).toBe(plan.capacityMinutes);
  const allocationIds = new Set<string>();
  for (const day of plan.days) {
    expect(day.allocatedMinutes).toBeLessThanOrEqual(day.capacityMinutes);
    expect(day.allocations.reduce((s, a) => s + a.minutes, 0)).toBe(day.allocatedMinutes);
    expect(day.date < plan.targetDate).toBe(true);
    for (const allocation of day.allocations) {
      expect(allocationIds.has(allocation.id)).toBe(false); allocationIds.add(allocation.id);
      expect(Number.isInteger(allocation.minutes)).toBe(true); expect(allocation.minutes).toBeGreaterThan(0);
      expect(Number.isInteger(allocation.completedMinutes)).toBe(true);
      expect(allocation.completedMinutes).toBeGreaterThanOrEqual(0);
      expect(allocation.completedMinutes).toBeLessThanOrEqual(allocation.minutes);
    }
  }
  for (const phase of plan.phases) {
    expect(phase.items.reduce((s, item) => s + item.minutes, 0)).toBe(phase.minutes);
    for (const item of phase.items) {
      const minutes = plan.days.flatMap(d => d.allocations).filter(a => a.phaseId === phase.id && a.itemId === item.id).reduce((s, a) => s + a.minutes, 0);
      expect(minutes).toBe(item.minutes);
    }
  }
}
function deepFreeze<T>(v: T): T {
  if (v !== null && typeof v === "object") { Object.values(v).forEach(deepFreeze); Object.freeze(v); }
  return v;
}

describe("integer-minute preparation planner", () => {
  it("matches fixed660-minute week and stable440/220 phase oracle", () => {
    const p = value(createPlan(input(), clock));
    expect(p.capacityMinutes).toBe(660); expect(p.totalMinutes).toBe(660);
    expect(p.phases.map(p => p.minutes)).toEqual([440, 220]);
    expect(p.days.map(d => d.capacityMinutes)).toEqual([60, 60, 60, 60, 60, 180, 180]);
    expect(p.days.map(d => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(p.days.at(-1)?.date).toBe("2026-10-25");
    expect(p.assumptions.officialRequiredHours).toBeNull(); assertConserved(p);
  });
  it("one excluded weekday gives600 minutes; duplicate exclusion is idempotent", () => {
    const config = { ...input(), excludedDates: ["2026-10-20", "2026-10-20"] };
    const r = createPlan(config, clock), p = value(r);
    expect(p.totalMinutes).toBe(600); expect(p.days[1].allocations).toEqual([]);
    if (r.ok) expect(r.warnings).toContainEqual({ code: "DUPLICATE_EXCLUDED_DATE", field: "excludedDates.1" });
    assertConserved(p);
  });
  it("uses independent fixed remainder oracle across phases, items and days", () => {
    const i = { ...input(), weekdayMinutes: { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10 }, requestedMinutes: 13,
      phases: ["a", "b", "c"].map(id => ({ id, label: id, weight: 1, items: [{ id: "one", label: "one", weight: 1 }, { id: "two", label: "two", weight: 2 }] })) };
    const p = value(createPlan(i, clock));
    expect(p.phases.map(p => p.minutes)).toEqual([5, 4, 4]);
    expect(p.phases[0].items.map(i => i.minutes)).toEqual([2, 3]);
    expect(p.days.map(d => d.allocatedMinutes)).toEqual([2, 2, 2, 2, 2, 2, 1]);
    expect(p.unusedMinutes).toBe(57); assertConserved(p);
  });
  it("zero-weight phases and items receive no ghost allocations", () => {
    const i = { ...input(), requestedMinutes: 1, phases: [
      { id: "zero", label: "zero", weight: 0, items: [{ id: "none", label: "none", weight: 0 }] },
      { id: "some", label: "some", weight: 1, items: [{ id: "none", label: "none", weight: 0 }, { id: "yes", label: "yes", weight: 1 }] },
    ] };
    const p = value(createPlan(i, clock)); expect(p.phases.map(p => p.minutes)).toEqual([0, 1]);
    expect(p.days.flatMap(d => d.allocations).map(a => [a.phaseId, a.itemId, a.minutes])).toEqual([["some", "yes", 1]]); assertConserved(p);
  });
  it("does not mutate frozen input and is deterministic", () => {
    const config = deepFreeze(input()), saved = JSON.stringify(config);
    const a = createPlan(config, deepFreeze(clock)), b = createPlan(config, deepFreeze(clock));
    expect(a).toEqual(b); expect(JSON.stringify(config)).toBe(saved);
  });
  it.each([
    [null, "INVALID_INPUT"], [[], "INVALID_INPUT"],
    [{ ...input(), startDate: "2026-02-30" }, "INVALID_DATE"],
    [{ ...input(), targetDate: "2026-10-19" }, "INVALID_RANGE"],
    [{ ...input(), targetDate: "2026-10-18" }, "INVALID_RANGE"],
    [{ ...input(), startDate: "2026-10-18" }, "START_IN_PAST"],
    [{ ...input(), targetDate: "2027-10-21" }, "PLAN_TOO_LONG"],
    [{ ...input(), stage: "oral" }, "INVALID_STAGE"],
    [{ ...input(), weekdayMinutes: null }, "INVALID_MINUTES"],
    [{ ...input(), weekdayMinutes: { 1: 60 } }, "INVALID_MINUTES"],
    [{ ...input(), weekdayMinutes: { ...input().weekdayMinutes, 1: -1 } }, "INVALID_MINUTES"],
    [{ ...input(), weekdayMinutes: { ...input().weekdayMinutes, 2: 60.5 } }, "INVALID_MINUTES"],
    [{ ...input(), weekdayMinutes: { ...input().weekdayMinutes, 3: 1441 } }, "INVALID_MINUTES"],
    [{ ...input(), weekdayMinutes: { ...input().weekdayMinutes, 4: "60" } }, "INVALID_MINUTES"],
    [{ ...input(), weekdayMinutes: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 } }, "ZERO_CAPACITY"],
    [{ ...input(), excludedDates: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"] }, "ALL_DATES_EXCLUDED"],
    [{ ...input(), excludedDates: [null] }, "INVALID_DATE"],
    [{ ...input(), requestedMinutes: 0 }, "ZERO_REQUESTED_MINUTES"],
    [{ ...input(), requestedMinutes: 661 }, "CAPACITY_EXCEEDED"],
    [{ ...input(), requestedMinutes: NaN }, "INVALID_MINUTES"],
    [{ ...input(), phases: null }, "INVALID_ITEMS"],
    [{ ...input(), phases: [] }, "INVALID_ITEMS"],
    [{ ...input(), phases: [{ ...input().phases[0], weight: -1 }] }, "INVALID_WEIGHT"],
    [{ ...input(), phases: [{ ...input().phases[0], weight: 0 }] }, "INVALID_WEIGHT"],
    [{ ...input(), phases: [{ ...input().phases[0], items: [{ id: "same", label: "a", weight: 1 }, { id: "same", label: "b", weight: 1 }] }] }, "INVALID_ITEMS"],
    [{ ...input(), phases: [{ ...input().phases[0], items: [{ id: "zero", label: "zero", weight: 0 }] }] }, "INVALID_WEIGHT"],
  ])("returns typed field error for invalid input %#", (config, code) => {
    const r = createPlan(config, clock); expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.code).toBe(code); expect(r.fieldErrors[0].field).toBeTruthy(); }
  });
  it("requires explicit valid clock and bounded product configuration", () => {
    expect(createPlan(input(), { now: "2026-02-30T00:00:00Z" })).toMatchObject({ ok: false, code: "INVALID_CLOCK" });
    expect(createPlan(input(), undefined)).toMatchObject({ ok: false, code: "INVALID_CLOCK" });
    expect(createPlan(input(), clock, { maxPlanDays: 6 })).toMatchObject({ ok: false, code: "PLAN_TOO_LONG" });
    expect(createPlan(input(), clock, { maxPlanDays: ABSOLUTE_MAX_PLAN_DAYS + 1 })).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });
  it("does not let exclusions outside the plan change capacity", () => {
    const r = createPlan({ ...input(), excludedDates: ["2026-10-18", "2026-10-26"] }, clock);
    expect(value(r).capacityMinutes).toBe(660);
    if (r.ok) expect(r.warnings.map(w => w.code)).toEqual(["EXCLUDED_DATE_OUTSIDE_RANGE", "EXCLUDED_DATE_OUTSIDE_RANGE"]);
  });
  it("includes366 days bydefault and excludes target across leap/year boundaries", () => {
    const p = value(createPlan({ ...input(), startDate: "2027-03-01", targetDate: "2028-03-01" }, { now: "2027-02-28T15:00:00Z" }));
    expect(p.days).toHaveLength(366); expect(p.days.at(-1)?.date).toBe("2028-02-29"); assertConserved(p);
  });
});

describe("explicit completed-work recalculation", () => {
  const nextDayClock = { now: "2026-10-19T15:00:00Z" }; // Seoul Tuesday 2026-10-20.
  function prior() {
    const p = structuredClone(value(createPlan(input(), clock)));
    const a = p.days[0].allocations[0];
    return { ...p, days: p.days.map((d, di) => ({ ...d, allocations: d.allocations.map((r, ai) => ({ ...r, completedMinutes: di === 0 && ai === 0 ? 30 : 0 })) })), done: a.id };
  }
  it("asks for a decision instead of silently losing completed work", () => {
    const old = prior(); expect(recalculatePlan(old, input(), clock)).toMatchObject({ ok: false, code: "COMPLETED_DECISION_REQUIRED" });
  });
  it("preserves only completedminutes, allocates remaining work and nevermutates previous", () => {
    const old = deepFreeze(prior()), before = JSON.stringify(old);
    const p = value(recalculatePlan(old, { ...input(), requestedMinutes: 500 }, clock, "preserve"));
    expect(p.days.flatMap(d => d.allocations).filter(a => a.completedMinutes > 0)).toEqual([expect.objectContaining({ id: old.done, completedMinutes: 30 })]);
    expect(p.totalMinutes).toBe(500); expect(p.completionDecision).toBe("preserve");
    expect(JSON.stringify(old)).toBe(before); assertConserved(p);
  });
  it("resets completed work only on explicit reset choice", () => {
    const r = recalculatePlan(prior(), input(), clock, "reset"), p = value(r);
    expect(p.days.flatMap(d => d.allocations).every(a => a.completedMinutes === 0)).toBe(true);
    if (r.ok) expect(r.warnings).toContainEqual({ code: "COMPLETED_WORK_RESET" });
  });
  it("recalculates on the next day, retaining only historical completed minutes", () => {
    const old = deepFreeze(prior()), before = JSON.stringify(old);
    expect(createPlan(input(), nextDayClock)).toMatchObject({ ok: false, code: "START_IN_PAST" });
    const r = recalculatePlan(old, input(), nextDayClock, "preserve"), p = value(r);
    expect(p.capacityMinutes).toBe(630); expect(p.totalMinutes).toBe(630);
    expect(p.days[0]).toMatchObject({ capacityMinutes: 30, allocatedMinutes: 30 });
    expect(p.days[0].allocations).toEqual([expect.objectContaining({ id: old.done, minutes: 30, completedMinutes: 30 })]);
    expect(p.days.slice(1).reduce((s, d) => s + d.allocatedMinutes, 0)).toBe(600);
    if (r.ok) expect(r.warnings).toContainEqual({ code: "PAST_DAYS_EXCLUDE_UNCOMPLETED_WORK", field: "startDate" });
    expect(JSON.stringify(old)).toBe(before); assertConserved(p);
    expect(recalculatePlan(deepFreeze(p), input(), nextDayClock, "preserve")).toEqual(r);
  });
  it("counts historical completed work inside an explicit requested total", () => {
    const config = { ...input(), requestedMinutes: 500 };
    const p = value(recalculatePlan(prior(), config, nextDayClock, "preserve"));
    expect(p.totalMinutes).toBe(500); expect(p.unusedMinutes).toBe(130);
    expect(p.days[0].allocatedMinutes).toBe(30);
    expect(p.days.slice(1).reduce((s, d) => s + d.allocatedMinutes, 0)).toBe(470);
    expect(value(recalculatePlan(p, config, nextDayClock, "preserve"))).toEqual(p); assertConserved(p);
    expect(recalculatePlan(prior(), { ...input(), requestedMinutes: 660 }, nextDayClock, "preserve"))
      .toMatchObject({ ok: false, code: "CAPACITY_EXCEEDED" });
  });
  it("reset removes historical availability and remains stable on repeated recalculation", () => {
    const p = value(recalculatePlan(prior(), input(), nextDayClock, "reset"));
    expect(p.capacityMinutes).toBe(600); expect(p.days[0]).toMatchObject({ capacityMinutes: 0, allocatedMinutes: 0, allocations: [] });
    expect(p.days.flatMap(d => d.allocations).every(a => a.completedMinutes === 0)).toBe(true);
    expect(value(recalculatePlan(p, input(), nextDayClock, "reset"))).toEqual(p); assertConserved(p);
  });
  it("drops elapsed unfinished days when there is no completed record", () => {
    const old = value(createPlan(input(), clock));
    const p = value(recalculatePlan(old, input(), nextDayClock));
    expect(p.capacityMinutes).toBe(600); expect(p.days[0].allocations).toEqual([]); assertConserved(p);
  });
  it("does not apply changed weekday availability retroactively to past completed work", () => {
    const config = { ...input(), weekdayMinutes: { ...input().weekdayMinutes, 1: 0 } };
    const p = value(recalculatePlan(prior(), config, nextDayClock, "preserve"));
    expect(p.capacityMinutes).toBe(630); expect(p.days[0]).toMatchObject({ capacityMinutes: 30, allocatedMinutes: 30 });
    expect(recalculatePlan(prior(), { ...config, excludedDates: ["2026-10-19"] }, nextDayClock, "preserve")).toMatchObject({ ok: false, code: "COMPLETED_WORK_CONFLICT" });
    assertConserved(p);
  });
  it("never moves unfinished work back into elapsed dates as the clock advances", () => {
    const wednesdayClock = { now: "2026-10-20T15:00:00Z" }, thursdayClock = { now: "2026-10-21T15:00:00Z" };
    const wednesday = value(recalculatePlan(prior(), input(), wednesdayClock, "preserve"));
    expect(wednesday.totalMinutes).toBe(570); expect(wednesday.days.slice(0, 2).map(d => d.allocatedMinutes)).toEqual([30, 0]);
    const thursday = value(recalculatePlan(deepFreeze(wednesday), input(), thursdayClock, "preserve"));
    expect(thursday.totalMinutes).toBe(510); expect(thursday.days.slice(0, 3).map(d => d.allocatedMinutes)).toEqual([30, 0, 0]);
    expect(thursday.days.filter(d => d.date < "2026-10-22").flatMap(d => d.allocations).every(a => a.minutes === a.completedMinutes)).toBe(true);
    assertConserved(wednesday); assertConserved(thursday);
  });
  it.each(["2026-10-25", "2026-10-26"])("requires a future target when the current date is October26: %s", targetDate => {
    expect(recalculatePlan(prior(), { ...input(), targetDate }, { now: "2026-10-25T15:00:00Z" }, "preserve"))
      .toMatchObject({ ok: false, code: "TARGET_NOT_FUTURE", fieldErrors: [{ field: "targetDate", code: "TARGET_NOT_FUTURE" }] });
  });
  it.each([
    { ...input(), qualificationId: "different-qualification" },
    { ...input(), stage: "practical" },
    { ...input(), excludedDates: ["2026-10-19"] },
    { ...input(), weekdayMinutes: { ...input().weekdayMinutes, 1: 20 } },
    { ...input(), requestedMinutes: 1 },
    { ...input(), phases: [input().phases[1]] },
  ])("rejects conflicting preserve proposal without changing prior %#", config => {
    const old = deepFreeze(prior()), before = JSON.stringify(old);
    expect(recalculatePlan(old, config, clock, "preserve")).toMatchObject({ ok: false, code: "COMPLETED_WORK_CONFLICT" });
    expect(JSON.stringify(old)).toBe(before);
  });
  it("does not require decision when nothing was completed", () => {
    const old = value(createPlan(input(), clock));
    expect(recalculatePlan(old, input(), clock)).toEqual(createPlan(input(), clock));
  });
  it("rejects corrupt completed allocation and duplicate identifiers", () => {
    const old = prior(), first = old.days[0].allocations[0];
    const corrupt = { ...old, days: [{ ...old.days[0], allocations: [{ ...first, completedMinutes: first.minutes + 1 }] }] };
    expect(recalculatePlan(corrupt, input(), clock, "preserve")).toMatchObject({ ok: false, code: "INVALID_PREVIOUS_PLAN" });
    const duplicate = { ...old, days: [old.days[0], old.days[0]] };
    expect(recalculatePlan(duplicate, input(), clock, "reset")).toMatchObject({ ok: false, code: "INVALID_PREVIOUS_PLAN" });
  });
});

it("conserves day and item minutes across deterministic property sweeps", () => {
  for (let seed = 1; seed <= 96; seed++) {
    const length = 1 + seed % 42;
    const target = new Date(Date.UTC(2026, 9, 19 + length)).toISOString().slice(0, 10);
    const weekly = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i + 1, (seed * 17 + i * 31) % 1441])) as Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number>;
    const expected = Array.from({ length }, (_, i) => weekly[(i % 7 + 1) as keyof typeof weekly]).reduce((a, b) => a + b, 0);
    const config = { ...input(), targetDate: target, weekdayMinutes: weekly, requestedMinutes: 1 + seed % expected,
      phases: Array.from({ length: 1 + seed % 5 }, (_, pi) => ({ id: `phase${pi}`, label: `phase${pi}`, weight: 1 + (seed + pi) % 7,
        items: Array.from({ length: 1 + (seed + pi) % 4 }, (_, ii) => ({ id: `item${ii}`, label: `item${ii}`, weight: 1 + (seed + ii) % 11 })) })) };
    const p = value(createPlan(deepFreeze(config), clock)); expect(p.capacityMinutes).toBe(expected);
    expect(createPlan(config, clock)).toEqual(createPlan(config, clock)); assertConserved(p);
  }
});
