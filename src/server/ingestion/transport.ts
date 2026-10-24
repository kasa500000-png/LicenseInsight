import "server-only";
import { SaxesParser } from "saxes";
import type { AppEnvironment } from "@/config/env";
import { sanitize } from "./safety";

export type IngestionErrorCode =
  | "SOURCE_UNVERIFIED" | "INVALID_REQUEST" | "BUDGET_EXHAUSTED" | "TIMEOUT"
  | "ABORTED" | "NETWORK_ERROR" | "HTTP_ERROR" | "BUSINESS_ERROR"
  | "MALFORMED_PAYLOAD" | "UNSAFE_XML" | "OVERSIZE_PAYLOAD"
  | "LIMIT_EXCEEDED" | "PAGINATION_ERROR";

/** Error messages deliberately contain only a fixed code, no upstream text. */
export class IngestionError extends Error {
  constructor(readonly code: IngestionErrorCode, readonly retryable = false) {
    super(code);
    this.name = "IngestionError";
  }
}

export type TransportContract = Readonly<{
  sourceId: string;
  operation: string;
  endpoint: string;
  allowedHost: string;
  allowedPath: string;
  allowedParameters: readonly string[];
  keyParameter: string;
  keyEncoding: "raw" | "percent-encoded";
  pageParameter: string;
  pageSizeParameter: string;
  format: "json" | "xml";
  successCodes: readonly string[];
  responsePaths: Readonly<{
    header: readonly string[];
    resultCode: readonly string[];
    items: readonly string[];
    totalCount: readonly string[];
    pageNo: readonly string[];
    pageSize: readonly string[];
  }>;
  evidence: "verified" | "synthetic";
  approval: "approved" | "unknown";
}>;

type Limits = {
  maxBytes: number;
  maxDepth: number;
  maxNodes: number;
  maxPages: number;
  maxRecords: number;
  pageSize: number;
  timeoutMs: number;
  maxAttemptsPerPage: number;
  retryDelayMs: number;
};
const DEFAULT_LIMITS: Limits = {
  maxBytes: 1_048_576, maxDepth: 32, maxNodes: 20_000, maxPages: 50,
  maxRecords: 20_000, pageSize: 100, timeoutMs: 10_000,
  maxAttemptsPerPage: 3, retryDelayMs: 250,
};
type Fetch = typeof globalThis.fetch;
export type CollectOptions = {
  contract: TransportContract;
  parameters: Readonly<Record<string, string>>;
  key: string;
  appEnv: AppEnvironment;
  fetch?: Fetch;
  signal?: AbortSignal;
  /** Shared across sources/runs for an explicitly configured quota period. */
  budget: { remaining: number };
  limits?: Partial<Limits>;
  sleep?: (milliseconds: number) => Promise<void>;
  /** Cross-process persisted source/day quota reservation, including retries. */
  onAttempt?: () => Promise<void>;
};
const SAFE_PARAMETER = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const SECRET_PARAMETER = /(?:service.?key|api.?key|auth|token|secret|password)/i;
const UNSAFE_PROPERTY = new Set(["__proto__", "prototype", "constructor"]);
const hasControl = (value: string, includeSpace = false) => [...value].some((character) => {
  const code = character.charCodeAt(0);
  return code <= (includeSpace ? 32 : 31) || code === 127;
});

function fail(code: IngestionErrorCode): never { throw new IngestionError(code); }

function normalizeKey(key: string, encoding: TransportContract["keyEncoding"]): string {
  if (!key || key.length > 4096 || hasControl(key)) fail("INVALID_REQUEST");
  try {
    const decoded = encoding === "percent-encoded" ? decodeURIComponent(key) : key;
    if (hasControl(decoded)) fail("INVALID_REQUEST");
    return decoded;
  }
  catch { return fail("INVALID_REQUEST"); }
}

