import { addDays, daysBetween, parseLocalDate, todayInSeoul, weekday, type LocalDate } from "./date";
import { failure, success, type DomainResult, type DomainWarning } from "./result";

export const DEFAULT_MAX_PLAN_DAYS = 366;
export const ABSOLUTE_MAX_PLAN_DAYS = 3660;
export type PlannerErrorCode =
  | "INVALID_INPUT" | "INVALID_DATE" | "INVALID_CLOCK" | "INVALID_STAGE" | "INVALID_MINUTES"
  | "INVALID_WEIGHT" | "INVALID_ITEMS" | "INVALID_RANGE" | "START_IN_PAST" | "TARGET_NOT_FUTURE" | "PLAN_TOO_LONG"
  | "ZERO_CAPACITY" | "ALL_DATES_EXCLUDED" | "ZERO_REQUESTED_MINUTES" | "CAPACITY_EXCEEDED"
  | "INVALID_PREVIOUS_PLAN" | "COMPLETED_DECISION_REQUIRED" | "INVALID_COMPLETED_DECISION"
  | "COMPLETED_WORK_CONFLICT";
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type PlannerItem = Readonly<{ id: string; label: string; weight: number }>;
export type PlannerPhase = Readonly<{ id: string; label: string; weight: number; items: readonly PlannerItem[] }>;
export type PlanInput = Readonly<{
  qualificationId: string;
  stage: "written" | "practical";
  startDate: string;
  targetDate: string;
  weekdayMinutes: Readonly<Record<IsoWeekday, number>>;
  excludedDates: readonly string[];
  phases: readonly PlannerPhase[];
  requestedMinutes?: number;
}>;
export type PlannerOptions = Readonly<{ maxPlanDays?: number }>;
export type PlanAllocation = Readonly<{
  id: string; phaseId: string; itemId: string; minutes: number; completedMinutes: number;
}>;
export type StudyDay = Readonly<{
  date: LocalDate; weekday: IsoWeekday; excluded: boolean; capacityMinutes: number;
  allocatedMinutes: number; allocations: readonly PlanAllocation[];
}>;
export type PhaseAllocation = Readonly<{
  id: string; label: string; weight: number; minutes: number;
  items: readonly Readonly<PlannerItem & { minutes: number }>[];
}>;
export type StudyPlan = Readonly<{
  qualificationId: string; stage: "written" | "practical"; startDate: LocalDate; targetDate: LocalDate;
  capacityMinutes: number; totalMinutes: number; unusedMinutes: number;
  days: readonly StudyDay[]; phases: readonly PhaseAllocation[];
  completionDecision: "none" | "preserve" | "reset";
  assumptions: Readonly<{ targetDateExcluded: true; allocation: "largest_remainder_then_phase_order"; officialRequiredHours: null }>;
}>;

type Result<T> = DomainResult<T, PlannerErrorCode>;
type MutableDay = { date: LocalDate; weekday: IsoWeekday; excluded: boolean; capacityMinutes: number;
  allocatedMinutes: number; allocations: { id: string; phaseId: string; itemId: string; minutes: number; completedMinutes: number }[] };
type Validated = { input: PlanInput; start: LocalDate; target: LocalDate; days: MutableDay[]; capacity: number; total: number; warnings: DomainWarning[] };
type Completed = { date: LocalDate; phaseId: string; itemId: string; minutes: number };
type Recalculation = { completed: readonly Completed[] };
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const integer = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const identifier = (v: unknown): v is string => typeof v === "string" && idPattern.test(v);
const label = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 500;
const key = (phaseId: string, itemId: string) => `${phaseId}:${itemId}`;
const allocationId = (date: string, phaseId: string, itemId: string) => `${date}:${phaseId}:${itemId}`;

/** Exact integer largest-remainder allocation; ties retain the supplied order. */
function distribute(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((s, w) => s + BigInt(w), 0n);
  if (total === 0 || sum === 0n) return weights.map(() => 0);
  const products = weights.map(w => BigInt(total) * BigInt(w));
  const result = products.map(n => Number(n / sum));
  const order = products.map((n, index) => ({ remainder: n % sum, index }))
    .sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  let remaining = total - result.reduce((s, n) => s + n, 0);
  for (let i = 0; remaining > 0; i++, remaining--) result[order[i].index]++;
  return result;
}

