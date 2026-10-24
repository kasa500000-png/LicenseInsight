import "server-only";

import type { Pool, PoolClient } from "pg";

type Row = Record<string, unknown>;
type Stage = "written" | "practical";
export type PageOptions = { page?: number; limit?: number };
export type Page<T> = { items: T[]; page: number; limit: number; hasMore: boolean };

export class PublicRepositoryError extends Error {
  constructor(readonly code: "INVALID_QUERY" | "INVALID_PUBLIC_DATA" | "PUBLIC_READ_UNAVAILABLE") {
    super(code);
    this.name = "PublicRepositoryError";
  }
}

export type ProvenanceDto = {
  sourceId: string;
  sourceUrl: string;
  sourcePublishedAt: string | null;
  dataAsOf: string | null;
  fetchedAt: string;
  validatedAt: string;
  reviewedAt: string;
  verification: "verified";
  revisionHash: string;
};

export type QualificationDto = ProvenanceDto & {
  id: string;
  provider: string;
  qualificationType: string;
  acquisitionTrack: string;
  sourceCode: string;
  canonicalName: string;
  grade: string;
  domain: string;
  slug: string;
  activeState: "active" | "abolished" | "unknown";
  createdAt: string;
  updatedAt: string;
};

export type ExamEventDto = ProvenanceDto & {
  id: string;
  qualificationId: string;
  logicalKey: string;
  year: number;
  round: string;
  stage: Stage;
  eventType: "registration" | "exam" | "result" | "document_submission";
  subtype: "ordinary" | "additional" | "vacancy" | "unknown";
  ordinal: string;
  dateStart: string;
  dateEnd: string;
  startsAt: string | null;
  endsAt: string | null;
  temporalPrecision: "date" | "datetime";
  extent: "single" | "range";
  timezone: "Asia/Seoul";
};

export type PassStatisticDto = ProvenanceDto & {
  id: string;
  qualificationId: string;
  year: number;
  round: string | null;
  stage: Stage;
  acquisitionTrack: string;
  aggregationLevel: "round" | "official_annual";
  // PostgreSQL casts these to text BEFORE the driver or JSON can lose precision.
  examinees: string | null;
  passed: string | null;
  publishedRate: string | null;
  calculatedRate: string | null;
  sourceRateText: string | null;
  sourcePrecision: number | null;
  completeness: "complete" | "partial" | "unknown";
};

export type QualificationDetailDto = ProvenanceDto & {
  id: string;
  qualificationId: string;
  infoType: "eligibility" | "fee" | "criteria" | "description" | "preparation";
  safeText: string;
  numericValue: string | null;
  unit: string | null;
  validFrom: string | null;
  validTo: string | null;
};

