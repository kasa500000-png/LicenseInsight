import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { domainBrowserBundle } from "../../scripts/domain-browser-bundle.mjs";
import { domainOracleExpected } from "../support/domain-oracle";

declare global {
  interface Window { DomainVerification: typeof import("../support/domain-browser-entry"); }
}

// Ephemeral test document only. No Next route, public fixture or persistence.
const documentHtml = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>STEP-06 계산 엔진 검증</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#17283e;font:16px/1.6 system-ui,sans-serif}main{max-width:980px;margin:auto;padding:32px 20px 48px}h1{font-size:clamp(24px,4vw,36px);line-height:1.3;margin:12px 0}h2{font-size:18px;margin:0 0 8px}p{margin:8px 0}.badge{font-size:13px;font-weight:700;color:#794a09;background:#fff1cf;display:inline-block;padding:4px 10px;border-radius:5px}.intro{color:#53647a}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:16px;margin:24px 0}section{background:white;border:1px solid #dbe2eb;border-radius:12px;padding:20px}.value{font-size:30px;font-weight:750;color:#154e8a}.note{font-size:14px;color:#52647b}.pass{padding:16px;border-left:4px solid #29825e;background:#e8f5ed;font-weight:700}footer{font-size:14px;color:#52647b;margin-top:20px}
</style><main><span class="badge">SYNTHETIC · 오프라인 테스트 전용</span><h1>계산 엔진 브라우저 검증</h1><p class="intro">주입한 시계와 합성 입력으로 계산한 결과입니다. 공식 자격·일정·통계가 아닙니다.</p>
<div class="grid"><section><h2>한국 자정 경계</h2><p class="value" data-testid="midnight"></p><p class="note">23:59 → 00:00 / 목표 2026-10-21</p></section><section><h2>응시·합격 수 합산</h2><p class="value" data-testid="rate"></p><p class="note">합격 470명 / 응시 1,000명<br>회차 비율의 단순 평균을 사용하지 않습니다.</p></section><section><h2>일주일 공부 가능 시간</h2><p class="value" data-testid="week"></p><p class="note">평일 5×60분 + 주말 2×180분</p></section><section><h2>평일 하루 제외</h2><p class="value" data-testid="excluded"></p><p class="note">제외일에는 공부를 배정하지 않습니다.</p></section></div>
<p data-testid="target"></p><p class="pass" data-testid="result" role="status">계산 중</p><footer>메모리에만 존재하는 검증 문서입니다. 제품 화면·공공 API 연결·개인 계획 저장 기능의 완료 근거가 아닙니다.</footer></main></html>`;

async function showOracle(page: Page) {
  const requests: string[] = [];
  await page.route("**/*", async route => { requests.push(route.request().url()); await route.abort(); });
  await page.setContent(documentHtml);
  const bundle = await domainBrowserBundle();
  await page.addScriptTag({ content: bundle.code });
  const result = await page.evaluate(() => {
    const value = window.DomainVerification.calculateDomainOracle();
    const put = (id: string, text: string) => { document.querySelector(`[data-testid="${id}"]`)!.textContent = text; };
    put("midnight", `D-${value.beforeMidnight} → D-day`);
    put("rate", `${value.rate}%`);
    put("week", `${value.weekMinutes}분`);
    put("excluded", `${value.excludedMinutes}분`);
    put("target", `마지막 공부일 ${value.lastStudyDate} · 목표일 2026-10-26은 계산에서 제외`);
    put("result", "계산 완료 · 고정 기대값과 일치 여부는 자동 검증으로 확인");
    return value;
  });
  expect(result).toEqual(domainOracleExpected);
  expect(requests).toEqual([]);
  await expect(page.getByTestId("rate")).toHaveText("47.0%");
  await expect(page.getByTestId("week")).toHaveText("660분");
  await expect(page.getByTestId("excluded")).toHaveText("600분");
  return result;
}

for (const width of [360, 390, 768, 1440]) {
  test(`pure domain engine renders fixed oracles at ${width}px in Seoul`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 960 }, timezoneId: "Asia/Seoul" });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.name));
      await showOracle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      const directory = process.env.SCREENSHOT_DIR ?? "test-results/screenshots";
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, `domain-oracle-${width}.png`), fullPage: true });
    } finally { await context.close(); }
  });
}

for (const timezoneId of ["America/Los_Angeles", "Pacific/Honolulu"]) {
  test(`browser timezone ${timezoneId} preserves the complete domain oracle`, async ({ browser }) => {
    const context = await browser.newContext({ timezoneId });
    try { await showOracle(await context.newPage()); }
    finally { await context.close(); }
  });
}
