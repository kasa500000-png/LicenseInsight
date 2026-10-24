import type { Json } from "@/data/database.types";

export type EntityType = "qualification" | "event" | "statistic" | "detail";
export interface CollectionScope {
  sourceId: string;
  operation: string;
  qualificationId: string;
  year: number;
  acquisitionTrack: string;
  datasetType: "qualifications" | "events" | "statistics" | "details";
}
export interface CandidateRecord {
  entityType: EntityType;
  logicalKey: string;
  sourceCode: string;
  sourceName: string;
  sourceGrade: string;
  payload: Record<string, unknown>;
}
export interface NormalizedRecord extends Omit<CandidateRecord, "payload"> {
  payload: Record<string, Json>;
}
export interface RunLease { runId: string; scopeKey: string }
export interface StageInput {
  records: NormalizedRecord[];
  snapshots: Json[];
  calls: number;
  pages: number;
}
export interface CollectionStore {
  startRun(scope: CollectionScope, leaseSeconds?: number): Promise<RunLease>;
  stageRun(lease: RunLease, input: StageInput): Promise<{ state: "staged" | "empty" | "quarantined" }>;
  failRun(lease: RunLease, safeCode: string, attemptedCalls?: number): Promise<void>;
  reserveCalls(lease: RunLease, count?: number): Promise<void>;
}