export type DatasetStatusDto = {
  scopeKey: string;
  qualificationId: string | null;
  datasetType: "qualifications" | "events" | "statistics" | "details";
  publishedRevisionHash: string | null;
  availability: "available" | "empty" | "unavailable" | "partial";
  freshness: "fresh" | "stale" | "unknown";
  verification: "pending" | "verified" | "review_required";
  lastFetchAt: string | null;
  lastValidatedAt: string | null;
  lastReviewedAt: string | null;
  sourceAsOf: string | null;
  pendingChange: boolean;
  publicNotice: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hashPattern = /^[0-9a-f]{64}$/;
const officialHosts = new Set([
  "www.q-net.or.kr", "q-net.or.kr", "www.data.go.kr", "data.go.kr", "apis.data.go.kr",
  "www.hrdkorea.or.kr", "hrdkorea.or.kr",
]);

function invalidData(): never { throw new PublicRepositoryError("INVALID_PUBLIC_DATA"); }
function text(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== "string") return invalidData();
  return value;
}
function nonempty(row: Row, key: string): string {
  const value = text(row, key);
  if (!value.trim()) return invalidData();
  return value;
}
function nullable<T>(row: Row, key: string, decode: (row: Row, key: string) => T): T | null {
  return row[key] === null ? null : decode(row, key);
}
function oneOf<const T extends string>(row: Row, key: string, values: readonly T[]): T {
  const value = text(row, key);
  if (!values.includes(value as T)) return invalidData();
  return value as T;
}
function integer(row: Row, key: string, minimum: number, maximum: number): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) return invalidData();
  return value;
}
function uuid(row: Row, key: string): string {
  const value = text(row, key);
  if (!uuidPattern.test(value)) return invalidData();
  return value;
}
function hash(row: Row, key: string): string {
  const value = text(row, key);
  if (!hashPattern.test(value)) return invalidData();
  return value;
}
function date(row: Row, key: string): string {
  const value = text(row, key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return invalidData();
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return invalidData();
  return value;
}
function timestamp(row: Row, key: string): string {
  const value = text(row, key);
  if (!/^\d{4}-\d{2}-\d{2}T(?:0\d|1\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{6}Z$/.test(value) || !Number.isFinite(Date.parse(value))) return invalidData();
  date({ date: value.slice(0, 10) }, "date");
  return value;
}
function decimal(row: Row, key: string): string {
  const value = text(row, key);
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return invalidData();
  return value;
}
function rate(row: Row, key: string): string {
  const value = decimal(row, key);
  const [whole, fraction = ""] = value.split(".");
  if (value.startsWith("-") || BigInt(whole) > 100n || (BigInt(whole) === 100n && /[1-9]/.test(fraction))) return invalidData();
  return value;
}
function count(row: Row, key: string): string {
  const value = text(row, key);
  if (!/^(?:0|[1-9]\d*)$/.test(value) || BigInt(value) > 9223372036854775807n) return invalidData();
  return value;
}
function sourceUrl(row: Row, key: string): string {
  const value = text(row, key);
  let url: URL;
  try { url = new URL(value); } catch { return invalidData(); }
  if (url.protocol !== "https:" || !officialHosts.has(url.hostname) || url.username || url.password || url.port || url.hash) return invalidData();
  for (const name of url.searchParams.keys()) {
    if (/servicekey|api_?key|token|secret|authorization/i.test(name)) return invalidData();
  }
  return value;
}
function provenance(row: Row): ProvenanceDto {
  return {
    sourceId: nonempty(row, "source_id"), sourceUrl: sourceUrl(row, "source_url"),
    sourcePublishedAt: nullable(row, "source_published_at", timestamp), dataAsOf: nullable(row, "data_as_of", date),
    fetchedAt: timestamp(row, "fetched_at"), validatedAt: timestamp(row, "validated_at"),
    reviewedAt: timestamp(row, "reviewed_at"), verification: oneOf(row, "verification", ["verified"]),
    revisionHash: hash(row, "revision_hash"),
  };
}
function qualification(row: Row): QualificationDto {
  return { ...provenance(row), id: uuid(row, "id"), provider: nonempty(row, "provider"),
    qualificationType: nonempty(row, "qualification_type"), acquisitionTrack: nonempty(row, "acquisition_track"),
    sourceCode: nonempty(row, "source_code"), canonicalName: nonempty(row, "canonical_name"),
    grade: text(row, "grade"), domain: text(row, "domain"), slug: nonempty(row, "slug"),
    activeState: oneOf(row, "active_state", ["active", "abolished", "unknown"]),
    createdAt: timestamp(row, "created_at"), updatedAt: timestamp(row, "updated_at") };
}
function event(row: Row): ExamEventDto {
  return { ...provenance(row), id: uuid(row, "id"), qualificationId: uuid(row, "qualification_id"),
    logicalKey: nonempty(row, "logical_key"), year: integer(row, "year", 1900, 2200), round: nonempty(row, "round"),
    stage: oneOf(row, "stage", ["written", "practical"]),
    eventType: oneOf(row, "event_type", ["registration", "exam", "result", "document_submission"]),
    subtype: oneOf(row, "subtype", ["ordinary", "additional", "vacancy", "unknown"]), ordinal: nonempty(row, "ordinal"),
    dateStart: date(row, "date_start"), dateEnd: date(row, "date_end"),
    startsAt: nullable(row, "starts_at", timestamp), endsAt: nullable(row, "ends_at", timestamp),
    temporalPrecision: oneOf(row, "temporal_precision", ["date", "datetime"]),
    extent: oneOf(row, "extent", ["single", "range"]), timezone: oneOf(row, "timezone", ["Asia/Seoul"]) };
}
function statistic(row: Row): PassStatisticDto {
  const examinees = nullable(row, "examinees", count);
  const passed = nullable(row, "passed", count);
  if (examinees !== null && passed !== null && BigInt(passed) > BigInt(examinees)) return invalidData();
  return { ...provenance(row), id: uuid(row, "id"), qualificationId: uuid(row, "qualification_id"),
    year: integer(row, "year", 1900, 2200), round: nullable(row, "round", text),
    stage: oneOf(row, "stage", ["written", "practical"]), acquisitionTrack: nonempty(row, "acquisition_track"),
    aggregationLevel: oneOf(row, "aggregation_level", ["round", "official_annual"]), examinees, passed,
    publishedRate: nullable(row, "published_rate", rate), calculatedRate: nullable(row, "calculated_rate", rate),
    sourceRateText: nullable(row, "source_rate_text", text),
    sourcePrecision: nullable(row, "source_precision", (r, k) => integer(r, k, 0, 10)),
    completeness: oneOf(row, "completeness", ["complete", "partial", "unknown"]) };
}
function detail(row: Row): QualificationDetailDto {
  return { ...provenance(row), id: uuid(row, "id"), qualificationId: uuid(row, "qualification_id"),
    infoType: oneOf(row, "info_type", ["eligibility", "fee", "criteria", "description", "preparation"]),
    safeText: text(row, "safe_text"), numericValue: nullable(row, "numeric_value", decimal),
    unit: nullable(row, "unit", text), validFrom: nullable(row, "valid_from", date), validTo: nullable(row, "valid_to", date) };
}
function datasetStatus(row: Row): DatasetStatusDto {
  if (typeof row.pending_change !== "boolean") return invalidData();
  return { scopeKey: nonempty(row, "scope_key"), qualificationId: nullable(row, "qualification_id", uuid),
    datasetType: oneOf(row, "dataset_type", ["qualifications", "events", "statistics", "details"]),
    publishedRevisionHash: nullable(row, "published_revision_hash", hash),
    availability: oneOf(row, "availability", ["available", "empty", "unavailable", "partial"]),
    freshness: oneOf(row, "freshness", ["fresh", "stale", "unknown"]),
    verification: oneOf(row, "verification", ["pending", "verified", "review_required"]),
    lastFetchAt: nullable(row, "last_fetch_at", timestamp), lastValidatedAt: nullable(row, "last_validated_at", timestamp),
    lastReviewedAt: nullable(row, "last_reviewed_at", timestamp), sourceAsOf: nullable(row, "source_as_of", date),
    pendingChange: row.pending_change, publicNotice: nullable(row, "public_notice", text) };
}

// These are fixed source-code SQL fragments, never caller-controlled identifiers.
function utc(column: string): string {
  return `to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as ${column}`;
}
const provenanceSql = `source_id, source_url, ${utc("source_published_at")}, data_as_of::text,
  ${utc("fetched_at")}, ${utc("validated_at")}, ${utc("reviewed_at")}, verification, revision_hash`;
const qualificationSql = `select id, provider, qualification_type, acquisition_track, source_code,
  canonical_name, grade, domain, slug, active_state, ${utc("created_at")}, ${utc("updated_at")}, ${provenanceSql}
  from public.qualifications where id = $1 limit 1`;
const qualificationBySlugSql = qualificationSql.replace("where id = $1", "where slug = $1");
const eventsSql = `select id, qualification_id, logical_key, year, round, stage, event_type, subtype, ordinal,
  date_start::text, date_end::text, ${utc("starts_at")}, ${utc("ends_at")}, temporal_precision, extent, timezone,
  ${provenanceSql} from public.exam_events where qualification_id = $1 and year = $2
  order by date_start, id limit $3 offset $4`;
const statisticsSql = `select id, qualification_id, year, round, stage, acquisition_track, aggregation_level,
  examinees::text, passed::text, published_rate::text, calculated_rate::text, source_rate_text, source_precision,
  completeness, ${provenanceSql} from public.pass_statistics where qualification_id = $1 and year = $2
  order by year desc, stage, aggregation_level, round nulls first, id limit $3 offset $4`;
const detailsSql = `select id, qualification_id, info_type, safe_text, numeric_value::text, unit,
  valid_from::text, valid_to::text, ${provenanceSql} from public.qualification_details where qualification_id = $1
  order by info_type, id limit $2 offset $3`;
const statusesSql = `select scope_key, qualification_id, dataset_type, published_revision_hash, availability,
  freshness, verification, ${utc("last_fetch_at")}, ${utc("last_validated_at")}, ${utc("last_reviewed_at")},
  source_as_of::text, pending_change, public_notice from public.dataset_status where qualification_id = $1
  order by scope_key limit $2 offset $3`;

function validateId(id: string): void {
  if (typeof id !== "string" || !uuidPattern.test(id)) throw new PublicRepositoryError("INVALID_QUERY");
}
function validateSlug(slug: string): void {
  if (typeof slug !== "string" || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new PublicRepositoryError("INVALID_QUERY");
  }
}
function validateYear(year: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new PublicRepositoryError("INVALID_QUERY");
}
function pagination(options: PageOptions): { page: number; limit: number; offset: number } {
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new PublicRepositoryError("INVALID_QUERY");
  }
  return { page, limit, offset: (page - 1) * limit };
}

/** Reads reviewed public projections only. Never fetches an upstream public API. */
export class PublicRepository {
  constructor(private readonly pool: Pool) {}

  private async read<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
    let client: PoolClient | undefined;
    let destroy = false;
    try {
      client = await this.pool.connect();
      await client.query("begin read only");
      await client.query("set local role anon");
      await client.query("set local search_path = pg_catalog");
      await client.query("set local datestyle = 'ISO, YMD'");
      const value = await run(client);
      await client.query("commit");
      return value;
    } catch (error) {
      if (client) {
        try { await client.query("rollback"); } catch { destroy = true; }
      }
      // Do not leak driver errors, SQL, connection strings, or returned raw rows.
      if (error instanceof PublicRepositoryError) throw error;
      throw new PublicRepositoryError("PUBLIC_READ_UNAVAILABLE");
    } finally {
      client?.release(destroy);
    }
  }

  async getQualification(id: string): Promise<QualificationDto | null> {
    validateId(id);
    return this.read(async (client) => {
      const { rows } = await client.query<Row>(qualificationSql, [id]);
      if (rows.length > 1) return invalidData();
      return rows.length ? qualification(rows[0]) : null;
    });
  }

  async getQualificationBySlug(slug: string): Promise<QualificationDto | null> {
    validateSlug(slug);
    return this.read(async (client) => {
      const { rows } = await client.query<Row>(qualificationBySlugSql, [slug]);
      if (rows.length > 1) return invalidData();
      return rows.length ? qualification(rows[0]) : null;
    });
  }

  private async list<T>(sql: string, values: (string | number)[], options: PageOptions,
    decode: (row: Row) => T): Promise<Page<T>> {
    const { page, limit, offset } = pagination(options);
    return this.read(async (client) => {
      const { rows } = await client.query<Row>(sql, [...values, limit + 1, offset]);
      if (rows.length > limit + 1) return invalidData();
      return { items: rows.slice(0, limit).map(decode), page, limit, hasMore: rows.length > limit };
    });
  }

  listEvents(id: string, year: number, options: PageOptions = {}): Promise<Page<ExamEventDto>> {
    validateId(id); validateYear(year);
    return this.list(eventsSql, [id, year], options, event);
  }
  listStatistics(id: string, year: number, options: PageOptions = {}): Promise<Page<PassStatisticDto>> {
    validateId(id); validateYear(year);
    return this.list(statisticsSql, [id, year], options, statistic);
  }
  listDetails(id: string, options: PageOptions = {}): Promise<Page<QualificationDetailDto>> {
    validateId(id);
    return this.list(detailsSql, [id], options, detail);
  }
  listDatasetStatuses(id: string, options: PageOptions = {}): Promise<Page<DatasetStatusDto>> {
    validateId(id);
    return this.list(statusesSql, [id], options, datasetStatus);
  }
}
