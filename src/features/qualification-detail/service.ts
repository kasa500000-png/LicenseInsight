import "server-only";

import type { DatasetStatusDto, ExamEventDto, Page, PassStatisticDto, ProvenanceDto, QualificationDetailDto, QualificationDto } from "../../data/repositories/public-repository";
import { evaluateSchedule, selectNextEvent, todayInSeoul, type Clock, type ScheduleEvent, type Stage } from "../../domain/date";
import { formatRate, summarizeStatistics } from "../../domain/statistics";
import type { DetailEvent, DetailLoadResult, DetailRepository, DetailServiceOptions, DetailStatisticGroup, QualificationDetailService, Section, SectionState } from "./model";
import { isOfficialUrl } from "./official-url";

const PAGE_SIZE = 50;
const MAX_PAGES = 10;
const stages: readonly Stage[] = ["written", "practical"];
const validSlug = (slug: unknown): slug is string => typeof slug === "string" && slug.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
const validYears = (years: readonly number[], maximum: number) => years.length > 0 && years.length <= maximum && new Set(years).size === years.length && years.every(year => Number.isInteger(year) && year >= 1900 && year <= 2200);
function invalid(): never { throw new Error("INVALID_PUBLIC_DATA"); }

// Pick fields explicitly: even an injected repository cannot add private properties to a render DTO.
function provenance(row: ProvenanceDto): ProvenanceDto {
  if (!row || row.verification !== "verified" || !isOfficialUrl(row.sourceUrl) || !/^[a-f0-9]{64}$/.test(row.revisionHash)) return invalid();
  return { sourceId: row.sourceId, sourceUrl: row.sourceUrl, sourcePublishedAt: row.sourcePublishedAt, dataAsOf: row.dataAsOf,
    fetchedAt: row.fetchedAt, validatedAt: row.validatedAt, reviewedAt: row.reviewedAt, verification: row.verification, revisionHash: row.revisionHash };
}
function qualification(row: QualificationDto, slug: string): QualificationDto {
  if (!row || row.slug !== slug || !row.id || !row.sourceCode || !row.canonicalName) return invalid();
  return { ...provenance(row), id: row.id, provider: row.provider, qualificationType: row.qualificationType,
    acquisitionTrack: row.acquisitionTrack, sourceCode: row.sourceCode, canonicalName: row.canonicalName,
    grade: row.grade, domain: row.domain, slug: row.slug, activeState: row.activeState, createdAt: row.createdAt, updatedAt: row.updatedAt };
}
function event(row: ExamEventDto, qualificationId: string, year: number): ExamEventDto {
  if (!row || row.qualificationId !== qualificationId || row.year !== year || !stages.includes(row.stage)) return invalid();
  return { ...provenance(row), id: row.id, qualificationId: row.qualificationId, logicalKey: row.logicalKey,
    year: row.year, round: row.round, stage: row.stage, eventType: row.eventType, subtype: row.subtype, ordinal: row.ordinal,
    dateStart: row.dateStart, dateEnd: row.dateEnd, startsAt: row.startsAt, endsAt: row.endsAt,
    temporalPrecision: row.temporalPrecision, extent: row.extent, timezone: row.timezone };
}
function statistic(row: PassStatisticDto, qualificationId: string, year: number): PassStatisticDto {
  if (!row || row.qualificationId !== qualificationId || row.year !== year || !stages.includes(row.stage)) return invalid();
  return { ...provenance(row), id: row.id, qualificationId: row.qualificationId, year: row.year, round: row.round, stage: row.stage,
    acquisitionTrack: row.acquisitionTrack, aggregationLevel: row.aggregationLevel, examinees: row.examinees, passed: row.passed,
    publishedRate: row.publishedRate, calculatedRate: row.calculatedRate, sourceRateText: row.sourceRateText,
    sourcePrecision: row.sourcePrecision, completeness: row.completeness };
}
function detail(row: QualificationDetailDto, qualificationId: string): QualificationDetailDto {
  if (!row || row.qualificationId !== qualificationId) return invalid();
  return { ...provenance(row), id: row.id, qualificationId: row.qualificationId, infoType: row.infoType,
    safeText: row.safeText, numericValue: row.numericValue, unit: row.unit, validFrom: row.validFrom, validTo: row.validTo };
}
function status(row: DatasetStatusDto, qualificationId: string): DatasetStatusDto {
  if (!row || row.qualificationId !== qualificationId || !["qualifications", "events", "statistics", "details"].includes(row.datasetType)
    || !["available", "empty", "unavailable", "partial"].includes(row.availability) || !["fresh", "stale", "unknown"].includes(row.freshness)
    || !["verified", "pending", "review_required"].includes(row.verification) || typeof row.pendingChange !== "boolean") return invalid();
  return { scopeKey: row.scopeKey, qualificationId: row.qualificationId, datasetType: row.datasetType,
    publishedRevisionHash: row.publishedRevisionHash, availability: row.availability, freshness: row.freshness,
    verification: row.verification, lastFetchAt: row.lastFetchAt, lastValidatedAt: row.lastValidatedAt,
    lastReviewedAt: row.lastReviewedAt, sourceAsOf: row.sourceAsOf, pendingChange: row.pendingChange, publicNotice: row.publicNotice };
}

