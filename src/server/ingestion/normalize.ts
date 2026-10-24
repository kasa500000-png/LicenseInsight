import "server-only";
import type { Json } from "@/data/database.types";
import type { CandidateRecord, CollectionScope, NormalizedRecord } from "./contracts";
import { hashJson, sanitize } from "./safety";

export class ValidationError extends Error {
  constructor(readonly code: string) { super(code); this.name = "ValidationError"; }
}
const fail = (code: string): never => { throw new ValidationError(code); };
const common = ["source_url", "source_published_at", "data_as_of"];
const fields = {
  qualification: [...common, "provider", "qualification_type", "acquisition_track", "source_code", "canonical_name", "grade", "domain", "slug", "active_state"],
  event: [...common, "qualification_id", "year", "round", "stage", "event_type", "subtype", "ordinal", "date_start", "date_end", "starts_at", "ends_at", "temporal_precision", "extent", "timezone"],
  statistic: [...common, "qualification_id", "year", "round", "stage", "acquisition_track", "aggregation_level", "examinees", "passed", "published_rate", "source_rate_text", "source_precision", "completeness"],
  detail: [...common, "qualification_id", "info_type", "safe_text", "numeric_value", "unit", "valid_from", "valid_to"],
} as const;
const datasetFor = { qualification: "qualifications", event: "events", statistic: "statistics", detail: "details" } as const;
const officialHosts = new Set(["q-net.or.kr", "www.q-net.or.kr", "data.go.kr", "www.data.go.kr", "apis.data.go.kr", "hrdkorea.or.kr", "www.hrdkorea.or.kr"]);

function text(value: unknown, max = 1000): string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max &&
    ![...value].some(c => c.charCodeAt(0) < 32 && ![9, 10, 13].includes(c.charCodeAt(0))) ? value : fail("INVALID_TEXT");
}
function member<T extends string>(value: unknown, values: readonly T[]): T {
  return values.includes(value as T) ? value as T : fail("INVALID_ENUM");
}
function date(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fail("INVALID_DATE");
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value ? value : fail("INVALID_DATE");
}
function timestamp(value: unknown): string {
  const s = text(value, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(s)) return fail("INVALID_TIMESTAMP");
  date(s.slice(0, 10));
  const parsed = new Date(s);
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : fail("INVALID_TIMESTAMP");
}
function integer(value: unknown, min: number, max: number): number {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= max ? n : fail("INVALID_INTEGER");
}
function count(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) value = String(value);
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value) || BigInt(value) > 9223372036854775807n) return fail("INVALID_COUNT");
  return value;
}
function decimal(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !/^-?(0|[1-9]\d*)(?:\.\d+)?$/.test(value) || value.length > 80) return fail("INVALID_DECIMAL");
  return value;
}
function url(value: unknown, secrets: string[]): string {
  const s = text(value, 2048);
  let parsed: URL;
  try { parsed = new URL(s); } catch { return fail("INVALID_SOURCE_URL"); }
  if (parsed.protocol !== "https:" || !officialHosts.has(parsed.hostname) || parsed.username || parsed.password || parsed.hash || parsed.port ||
    [...parsed.searchParams.keys()].some(k => /^(servicekey|api_?key|access_token|token)$/i.test(k)) || sanitize(s, secrets) !== s) return fail("INVALID_SOURCE_URL");
  return parsed.href;
}
const seoulDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });

export function stableEventKey(identity: {
  sourceRecordKey?: string; qualificationCode: string; year: number; round: string;
  stage: string; eventType: string; subtype: string; ordinal: string;
}): string {
  // Dates are deliberately absent, so a correction updates one event identity.
  return hashJson(identity.sourceRecordKey ? { sourceRecordKey: identity.sourceRecordKey } : {
    qualificationCode: identity.qualificationCode, year: identity.year, round: identity.round,
    stage: identity.stage, eventType: identity.eventType, subtype: identity.subtype, ordinal: identity.ordinal,
  });
}

