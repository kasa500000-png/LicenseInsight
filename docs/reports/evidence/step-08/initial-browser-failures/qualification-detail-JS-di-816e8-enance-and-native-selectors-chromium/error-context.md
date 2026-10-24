# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qualification-detail.spec.ts >> JS disabled HTML contains core values, provenance and native selectors
- Location: tests/e2e/qualification-detail.spec.ts:66:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('heading', { level: 1 })
Expected: "합성 전기설비 자격"
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" getByRole('heading', { level: 1 }) with timeout 8000ms
  - waiting for getByRole('heading', { level: 1 })

```

```yaml
- link "본문으로 바로가기":
  - /url: "#main-content"
- banner:
  - link "자격인사이트 홈":
    - /url: /
    - text: 자격인사이트
  - navigation "주요 메뉴":
    - link "홈":
      - /url: /
    - link "일정":
      - /url: /calendar
    - link "비교":
      - /url: /compare
    - link "내 준비":
      - /url: /my-plan
- main:
  - status: 화면을 불러오고 있습니다
  - paragraph: 화면을 불러오고 있습니다.
- contentinfo:
  - paragraph: 자격인사이트는 비공식 정보 서비스입니다.
  - paragraph: 최종 일정과 접수 기준은 시행기관의 공식 안내를 확인해 주세요.