function validate(input: unknown, clock: unknown, options: PlannerOptions, recalculation?: Recalculation): Result<Validated> {
  if (!object(input) || !object(options)) return failure("INVALID_INPUT", "plan");
  if (!identifier(input.qualificationId)) return failure("INVALID_INPUT", "qualificationId");
  if (input.stage !== "written" && input.stage !== "practical") return failure("INVALID_STAGE", "stage");
  const start = parseLocalDate(input.startDate), target = parseLocalDate(input.targetDate);
  if (!start.ok) return failure("INVALID_DATE", "startDate");
  if (!target.ok) return failure("INVALID_DATE", "targetDate");
  const today = todayInSeoul(clock);
  if (!today.ok) return failure("INVALID_CLOCK", "clock.now");
  const length = daysBetween(start.value, target.value);
  if (!length.ok || length.value <= 0) return failure("INVALID_RANGE", "targetDate");
  if (!recalculation && start.value < today.value) return failure("START_IN_PAST", "startDate");
  if (recalculation && target.value <= today.value) return failure("TARGET_NOT_FUTURE", "targetDate");
  const max = options.maxPlanDays ?? DEFAULT_MAX_PLAN_DAYS;
  if (!integer(max, 1, ABSOLUTE_MAX_PLAN_DAYS)) return failure("INVALID_INPUT", "maxPlanDays");
  if (length.value > max) return failure("PLAN_TOO_LONG", "targetDate");
  const weekly = input.weekdayMinutes;
  if (!object(weekly) || Object.keys(weekly).length !== 7) return failure("INVALID_MINUTES", "weekdayMinutes");
  for (let d = 1; d <= 7; d++) if (!integer(weekly[d], 0, 1440)) return failure("INVALID_MINUTES", `weekdayMinutes.${d}`);
  if (!Array.isArray(input.excludedDates) || input.excludedDates.length > 10_000) return failure("INVALID_DATE", "excludedDates");
  const exclusions = new Set<string>(), warnings: DomainWarning[] = [];
  for (let i = 0; i < input.excludedDates.length; i++) {
    const parsed = parseLocalDate(input.excludedDates[i]);
    if (!parsed.ok) return failure("INVALID_DATE", `excludedDates.${i}`);
    if (exclusions.has(parsed.value)) warnings.push({ code: "DUPLICATE_EXCLUDED_DATE", field: `excludedDates.${i}` });
    if (parsed.value < start.value || parsed.value >= target.value) warnings.push({ code: "EXCLUDED_DATE_OUTSIDE_RANGE", field: `excludedDates.${i}` });
    exclusions.add(parsed.value);
  }
  if (!Array.isArray(input.phases) || !input.phases.length || input.phases.length > 50) return failure("INVALID_ITEMS", "phases");
  const phaseIds = new Set<string>(); let totalItems = 0, phaseWeights = 0;
  for (let pi = 0; pi < input.phases.length; pi++) {
    const phase: unknown = input.phases[pi];
    if (!object(phase) || !identifier(phase.id) || !label(phase.label) || phaseIds.has(phase.id)) return failure("INVALID_ITEMS", `phases.${pi}`);
    phaseIds.add(phase.id);
    if (!integer(phase.weight, 0, 1_000_000)) return failure("INVALID_WEIGHT", `phases.${pi}.weight`);
    phaseWeights += phase.weight;
    if (!Array.isArray(phase.items) || !phase.items.length || phase.items.length > 200) return failure("INVALID_ITEMS", `phases.${pi}.items`);
    totalItems += phase.items.length;
    if (totalItems > 500) return failure("INVALID_ITEMS", "phases");
    const itemIds = new Set<string>(); let itemWeights = 0;
    for (let ii = 0; ii < phase.items.length; ii++) {
      const item: unknown = phase.items[ii];
      if (!object(item) || !identifier(item.id) || !label(item.label) || itemIds.has(item.id)) return failure("INVALID_ITEMS", `phases.${pi}.items.${ii}`);
      itemIds.add(item.id);
      if (!integer(item.weight, 0, 1_000_000)) return failure("INVALID_WEIGHT", `phases.${pi}.items.${ii}.weight`);
      itemWeights += item.weight;
    }
    if (phase.weight > 0 && itemWeights === 0) return failure("INVALID_WEIGHT", `phases.${pi}.items`);
  }
  if (phaseWeights === 0) return failure("INVALID_WEIGHT", "phases");
  const days: MutableDay[] = [];
  for (let offset = 0; offset < length.value; offset++) {
    const date = addDays(start.value, offset);
    if (!date.ok) return failure("INVALID_DATE", "targetDate");
    const day = weekday(date.value);
    if (!day.ok) return failure("INVALID_DATE", "startDate");
    const excluded = exclusions.has(date.value);
    days.push({ date: date.value, weekday: day.value as IsoWeekday, excluded, capacityMinutes: excluded ? 0 : weekly[day.value] as number,
      allocatedMinutes: 0, allocations: [] });
  }
  if (recalculation) {
    const completedByDate = new Map<string, number>();
    for (const done of recalculation.completed) completedByDate.set(done.date, (completedByDate.get(done.date) ?? 0) + done.minutes);
    let hasPastDays = false;
    for (const day of days) {
      if (day.date >= today.value) continue;
      hasPastDays = true;
      const done = completedByDate.get(day.date) ?? 0;
      if (done > 0 && day.excluded) return failure("COMPLETED_WORK_CONFLICT", "excludedDates", "COMPLETED_DATE_UNAVAILABLE");
      // A new weekday setting applies to future availability, not work already done.
      // Historical time cannot be studied again. Only explicitly preserved work counts.
      day.capacityMinutes = done;
    }
    if (hasPastDays) warnings.push({ code: "PAST_DAYS_EXCLUDE_UNCOMPLETED_WORK", field: "startDate" });
  }
  const capacity = days.reduce((s, d) => s + d.capacityMinutes, 0);
  if (days.every(d => d.excluded)) return failure("ALL_DATES_EXCLUDED", "excludedDates");
  if (capacity === 0) return failure("ZERO_CAPACITY", "weekdayMinutes");
  let total = capacity;
  if (input.requestedMinutes !== undefined) {
    if (!integer(input.requestedMinutes, 0, ABSOLUTE_MAX_PLAN_DAYS * 1440)) return failure("INVALID_MINUTES", "requestedMinutes");
    if (input.requestedMinutes === 0) return failure("ZERO_REQUESTED_MINUTES", "requestedMinutes");
    if (input.requestedMinutes > capacity) return failure("CAPACITY_EXCEEDED", "requestedMinutes");
    total = input.requestedMinutes;
  }
  return success({ input: input as unknown as PlanInput, start: start.value, target: target.value, days, capacity, total, warnings });
}