/** URL is secret-bearing. Only the HTTP adapter may consume it. Never log it. */
export function buildRequest(
  options: Pick<CollectOptions, "contract" | "parameters" | "key" | "appEnv" | "fetch">,
  pageNo: number,
  pageSize: number,
): URL {
  const c = options.contract;
  const synthetic = c.evidence === "synthetic";
  if (synthetic) {
    if (!["test", "local"].includes(options.appEnv) || !options.fetch) fail("SOURCE_UNVERIFIED");
  } else if (c.evidence !== "verified" || c.approval !== "approved") fail("SOURCE_UNVERIFIED");
  if (!c.sourceId || !c.operation || !c.successCodes.length || !["json", "xml"].includes(c.format)
    || !["raw", "percent-encoded"].includes(c.keyEncoding)) fail("INVALID_REQUEST");
  let url: URL;
  try { url = new URL(c.endpoint); } catch { return fail("INVALID_REQUEST"); }
  if (url.protocol !== "https:" || url.hostname !== c.allowedHost || url.pathname !== c.allowedPath
    || url.port || url.username || url.password || url.search || url.hash
    || (synthetic ? url.hostname !== "synthetic.invalid" : url.hostname !== "apis.data.go.kr")
    || c.allowedPath.includes("%") || hasControl(c.endpoint, true) || c.endpoint.includes("\\")) fail("INVALID_REQUEST");
  const reserved = [c.keyParameter, c.pageParameter, c.pageSizeParameter];
  if (new Set(reserved).size !== reserved.length
    || reserved.some((name) => !SAFE_PARAMETER.test(name))
    || c.allowedParameters.some((name) => !SAFE_PARAMETER.test(name) || SECRET_PARAMETER.test(name))) fail("INVALID_REQUEST");
  if (!Number.isSafeInteger(pageNo) || pageNo < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1) fail("INVALID_REQUEST");
  for (const [name, value] of Object.entries(options.parameters)) {
    if (!c.allowedParameters.includes(name) || reserved.includes(name) || typeof value !== "string"
      || value.length > 4096 || hasControl(value)) fail("INVALID_REQUEST");
    url.searchParams.set(name, value);
  }
  for (const path of Object.values(c.responsePaths)) {
    if (!path.length || path.some((segment) => !SAFE_PARAMETER.test(segment) || UNSAFE_PROPERTY.has(segment))) fail("INVALID_REQUEST");
  }
  url.searchParams.set(c.pageParameter, String(pageNo));
  url.searchParams.set(c.pageSizeParameter, String(pageSize));
  url.searchParams.set(c.keyParameter, normalizeKey(options.key, c.keyEncoding));
  return url;
}

function boundedTree(root: unknown, limits: Limits): void {
  const pending = [{ value: root, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (++nodes > limits.maxNodes || depth > limits.maxDepth) fail("LIMIT_EXCEEDED");
    if (typeof value === "number" && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) fail("MALFORMED_PAYLOAD");
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (UNSAFE_PROPERTY.has(key)) fail("MALFORMED_PAYLOAD");
        pending.push({ value: child, depth: depth + 1 });
      }
    }
  }
}

type XmlNode = { name: string; text: string; children: Record<string, unknown> };
function xmlValue(node: XmlNode): unknown {
  const keys = Object.keys(node.children);
  if (!keys.length) return node.text.trim();
  if (node.text.trim()) fail("MALFORMED_PAYLOAD");
  return node.children;
}
function putXml(parent: Record<string, unknown>, name: string, value: unknown) {
  if (!Object.hasOwn(parent, name)) parent[name] = value;
  else if (Array.isArray(parent[name])) (parent[name] as unknown[]).push(value);
  else parent[name] = [parent[name], value];
}

/** Preserve every JSON number token as decimal text; detect duplicate decoded keys. */
function parseExactJson(text: string, limits: Limits): unknown {
  // Native parsing validates syntax only. Its potentially rounded numbers are discarded.
  JSON.parse(text);
  const frames: { object: boolean; key: boolean; keys: Set<string> }[] = [];
  const output: string[] = [];
  for (let i = 0; i < text.length;) {
    const char = text[i];
    if (char === '"') {
      const start = i++;
      while (i < text.length) {
        if (text[i] === "\\") { i += 2; continue; }
        if (text[i++] === '"') break;
      }
      const token = text.slice(start, i);
      const frame = frames.at(-1);
      if (frame?.object && frame.key) {
        const name = JSON.parse(token) as string;
        if (frame.keys.has(name) || UNSAFE_PROPERTY.has(name)) fail("MALFORMED_PAYLOAD");
        frame.keys.add(name);
        frame.key = false;
      }
      output.push(token);
    } else if (char === "{" || char === "[") {
      frames.push({ object: char === "{", key: char === "{", keys: new Set() });
      if (frames.length > limits.maxDepth) fail("LIMIT_EXCEEDED");
      output.push(char); i++;
    } else if (char === "}" || char === "]") {
      frames.pop(); output.push(char); i++;
    } else if (char === ",") {
      const frame = frames.at(-1);
      if (frame?.object) frame.key = true;
      output.push(char); i++;
    } else if (char === "-" || /\d/.test(char ?? "")) {
      const token = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i))?.[0];
      if (!token) fail("MALFORMED_PAYLOAD");
      output.push(JSON.stringify(token)); i += token.length;
    } else { output.push(char); i++; }
  }
  return JSON.parse(output.join(""));
}

