import preparation from "../../../docs/contracts/public-api-sources.json";

/** Evidence-backed source identities, never inherited/unverified API endpoints. */
export const sourceRegistry = Object.freeze(preparation.sources.map((source) => Object.freeze({
  sourceId: source.source_id,
  datasetId: source.dataset_id,
  catalogUrl: source.catalog_url,
  enabled: false as const,
  endpoint: null,
  operation: null,
  format: null,
  reason: "PUBLIC_SPEC_AND_AUTHENTICATED_RESPONSE_UNVERIFIED" as const,
})));

export function sourceReadiness(sourceId: string) {
  return sourceRegistry.find((source) => source.sourceId === sourceId) ?? null;
}
