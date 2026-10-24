import { describe, expect, it } from "vitest";
import oracle from "../fixtures/synthetic/domain/calendar-oracles.json";
import { addDays, daysBetween, parseLocalDate, weekday } from "@/domain/date";
import { createPlan } from "@/domain/planner";

// Expected dates/weekdays/capacities were produced independently by Python datetime,
// not by the TypeScript implementation under test. These are SYNTHETIC only.
describe("independent Gregorian calendar and plan-capacity oracles", () => {
  it.each(oracle.calendar)("matches Python Gregorian oracle $start → $end", row => {
    expect(daysBetween(row.start, row.end)).toMatchObject({ ok: true, value: row.days });
    expect(daysBetween(row.end, row.start)).toMatchObject({ ok: true, value: -row.days });
    expect(addDays(row.start, row.days)).toMatchObject({ ok: true, value: row.end });
    expect(weekday(row.start)).toMatchObject({ ok: true, value: row.startWeekday });
    expect(weekday(row.end)).toMatchObject({ ok: true, value: row.endWeekday });
  });
  it.each(oracle.invalidDates)("rejects independently invalid date %s", date => {
    expect(parseLocalDate(date).ok).toBe(false);
  });
  it.each(oracle.plannerCapacity)("matches independent expanded capacity $startDate → $targetDate", row => {
    const result = createPlan({
      qualificationId: "SYNTHETIC-oracle", stage: "written",
      startDate: row.startDate, targetDate: row.targetDate, excludedDates: row.excludedDates,
      weekdayMinutes: { 1: 60, 2: 60, 3: 60, 4: 60, 5: 60, 6: 180, 7: 180 },
      phases: [{ id: "synthetic", label: "합성 테스트", weight: 1, items: [{ id: "one", label: "합성 항목", weight: 1 }] }],
    }, { now: `${row.startDate}T00:00:00Z` });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.code);
    expect(result.value.capacityMinutes).toBe(row.totalCapacity);
    expect(result.value.totalMinutes).toBe(row.totalCapacity);
    expect(result.value.days.map(day => ({ date: day.date, capacity: day.capacityMinutes }))).toEqual(row.days);
    expect(result.value.days.some(day => day.date === row.targetDate)).toBe(false);
  });
});