export function normalizeRecord(candidate: CandidateRecord, scope: CollectionScope, options: {
  fetchedAt: string; validatedAt: string; sourceUrl: string; secrets?: string[];
}): NormalizedRecord {
  if (!Object.hasOwn(fields, candidate.entityType) || datasetFor[candidate.entityType] !== scope.datasetType) return fail("ENTITY_SCOPE_MISMATCH");
  const sourceCode = text(candidate.sourceCode, 100), sourceName = text(candidate.sourceName), sourceGrade = text(candidate.sourceGrade, 100);
  const logicalKey = text(candidate.logicalKey, 512);
  const raw = candidate.payload;
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.getPrototypeOf(raw) !== Object.prototype) return fail("INVALID_RECORD");
  for (const key of Object.keys(raw)) if (!(fields[candidate.entityType] as readonly string[]).includes(key)) return fail("UNEXPECTED_FIELD");
  const secrets = options.secrets ?? [];
  const payload: Record<string, Json> = {
    qualification_id: scope.qualificationId,
    source_id: scope.sourceId, source_url: url(raw.source_url ?? options.sourceUrl, secrets),
    source_published_at: raw.source_published_at == null ? null : timestamp(raw.source_published_at),
    data_as_of: raw.data_as_of == null ? null : date(raw.data_as_of),
    fetched_at: timestamp(options.fetchedAt), validated_at: timestamp(options.validatedAt),
  };
  if (candidate.entityType !== "qualification") {
    if (raw.qualification_id !== undefined && raw.qualification_id !== scope.qualificationId) return fail("QUALIFICATION_SCOPE_MISMATCH");
  }
  if (candidate.entityType === "qualification") {
    for (const key of ["provider", "qualification_type", "acquisition_track", "canonical_name", "grade", "domain", "slug"] as const) payload[key] = text(raw[key]);
    if (raw.source_code !== sourceCode || raw.canonical_name !== sourceName || raw.grade !== sourceGrade || raw.acquisition_track !== scope.acquisitionTrack) return fail("IDENTITY_MISMATCH");
    payload.source_code = sourceCode;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(payload.slug as string)) return fail("INVALID_SLUG");
    payload.active_state = member(raw.active_state, ["active", "abolished", "unknown"]);
  } else if (candidate.entityType === "event") {
    payload.logical_key = logicalKey;
    payload.year = integer(raw.year, 1900, 2200);
    if (payload.year !== scope.year) return fail("YEAR_SCOPE_MISMATCH");
    payload.round = text(raw.round, 100);
    payload.stage = member(raw.stage, ["written", "practical"]);
    payload.event_type = member(raw.event_type, ["registration", "exam", "result", "document_submission"]);
    payload.subtype = member(raw.subtype, ["ordinary", "additional", "vacancy", "unknown"]);
    payload.ordinal = text(raw.ordinal, 100);
    payload.date_start = date(raw.date_start); payload.date_end = date(raw.date_end);
    payload.extent = member(raw.extent, ["single", "range"]);
    payload.temporal_precision = member(raw.temporal_precision, ["date", "datetime"]);
    payload.timezone = member(raw.timezone, ["Asia/Seoul"]);
    if (payload.date_end < payload.date_start || payload.extent === "single" && payload.date_start !== payload.date_end) return fail("REVERSED_DATE_RANGE");
    if (payload.temporal_precision === "date") {
      if (raw.starts_at != null || raw.ends_at != null) return fail("INVENTED_TIME");
      payload.starts_at = null; payload.ends_at = null;
    } else {
      payload.starts_at = timestamp(raw.starts_at); payload.ends_at = timestamp(raw.ends_at);
      if (payload.ends_at < payload.starts_at || seoulDate.format(new Date(payload.starts_at)) !== payload.date_start || seoulDate.format(new Date(payload.ends_at)) !== payload.date_end) return fail("TIMESTAMP_DATE_MISMATCH");
    }
  } else if (candidate.entityType === "statistic") {
    payload.year = integer(raw.year, 1900, 2200);
    if (payload.year !== scope.year || raw.acquisition_track !== scope.acquisitionTrack) return fail("STATISTIC_SCOPE_MISMATCH");
    payload.round = raw.round === null ? null : text(raw.round, 100);
    payload.stage = member(raw.stage, ["written", "practical"]);
    payload.acquisition_track = text(raw.acquisition_track);
    payload.aggregation_level = member(raw.aggregation_level, ["round", "official_annual"]);
    if ((payload.aggregation_level === "official_annual") !== (payload.round === null)) return fail("INVALID_AGGREGATION");
    payload.examinees = count(raw.examinees); payload.passed = count(raw.passed);
    if (payload.examinees !== null && payload.passed !== null && BigInt(payload.passed) > BigInt(payload.examinees)) return fail("INVALID_COUNTS");
    payload.published_rate = decimal(raw.published_rate);
    payload.source_rate_text = raw.source_rate_text == null ? null : text(raw.source_rate_text, 100);
    payload.source_precision = raw.source_precision == null ? null : integer(raw.source_precision, 0, 10);
    payload.completeness = member(raw.completeness, ["complete", "partial", "unknown"]);
    if (payload.published_rate !== null) {
      const [whole, fraction = ""] = payload.published_rate.split(".");
      const scale = 10n ** BigInt(fraction.length), rate = BigInt(whole + fraction);
      if (rate < 0 || rate > 100n * scale) return fail("INVALID_RATE");
      if (payload.examinees !== null && payload.passed !== null && BigInt(payload.examinees) > 0n) {
        if (payload.source_precision === null) return fail("RATE_PRECISION_REQUIRED");
        const denominator = BigInt(payload.examinees);
        const difference = BigInt(payload.passed) * 100n * scale - rate * denominator;
        const absolute = difference < 0 ? -difference : difference;
        if (2n * absolute * 10n ** BigInt(payload.source_precision) > denominator * scale) return fail("RATE_MISMATCH");
      }
    }
  } else {
    payload.info_type = member(raw.info_type, ["eligibility", "fee", "criteria", "description", "preparation"]);
    payload.safe_text = text(raw.safe_text, 20_000); // Render as plain text only.
    payload.numeric_value = decimal(raw.numeric_value ?? null);
    payload.unit = raw.unit == null ? null : text(raw.unit, 100);
    payload.valid_from = raw.valid_from == null ? null : date(raw.valid_from);
    payload.valid_to = raw.valid_to == null ? null : date(raw.valid_to);
    if (payload.valid_from !== null && payload.valid_to !== null && payload.valid_to < payload.valid_from) return fail("REVERSED_DATE_RANGE");
  }
  const cleaned = sanitize(payload, secrets);
  if (JSON.stringify(cleaned) !== JSON.stringify(payload) || sanitize(sourceName, secrets) !== sourceName || sanitize(sourceCode, secrets) !== sourceCode || sanitize(sourceGrade, secrets) !== sourceGrade || sanitize(logicalKey, secrets) !== logicalKey) return fail("SECRET_IN_RECORD");
  return { entityType: candidate.entityType, logicalKey, sourceCode, sourceName, sourceGrade, payload };
}
