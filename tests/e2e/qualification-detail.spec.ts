import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const demo = "/detail-demo/synthetic-electrical";
const screenshotDir = process.env.SCREENSHOT_DIR ?? "test-results/screenshots";
const evidenceDir = process.env.STEP_EVIDENCE_DIR ?? "test-results";
const screenshotRef = (process.env.SCREENSHOT_REF ?? "working-tree").replace(/[^a-zA-Z0-9_-]/g, "_");
const externalRequests = new WeakMap<BrowserContext, string[]>();
test.beforeEach(async ({ context, baseURL }) => {
  const external: string[] = []; externalRequests.set(context, external);
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (["https:", "http:"].includes(url.protocol) && url.origin !== new URL(baseURL!).origin) {
      external.push(url.origin); await route.abort(); return;
    }
    await route.continue();
  });
});
test.afterEach(async ({ context }) => { expect(externalRequests.get(context)).toEqual([]); });

async function screen(page: Page, name: string, selector?: string) {
  await mkdir(screenshotDir, { recursive: true });
  const filename = path.join(screenshotDir, `detail-${name}-${screenshotRef}.png`);
  if (selector) await page.locator(selector).screenshot({ path: filename, animations: "disabled" });
  else await page.screenshot({ path: filename, animations: "disabled", fullPage: false });
}
async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

