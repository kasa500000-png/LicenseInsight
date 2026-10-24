import { describe, expect, it, vi } from "vitest";
import { sourceReadiness, sourceRegistry } from "@/data/adapters/source-registry";
import { buildRequest, collectPages, IngestionError, parsePayload, type CollectOptions, type TransportContract } from "@/server/ingestion/transport";

// SYNTHETIC protocol. No assertion claims these fields/codes match a public API.
const contract: TransportContract = {
  sourceId: "SYNTHETIC", operation: "synthetic-operation",
  endpoint: "https://synthetic.invalid/synthetic-operation", allowedHost: "synthetic.invalid",
  allowedPath: "/synthetic-operation", allowedParameters: ["year", "code"],
  keyParameter: "ServiceKey", keyEncoding: "raw", pageParameter: "pageNo", pageSizeParameter: "pageSize",
  format: "json", successCodes: ["SYNTHETIC_OK"], evidence: "synthetic", approval: "unknown",
  responsePaths: {
    header: ["response", "header"], resultCode: ["response", "header", "code"],
    items: ["response", "body", "items", "item"], totalCount: ["response", "body", "totalCount"],
    pageNo: ["response", "body", "pageNo"], pageSize: ["response", "body", "pageSize"],
  },
};
const key = "SYNTHETIC-ONLY/a+b==";
const noopSleep = async () => undefined;
function json(items: unknown, totalCount = Array.isArray(items) ? items.length : items ? 1 : 0, pageNo = 1, pageSize = 100) {
  return JSON.stringify({ response: { header: { code: "SYNTHETIC_OK" }, body: { items: { item: items }, totalCount, pageNo, pageSize } } });
}
function xml(items: string, totalCount = 1) {
  return `<response><header><code>SYNTHETIC_OK</code></header><body><items>${items}</items><totalCount>${totalCount}</totalCount><pageNo>1</pageNo><pageSize>100</pageSize></body></response>`;
}
function response(body: string, status = 200, headers: Record<string, string> = {}) { return new Response(body, { status, headers }); }
function options(fetch: typeof globalThis.fetch, overrides: Partial<CollectOptions> = {}): CollectOptions {
  return { contract, parameters: { year: "2026" }, key, appEnv: "test", fetch, budget: { remaining: 10 }, sleep: noopSleep, ...overrides };
}
const mock = (body = json({ code: "0007" })) => vi.fn<typeof fetch>().mockResolvedValue(response(body));
const errorCode = (code: string) => expect.objectContaining({ name: "IngestionError", message: code, code });

describe("source readiness and safe request construction", () => {
  it("keeps all five real sources disabled with no inherited endpoints", () => {
    expect(sourceRegistry).toHaveLength(5);
    expect(sourceRegistry.every((source) => !source.enabled && source.endpoint === null && source.operation === null && source.format === null)).toBe(true);
    expect(sourceReadiness("DS-02")?.reason).toBe("PUBLIC_SPEC_AND_AUTHENTICATED_RESPONSE_UNVERIFIED");
    expect(sourceReadiness("invented")).toBeNull();
  });
  it.each(["raw", "percent-encoded"] as const)("encodes a %s key exactly once, preserving key casing and leading zero", (keyEncoding) => {
    const fetch = mock();
    const request = buildRequest(options(fetch, { contract: { ...contract, keyEncoding }, parameters: { code: "0007" }, key: keyEncoding === "raw" ? key : encodeURIComponent(key) }), 1, 100);
    expect(request.searchParams.get("ServiceKey")).toBe(key);
    expect(request.searchParams.get("serviceKey")).toBeNull();
    expect(request.searchParams.get("code")).toBe("0007");
    expect(request.href).not.toContain("%252F");
  });
  it.each(["preview", "production"] as const)("blocks synthetic contracts in %s", async (appEnv) => {
    const fetch = mock();
    await expect(collectPages(options(fetch, { appEnv }))).rejects.toEqual(errorCode("SOURCE_UNVERIFIED"));
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not silently send a synthetic request through the default network fetch", async () => {
    await expect(collectPages({ ...options(mock()), fetch: undefined })).rejects.toEqual(errorCode("SOURCE_UNVERIFIED"));
  });
  it("requires actual approval for a verified/live contract", async () => {
    const fetch = mock();
    await expect(collectPages(options(fetch, { contract: { ...contract, evidence: "verified" } }))).rejects.toEqual(errorCode("SOURCE_UNVERIFIED"));
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { endpoint: "http://synthetic.invalid/synthetic-operation" },
    { endpoint: "https://synthetic.invalid.evil.invalid/synthetic-operation" },
    { endpoint: "https://synthetic.invalid/wrong" },
    { endpoint: "https://synthetic.invalid/synthetic-operation?extra=1" },
    { endpoint: "https://user:password@synthetic.invalid/synthetic-operation" },
    { endpoint: "https://synthetic.invalid:444/synthetic-operation" },
    { endpoint: "https://synthetic.invalid/synthetic-operation#fragment" },
    { keyParameter: "pageNo" },
    { allowedParameters: ["Authorization"] },
  ])("rejects unsafe endpoint/parameter contract %#", (override) => {
    expect(() => buildRequest(options(mock(), { contract: { ...contract, ...override } }), 1, 100)).toThrow("INVALID_REQUEST");
  });
  it("rejects unlisted parameters and malformed percent encoding with safe errors", () => {
    expect(() => buildRequest(options(mock(), { parameters: { private_url: "secret" } }), 1, 100)).toThrow("INVALID_REQUEST");
    expect(() => buildRequest(options(mock(), { contract: { ...contract, keyEncoding: "percent-encoded" }, key: "%BROKEN" }), 1, 100)).toThrow("INVALID_REQUEST");
  });
});