type ReadRows<T> = { rows: T[]; paginationComplete: boolean; failed: boolean; warnings: string[] };
const readState = <T>(read: ReadRows<T>): SectionState => read.failed ? read.rows.length ? "partial" : "unavailable" : !read.paginationComplete ? "partial" : read.rows.length ? "available" : "empty";
function mergeReads<T>(reads: readonly ReadRows<T>[]): ReadRows<T> {
  return { rows: reads.flatMap(read => read.rows), paginationComplete: reads.every(read => read.paginationComplete),
    failed: reads.some(read => read.failed), warnings: [...new Set(reads.flatMap(read => read.warnings))] };
}
function section<T>(read: ReadRows<T>): Section<T> {
  return { state: readState(read), paginationComplete: read.paginationComplete, rows: read.rows, warnings: read.warnings };
}
type Health = { ready: boolean; pending: boolean; stale: boolean; warnings: string[] };
function health(type: DatasetStatusDto["datasetType"], statuses: ReadRows<DatasetStatusDto>): Health {
  const matching = statuses.rows.filter(row => row.datasetType === type || row.datasetType === "qualifications");
  const own = matching.filter(row => row.datasetType === type);
  const pending = matching.some(row => row.pendingChange || row.verification !== "verified");
  const stale = matching.some(row => row.freshness === "stale");
  const ready = statuses.paginationComplete && !statuses.failed && own.length > 0 && matching.every(row => row.verification === "verified"
    && !row.pendingChange && row.freshness === "fresh" && row.availability === "available");
  return { ready, pending, stale, warnings: ready ? [] : [pending ? "PENDING_CHANGE_OR_REVIEW" : stale ? "STALE_DATASET" : "DATASET_STATUS_UNCONFIRMED"] };
}
function scheduleInput(row: ExamEventDto, dataset: Health): ScheduleEvent {
  return { id: row.id, stage: row.stage, eventType: row.eventType,
    // PublicRepository only reads the verified, reviewed published event projection.
    scheduleStatus: "announced", verification: dataset.ready || dataset.stale ? "verified" : "review_required",
    lastValidatedAt: row.validatedAt, pendingChange: dataset.pending,
    dateStart: row.dateStart, dateEnd: row.dateEnd, startsAt: row.startsAt, endsAt: row.endsAt,
    temporalPrecision: row.temporalPrecision, extent: row.extent, timezone: row.timezone, calendarExceptions: "unknown" };
}
function renderStatistics(rows: readonly PassStatisticDto[], referenceYear: number, complete: boolean, dataset: Health,
  options: DetailServiceOptions): DetailStatisticGroup[] {
  const grouped = new Map<string, PassStatisticDto[]>();
  for (const row of rows) {
    const key = JSON.stringify([row.year, row.stage, row.acquisitionTrack]);
    const group = grouped.get(key) ?? []; group.push(row); grouped.set(key, group);
  }
  return [...grouped.values()].map((groupRows): DetailStatisticGroup => {
    const first = groupRows[0];
    const base = { year: first.year, stage: first.stage, acquisitionTrack: first.acquisitionTrack,
      population: null, rows: groupRows.map(source => ({ source, domain: null, formattedRate: null })), summary: null, formattedDerivedRate: null };
    const evidence = options.mode === "synthetic" && options.syntheticEvidence?.synthetic === true
      ? options.syntheticEvidence.groups.filter(item => item.qualificationId === first.qualificationId && item.acquisitionTrack === first.acquisitionTrack && item.year === first.year && item.stage === first.stage) : [];
    if (evidence.length === 0) return { ...base, reason: "POPULATION_UNCONFIRMED" };
    const reviewed = evidence[0];
    const revisions = [...new Set(groupRows.map(row => row.revisionHash))].sort();
    if (evidence.length !== 1 || !reviewed.population.trim() || new Set(reviewed.revisionHashes).size !== reviewed.revisionHashes.length
      || JSON.stringify([...reviewed.revisionHashes].sort()) !== JSON.stringify(revisions)) return { ...base, reason: "EVIDENCE_MISMATCH" };
    const group = { qualificationId: first.qualificationId, acquisitionTrack: first.acquisitionTrack, stage: first.stage,
      year: first.year, population: reviewed.population };
    const summary = summarizeStatistics({ group, referenceYear,
      coverage: { expectedRounds: reviewed.expectedRounds, confirmed: reviewed.coverageConfirmed && complete && dataset.ready },
      records: groupRows.map(row => ({ group, sourceId: row.sourceId,
        logicalKey: JSON.stringify([row.qualificationId, row.year, row.stage, row.acquisitionTrack, row.aggregationLevel, row.round]),
        revision: row.revisionHash, aggregationLevel: row.aggregationLevel, round: row.round, examinees: row.examinees, passed: row.passed,
        publishedRate: row.publishedRate, sourceRateText: row.sourceRateText, sourcePrecision: row.sourcePrecision,
        roundingMethod: reviewed.roundingMethod, verification: dataset.ready ? row.verification : "pending",
        completeness: complete && dataset.ready ? row.completeness : "partial" })) });
    if (!summary.ok) return { ...base, population: reviewed.population, reason: "INVALID_STATISTICS" };
    const domainRows = [...summary.value.rounds, ...summary.value.officialAnnual];
    const derivedRate = formatRate(summary.value.derivedAnnual.rate);
    return { ...base, population: reviewed.population, summary: summary.value,
      rows: groupRows.map(source => {
        const domain = domainRows.find(row => row.sourceId === source.sourceId && row.revision === source.revisionHash
          && row.round === source.round && row.aggregationLevel === source.aggregationLevel) ?? null;
        const formatted = formatRate(domain?.effectiveVerification === "verified" && dataset.ready ? domain.calculatedRate : null);
        return { source, domain, formattedRate: formatted.ok ? formatted.value : null };
      }), formattedDerivedRate: derivedRate.ok && dataset.ready && complete ? derivedRate.value : null,
      reason: !dataset.ready || !complete ? "DATASET_NOT_READY" : summary.value.reviewRequired ? "REVIEW_REQUIRED" : null };
  }).sort((a, b) => b.year - a.year || a.stage.localeCompare(b.stage) || a.acquisitionTrack.localeCompare(b.acquisitionTrack));
}

