/** No fixture payload here: this policy is also used before a response can stream. */
export const DETAIL_DEMO_SLUG = "synthetic-electrical";
export const DETAIL_DEMO_PATH = `/detail-demo/${DETAIL_DEMO_SLUG}`;
export const detailDemoScenarios = ["normal", "stats-error", "stats-partial-error", "events-error", "details-error", "status-error", "stale", "pending", "unsupported", "range", "time-unknown", "no-stats", "unconfirmed-population"] as const;
export type DetailDemoScenario = typeof detailDemoScenarios[number];
export function parseDemoScenario(value: unknown): DetailDemoScenario {
  return typeof value === "string" && detailDemoScenarios.includes(value as DetailDemoScenario) ? value as DetailDemoScenario : "normal";
}
export function isDetailDemoPath(pathname: string): boolean {
  return pathname.replace(/\/$/, "") === DETAIL_DEMO_PATH;
}