describe("bounded strict parsing", () => {
  it.each([
    ["json", json([{ code: "0007" }, { code: "0012" }]), 2],
    ["json", json({ code: "0007" }), 1],
    ["json", json(null), 0],
    ["xml", xml("<item><code>0007</code></item><item><code>0012</code></item>", 2), 2],
    ["xml", xml("<item><code>0007</code></item>"), 1],
    ["xml", xml("", 0), 0],
  ] as const)("supports %s single/multiple/empty records %#", async (format, body, count) => {
    const result = await collectPages(options(mock(body), { contract: { ...contract, format } }));
    expect(result.records).toHaveLength(count);
    if (count) expect(result.records[0].code).toBe("0007");
  });
  it("preserves unsafe integer and decimal JSON tokens exactly as strings", () => {
    expect(parsePayload('{"large":9007199254740993,"decimal":47.1000000000000000001,"negative":-0.0}', "json"))
      .toEqual({ large: "9007199254740993", decimal: "47.1000000000000000001", negative: "-0.0" });
  });
  it.each(['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '{"__proto__":{}}', '{"constructor":{}}', '{"a":', '<html>unavailable</html>'])("rejects malformed/duplicate JSON %#", (body) => {
    expect(() => parsePayload(body, "json")).toThrow("MALFORMED_PAYLOAD");
  });
  it.each([
    '<!DOCTYPE response SYSTEM "https://external.invalid/secret"><response/>',
    '<!DOCTYPE response [<!ENTITY external SYSTEM "file:///etc/passwd">]><response>&external;</response>',
    '<!ENTITY external "expansion"><response/>',
  ])("rejects XML declarations before resolving any entity %#", (body) => {
    expect(() => parsePayload(body, "xml")).toThrow("UNSAFE_XML");
  });
  it.each(["<response>", "<response>&undefined;</response>", '<response a="ambiguous"/>'])("rejects invalid XML %#", (body) => {
    expect(() => parsePayload(body, "xml")).toThrow("MALFORMED_PAYLOAD");
  });
  it("caps decoded byte size, structure depth and node count", () => {
    expect(() => parsePayload('{"name":"가나다"}', "json", { maxBytes: 10 })).toThrow("OVERSIZE_PAYLOAD");
    expect(() => parsePayload('{"a":{"b":{"c":1}}}', "json", { maxDepth: 2 })).toThrow("LIMIT_EXCEEDED");
    expect(() => parsePayload("<a><b><c>1</c></b></a>", "xml", { maxDepth: 2 })).toThrow("LIMIT_EXCEEDED");
    expect(() => parsePayload('[1,2,3]', "json", { maxNodes: 2 })).toThrow("LIMIT_EXCEEDED");
  });
  it("rejects streaming size overflow and declared oversized responses", async () => {
    await expect(collectPages(options(mock(json({ text: "x".repeat(1000) })), { limits: { maxBytes: 100 } }))).rejects.toEqual(errorCode("OVERSIZE_PAYLOAD"));
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response("{}", 200, { "content-length": "99999" }));
    await expect(collectPages(options(fetch, { limits: { maxBytes: 100 } }))).rejects.toEqual(errorCode("OVERSIZE_PAYLOAD"));
  });
  it("rejects invalid UTF-8 and HTML response content type", async () => {
    const invalid = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array([0xc3, 0x28])));
    await expect(collectPages(options(invalid))).rejects.toEqual(errorCode("MALFORMED_PAYLOAD"));
    const html = vi.fn<typeof fetch>().mockResolvedValue(response("<h1>error</h1>", 200, { "content-type": "text/html" }));
    await expect(collectPages(options(html))).rejects.toEqual(errorCode("MALFORMED_PAYLOAD"));
  });
});