/** Construct once inside a request. Only raw reads are memoized; no module/global/cross-request cache. */
export function createQualificationDetailService(repository: DetailRepository, options: DetailServiceOptions): QualificationDetailService {
  const reads = new Map<string, Promise<unknown>>();
  async function memo<T>(key: string, run: () => Promise<T>): Promise<T> {
    if (reads.has(key)) return reads.get(key) as Promise<T>;
    const pending = run().then(value => { if (value === null) reads.delete(key); return value; }, () => { reads.delete(key); return invalid(); });
    reads.set(key, pending);
    return pending;
  }
  async function pages<T>(key: string, fetch: (page: number) => Promise<Page<T>>, project: (row: T) => T): Promise<ReadRows<T>> {
    const rows: T[] = [];
    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const result = await memo(`${key}:${page}`, async () => {
          const value = await fetch(page);
          if (!value || !Array.isArray(value.items) || value.items.length > PAGE_SIZE || value.page !== page || value.limit !== PAGE_SIZE
            || typeof value.hasMore !== "boolean" || value.hasMore && value.items.length !== PAGE_SIZE) return invalid();
          return { ...value, items: value.items.map(project) };
        });
        rows.push(...result.items);
        if (!result.hasMore) return { rows, paginationComplete: true, failed: false, warnings: [] };
      }
      return { rows, paginationComplete: false, failed: false, warnings: ["PAGINATION_TRUNCATED"] };
    } catch { return { rows, paginationComplete: false, failed: true, warnings: ["PUBLIC_READ_UNAVAILABLE"] }; }
  }
  return { async loadDetail(slug: string, clock: Clock): Promise<DetailLoadResult> {
    const today = todayInSeoul(clock);
    if (!validSlug(slug) || !today.ok || !options || !["live", "synthetic"].includes(options.mode)
      || options.mode === "live" && options.syntheticEvidence !== undefined) return { kind: "invalid-query" };
    const referenceYear = Number(today.value.slice(0, 4));
    const eventYears = options.eventYears ?? [referenceYear, referenceYear + 1];
    const statisticsYears = options.statisticsYears ?? Array.from({ length: 6 }, (_, index) => referenceYear - index);
    if (!validYears(eventYears, 2) || !validYears(statisticsYears, 6)) return { kind: "invalid-query" };
    let found: QualificationDto | null;
    try { found = await memo(`qualification:${slug}`, async () => {
      const value = await repository.getQualificationBySlug(slug);
      return value === null ? null : qualification(value, slug);
    }); } catch { return { kind: "unavailable" }; }
    if (!found) return { kind: "not-found" };
    const id = found.id;
    const [eventReads, statisticReads, detailsRead, statusesRead] = await Promise.all([
      Promise.all(eventYears.map(year => pages(`events:${id}:${year}`, page => repository.listEvents(id, year, { page, limit: PAGE_SIZE }), row => event(row, id, year)))),
      Promise.all(statisticsYears.map(year => pages(`statistics:${id}:${year}`, page => repository.listStatistics(id, year, { page, limit: PAGE_SIZE }), row => statistic(row, id, year)))),
      pages(`details:${id}`, page => repository.listDetails(id, { page, limit: PAGE_SIZE }), row => detail(row, id)),
      pages(`statuses:${id}`, page => repository.listDatasetStatuses(id, { page, limit: PAGE_SIZE }), row => status(row, id)),
    ]);
    const eventsRead = mergeReads(eventReads), statisticsRead = mergeReads(statisticReads);
    const eventHealth = health("events", statusesRead), statisticHealth = health("statistics", statusesRead), detailHealth = health("details", statusesRead);
    const eventRows: DetailEvent[] = [];
    const inputs: ScheduleEvent[] = [];
    const eventIds = new Set<string>();
    let invalidEvents = false;
    for (const source of eventsRead.rows) {
      const input = scheduleInput(source, eventHealth);
      const evaluation = evaluateSchedule(input, clock);
      if (!evaluation.ok || eventIds.has(source.id)) { invalidEvents = true; continue; }
      eventIds.add(source.id);
      // Dataset staleness can be broader than a row timestamp; suppress all candidate claims.
      const conservative = !eventHealth.ready || !eventsRead.paginationComplete || eventsRead.failed;
      const evaluated = conservative ? { ...evaluation.value, countdown: null, currentRegistrationCandidate: false, nextActionEligible: false,
        ...(eventHealth.stale && !eventHealth.pending ? { dataState: "stale" as const, state: "STALE" as const } : {}) } : evaluation.value;
      eventRows.push({ source, evaluation: evaluated, warnings: [...evaluation.warnings.map(warning => warning.code), ...eventHealth.warnings] });
      inputs.push(input);
    }
    const nextByStage: Record<Stage, DetailEvent | null> = { written: null, practical: null };
    if (!invalidEvents && eventHealth.ready && eventsRead.paginationComplete && !eventsRead.failed) for (const stage of stages) {
      const next = selectNextEvent(inputs, stage, clock);
      if (next.ok && next.value) nextByStage[stage] = eventRows.find(row => row.source.id === next.value?.id) ?? null;
    }
    const groups = renderStatistics(statisticsRead.rows, referenceYear, statisticsRead.paginationComplete && !statisticsRead.failed, statisticHealth, options);
    const statsWarnings = [...statisticsRead.warnings, ...statisticHealth.warnings,
      ...new Set(groups.flatMap(group => group.reason ? [group.reason] : []))];
    const eventsState = readState(eventsRead), statsState = readState(statisticsRead), detailsState = readState(detailsRead);
    const result: DetailLoadResult = { kind: "ok", value: { mode: options.mode, evaluatedAt: clock.now, today: today.value,
      qualification: found,
      events: { state: eventsState === "available" && (invalidEvents || !eventHealth.ready) ? "partial" : eventsState,
        paginationComplete: eventsRead.paginationComplete, rows: eventRows, nextByStage,
        warnings: [...eventsRead.warnings, ...eventHealth.warnings, ...(invalidEvents ? ["INVALID_EVENT_WITHHELD"] : [])] },
      statistics: { state: statsState === "available" && statsWarnings.length ? "partial" : statsState,
        paginationComplete: statisticsRead.paginationComplete, groups, warnings: statsWarnings },
      details: { ...section(detailsRead), state: detailsState === "available" && !detailHealth.ready ? "partial" : detailsState,
        warnings: [...detailsRead.warnings, ...detailHealth.warnings] }, statuses: section(statusesRead) } };
    return structuredClone(result);
  } };
}