for (const width of [390, 1440]) {
  test(`detail repository/domain values, source and chart/table agree at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(demo);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("heading", { level: 1, name: "합성 전기설비 자격" })).toBeVisible();
    await expect(page.getByText("실제 공공 데이터 검증은 완료되지 않았습니다.", { exact: false })).toBeVisible();
    await expect(page.getByTestId("detail-event")).toHaveCount(9);
    await expect(page.locator("#next-events")).toContainText("시작일 · 시각 미확인");
    await expect(page.locator("#next-events")).toContainText("D-12");
    await fits(page); await screen(page, `overview-${width}`);
    await screen(page, `schedules-${width}`, "#detail-schedules");
    const summary = page.getByTestId("derived-statistics-summary");
    await expect(summary).toHaveAttribute("data-rate", "47.0");
    await expect(summary).toContainText("1,000명"); await expect(summary).toContainText("470명");
    await expect(page.getByTestId("official-annual-statistics")).toContainText("47.0");
    for (const [round, rate] of [["1", "20.0"], ["2", "50.0"]]) {
      const displayed = page.locator(`[data-statistic-round="${round}"]`);
      await expect(displayed).toHaveCount(2); // chart and semantic table
      for (const row of await displayed.all()) await expect(row).toHaveAttribute("data-rate", rate);
    }
    await screen(page, `statistics-${width}`, "#detail-statistics"); await fits(page);
    const last = page.getByRole("link", { name: "준비 계획 화면으로", exact: true });
    await last.scrollIntoViewIfNeeded();
    if (width === 390) {
      const bottom = await page.getByRole("navigation", { name: "모바일 메뉴" }).boundingBox();
      const action = await last.boundingBox(); expect(action!.y + action!.height).toBeLessThanOrEqual(bottom!.y);
    }
    expect(errors).toEqual([]);
  });
}

test("JS disabled HTML contains core values, provenance and native selectors", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const external: string[] = [];
  try {
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (["https:", "http:"].includes(url.protocol) && url.origin !== new URL(baseURL!).origin) { external.push(url.origin); await route.abort(); return; }
      await route.continue();
    });
    const page = await context.newPage();
    const response = await page.goto(demo);
    const html = await response!.text();
    await mkdir(evidenceDir, { recursive: true }); await writeFile(path.join(evidenceDir, "detail-ssr.html"), html);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("합성 전기설비 자격");
    await expect(page.getByTestId("derived-statistics-summary")).toHaveAttribute("data-rate", "47.0");
    expect(html).toContain("마지막 자동 검증"); expect(html).toContain("운영자 대조");
    expect(html).not.toContain("SYNTHETIC_PRIVATE_ERROR_DO_NOT_RENDER");
    await page.getByLabel("연도", { exact: true }).selectOption("2025");
    await page.getByLabel("시험 단계", { exact: true }).selectOption("practical");
    await page.getByRole("button", { name: "통계 보기" }).click();
    await expect(page).toHaveURL(/stage=practical/);
    await expect(page.getByTestId("derived-statistics-summary")).toHaveAttribute("data-rate", "50.0");
    await screen(page, "no-js-statistics", "#detail-statistics");
    expect(external).toEqual([]);
  } finally { await context.close(); }
});

test("year and stage selection keeps partial/null statistics explicit", async ({ page }) => {
  await page.goto(demo);
  await page.getByLabel("연도", { exact: true }).selectOption("2026");
  await page.getByRole("button", { name: "통계 보기" }).click();
  await expect(page.getByTestId("derived-statistics-summary")).toHaveAttribute("data-rate", "unavailable");
  await expect(page.locator("#detail-statistics")).toContainText("진행 중인 연도");
  await expect(page.locator("#detail-statistics")).toContainText("미확인");
  await expect(page.locator('[data-statistic-round="1"][data-rate="unavailable"]')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 1000 });
  await screen(page, "partial-statistics-390", "#detail-statistics");
});

for (const scenario of ["stats-error", "events-error", "details-error"] as const) {
  test(`${scenario} is isolated without exposing private errors`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    const response = await page.goto(`${demo}?scenario=${scenario}`);
    expect(response?.status()).toBe(200);
    expect(await response!.text()).not.toContain("SYNTHETIC_PRIVATE_ERROR_DO_NOT_RENDER");
    if (scenario === "stats-error") {
      await expect(page.getByText("통계 정보를 불러오지 못했습니다", { exact: true })).toBeVisible();
      await expect(page.getByTestId("detail-event")).toHaveCount(9);
    } else {
      await expect(page.getByTestId("derived-statistics-summary")).toHaveAttribute("data-rate", "47.0");
      await expect(page.getByText(scenario === "events-error" ? "일정을 불러오지 못했습니다" : "시험 부가정보를 불러오지 못했습니다", { exact: true })).toBeVisible();
    }
    await screen(page, `${scenario}-390`, scenario === "stats-error" ? "#detail-statistics" : scenario === "events-error" ? "#detail-schedules" : "#detail-information");
  });
}

for (const scenario of ["stale", "pending", "status-error"] as const) {
  test(`${scenario} withholds next action and aggregate claims`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto(`${demo}?scenario=${scenario}`);
    await expect(page.locator("#next-events")).toContainText("다음 행동을 제안하지 않습니다");
    await expect(page.getByTestId("derived-statistics-summary")).toHaveCount(0);
    await expect(page.getByTestId("statistics-aggregate-withheld")).toBeVisible();
    await expect(page.getByText(scenario === "stale" ? "갱신이 지연되고 있습니다" : scenario === "pending" ? "변경 사항을 확인하고 있습니다" : "아직 검증되지 않은 자료입니다", { exact: true })).toBeVisible();
    await fits(page); await screen(page, `${scenario}-390`);
  });
}

test("range exam and unknown registration time never invent a personal day or hours", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(`${demo}?scenario=range`);
  await expect(page.locator("#next-events")).toContainText("2026-11-10 – 2026-11-15 · 시각 미제공");
  await expect(page.locator("#detail-schedules")).toContainText("개인별 시험일이 확정된 값은 아닙니다");
  await screen(page, "range-390", "#next-events");
  await page.goto(`${demo}?scenario=time-unknown`);
  await expect(page.getByTestId("detail-event").first()).toHaveAttribute("data-state", "DATE_ONLY_START_DAY");
  await expect(page.getByTestId("detail-event").first()).not.toContainText("09:00");
  await screen(page, "time-unknown-390", '[data-testid="detail-event"] >> nth=0');
});

test("unsupported/empty/unconfirmed population stay distinct from zero", async ({ page }) => {
  await page.goto(`${demo}?scenario=unsupported`);
  await expect(page.getByText("제공되지 않는 시험 정보입니다", { exact: true })).toBeVisible();
  await screen(page, "unsupported", "#detail-information");
  await page.goto(`${demo}?scenario=no-stats`);
  await expect(page.getByText("이 기준의 통계가 없습니다", { exact: true })).toBeVisible();
  await expect(page.getByTestId("derived-statistics-summary")).toHaveCount(0);
  await page.goto(`${demo}?scenario=unconfirmed-population`);
  await expect(page.getByText("통계 합산 근거가 확인되지 않았습니다", { exact: true })).toBeVisible();
  await expect(page.getByTestId("derived-statistics-summary")).toHaveCount(0);
  await expect(page.locator('[data-rate="47.0"]')).toHaveCount(0);
});

test("a failed selected year is an error even when other years load", async ({ page }) => {
  await page.goto(`${demo}?scenario=stats-partial-error&year=2024`);
  await expect(page.getByText("통계 정보를 불러오지 못했습니다", { exact: true })).toBeVisible();
  await expect(page.getByText("이 기준의 통계가 없습니다", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("detail-event")).toHaveCount(9);
  await page.goto(`${demo}?scenario=stats-partial-error&year=2025`);
  await expect(page.getByTestId("statistics-aggregate-withheld")).toBeVisible();
  await expect(page.locator('[data-statistic-round="1"][data-rate="20.0"]')).toHaveCount(2);
});

test("unknown slug is HTTP404 and official links stay on the allowlist", async ({ page }) => {
  const unknown = await page.goto("/detail-demo/not-a-qualification");
  expect(unknown?.status()).toBe(404); expect(await unknown!.text()).not.toContain("합성 전기설비 자격");
  const publicPage = await page.goto("/qualifications/unverified-electric");
  expect(publicPage?.status()).toBe(404);
  await page.goto(`${demo}?year=invalid&stage=other&scenario=invalid`);
  await expect(page.getByTestId("derived-statistics-summary")).toHaveAttribute("data-rate", "47.0");
  const hrefs = await page.locator('a[href^="https:"]').evaluateAll(links => links.map(link => link.getAttribute("href")!));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) { const url = new URL(href); expect(["www.q-net.or.kr"]).toContain(url.hostname); expect(url.search).toBe(""); }
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole("link", { name: "관심·준비 계획 진입", exact: true }).click();
  await expect(page).toHaveURL(/\/my-plan$/);
  await expect(page.getByText("아직 이 화면에서 제공할 수 있는 기능이 없습니다.", { exact: false })).toBeVisible();
});
