import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const screenshotRef = (process.env.SCREENSHOT_REF ?? "working-tree").replace(/[^a-zA-Z0-9_-]/g, "_");
const screenshotDir = process.env.SCREENSHOT_DIR ?? "test-results/screenshots";

async function gallery(page: Page, context: BrowserContext, baseURL: string) {
  const external: string[] = [];
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if ((url.protocol === "https:" || url.protocol === "http:") && url.origin !== new URL(baseURL).origin) {
      external.push(url.origin); await route.abort(); return;
    }
    await route.continue();
  });
  const response = await page.goto("/ui-gallery");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByRole("heading", { level: 1, name: "공통 UI 검증실" })).toBeVisible();
  await expect(page.getByText("SYNTHETIC · 로컬/테스트 전용", { exact: true })).toBeVisible();
  expect(external).toEqual([]);
  return external;
}
async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}
async function screen(page: Page, name: string) {
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, `${name}-${screenshotRef}.png`), fullPage: false, animations: "disabled" });
}

for (const width of [360, 390, 768, 1440]) {
  test(`gallery and long Korean/large-number content reflow at ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 1000 });
    const external = await gallery(page, context, baseURL!);
    await fits(page);
    await screen(page, `ui-gallery-overview-${width}`);
    const longHeading = page.getByRole("heading", { name: "합성 검증용 초고압 전기설비 설계·시공·유지관리 및 산업안전 복합 자격 종목의 매우 긴 이름", exact: true }).first();
    await longHeading.scrollIntoViewIfNeeded();
    const nameBox = await longHeading.boundingBox();
    expect(nameBox!.x).toBeGreaterThanOrEqual(0);
    expect(nameBox!.x + nameBox!.width).toBeLessThanOrEqual(width);
    await longHeading.locator("..").screenshot({ path: path.join(screenshotDir, `ui-long-name-${width}-${screenshotRef}.png`), animations: "disabled" });
    await expect(page.getByText("9,223,372,036,854,775,807명", { exact: true })).toBeVisible();
    await fits(page);
    if (width === 390 || width === 1440) {
      for (const state of ["loading", "empty", "error", "stale", "storage", "demo"]) {
        const target = page.getByTestId(`state-${state}`);
        await target.scrollIntoViewIfNeeded();
        await target.screenshot({ path: path.join(screenshotDir, `ui-state-${state}-${width}-${screenshotRef}.png`), animations: "disabled" });
      }
      await page.getByRole("region", { name: "큰 숫자·누락값 표시", exact: true }).screenshot({ path: path.join(screenshotDir, `ui-large-number-${width}-${screenshotRef}.png`) });
    }
    await page.getByTestId("gallery-last-action").scrollIntoViewIfNeeded();
    if (width < 768) {
      const nav = await page.getByRole("navigation", { name: "모바일 메뉴" }).boundingBox();
      const last = await page.getByTestId("gallery-last-action").boundingBox();
      expect(last!.y + last!.height).toBeLessThanOrEqual(nav!.y);
    }
    await fits(page);
    expect(external).toEqual([]);
  });
}

test("mobile navigation reaches only honest shell destinations and reserves footer space", async ({ page, context, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gallery(page, context, baseURL!);
  const nav = page.getByRole("navigation", { name: "모바일 메뉴" });
  for (const [label, url] of [["일정", "/calendar"], ["비교", "/compare"], ["내 준비", "/my-plan"], ["홈", "/"]]) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new URL(url, baseURL!).href);
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    if (url !== "/") await expect(page.getByText("아직 이 화면에서 제공할 수 있는 기능이 없습니다.", { exact: false })).toBeVisible();
    await fits(page);
  }
  // Native scrollIntoView observes the reserved fixed-menu scroll padding.
  await page.locator("footer p").last().evaluate(el => el.scrollIntoView({ block: "end" }));
  const footer = await page.locator("footer p").last().boundingBox(), bar = await nav.boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(bar!.y);
  await page.keyboard.press("Control+End");
  const atEnd = await page.locator("footer p").last().boundingBox();
  expect(atEnd!.y + atEnd!.height).toBeLessThanOrEqual(bar!.y);
  await screen(page, "ui-home-footer-390");
});

test("desktop navigation, active location, keyboard skip link and visible focus work", async ({ page, context, baseURL }) => {
  await gallery(page, context, baseURL!);
  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  await expect(nav).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "본문으로 바로가기" })).toBeFocused();
  expect(await page.getByRole("link", { name: "본문으로 바로가기" }).evaluate(el => getComputedStyle(el).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await nav.getByRole("link", { name: "비교", exact: true }).click();
  await expect(nav.getByRole("link", { name: "비교", exact: true })).toHaveAttribute("aria-current", "page");
});

test("search Enter and button submit the same trimmed text without external calls", async ({ page, context, baseURL }) => {
  const external = await gallery(page, context, baseURL!);
  await page.getByRole("searchbox", { name: "합성 종목 검색" }).fill("  합성 긴 이름  ");
  await page.getByRole("searchbox", { name: "합성 종목 검색" }).press("Enter");
  await expect(page.getByTestId("search-result")).toHaveText("검색 입력 확인 1회: 합성 긴 이름");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByTestId("search-result")).toHaveText("검색 입력 확인 2회: 합성 긴 이름");
  expect(external).toEqual([]);
});

test("date/input errors are described, focus first error, and invalid duration cannot pass validation", async ({ page, context, baseURL }) => {
  await gallery(page, context, baseURL!);
  await page.getByRole("button", { name: "입력 오류 확인", exact: true }).click();
  const date = page.getByLabel("합성 목표일", { exact: true });
  await expect(date).toBeFocused();
  await expect(date).toHaveAttribute("aria-invalid", "true");
  await expect(date).toHaveAttribute("aria-describedby", /demo-goal-error/);
  await date.fill("2028-02-29");
  await page.locator("#demo-duration-hours").fill("25");
  await expect(page.locator("#demo-duration-hours")).toHaveAttribute("aria-invalid", "true");
  expect(await page.locator("#demo-duration-hours").evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false);
  await page.getByRole("button", { name: "입력 오류 확인", exact: true }).click();
  await expect(page.locator("#demo-duration-hours")).toBeFocused();
  await expect(page.getByText("입력 형식을 확인했습니다. 저장하지 않았습니다.", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("duration-value")).toHaveText("마지막 유효 입력: 90분");
  await page.locator("#demo-duration-hours").fill("24");
  await page.locator("#demo-duration-minutes").fill("0");
  await page.getByRole("button", { name: "입력 오류 확인", exact: true }).click();
  await expect(page.getByTestId("duration-value")).toHaveText("마지막 유효 입력: 1440분");
  await expect(page.getByText("입력 형식을 확인했습니다. 저장하지 않았습니다.", { exact: true })).toBeVisible();
  await page.locator("#demo-duration-minutes").fill("60");
  await expect(page.locator("#demo-duration-minutes")).toHaveValue("60");
  await expect(page.locator("#demo-duration-minutes")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("입력 형식을 확인했습니다. 저장하지 않았습니다.", { exact: true })).toHaveCount(0);
});

test("tabs implement roving focus, arrow activation, Home/End, and disabled skipping", async ({ page, context, baseURL }) => {
  await gallery(page, context, baseURL!);
  const written = page.getByRole("tab", { name: "필기 예시", exact: true }), practical = page.getByRole("tab", { name: "실기 예시", exact: true });
  await written.focus(); await page.keyboard.press("ArrowRight");
  await expect(practical).toBeFocused(); await expect(practical).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "실기 예시", exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight"); await expect(written).toBeFocused();
  await page.keyboard.press("End"); await expect(practical).toBeFocused();
  await page.keyboard.press("Home"); await expect(written).toBeFocused();
  await expect(page.getByRole("tab", { name: "미지원 단계" })).toBeDisabled();
});

test("dialog traps focus, closes on Escape and button, and returns focus to each trigger", async ({ page, context, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gallery(page, context, baseURL!);
  const trigger = page.getByRole("button", { name: "대화상자 열기", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "합성 항목 삭제 확인", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "대화상자 닫기", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "예시 확인 후 닫기", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "대화상자 닫기", exact: true })).toBeFocused();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await screen(page, "ui-dialog-390");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
  const other = page.getByRole("button", { name: "삭제 확인 예시", exact: true });
  await other.click(); await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await expect(other).toBeFocused();
});

test("chart rendering failure stays inside chart and keeps the semantic data table", async ({ page, context, baseURL }) => {
  await gallery(page, context, baseURL!);
  const table = page.getByRole("table", { name: "차트 오류 격리 예시 데이터 표", exact: true });
  const figure = table.locator("xpath=ancestor::figure");
  await expect(table).toBeVisible();
  await expect(figure.getByRole("img")).toBeVisible();
  await page.getByRole("button", { name: "차트 오류 확인", exact: true }).click();
  await expect(figure.getByRole("img")).toHaveCount(0);
  await expect(figure.getByText("차트 대신 아래 데이터 표를 확인해 주세요.", { exact: false })).toBeVisible();
  await expect(table).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "응시자", exact: true })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: "회차 1", exact: true })).toBeVisible();
  await expect(table.getByRole("cell", { name: "20.0%", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "화면을 불러오지 못했습니다" })).toHaveCount(0);
  await screen(page, "ui-chart-fallback");
});

test("loading disables repeat submissions and checkbox retains native keyboard semantics", async ({ page, context, baseURL }) => {
  await gallery(page, context, baseURL!);
  await page.getByTestId("busy-button").dblclick();
  await expect(page.getByTestId("busy-button")).toBeDisabled();
  await expect(page.getByTestId("busy-button")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByTestId("button-result")).toContainText("제출 실행 1회");
  await page.getByRole("button", { name: "처리 완료 확인", exact: true }).click();
  await expect(page.getByTestId("busy-button")).toBeEnabled();
  const check = page.getByRole("checkbox", { name: "이 예제가 합성 자료임을 확인했습니다", exact: true });
  await check.focus(); await page.keyboard.press("Space"); await expect(check).toBeChecked();
});

test("source stamps distinguish timestamps, preserve unknown review, and do not write local storage", async ({ page, context, baseURL }) => {
  await gallery(page, context, baseURL!);
  const source = page.getByRole("complementary", { name: "자료 출처와 확인 시각" });
  await expect(source.locator("time")).toHaveCount(3);
  await expect(source.locator("time").last()).toHaveAttribute("datetime", "2026-10-20T03:00:00Z");
  await expect(source.locator("dd").last()).toHaveText("미확인");
  await expect(source).toContainText("한국시간");
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

for (const mode of ["css-zoom-200", "text-200"] as const) {
  test(`200% ${mode} reflows without clipping or bottom navigation obstruction`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width: mode === "css-zoom-200" ? 720 : 360, height: 1000 });
    await gallery(page, context, baseURL!);
    await page.evaluate(mode => {
      if (mode === "css-zoom-200") document.documentElement.style.zoom = "2";
      else document.documentElement.style.fontSize = "200%";
    }, mode);
    await fits(page);
    await screen(page, `ui-gallery-${mode}`);
    await page.getByTestId("gallery-last-action").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("gallery-last-action").getByRole("link")).toBeVisible();
    await expect.poll(async () => {
      const nav = await page.getByRole("navigation", { name: "모바일 메뉴" }).boundingBox();
      const last = await page.getByTestId("gallery-last-action").boundingBox();
      return last!.y + last!.height <= nav!.y;
    }).toBe(true);
    await fits(page);
  });
}

for (const width of [390, 768, 1440]) {
  test(`200% text at ${width}px preserves header and gallery layout`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 1000 });
    await gallery(page, context, baseURL!);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await fits(page);
    await screen(page, `ui-gallery-text-200-${width}`);
    await page.getByTestId("gallery-last-action").scrollIntoViewIfNeeded();
    await fits(page);
  });
}

test("reduced motion stops the loading spinner animation", async ({ page, context, baseURL }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gallery(page, context, baseURL!);
  const animation = await page.getByTestId("state-loading").locator('button > span[aria-hidden="true"]').evaluate(el => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
});

test("actual text, control borders and keyboard focus colors meet contrast thresholds", async ({ page, context, baseURL }) => {
  await gallery(page, context, baseURL!);
  // Read rendered combinations, rather than assuming token colors pass.
  const combinations = await page.evaluate(() => {
    function rgb(value: string): number[] { return (value.match(/[\d.]+/g) ?? []).map(Number); }
    function background(element: Element): number[] {
      for (let el: Element | null = element; el; el = el.parentElement) {
        const c = rgb(getComputedStyle(el).backgroundColor);
        if (c.length === 3 || c[3] === 1) return c.slice(0, 3);
      }
      return [255, 255, 255];
    }
    function luma(c: number[]) { const a = c.map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }); return .2126*a[0]+.7152*a[1]+.0722*a[2]; }
    function ratio(a: number[], b: number[]) { const x=luma(a),y=luma(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
    const found = new Map<string, { kind: string; foreground: number[]; background: number[]; ratio: number; minimum: number }>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, el = node.parentElement;
      if (!el || !node.textContent?.trim() || !el.checkVisibility({ visibilityProperty: true })) continue;
      const fg=rgb(getComputedStyle(el).color).slice(0,3),bg=background(el);
      const key=`text:${fg}:${bg}`;
      found.set(key,{kind:"text",foreground:fg,background:bg,ratio:ratio(fg,bg),minimum:4.5});
    }
    for (const el of document.querySelectorAll('input:not([type="checkbox"]), select')) {
      const style=getComputedStyle(el),fg=rgb(style.borderTopColor).slice(0,3),bg=background(el);
      found.set(`border:${fg}:${bg}`,{kind:"control-border",foreground:fg,background:bg,ratio:ratio(fg,bg),minimum:3});
    }
    const focus = document.querySelector<HTMLInputElement>("#demo-search")!;
    focus.focus();
    const fg=rgb(getComputedStyle(focus).outlineColor).slice(0,3),bg=background(focus);
    found.set(`focus:${fg}:${bg}`,{kind:"focus",foreground:fg,background:bg,ratio:ratio(fg,bg),minimum:3});
    return [...found.values()];
  });
  expect(combinations.length).toBeGreaterThan(10);
  expect(combinations.filter(row => row.ratio < row.minimum)).toEqual([]);
  const evidenceDir = process.env.STEP_EVIDENCE_DIR ?? "test-results";
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, "contrast.json"), JSON.stringify({ method: "WCAG relative luminance of rendered foreground and nearest opaque background", combinations, status: "PASS", limits: "Computed color checks; not a full WCAG audit" }, null, 2));
});