function phaseQuotas(input: PlanInput, total: number): PhaseAllocation[] {
  const phaseMinutes = distribute(total, input.phases.map(p => p.weight));
  return input.phases.map((phase, pi) => {
    const itemMinutes = distribute(phaseMinutes[pi], phase.items.map(item => item.weight));
    return { id: phase.id, label: phase.label, weight: phase.weight, minutes: phaseMinutes[pi],
      items: phase.items.map((item, ii) => ({ id: item.id, label: item.label, weight: item.weight, minutes: itemMinutes[ii] })) };
  });
}
function assemble(valid: Validated, completed: readonly Completed[], decision: StudyPlan["completionDecision"]): Result<StudyPlan> {
  const phases = phaseQuotas(valid.input, valid.total), totals = new Map<string, number>();
  for (const phase of phases) for (const item of phase.items) totals.set(key(phase.id, item.id), item.minutes);
  const completedByDay = new Map<string, number>();
  const days = valid.days;
  const dayByDate = new Map(days.map(day => [day.date, day]));
  for (const done of completed) {
    const day = dayByDate.get(done.date), k = key(done.phaseId, done.itemId), budget = totals.get(k);
    if (!day || day.excluded) return failure("COMPLETED_WORK_CONFLICT", "excludedDates", "COMPLETED_DATE_UNAVAILABLE");
    if (budget === undefined || done.minutes > budget) return failure("COMPLETED_WORK_CONFLICT", "phases", "COMPLETED_ITEM_QUOTA_EXCEEDED");
    const dayCompleted = (completedByDay.get(done.date) ?? 0) + done.minutes;
    if (dayCompleted > day.capacityMinutes) return failure("COMPLETED_WORK_CONFLICT", `weekdayMinutes.${day.weekday}`, "COMPLETED_DAY_CAPACITY_EXCEEDED");
    totals.set(k, budget - done.minutes); completedByDay.set(done.date, dayCompleted);
    day.allocations.push({ id: allocationId(day.date, done.phaseId, done.itemId), phaseId: done.phaseId, itemId: done.itemId, minutes: done.minutes, completedMinutes: done.minutes });
  }
  const completedTotal = completed.reduce((s, done) => s + done.minutes, 0);
  if (completedTotal > valid.total) return failure("COMPLETED_WORK_CONFLICT", "requestedMinutes");
  const remainingMinutes = valid.total - completedTotal;
  const dayBudgets = distribute(remainingMinutes, days.map(day => day.capacityMinutes - (completedByDay.get(day.date) ?? 0)));
  const items = phases.flatMap(phase => phase.items.map(item => ({ phaseId: phase.id, itemId: item.id, minutes: totals.get(key(phase.id, item.id))! })));
  let itemIndex = 0;
  for (let di = 0; di < days.length; di++) {
    const day = days[di]; let available = dayBudgets[di];
    while (available > 0) {
      while (itemIndex < items.length && items[itemIndex].minutes === 0) itemIndex++;
      const item = items[itemIndex];
      const minutes = Math.min(available, item.minutes);
      const existing = day.allocations.find(a => a.phaseId === item.phaseId && a.itemId === item.itemId);
      if (existing) existing.minutes += minutes;
      else day.allocations.push({ id: allocationId(day.date, item.phaseId, item.itemId), phaseId: item.phaseId, itemId: item.itemId, minutes, completedMinutes: 0 });
      item.minutes -= minutes; available -= minutes;
    }
    day.allocatedMinutes = day.allocations.reduce((s, allocation) => s + allocation.minutes, 0);
    // Presentation has a stable template order even when completed work was pinned first.
    day.allocations.sort((a, b) => items.findIndex(i => i.phaseId === a.phaseId && i.itemId === a.itemId) - items.findIndex(i => i.phaseId === b.phaseId && i.itemId === b.itemId));
  }
  return success({ qualificationId: valid.input.qualificationId, stage: valid.input.stage, startDate: valid.start, targetDate: valid.target,
    capacityMinutes: valid.capacity, totalMinutes: valid.total, unusedMinutes: valid.capacity - valid.total, days, phases,
    completionDecision: decision, assumptions: { targetDateExcluded: true, allocation: "largest_remainder_then_phase_order", officialRequiredHours: null } }, valid.warnings);
}