describe("complete pagination, quotas and safe failures", () => {
  it("collects complete pages and uses no-store, redirect rejection", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response(json([{ code: "0007" }], 2, 1, 1)))
      .mockResolvedValueOnce(response(json([{ code: "0012" }], 2, 2, 1)));
    const result = await collectPages(options(fetch, { limits: { pageSize: 1 } }));
    expect(result).toMatchObject({ records: [{ code: "0007" }, { code: "0012" }], calls: 2, pages: 2 });
    expect(fetch.mock.calls[1][0]).toBeInstanceOf(URL);
    expect(fetch.mock.calls[1][1]).toMatchObject({ redirect: "error", cache: "no-store" });
  });
  it("never returns a partial successful result after page two fails", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response(json([{ code: "0007" }], 2, 1, 1)))
      .mockResolvedValueOnce(response("upstream error", 503));
    await expect(collectPages(options(fetch, { limits: { pageSize: 1, maxAttemptsPerPage: 1 } }))).rejects.toEqual(errorCode("HTTP_ERROR"));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([
    json([], 1), json([{ code: "0007" }], 1, 2), json([{ code: "0007" }], 1, 1, 99),
    json([{ code: "0007" }, { code: "0012" }], 1),
  ])("rejects inconsistent pagination metadata %#", async (body) => {
    await expect(collectPages(options(mock(body)))).rejects.toEqual(errorCode("PAGINATION_ERROR"));
  });
  it("rejects a changing total and enforces max pages", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response(json([{ code: "0007" }], 2, 1, 1)))
      .mockResolvedValueOnce(response(json([{ code: "0012" }], 3, 2, 1)));
    await expect(collectPages(options(fetch, { limits: { pageSize: 1 } }))).rejects.toEqual(errorCode("PAGINATION_ERROR"));
    await expect(collectPages(options(mock(json([{ code: "0007" }], 2, 1, 1)), { limits: { pageSize: 1, maxPages: 1 } }))).rejects.toEqual(errorCode("LIMIT_EXCEEDED"));
  });
  it("separates HTTP200 business errors and missing headers from HTTP errors", async () => {
    const fetch = mock(json({ code: "0007" }).replace("SYNTHETIC_OK", "SYNTHETIC_AUTH_ERROR"));
    await expect(collectPages(options(fetch))).rejects.toEqual(errorCode("BUSINESS_ERROR"));
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(collectPages(options(mock('{"response":{"body":{}}}')))).rejects.toEqual(errorCode("MALFORMED_PAYLOAD"));
  });
  it("retries transient 429/503 within attempt and persisted quota budgets", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(response("retry", 429))
      .mockResolvedValueOnce(response("retry", 503)).mockResolvedValueOnce(response(json({ code: "0007" })));
    const reserve = vi.fn(async () => undefined);
    const budget = { remaining: 3 };
    const result = await collectPages(options(fetch, { budget, onAttempt: reserve }));
    expect(result.calls).toBe(3); expect(reserve).toHaveBeenCalledTimes(3); expect(budget.remaining).toBe(0);
  });
  it("does not exceed the shared quota after retries", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => response("no", 429));
    const budget = { remaining: 2 };
    await expect(collectPages(options(fetch, { budget }))).rejects.toEqual(errorCode("HTTP_ERROR"));
    expect(fetch).toHaveBeenCalledTimes(2); expect(budget.remaining).toBe(0);
  });
  it("does not fetch on exhausted memory quota or persisted quota rejection", async () => {
    const fetch = mock();
    await expect(collectPages(options(fetch, { budget: { remaining: 0 } }))).rejects.toEqual(errorCode("BUDGET_EXHAUSTED"));
    await expect(collectPages(options(fetch, { onAttempt: async () => { throw new Error(`secret ${key}`); } }))).rejects.toEqual(errorCode("BUDGET_EXHAUSTED"));
    expect(fetch).not.toHaveBeenCalled();
  });
  it("bounds timeouts even if an injected fetch ignores AbortSignal", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(() => new Promise(() => undefined));
    await expect(collectPages(options(fetch, { limits: { timeoutMs: 5, maxAttemptsPerPage: 2 } }))).rejects.toEqual(errorCode("TIMEOUT"));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("aborts before sending and sanitizes network errors", async () => {
    const fetch = mock();
    const controller = new AbortController(); controller.abort();
    await expect(collectPages(options(fetch, { signal: controller.signal }))).rejects.toEqual(errorCode("ABORTED"));
    expect(fetch).not.toHaveBeenCalled();
    const broken = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new Error(`request https://secret.invalid/?ServiceKey=${key}`));
    try { await collectPages(options(broken, { limits: { maxAttemptsPerPage: 1 } })); }
    catch (error) {
      expect(error).toBeInstanceOf(IngestionError);
      expect(String(error)).toBe("IngestionError: NETWORK_ERROR");
      expect(JSON.stringify(error)).not.toContain(key);
    }
  });
  it("retains only sanitized parsed snapshots", async () => {
    const result = await collectPages(options(mock(json({ code: "0007", Authorization: key, echo: `raw=${key}, encoded=${encodeURIComponent(key)}` }))));
    const saved = JSON.stringify(result.snapshots);
    expect(saved).not.toContain(key); expect(saved).not.toContain(encodeURIComponent(key));
    expect(saved).toContain("[REDACTED]");
  });
});
