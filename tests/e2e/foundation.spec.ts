import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type BrowserContext } from "@playwright/test";

const heading = "확인된 자격 정보를 준비하고 있습니다";

async function blockExternalRequests(context: BrowserContext, allowedOrigin: string) {
  const externalRequests: string[] = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === "http:" || url.protocol === "https:") {
      if (url.origin !== allowedOrigin) {
        externalRequests.push(url.origin);
        await route.abort("blockedbyclient");
        return;
      }
    }
    await route.continue();
  });
  return externalRequests;
}

test("home provides an honest empty state, official link and keyboard entry without external requests", async ({
  page,
  context,
  baseURL,
}) => {
  const externalRequests = await blockExternalRequests(context, new URL(baseURL!).origin);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Q-Net에서 공식 정보 확인" })).toHaveAttribute(
    "href",
    "https://www.q-net.or.kr/",
  );
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "본문으로 바로가기" })).toBeFocused();
  await page.waitForLoadState("networkidle");
  expect(externalRequests).toEqual([]);
});

test("home content is available with JavaScript disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const externalRequests = await blockExternalRequests(context, new URL(baseURL!).origin);
    const page = await context.newPage();
    const response = await page.goto(baseURL!);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("link", { name: "Q-Net에서 공식 정보 확인" })).toBeVisible();
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

for (const width of [360, 390, 768, 1440]) {
  test(`home is readable without page overflow at ${width}px`, async ({ page, context, baseURL }, testInfo) => {
    const externalRequests = await blockExternalRequests(context, new URL(baseURL!).origin);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    const sizes = await page.evaluate(() => ({
      contentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(sizes.contentWidth).toBeLessThanOrEqual(sizes.viewportWidth);
    const screenshotDirectory = process.env.SCREENSHOT_DIR;
    const screenshotPath = screenshotDirectory
      ? path.join(screenshotDirectory, `foundation-home-${width}.png`)
      : testInfo.outputPath(`foundation-home-${width}.png`);
    await mkdir(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(externalRequests).toEqual([]);
  });
}

test("a synthetic render failure reaches the error boundary", async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, new URL(baseURL!).origin);
  await page.goto("/foundation-check/error");
  await page.getByRole("button", { name: "오류 화면 확인" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "화면을 불러오지 못했습니다" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
});

test("an unknown route returns a real 404 page", async ({ page, context, baseURL }) => {
  await blockExternalRequests(context, new URL(baseURL!).origin);
  const response = await page.goto("/foundation-route-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "페이지를 찾을 수 없습니다" })).toBeVisible();
});