export function createPlan(input: unknown, clock: unknown, options: PlannerOptions = {}): Result<StudyPlan> {
  const valid = validate(input, clock, options);
  return valid.ok ? assemble(valid.value, [], "none") : valid;
}

function readCompleted(previous: unknown): Result<{ qualificationId: string; stage: string; completed: Completed[] }> {
  if (!object(previous) || !identifier(previous.qualificationId) || !["written", "practical"].includes(previous.stage as string) || !Array.isArray(previous.days) || previous.days.length > ABSOLUTE_MAX_PLAN_DAYS) return failure("INVALID_PREVIOUS_PLAN", "previous");
  const start = parseLocalDate(previous.startDate), target = parseLocalDate(previous.targetDate);
  if (!start.ok || !target.ok) return failure("INVALID_PREVIOUS_PLAN", "previous.startDate");
  const length = daysBetween(start.value, target.value);
  if (!length.ok || length.value !== previous.days.length || !integer(length.value, 1, ABSOLUTE_MAX_PLAN_DAYS) ||
    !integer(previous.capacityMinutes, 1, ABSOLUTE_MAX_PLAN_DAYS * 1440) || !integer(previous.totalMinutes, 1, previous.capacityMinutes) ||
    previous.unusedMinutes !== previous.capacityMinutes - previous.totalMinutes || !Array.isArray(previous.phases) || previous.phases.length < 1 || previous.phases.length > 50) return failure("INVALID_PREVIOUS_PLAN", "previous");
  const expectedItems = new Map<string, number>(), actualItems = new Map<string, number>(), phaseIds = new Set<string>();
  let phaseSum = 0;
  for (const phase of previous.phases) {
    if (!object(phase) || !identifier(phase.id) || phaseIds.has(phase.id) || !label(phase.label) || !integer(phase.weight, 0, 1_000_000) ||
      !integer(phase.minutes, 0, previous.totalMinutes) || !Array.isArray(phase.items) || !phase.items.length || phase.items.length > 200) return failure("INVALID_PREVIOUS_PLAN", "previous.phases");
    phaseIds.add(phase.id); let itemSum = 0;
    for (const item of phase.items) {
      if (!object(item) || !identifier(item.id) || !label(item.label) || !integer(item.weight, 0, 1_000_000) || !integer(item.minutes, 0, phase.minutes) || expectedItems.has(key(phase.id, item.id))) return failure("INVALID_PREVIOUS_PLAN", "previous.phases.items");
      expectedItems.set(key(phase.id, item.id), item.minutes); itemSum += item.minutes;
    }
    if (itemSum !== phase.minutes || expectedItems.size > 500) return failure("INVALID_PREVIOUS_PLAN", "previous.phases.items");
    phaseSum += phase.minutes;
  }
  if (phaseSum !== previous.totalMinutes) return failure("INVALID_PREVIOUS_PLAN", "previous.phases.minutes");
  const completed: Completed[] = [], dates = new Set<string>(), ids = new Set<string>();
  let capacitySum = 0, allocationSum = 0, allocationCount = 0;
  for (let di = 0; di < previous.days.length; di++) {
    const day = previous.days[di];
    if (!object(day)) return failure("INVALID_PREVIOUS_PLAN", "previous.days");
    const parsed = parseLocalDate(day.date), expectedDate = addDays(start.value, di);
    if (!parsed.ok || !expectedDate.ok || parsed.value !== expectedDate.value || dates.has(parsed.value) || !integer(day.capacityMinutes, 0, 1440) ||
      typeof day.excluded !== "boolean" || day.excluded && day.capacityMinutes !== 0 || !Array.isArray(day.allocations) || day.allocations.length > 500) return failure("INVALID_PREVIOUS_PLAN", "previous.days");
    const expectedWeekday = weekday(parsed.value);
    if (!expectedWeekday.ok || day.weekday !== expectedWeekday.value) return failure("INVALID_PREVIOUS_PLAN", "previous.days.weekday");
    allocationCount += day.allocations.length;
    if (allocationCount > 20_000) return failure("INVALID_PREVIOUS_PLAN", "previous.days.allocations");
    dates.add(parsed.value); let used = 0;
    for (const allocation of day.allocations) {
      if (!object(allocation) || !identifier(allocation.phaseId) || !identifier(allocation.itemId) || !integer(allocation.minutes, 1, 1440) ||
        !integer(allocation.completedMinutes, 0, allocation.minutes) || allocation.id !== allocationId(parsed.value, allocation.phaseId, allocation.itemId) || ids.has(allocation.id as string)) return failure("INVALID_PREVIOUS_PLAN", "previous.days.allocations");
      ids.add(allocation.id as string); used += allocation.minutes;
      const k = key(allocation.phaseId, allocation.itemId);
      if (!expectedItems.has(k)) return failure("INVALID_PREVIOUS_PLAN", "previous.days.allocations");
      actualItems.set(k, (actualItems.get(k) ?? 0) + allocation.minutes);
      if (allocation.completedMinutes) completed.push({ date: parsed.value, phaseId: allocation.phaseId, itemId: allocation.itemId, minutes: allocation.completedMinutes });
    }
    if (used > day.capacityMinutes || day.allocatedMinutes !== used) return failure("INVALID_PREVIOUS_PLAN", "previous.days.allocatedMinutes");
    capacitySum += day.capacityMinutes; allocationSum += used;
  }
  if (capacitySum !== previous.capacityMinutes || allocationSum !== previous.totalMinutes || [...expectedItems].some(([k, minutes]) => (actualItems.get(k) ?? 0) !== minutes)) return failure("INVALID_PREVIOUS_PLAN", "previous.totalMinutes");
  return success({ qualificationId: previous.qualificationId, stage: previous.stage as string, completed });
}