export function parsePayload(text: string, format: "json" | "xml", limits: Partial<Limits> = {}): unknown {
  const config = { ...DEFAULT_LIMITS, ...limits };
  if (new TextEncoder().encode(text).byteLength > config.maxBytes) fail("OVERSIZE_PAYLOAD");
  if (/^\s*(?:<!doctype\s+html|<html(?:\s|>))/i.test(text)) fail("MALFORMED_PAYLOAD");
  let payload: unknown;
  try {
    if (format === "json") payload = parseExactJson(text, config);
    else {
      // Reject declarations before parsing. saxes itself never resolves externals.
      if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)) fail("UNSAFE_XML");
      const parser = new SaxesParser({ xmlns: false });
      const stack: XmlNode[] = [];
      const document: Record<string, unknown> = Object.create(null);
      let nodes = 0;
      parser.on("doctype", () => fail("UNSAFE_XML"));
      parser.on("opentag", (tag) => {
        if (++nodes > config.maxNodes || stack.length + 1 > config.maxDepth) fail("LIMIT_EXCEEDED");
        if (UNSAFE_PROPERTY.has(tag.name) || Object.keys(tag.attributes).length) fail("MALFORMED_PAYLOAD");
        stack.push({ name: tag.name, text: "", children: Object.create(null) });
      });
      parser.on("text", (value) => {
        if (stack.length) stack.at(-1)!.text += value;
        else if (value.trim()) fail("MALFORMED_PAYLOAD");
      });
      parser.on("cdata", (value) => { if (stack.length) stack.at(-1)!.text += value; });
      parser.on("closetag", () => {
        const node = stack.pop();
        if (!node) fail("MALFORMED_PAYLOAD");
        putXml(stack.length ? stack.at(-1)!.children : document, node.name, xmlValue(node));
      });
      parser.on("error", () => fail("MALFORMED_PAYLOAD"));
      parser.write(text).close();
      payload = document;
    }
    boundedTree(payload, config);
    return payload;
  } catch (error) {
    if (error instanceof IngestionError) throw error;
    return fail("MALFORMED_PAYLOAD");
  }
}

function atPath(value: unknown, path: readonly string[]): unknown {
  for (const key of path) {
    if (!value || typeof value !== "object" || Array.isArray(value) || !Object.hasOwn(value, key)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
function nonnegativeInteger(value: unknown): number {
  if (typeof value === "string" && /^(?:0|[1-9]\d*)$/.test(value)) value = Number(value);
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) fail("PAGINATION_ERROR");
  return value;
}

async function readBody(response: Response, limits: Limits, signal: AbortSignal): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limits.maxBytes)) {
    await response.body?.cancel().catch(() => undefined);
    fail("OVERSIZE_PAYLOAD");
  }
  if (!response.body) fail("MALFORMED_PAYLOAD");
  const reader = response.body.getReader();
  const abort = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", abort, { once: true });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limits.maxBytes) fail("OVERSIZE_PAYLOAD");
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof IngestionError) throw error;
    return fail("MALFORMED_PAYLOAD");
  } finally { signal.removeEventListener("abort", abort); reader.releaseLock(); }
}

