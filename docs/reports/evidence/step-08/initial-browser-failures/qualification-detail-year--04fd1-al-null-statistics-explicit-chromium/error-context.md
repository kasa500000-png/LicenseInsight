# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qualification-detail.spec.ts >> year and stage selection keeps partial/null statistics explicit
- Location: tests/e2e/qualification-detail.spec.ts:86:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('연도', { exact: true })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "본문으로 바로가기" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "자격인사이트 홈" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [aria-hidden] [ref=e6]: 자
        - text: 자격인사이트
      - navigation "주요 메뉴" [ref=e7]:
        - link "홈" [ref=e8] [cursor=pointer]:
          - /url: /
        - link "일정" [ref=e13] [cursor=pointer]:
          - /url: /calendar
        - link "비교" [ref=e18] [cursor=pointer]:
          - /url: /compare
        - link "내 준비" [ref=e22] [cursor=pointer]:
          - /url: /my-plan
  - main [ref=e27]:
    - generic [ref=e28]:
      - status [ref=e29]:
        - generic [aria-hidden] [ref=e30]: ◇
        - generic [ref=e31]:
          - paragraph [ref=e32]: SYNTHETIC · 합성 테스트 자료
          - generic [ref=e33]: "상세 흐름을 확인하는 로컬/테스트 전용 합성 자료입니다. 실제 공공 데이터 검증은 완료되지 않았습니다. 고정 평가 시점: 2026-10-21 12:00 (한국시간)."
      - generic [ref=e34]:
        - generic [ref=e35]:
          - paragraph [ref=e36]: 자격 상세 · SYNTHETIC
          - heading "합성 전기설비 자격" [level=1] [ref=e37]
          - paragraph [ref=e38]: 합성 등급 · 전기 분야 UI 검증 · 검정형
          - generic [ref=e39]:
            - generic [ref=e40]:
              - generic [aria-hidden] [ref=e41]: i
              - generic [ref=e42]: 일정·통계 분리 확인
            - generic [ref=e43]:
              - generic [aria-hidden] [ref=e44]: "!"
              - generic [ref=e45]: 실데이터 미검증
        - generic [ref=e46]:
          - link "관심·준비 계획 진입" [ref=e47] [cursor=pointer]:
            - /url: /my-plan
          - link "Q-Net 바로가기 ↗" [ref=e48] [cursor=pointer]:
            - /url: https://www.q-net.or.kr/
      - paragraph [ref=e49]: 관심 저장과 개인 계획 편집은 다음 단계에서 제공합니다. 현재 진입 링크로는 저장되지 않습니다.
      - navigation "상세 내용" [ref=e50]:
        - link "다음 일정" [ref=e51] [cursor=pointer]:
          - /url: "#next-events"
        - link "필기·실기 일정" [ref=e52] [cursor=pointer]:
          - /url: "#detail-schedules"
        - link "연도별 통계" [ref=e53] [cursor=pointer]:
          - /url: "#detail-statistics"
        - link "시험 정보·출처" [ref=e54] [cursor=pointer]:
          - /url: "#detail-information"
      - region [ref=e55]:
        - generic [ref=e56]:
          - paragraph [ref=e57]: 01 · 다음 확인할 일
          - heading "접수와 시험을 차례로 확인하세요" [level=2] [ref=e58]
        - generic [ref=e59]:
          - article [ref=e60]:
            - paragraph [ref=e61]: 다음 확인할 일
            - heading "필기 · 일반 접수" [level=3] [ref=e62]
            - generic [ref=e63]:
              - paragraph [ref=e64]: 2026-10-21 – 2026-10-23 · 시각 미제공
              - paragraph [ref=e65]: 시작일 · 시각 미확인
              - paragraph [ref=e66]: 접수 가능·잔여 좌석을 뜻하지 않습니다.
            - link "Q-Net 공식 안내 확인 ↗" [ref=e68] [cursor=pointer]:
              - /url: https://www.q-net.or.kr/
          - article [ref=e69]:
            - paragraph [ref=e70]: 다음 확인할 일
            - heading "실기 · 일반 접수" [level=3] [ref=e71]
            - generic [ref=e72]:
              - paragraph [ref=e73]: 2026. 11. 02. 09:00 – 2026. 11. 02. 18:00 (한국시간)
              - paragraph [ref=e74]: D-12 · 예정
              - paragraph [ref=e75]: 접수 가능·잔여 좌석을 뜻하지 않습니다.
            - link "Q-Net 공식 안내 확인 ↗" [ref=e77] [cursor=pointer]:
              - /url: https://www.q-net.or.kr/
      - region [ref=e78]:
        - generic [ref=e79]:
          - paragraph [ref=e80]: 02 · 일정
          - heading "필기와 실기 일정" [level=2] [ref=e81]
          - paragraph [ref=e82]: 일정의 날짜·기간·시각 정밀도를 구분합니다. 모든 날짜는 한국시간 기준입니다.
        - generic [ref=e83]:
          - region "필기 일정" [ref=e84]:
            - heading "필기" [level=3] [ref=e85]
            - article [ref=e87]:
              - generic [ref=e88]:
                - paragraph [ref=e89]: 필기 · 일반 접수
                - generic [ref=e90]: 시작일 · 시각 미확인
              - heading "2026년 합성 1회 · 일반 접수" [level=3] [ref=e91]
              - paragraph [ref=e92]: 2026-10-21 – 2026-10-23 · 시각 미제공
              - paragraph [ref=e93]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=e95]:
                - generic "이 일정의 출처·확인 시각" [ref=e96] [cursor=pointer]
            - article [ref=e98]:
              - generic [ref=e99]:
                - paragraph [ref=e100]: 필기 · 추가 접수
                - generic [ref=e101]: 예정
              - heading "2026년 합성 1회 · 추가 접수" [level=3] [ref=e102]
              - paragraph [ref=e103]: 2026-10-24 – 2026-10-25 · 시각 미제공
              - paragraph [ref=e104]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=e106]:
                - generic "이 일정의 출처·확인 시각" [ref=e107] [cursor=pointer]
            - article [ref=e109]:
              - generic [ref=e110]:
                - paragraph [ref=e111]: 필기 · 시험
                - generic [ref=e112]: 예정
              - heading "2026년 합성 1회 · 시험" [level=3] [ref=e113]
              - paragraph [ref=e114]: 2026-11-10 – 2026-11-15 · 시각 미제공
              - paragraph [ref=e115]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다. 시험 기간입니다. 개인별 시험일이 확정된 값은 아닙니다.
              - group [ref=e117]:
                - generic "이 일정의 출처·확인 시각" [ref=e118] [cursor=pointer]
            - article [ref=e120]:
              - generic [ref=e121]:
                - paragraph [ref=e122]: 필기 · 합격 발표
                - generic [ref=e123]: 예정
              - heading "2026년 합성 1회 · 합격 발표" [level=3] [ref=e124]
              - paragraph [ref=e125]: 2026-12-01 · 시각 미제공
              - paragraph [ref=e126]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=e128]:
                - generic "이 일정의 출처·확인 시각" [ref=e129] [cursor=pointer]
            - article [ref=e131]:
              - generic [ref=e132]:
                - paragraph [ref=e133]: 필기 · 일반 접수
                - generic [ref=e134]: 예정
              - heading "2027년 합성 1회 · 일반 접수" [level=3] [ref=e135]
              - paragraph [ref=e136]: 2027-01-05 – 2027-01-07 · 시각 미제공
              - paragraph [ref=e137]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=e139]:
                - generic "이 일정의 출처·확인 시각" [ref=e140] [cursor=pointer]
          - region "실기 일정" [ref=e141]:
            - heading "실기" [level=3] [ref=e142]
            - article [ref=e144]:
              - generic [ref=e145]:
                - paragraph [ref=e146]: 실기 · 일반 접수
                - generic [ref=e147]: 예정
              - heading "2026년 합성 1회 · 일반 접수" [level=3] [ref=e148]
              - paragraph [ref=e149]: 2026. 11. 02. 09:00 – 2026. 11. 02. 18:00 (한국시간)
              - paragraph [ref=e150]: ⓘ 접수 가능 여부와 잔여 좌석을 보장하지 않습니다.
              - group [ref=e152]:
                - generic "이 일정의 출처·확인 시각" [ref=e153] [cursor=pointer]
            - article [ref=e155]:
              - generic [ref=e156]:
                - paragraph [ref=e157]: 실기 · 서류 제출
                - generic [ref=e158]: 예정
              - heading "2026년 합성 1회 · 서류 제출" [level=3] [ref=e159]
              - paragraph [ref=e160]: 2026-11-05 – 2026-11-06 · 시각 미제공
              - paragraph [ref=e161]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=e163]:
                - generic "이 일정의 출처·확인 시각" [ref=e164] [cursor=pointer]
            - article [ref=e166]:
              - generic [ref=e167]:
                - paragraph [ref=e168]: 실기 · 시험
                - generic [ref=e169]: 예정
              - heading "2026년 합성 1회 · 시험" [level=3] [ref=e170]
              - paragraph [ref=e171]: 2026-12-05 – 2026-12-09 · 시각 미제공
              - paragraph [ref=e172]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다. 시험 기간입니다. 개인별 시험일이 확정된 값은 아닙니다.
              - group [ref=e174]:
                - generic "이 일정의 출처·확인 시각" [ref=e175] [cursor=pointer]
            - article [ref=e177]:
              - generic [ref=e178]:
                - paragraph [ref=e179]: 실기 · 합격 발표
                - generic [ref=e180]: 예정
              - heading "2026년 합성 1회 · 합격 발표" [level=3] [ref=e181]
              - paragraph [ref=e182]: 2026-12-20 · 시각 미제공
              - paragraph [ref=e183]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=e185]:
                - generic "이 일정의 출처·확인 시각" [ref=e186] [cursor=pointer]
      - region [ref=e187]:
        - generic [ref=e188]:
          - paragraph [ref=e189]: 03 · 통계
          - heading "연도별 응시·합격 통계" [level=2] [ref=e190]
          - paragraph [ref=e191]: 과거 응시 집단의 결과입니다. 개인의 합격 가능성이나 난이도를 예측하지 않습니다.
        - form "통계 선택" [ref=e192]:
          - generic [ref=e193]:
            - text: 연도
            - combobox "연도" [ref=e194]:
              - option "2024년"
              - option "2025년" [selected]
              - option "2026년 · 진행 중"
          - generic [ref=e195]:
            - text: 시험 단계
            - combobox "시험 단계" [ref=e196]:
              - option "필기" [selected]
              - option "실기"
          - button "통계 보기" [ref=e197] [cursor=pointer]
        - region "2025년 필기 통계" [ref=e199]:
          - paragraph [ref=e200]: 합격률은 해당 자료의 응시자 대비 합격자 비율입니다. 개인의 합격 가능성이나 시험 난이도를 뜻하지 않습니다.
          - generic [ref=e201]:
            - region "자체 회차 합산" [ref=e202]:
              - heading "자체 회차 합산" [level=3] [ref=e203]
              - paragraph [ref=e204]: 2025년 필기 · 완료 연도 · 확인된 전체 회차 · 자체 합산
              - paragraph [ref=e205]: 47.0%
              - generic [ref=e206]:
                - generic [ref=e207]:
                  - term [ref=e208]: 응시자
                  - definition [ref=e209]: 1,000명
                - generic [ref=e210]:
                  - term [ref=e211]: 합격자
                  - definition [ref=e212]: 470명
            - paragraph [ref=e213]: "합산 검증 상태: 검증 완료 · 공식 연간값은 회차 합산에 더하지 않습니다."
          - generic [ref=e214]:
            - paragraph [ref=e215]: "자료 범위: 완료 자료 · 수집 회차 2개"
            - paragraph [ref=e216]: 확인된 예상 회차 중 누락된 회차가 없습니다.
          - figure [ref=e217]:
            - generic [ref=e218]:
              - strong [ref=e219]: 2025년 필기 회차별 합격률
              - paragraph [ref=e220]: 회차별 응시자와 합격자, 검증 상태를 아래 표에서 함께 확인할 수 있습니다. 비율이 산출되지 않은 회차는 0%로 표시하지 않습니다.
            - img "2025년 필기 회차별 합격률 막대 차트. 빗금 막대는 필기 합격률이며 아래 표와 같은 값을 표시합니다." [ref=e222]:
              - paragraph [ref=e223]: "빗금 막대: 필기 합격률 · 가로축 0~100%"
              - list [ref=e225]:
                - listitem [ref=e226]:
                  - generic [ref=e227]: "1"
                  - generic [ref=e230]: 20.0%
                - listitem [ref=e231]:
                  - generic [ref=e232]: "2"
                  - generic [ref=e235]: 50.0%
            - region "2025년 필기 회차별 합격률 데이터 표 가로 스크롤 표" [ref=e236]:
              - table [ref=e237]:
                - caption [ref=e238]: 2025년 필기 회차별 합격률 데이터 표
                - rowgroup [ref=e239]:
                  - row [ref=e240]:
                    - columnheader "회차" [ref=e241]
                    - columnheader "응시자" [ref=e242]
                    - columnheader "합격자" [ref=e243]
                    - columnheader "인원 기준 합격률" [ref=e244]
                    - columnheader "출처 원문 비율" [ref=e245]
                    - columnheader "수집 범위" [ref=e246]
                    - columnheader "검증 상태" [ref=e247]
                - rowgroup [ref=e248]:
                  - row [ref=e249]:
                    - rowheader "1" [ref=e250]
                    - cell "100명" [ref=e251]
                    - cell "20명" [ref=e253]
                    - cell "20.0%" [ref=e255]
                    - cell "미제공" [ref=e256]
                    - cell "완료 자료" [ref=e258]
                    - cell "검증 완료 원문 비율 미제공" [ref=e259]:
                      - generic [ref=e260]:
                        - generic [ref=e261]:
                          - generic [aria-hidden] [ref=e262]: ✓
                          - generic [ref=e263]: 검증 완료
                        - generic [ref=e264]: 원문 비율 미제공
                  - row [ref=e265]:
                    - rowheader "2" [ref=e266]
                    - cell "900명" [ref=e267]
                    - cell "450명" [ref=e269]
                    - cell "50.0%" [ref=e271]
                    - cell "미제공" [ref=e272]
                    - cell "완료 자료" [ref=e274]
                    - cell "검증 완료 원문 비율 미제공" [ref=e275]:
                      - generic [ref=e276]:
                        - generic [ref=e277]:
                          - generic [aria-hidden] [ref=e278]: ✓
                          - generic [ref=e279]: 검증 완료
                        - generic [ref=e280]: 원문 비율 미제공
          - region "공식 제공 연간값" [ref=e281]:
            - paragraph [ref=e282]: 공식 제공 연간값은 회차별 자료와 별도인 원천 자료입니다. 자체 회차 합산에 중복으로 더하지 않습니다.
            - generic [ref=e283]:
              - region "공식 제공 연간값" [ref=e284]:
                - heading "공식 제공 연간값" [level=3] [ref=e285]
                - paragraph [ref=e286]: 2025년 필기 · 완료 자료
                - paragraph [ref=e287]: 47.0%
                - generic [ref=e288]:
                  - generic [ref=e289]:
                    - term [ref=e290]: 응시자
                    - definition [ref=e291]: 1,000명
                  - generic [ref=e292]:
                    - term [ref=e293]: 합격자
                    - definition [ref=e294]: 470명
              - paragraph [ref=e295]:
                - text: "출처 원문 비율:"
                - generic [ref=e296]: 미제공
              - generic [ref=e297]:
                - generic [ref=e298]:
                  - generic [aria-hidden] [ref=e299]: ✓
                  - generic [ref=e300]: 검증 완료
                - generic [ref=e301]: 원문 비율 미제공
          - complementary "자료 출처와 확인 시각" [ref=e302]:
            - paragraph [ref=e303]: "↗ 출처: 합성 레코드 · 공식 출처 아님"
            - paragraph [ref=e304]: "자료 기준: 기준 시점 미확인"
            - generic [ref=e305]:
              - generic [ref=e306]:
                - term [ref=e307]: 공식 발표
                - definition [ref=e308]: 미확인
              - generic [ref=e309]:
                - term [ref=e310]: 자료 수집
                - definition [ref=e311]:
                  - time [ref=e312]: 2026. 10. 21. 10:00 (한국시간)
              - generic [ref=e313]:
                - term [ref=e314]: 마지막 자동 검증
                - definition [ref=e315]:
                  - time [ref=e316]: 2026. 10. 21. 11:00 (한국시간)
              - generic [ref=e317]:
                - term [ref=e318]: 운영자 대조
                - definition [ref=e319]:
                  - time [ref=e320]: 2026. 10. 21. 11:30 (한국시간)
      - region [ref=e321]:
        - generic [ref=e322]:
          - paragraph [ref=e323]: 04 · 시험 정보와 출처
          - heading "확인된 범위 안에서 준비하세요" [level=2] [ref=e324]
        - generic [ref=e325]:
          - paragraph [ref=e326]: 화면과 계산 연결을 확인하는 합성 설명입니다. 실제 종목의 응시자격·수수료·시험기준은 제공하지 않습니다.
          - paragraph [ref=e327]: "응시자격 · 수수료 · 시험기준: 미확인"
        - complementary "자료 출처와 확인 시각" [ref=e328]:
          - paragraph [ref=e329]: "↗ 출처: 합성 레코드 · 공식 출처 아님"
          - paragraph [ref=e330]: "자료 기준: 기준 시점 미확인"
          - generic [ref=e331]:
            - generic [ref=e332]:
              - term [ref=e333]: 공식 발표
              - definition [ref=e334]: 미확인
            - generic [ref=e335]:
              - term [ref=e336]: 자료 수집
              - definition [ref=e337]:
                - time [ref=e338]: 2026. 10. 21. 10:00 (한국시간)
            - generic [ref=e339]:
              - term [ref=e340]: 마지막 자동 검증
              - definition [ref=e341]:
                - time [ref=e342]: 2026. 10. 21. 11:00 (한국시간)
            - generic [ref=e343]:
              - term [ref=e344]: 운영자 대조
              - definition [ref=e345]:
                - time [ref=e346]: 2026. 10. 21. 11:30 (한국시간)
        - paragraph [ref=e347]: 위 시각은 합성 레코드의 테스트용 메타데이터입니다. 실제 공식 발표·수집·대조의 증거가 아닙니다.
        - generic [ref=e348]:
          - heading "자료가 다르게 보이나요?" [level=3] [ref=e349]
          - paragraph [ref=e350]: 시행기관의 최신 공고에서 종목·연도·회차를 먼저 확인해 주세요. 정정 요청 접수 기능은 아직 제공하지 않습니다.
          - generic [ref=e351]:
            - link "공식 공고 확인 ↗" [ref=e352] [cursor=pointer]:
              - /url: https://www.q-net.or.kr/
            - link "준비 계획 화면으로" [ref=e353] [cursor=pointer]:
              - /url: /my-plan
  - contentinfo [ref=e354]:
    - paragraph [ref=e355]: 자격인사이트는 비공식 정보 서비스입니다.
    - paragraph [ref=e356]: 최종 일정과 접수 기준은 시행기관의 공식 안내를 확인해 주세요.
  - alert [ref=e357]
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
  73  |     await expect(page.getByRole("heading", { level: 1 })).toHaveText("합성 전기설비 자격");
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
> 88  |   await page.getByLabel("연도", { exact: true }).selectOption("2026");
      |                                                ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
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