/** Explicit proposal only: no storage writes or silent changes to prior work. */
export function recalculatePlan(previous: unknown, input: unknown, clock: unknown, choice?: "preserve" | "reset", options: PlannerOptions = {}): Result<StudyPlan> {
  const prior = readCompleted(previous);
  if (!prior.ok) return prior;
  if (choice !== undefined && choice !== "preserve" && choice !== "reset") return failure("INVALID_COMPLETED_DECISION", "completionDecision");
  if (prior.value.completed.length > 0 && choice === undefined) return failure("COMPLETED_DECISION_REQUIRED", "completionDecision");
  const valid = validate(input, clock, options, { completed: choice === "preserve" ? prior.value.completed : [] });
  if (!valid.ok) return valid;
  if (prior.value.completed.length && choice === "preserve" && (prior.value.qualificationId !== valid.value.input.qualificationId || prior.value.stage !== valid.value.input.stage)) return failure("COMPLETED_WORK_CONFLICT", "qualificationId", "COMPLETED_SUBJECT_CHANGED");
  const plan = assemble(valid.value, choice === "preserve" ? prior.value.completed : [], choice ?? "none");
  if (plan.ok && choice === "reset" && prior.value.completed.length) return success(plan.value, [...plan.warnings, { code: "COMPLETED_WORK_RESET" }]);
  return plan;
}