```

# Test source

```ts
  1   | import { mkdir, writeFile } from "node:fs/promises";
  2   | import path from "node:path";
  3   | import { expect, test, type BrowserContext, type Page } from "@playwright/test";
  4   | 
  5   | const demo = "/detail-demo/synthetic-electrical";
  6   | const screenshotDir = process.env.SCREENSHOT_DIR ?? "test-results/screenshots";
  7   | const evidenceDir = process.env.STEP_EVIDENCE_DIR ?? "test-results";
  8   | const screenshotRef = (process.env.SCREENSHOT_REF ?? "working-tree").replace(/[^a-zA-Z0-9_-]/g, "_");
  9   | const externalRequests = new WeakMap<BrowserContext, string[]>();
  10  | test.beforeEach(async ({ context, baseURL }) => {
  11  |   const external: string[] = []; externalRequests.set(context, external);
  12  |   await context.route("**/*", async route => {
  13  |     const url = new URL(route.request().url());
  14  |     if (["https:", "http:"].includes(url.protocol) && url.origin !== new URL(baseURL!).origin) {
  15  |       external.push(url.origin); await route.abort(); return;
  16  |     }
  17  |     await route.continue();
  18  |   });
  19  | });
  20  | test.afterEach(async ({ context }) => { expect(externalRequests.get(context)).toEqual([]); });
  21  | 
  22  | async function screen(page: Page, name: string, selector?: string) {
  23  |   await mkdir(screenshotDir, { recursive: true });
  24  |   const filename = path.join(screenshotDir, `detail-${name}-${screenshotRef}.png`);
  25  |   if (selector) await page.locator(selector).screenshot({ path: filename, animations: "disabled" });
  26  |   else await page.screenshot({ path: filename, animations: "disabled", fullPage: false });
  27  | }
  28  | async function fits(page: Page) {
  29  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  30  | }
  31  | 
  32  | for (const width of [390, 1440]) {
  33  |   test(`detail repository/domain values, source and chart/table agree at ${width}px`, async ({ page }) => {
  34  |     await page.setViewportSize({ width, height: 1000 });
  35  |     const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  36  |     const response = await page.goto(demo);
  37  |     expect(response?.status()).toBe(200);
  38  |     expect(response?.headers()["cache-control"]).toContain("no-store");
  39  |     expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  40  |     await expect(page.getByRole("heading", { level: 1, name: "합성 전기설비 자격" })).toBeVisible();
  41  |     await expect(page.getByText("실제 공공 데이터 검증은 완료되지 않았습니다.", { exact: false })).toBeVisible();
  42  |     await expect(page.getByTestId("detail-event")).toHaveCount(9);
  43  |     await expect(page.locator("#next-events")).toContainText("D-Day");
  44  |     await fits(page); await screen(page, `overview-${width}`);
  45  |     await screen(page, `schedules-${width}`, "#detail-schedules");
  46  |     const summary = page.getByTestId("derived-statistics-summary");
  47  |     await expect(summary).toHaveAttribute("data-rate", "47.0");
  48  |     await expect(summary).toContainText("1,000명"); await expect(summary).toContainText("470명");
  49  |     await expect(page.getByTestId("official-annual-statistics")).toContainText("47.0");
  50  |     for (const [round, rate] of [["1", "20.0"], ["2", "50.0"]]) {
  51  |       const displayed = page.locator(`[data-statistic-round="${round}"]`);
  52  |       await expect(displayed).toHaveCount(2); // chart and semantic table
  53  |       for (const row of await displayed.all()) await expect(row).toHaveAttribute("data-rate", rate);
  54  |     }
  55  |     await screen(page, `statistics-${width}`, "#detail-statistics"); await fits(page);
  56  |     const last = page.getByRole("link", { name: "준비 계획 화면으로", exact: true });
  57  |     await last.scrollIntoViewIfNeeded();
  58  |     if (width === 390) {
  59  |       const bottom = await page.getByRole("navigation", { name: "모바일 메뉴" }).boundingBox();
  60  |       const action = await last.boundingBox(); expect(action!.y + action!.height).toBeLessThanOrEqual(bottom!.y);
  61  |     }
  62  |     expect(errors).toEqual([]);
  63  |   });
  64  | }
  65  | 
  66  | test("JS disabled HTML contains core values, provenance and native selectors", async ({ browser, baseURL }) => {
  67  |   const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  68  |   try {
  69  |     const page = await context.newPage();
  70  |     const response = await page.goto(demo);
  71  |     const html = await response!.text();
  72  |     await mkdir(evidenceDir, { recursive: true }); await writeFile(path.join(evidenceDir, "detail-ssr.html"), html);
> 73  |     await expect(page.getByRole("heading", { level: 1 })).toHaveText("합성 전기설비 자격");
      |                                                           ^ Error: expect(locator).toHaveText(expected) failed
  74  |     await expect(page.getByTestId("derived-statistics-summary")).toHaveAttribute("data-rate", "47.0");
  75  |     expect(html).toContain("마지막 자동 검증"); expect(html).toContain("운영자 대조");
  76  |     expect(html).not.toContain("SYNTHETIC_PRIVATE_ERROR_DO_NOT_RENDER");
  77  |     await page.getByLabel("연도", { exact: true }).selectOption("2025");
  78  |     await page.getByLabel("시험 단계", { exact: true }).selectOption("practical");
  79  |     await page.getByRole("button", { name: "통계 보기" }).click();
  80  |     await expect(page).toHaveURL(/stage=practical/);
  81  |     await expect(page.getByTestId("derived-statistics-summary")).toHaveAttribute("data-rate", "50.0");
  82  |     await screen(page, "no-js-statistics", "#detail-statistics");
  83  |   } finally { await context.close(); }
  84  | });
  85  | 
  86  | test("year and stage selection keeps partial/null statistics explicit", async ({ page }) => {
  87  |   await page.goto(demo);
  88  |   await page.getByLabel("연도", { exact: true }).selectOption("2026");
  89  |   await page.getByRole("button", { name: "통계 보기" }).click();
  90  |   await expect(page.getByTestId("derived-statistics-summary")).toHaveAttribute("data-rate", "unavailable");
  91  |   await expect(page.locator("#detail-statistics")).toContainText("진행 중인 연도");
  92  |   await expect(page.locator("#detail-statistics")).toContainText("미확인");
  93  |   await expect(page.locator('[data-statistic-round="1"][data-rate="unavailable"]')).toHaveCount(2);
  94  |   await page.setViewportSize({ width: 390, height: 1000 });
  95  |   await screen(page, "partial-statistics-390", "#detail-statistics");
  96  | });
  97  | 
  98  | for (const scenario of ["stats-error", "events-error", "details-error"] as const) {
  99  |   test(`${scenario} is isolated without exposing private errors`, async ({ page }) => {
  100 |     await page.setViewportSize({ width: 390, height: 1000 });
  101 |     const response = await page.goto(`${demo}?scenario=${scenario}`);
  102 |     expect(response?.status()).toBe(200);
  103 |     expect(await response!.text()).not.toContain("SYNTHETIC_PRIVATE_ERROR_DO_NOT_RENDER");
  104 |     if (scenario === "stats-error") {
  105 |       await expect(page.getByText("통계 정보를 불러오지 못했습니다", { exact: true })).toBeVisible();
  106 |       await expect(page.getByTestId("detail-event")).toHaveCount(9);
  107 |     } else {
  108 |       await expect(page.getByTestId("derived-statistics-summary")).toHaveAttribute("data-rate", "47.0");
  109 |       await expect(page.getByText(scenario === "events-error" ? "일정을 불러오지 못했습니다" : "시험 부가정보를 불러오지 못했습니다", { exact: true })).toBeVisible();
  110 |     }
  111 |     await screen(page, `${scenario}-390`, scenario === "stats-error" ? "#detail-statistics" : scenario === "events-error" ? "#detail-schedules" : "#detail-information");
  112 |   });
  113 | }
  114 | 
  115 | for (const scenario of ["stale", "pending"] as const) {
  116 |   test(`${scenario} withholds next action and aggregate claims`, async ({ page }) => {
  117 |     await page.setViewportSize({ width: 390, height: 1000 });
  118 |     await page.goto(`${demo}?scenario=${scenario}`);
  119 |     await expect(page.locator("#next-events")).toContainText("다음 행동을 제안하지 않습니다");
  120 |     await expect(page.getByTestId("derived-statistics-summary")).toHaveCount(0);
  121 |     await expect(page.getByTestId("statistics-aggregate-withheld")).toBeVisible();
  122 |     await expect(page.getByText(scenario === "stale" ? "갱신이 지연되고 있습니다" : "변경 사항을 확인하고 있습니다", { exact: true })).toBeVisible();
  123 |     await fits(page); await screen(page, `${scenario}-390`);
  124 |   });
  125 | }
  126 | 
  127 | test("range exam and unknown registration time never invent a personal day or hours", async ({ page }) => {
  128 |   await page.setViewportSize({ width: 390, height: 1000 });
  129 |   await page.goto(`${demo}?scenario=range`);
  130 |   await expect(page.locator("#next-events")).toContainText("2026-11-10 – 2026-11-15 · 시각 미제공");
  131 |   await expect(page.locator("#detail-schedules")).toContainText("개인별 시험일이 확정된 값은 아닙니다");
  132 |   await screen(page, "range-390", "#next-events");
  133 |   await page.goto(`${demo}?scenario=time-unknown`);
  134 |   await expect(page.getByTestId("detail-event").first()).toHaveAttribute("data-state", "DATE_ONLY_START_DAY");
  135 |   await expect(page.getByTestId("detail-event").first()).not.toContainText("09:00");
  136 |   await screen(page, "time-unknown-390", '[data-testid="detail-event"]:first-child');
  137 | });
  138 | 
  139 | test("unsupported/empty/unconfirmed population stay distinct from zero", async ({ page }) => {
  140 |   await page.goto(`${demo}?scenario=unsupported`);
  141 |   await expect(page.getByText("제공되지 않는 시험 정보입니다", { exact: true })).toBeVisible();
  142 |   await screen(page, "unsupported", "#detail-information");
  143 |   await page.goto(`${demo}?scenario=no-stats`);
  144 |   await expect(page.getByText("이 기준의 통계가 없습니다", { exact: true })).toBeVisible();
  145 |   await expect(page.getByTestId("derived-statistics-summary")).toHaveCount(0);
  146 |   await page.goto(`${demo}?scenario=unconfirmed-population`);
  147 |   await expect(page.getByText("통계 합산 근거가 확인되지 않았습니다", { exact: true })).toBeVisible();
  148 |   await expect(page.getByTestId("derived-statistics-summary")).toHaveCount(0);
  149 |   await expect(page.locator('[data-rate="47.0"]')).toHaveCount(0);
  150 | });
  151 | 
  152 | test("unknown slug is HTTP404 and official links stay on the allowlist", async ({ page }) => {
  153 |   const unknown = await page.goto("/detail-demo/not-a-qualification");
  154 |   expect(unknown?.status()).toBe(404); expect(await unknown!.text()).not.toContain("합성 전기설비 자격");
  155 |   const publicPage = await page.goto("/qualifications/unverified-electric");
  156 |   expect(publicPage?.status()).toBe(404);
  157 |   await page.goto(`${demo}?year=invalid&stage=other&scenario=invalid`);
  158 |   await expect(page.getByTestId("derived-statistics-summary")).toHaveAttribute("data-rate", "47.0");
  159 |   const hrefs = await page.locator('a[href^="https:"]').evaluateAll(links => links.map(link => link.getAttribute("href")!));
  160 |   expect(hrefs.length).toBeGreaterThan(0);
  161 |   for (const href of hrefs) { const url = new URL(href); expect(["www.q-net.or.kr"]).toContain(url.hostname); expect(url.search).toBe(""); }
  162 |   expect(await page.evaluate(() => localStorage.length)).toBe(0);
  163 |   await page.getByRole("link", { name: "관심·준비 계획 진입", exact: true }).click();
  164 |   await expect(page).toHaveURL(/\/my-plan$/);
  165 |   await expect(page.getByText("아직 이 화면에서 제공할 수 있는 기능이 없습니다.", { exact: false })).toBeVisible();
  166 | });
  167 | 
```