async function oneAttempt(options: CollectOptions, url: URL, limits: Limits): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) { abort(); fail("ABORTED"); }
  try {
    return await Promise.race([
      (async () => {
        let response: Response;
        try {
          response = await (options.fetch ?? globalThis.fetch)(url, { redirect: "error", signal: controller.signal, cache: "no-store" });
        } catch {
          if (options.signal?.aborted) fail("ABORTED");
          throw new IngestionError("NETWORK_ERROR", true);
        }
        if (!response.ok) {
          await response.body?.cancel().catch(() => undefined);
          throw new IngestionError("HTTP_ERROR", response.status === 429 || [500, 502, 503, 504].includes(response.status));
        }
        const contentType = response.headers.get("content-type") ?? "";
        if (/\btext\/html\b/i.test(contentType)) {
          await response.body?.cancel().catch(() => undefined);
          fail("MALFORMED_PAYLOAD");
        }
        return parsePayload(await readBody(response, limits, controller.signal), options.contract.format, limits);
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new IngestionError("TIMEOUT", true)); }, limits.timeoutMs);
      }),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          if (options.signal?.aborted) reject(new IngestionError("ABORTED"));
        }, { once: true });
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

export async function collectPages(options: CollectOptions): Promise<{
  records: Record<string, unknown>[]; snapshots: unknown[]; calls: number; pages: number;
}> {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  if (Object.values(limits).some((value) => !Number.isSafeInteger(value) || value < 1)
    || !Number.isSafeInteger(options.budget.remaining) || options.budget.remaining < 0) fail("INVALID_REQUEST");
  // Validate before entering the loop or consuming quota.
  buildRequest(options, 1, limits.pageSize);
  let calls = 0;
  const records: Record<string, unknown>[] = [];
  const snapshots: unknown[] = [];
  let total: number | undefined;
  let pageNo = 1;
  while (true) {
    if (pageNo > limits.maxPages) fail("LIMIT_EXCEEDED");
    let parsed: unknown;
    for (let attempt = 1; ; attempt++) {
      if (options.signal?.aborted) fail("ABORTED");
      if (options.budget.remaining <= 0) fail("BUDGET_EXHAUSTED");
      options.budget.remaining--;
      try {
        if (options.onAttempt) {
          try { await options.onAttempt(); }
          catch { fail("BUDGET_EXHAUSTED"); }
        }
        calls++;
        parsed = await oneAttempt(options, buildRequest(options, pageNo, limits.pageSize), limits);
        break;
      } catch (error) {
        const safe = error instanceof IngestionError ? error : new IngestionError("NETWORK_ERROR", true);
        if (!safe.retryable || attempt >= limits.maxAttemptsPerPage || options.budget.remaining <= 0) throw safe;
        await (options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(limits.retryDelayMs * attempt);
      }
    }
    const p = options.contract.responsePaths;
    const header = atPath(parsed, p.header);
    const code = atPath(parsed, p.resultCode);
    if (!header || typeof header !== "object" || Array.isArray(header) || typeof code !== "string") fail("MALFORMED_PAYLOAD");
    if (!options.contract.successCodes.includes(code)) fail("BUSINESS_ERROR");
    const currentTotal = nonnegativeInteger(atPath(parsed, p.totalCount));
    const returnedPage = nonnegativeInteger(atPath(parsed, p.pageNo));
    const returnedPageSize = nonnegativeInteger(atPath(parsed, p.pageSize));
    if (returnedPage !== pageNo || returnedPageSize !== limits.pageSize || currentTotal > limits.maxRecords
      || (total !== undefined && total !== currentTotal)) fail("PAGINATION_ERROR");
    total = currentTotal;
    const rawItems = atPath(parsed, p.items);
    const items = rawItems === null || rawItems === undefined || rawItems === "" ? [] : Array.isArray(rawItems) ? rawItems : [rawItems];
    if (items.some((item) => !item || typeof item !== "object" || Array.isArray(item))) fail("MALFORMED_PAYLOAD");
    const expectedItems = Math.min(limits.pageSize, Math.max(0, total - records.length));
    if (items.length !== expectedItems || records.length + items.length > limits.maxRecords) fail("PAGINATION_ERROR");
    records.push(...items as Record<string, unknown>[]);
    const decodedKey = normalizeKey(options.key, options.contract.keyEncoding);
    snapshots.push(sanitize(parsed, [options.key, decodedKey, encodeURIComponent(decodedKey)]));
    if (records.length === total) break;
    pageNo++;
  }
  return { records, snapshots, calls, pages: pageNo };
}
