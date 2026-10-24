import { expect, it, vi } from "vitest";
import { collectAndStage } from "@/server/ingestion/service";
import type { CollectionStore } from "@/server/ingestion/contracts";
import type { TransportContract } from "@/server/ingestion/transport";

const contract: TransportContract = {
  sourceId: "DS-02", operation: "synthetic-never-called", endpoint: "https://synthetic.invalid/synthetic-never-called",
  allowedHost: "synthetic.invalid", allowedPath: "/synthetic-never-called", allowedParameters: [],
  keyParameter: "serviceKey", keyEncoding: "raw", pageParameter: "pageNo", pageSizeParameter: "pageSize",
  format: "json", successCodes: ["SYNTHETIC_OK"], evidence: "synthetic", approval: "unknown",
  responsePaths: { header: ["header"], resultCode: ["header", "code"], items: ["items"], totalCount: ["total"], pageNo: ["page"], pageSize: ["size"] },
};
it.each([
  ["DS-02", "synthetic", "test"], ["DS-02", "verified", "production"], ["UNKNOWN", "verified", "local"], ["SYNTHETIC", "synthetic", "production"],
] as const)("blocks source %s / %s in %s before DB or HTTP", async (sourceId, evidence, appEnv) => {
  const startRun = vi.fn(); const fetch = vi.fn();
  const store = { startRun, stageRun: vi.fn(), reserveCalls: vi.fn(), failRun: vi.fn() } as CollectionStore;
  const result = await collectAndStage({ store, scope: { sourceId, operation: contract.operation,
    qualificationId: "00000000-0000-0000-0000-000000000001", year: 2026, acquisitionTrack: "synthetic", datasetType: "events" },
    transport: { contract: { ...contract, sourceId, evidence, approval: "approved" }, parameters: {}, key: "SYNTHETIC-KEY", appEnv, fetch, budget: { remaining: 1 } },
    sourceUrl: "https://www.q-net.or.kr/", mapRecord: () => { throw new Error("MUST_NOT_MAP"); },
  });
  expect(result).toMatchObject({ status: "failed", errorCode: "SOURCE_UNVERIFIED", calls: 0 });
  expect(startRun).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
