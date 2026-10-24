# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qualification-detail.spec.ts >> range exam and unknown registration time never invent a personal day or hours
- Location: tests/e2e/qualification-detail.spec.ts:127:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.screenshot: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-testid="detail-event"]:first-child')

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - link "본문으로 바로가기" [ref=f1e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f1e3]:
    - link "자격인사이트 홈" [ref=f1e5] [cursor=pointer]:
      - /url: /
      - generic [aria-hidden] [ref=f1e6]: 자
      - text: 자격인사이트
  - main [ref=f1e7]:
    - generic [ref=f1e8]:
      - status [ref=f1e9]:
        - generic [aria-hidden] [ref=f1e10]: ◇
        - generic [ref=f1e11]:
          - paragraph [ref=f1e12]: SYNTHETIC · 합성 테스트 자료
          - generic [ref=f1e13]: "상세 흐름을 확인하는 로컬/테스트 전용 합성 자료입니다. 실제 공공 데이터 검증은 완료되지 않았습니다. 고정 평가 시점: 2026-10-21 12:00 (한국시간)."
      - generic [ref=f1e14]:
        - generic [ref=f1e15]:
          - paragraph [ref=f1e16]: 자격 상세 · SYNTHETIC
          - heading "합성 전기설비 자격" [level=1] [ref=f1e17]
          - paragraph [ref=f1e18]: 합성 등급 · 전기 분야 UI 검증 · 검정형
          - generic [ref=f1e19]:
            - generic [ref=f1e20]:
              - generic [aria-hidden] [ref=f1e21]: i
              - generic [ref=f1e22]: 일정·통계 분리 확인
            - generic [ref=f1e23]:
              - generic [aria-hidden] [ref=f1e24]: "!"
              - generic [ref=f1e25]: 실데이터 미검증
        - generic [ref=f1e26]:
          - link "관심·준비 계획 진입" [ref=f1e27] [cursor=pointer]:
            - /url: /my-plan
          - link "Q-Net 바로가기 ↗" [ref=f1e28] [cursor=pointer]:
            - /url: https://www.q-net.or.kr/
      - paragraph [ref=f1e29]: 관심 저장과 개인 계획 편집은 다음 단계에서 제공합니다. 현재 진입 링크로는 저장되지 않습니다.
      - navigation "상세 내용" [ref=f1e30]:
        - link "다음 일정" [ref=f1e31] [cursor=pointer]:
          - /url: "#next-events"
        - link "필기·실기 일정" [ref=f1e32] [cursor=pointer]:
          - /url: "#detail-schedules"
        - link "연도별 통계" [ref=f1e33] [cursor=pointer]:
          - /url: "#detail-statistics"
        - link "시험 정보·출처" [ref=f1e34] [cursor=pointer]:
          - /url: "#detail-information"
      - region [ref=f1e35]:
        - generic [ref=f1e36]:
          - paragraph [ref=f1e37]: 01 · 다음 확인할 일
          - heading "접수와 시험을 차례로 확인하세요" [level=2] [ref=f1e38]
        - generic [ref=f1e39]:
          - article [ref=f1e40]:
            - paragraph [ref=f1e41]: 다음 확인할 일
            - heading "필기 · 일반 접수" [level=3] [ref=f1e42]
            - generic [ref=f1e43]:
              - paragraph [ref=f1e44]: 2026-10-21 – 2026-10-23 · 시각 미제공
              - paragraph [ref=f1e45]: 시작일 · 시각 미확인
              - paragraph [ref=f1e46]: 접수 가능·잔여 좌석을 뜻하지 않습니다.
            - link "Q-Net 공식 안내 확인 ↗" [ref=f1e48] [cursor=pointer]:
              - /url: https://www.q-net.or.kr/
          - article [ref=f1e49]:
            - paragraph [ref=f1e50]: 다음 확인할 일
            - heading "실기 · 일반 접수" [level=3] [ref=f1e51]
            - generic [ref=f1e52]:
              - paragraph [ref=f1e53]: 2026. 11. 02. 09:00 – 2026. 11. 02. 18:00 (한국시간)
              - paragraph [ref=f1e54]: D-12 · 예정
              - paragraph [ref=f1e55]: 접수 가능·잔여 좌석을 뜻하지 않습니다.
            - link "Q-Net 공식 안내 확인 ↗" [ref=f1e57] [cursor=pointer]:
              - /url: https://www.q-net.or.kr/
      - region [ref=f1e58]:
        - generic [ref=f1e59]:
          - paragraph [ref=f1e60]: 02 · 일정
          - heading "필기와 실기 일정" [level=2] [ref=f1e61]
          - paragraph [ref=f1e62]: 일정의 날짜·기간·시각 정밀도를 구분합니다. 모든 날짜는 한국시간 기준입니다.
        - generic [ref=f1e63]:
          - region "필기 일정" [ref=f1e64]:
            - heading "필기" [level=3] [ref=f1e65]
            - article [ref=f1e67]:
              - generic [ref=f1e68]:
                - paragraph [ref=f1e69]: 필기 · 일반 접수
                - generic [ref=f1e70]: 시작일 · 시각 미확인
              - heading "2026년 합성 1회 · 일반 접수" [level=3] [ref=f1e71]
              - paragraph [ref=f1e72]: 2026-10-21 – 2026-10-23 · 시각 미제공
              - paragraph [ref=f1e73]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=f1e75]:
                - generic "이 일정의 출처·확인 시각" [ref=f1e76] [cursor=pointer]
            - article [ref=f1e78]:
              - generic [ref=f1e79]:
                - paragraph [ref=f1e80]: 필기 · 추가 접수
                - generic [ref=f1e81]: 예정
              - heading "2026년 합성 1회 · 추가 접수" [level=3] [ref=f1e82]
              - paragraph [ref=f1e83]: 2026-10-24 – 2026-10-25 · 시각 미제공
              - paragraph [ref=f1e84]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=f1e86]:
                - generic "이 일정의 출처·확인 시각" [ref=f1e87] [cursor=pointer]
            - article [ref=f1e89]:
              - generic [ref=f1e90]:
                - paragraph [ref=f1e91]: 필기 · 시험
                - generic [ref=f1e92]: 예정
              - heading "2026년 합성 1회 · 시험" [level=3] [ref=f1e93]
              - paragraph [ref=f1e94]: 2026-11-10 – 2026-11-15 · 시각 미제공
              - paragraph [ref=f1e95]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다. 시험 기간입니다. 개인별 시험일이 확정된 값은 아닙니다.
              - group [ref=f1e97]:
                - generic "이 일정의 출처·확인 시각" [ref=f1e98] [cursor=pointer]
            - article [ref=f1e100]:
              - generic [ref=f1e101]:
                - paragraph [ref=f1e102]: 필기 · 합격 발표
                - generic [ref=f1e103]: 예정
              - heading "2026년 합성 1회 · 합격 발표" [level=3] [ref=f1e104]
              - paragraph [ref=f1e105]: 2026-12-01 · 시각 미제공
              - paragraph [ref=f1e106]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=f1e108]:
                - generic "이 일정의 출처·확인 시각" [ref=f1e109] [cursor=pointer]
            - article [ref=f1e111]:
              - generic [ref=f1e112]:
                - paragraph [ref=f1e113]: 필기 · 일반 접수
                - generic [ref=f1e114]: 예정
              - heading "2027년 합성 1회 · 일반 접수" [level=3] [ref=f1e115]
              - paragraph [ref=f1e116]: 2027-01-05 – 2027-01-07 · 시각 미제공
              - paragraph [ref=f1e117]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=f1e119]:
                - generic "이 일정의 출처·확인 시각" [ref=f1e120] [cursor=pointer]
          - region "실기 일정" [ref=f1e121]:
            - heading "실기" [level=3] [ref=f1e122]
            - article [ref=f1e124]:
              - generic [ref=f1e125]:
                - paragraph [ref=f1e126]: 실기 · 일반 접수
                - generic [ref=f1e127]: 예정
              - heading "2026년 합성 1회 · 일반 접수" [level=3] [ref=f1e128]
              - paragraph [ref=f1e129]: 2026. 11. 02. 09:00 – 2026. 11. 02. 18:00 (한국시간)
              - paragraph [ref=f1e130]: ⓘ 접수 가능 여부와 잔여 좌석을 보장하지 않습니다.
              - group [ref=f1e132]:
                - generic "이 일정의 출처·확인 시각" [ref=f1e133] [cursor=pointer]
            - article [ref=f1e135]:
              - generic [ref=f1e136]:
                - paragraph [ref=f1e137]: 실기 · 서류 제출
                - generic [ref=f1e138]: 예정
              - heading "2026년 합성 1회 · 서류 제출" [level=3] [ref=f1e139]
              - paragraph [ref=f1e140]: 2026-11-05 – 2026-11-06 · 시각 미제공
              - paragraph [ref=f1e141]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=f1e143]:
                - generic "이 일정의 출처·확인 시각" [ref=f1e144] [cursor=pointer]
            - article [ref=f1e146]:
              - generic [ref=f1e147]:
                - paragraph [ref=f1e148]: 실기 · 시험
                - generic [ref=f1e149]: 예정
              - heading "2026년 합성 1회 · 시험" [level=3] [ref=f1e150]
              - paragraph [ref=f1e151]: 2026-12-05 – 2026-12-09 · 시각 미제공
              - paragraph [ref=f1e152]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다. 시험 기간입니다. 개인별 시험일이 확정된 값은 아닙니다.
              - group [ref=f1e154]:
                - generic "이 일정의 출처·확인 시각" [ref=f1e155] [cursor=pointer]
            - article [ref=f1e157]:
              - generic [ref=f1e158]:
                - paragraph [ref=f1e159]: 실기 · 합격 발표
                - generic [ref=f1e160]: 예정
              - heading "2026년 합성 1회 · 합격 발표" [level=3] [ref=f1e161]
              - paragraph [ref=f1e162]: 2026-12-20 · 시각 미제공
              - paragraph [ref=f1e163]: ⓘ 접수 가능 시각·마감 시각을 알 수 없습니다.
              - group [ref=f1e165]:
                - generic "이 일정의 출처·확인 시각" [ref=f1e166] [cursor=pointer]
      - region [ref=f1e167]:
        - generic [ref=f1e168]:
          - paragraph [ref=f1e169]: 03 · 통계
          - heading "연도별 응시·합격 통계" [level=2] [ref=f1e170]
          - paragraph [ref=f1e171]: 과거 응시 집단의 결과입니다. 개인의 합격 가능성이나 난이도를 예측하지 않습니다.
        - form "통계 선택" [ref=f1e172]:
          - generic [ref=f1e173]:
            - text: 연도
            - combobox "연도" [ref=f1e174]:
              - option "2024년"
              - option "2025년" [selected]
              - option "2026년 · 진행 중"
          - generic [ref=f1e175]:
            - text: 시험 단계
            - combobox "시험 단계" [ref=f1e176]:
              - option "필기" [selected]
              - option "실기"
          - button "통계 보기" [ref=f1e177] [cursor=pointer]
        - region "2025년 필기 통계" [ref=f1e179]:
          - paragraph [ref=f1e180]: 합격률은 해당 자료의 응시자 대비 합격자 비율입니다. 개인의 합격 가능성이나 시험 난이도를 뜻하지 않습니다.
          - generic [ref=f1e181]:
            - region "자체 회차 합산" [ref=f1e182]:
              - heading "자체 회차 합산" [level=3] [ref=f1e183]
              - paragraph [ref=f1e184]: 2025년 필기 · 완료 연도 · 확인된 전체 회차 · 자체 합산
              - paragraph [ref=f1e185]: 47.0%
              - generic [ref=f1e186]:
                - generic [ref=f1e187]:
                  - term [ref=f1e188]: 응시자
                  - definition [ref=f1e189]: 1,000명
                - generic [ref=f1e190]:
                  - term [ref=f1e191]: 합격자
                  - definition [ref=f1e192]: 470명
            - paragraph [ref=f1e193]: "합산 검증 상태: 검증 완료 · 공식 연간값은 회차 합산에 더하지 않습니다."
          - generic [ref=f1e194]:
            - paragraph [ref=f1e195]: "자료 범위: 완료 자료 · 수집 회차 2개"
            - paragraph [ref=f1e196]: 확인된 예상 회차 중 누락된 회차가 없습니다.
          - figure [ref=f1e197]:
            - generic [ref=f1e198]:
              - strong [ref=f1e199]: 2025년 필기 회차별 합격률
              - paragraph [ref=f1e200]: 회차별 응시자와 합격자, 검증 상태를 아래 표에서 함께 확인할 수 있습니다. 비율이 산출되지 않은 회차는 0%로 표시하지 않습니다.
            - img "2025년 필기 회차별 합격률 막대 차트. 빗금 막대는 필기 합격률이며 아래 표와 같은 값을 표시합니다." [ref=f1e202]:
              - paragraph [ref=f1e203]: "빗금 막대: 필기 합격률 · 가로축 0~100%"
              - list [ref=f1e205]:
                - listitem [ref=f1e206]:
                  - generic [ref=f1e207]: "1"
                  - generic [ref=f1e210]: 20.0%
                - listitem [ref=f1e211]:
                  - generic [ref=f1e212]: "2"
                  - generic [ref=f1e215]: 50.0%
            - region "2025년 필기 회차별 합격률 데이터 표 가로 스크롤 표" [ref=f1e216]:
              - table [ref=f1e217]:
                - caption [ref=f1e218]: 2025년 필기 회차별 합격률 데이터 표
                - rowgroup [ref=f1e219]:
                  - row [ref=f1e220]:
                    - columnheader "회차" [ref=f1e221]
                    - columnheader "응시자" [ref=f1e222]
                    - columnheader "합격자" [ref=f1e223]
                    - columnheader "인원 기준 합격률" [ref=f1e224]
                    - columnheader "출처 원문 비율" [ref=f1e225]
                    - columnheader "수집 범위" [ref=f1e226]
                    - columnheader "검증 상태" [ref=f1e227]
                - rowgroup [ref=f1e228]:
                  - row [ref=f1e229]:
                    - rowheader "1" [ref=f1e230]
                    - cell "100명" [ref=f1e231]
                    - cell "20명" [ref=f1e233]
                    - cell "20.0%" [ref=f1e235]
                    - cell "미제공" [ref=f1e236]
                    - cell "완료 자료" [ref=f1e238]
                    - cell "검증 완료 원문 비율 미제공" [ref=f1e239]:
                      - generic [ref=f1e240]:
                        - generic [ref=f1e241]:
                          - generic [aria-hidden] [ref=f1e242]: ✓
                          - generic [ref=f1e243]: 검증 완료
                        - generic [ref=f1e244]: 원문 비율 미제공
                  - row [ref=f1e245]:
                    - rowheader "2" [ref=f1e246]
                    - cell "900명" [ref=f1e247]
                    - cell "450명" [ref=f1e249]
                    - cell "50.0%" [ref=f1e251]
                    - cell "미제공" [ref=f1e252]
                    - cell "완료 자료" [ref=f1e254]
                    - cell "검증 완료 원문 비율 미제공" [ref=f1e255]:
                      - generic [ref=f1e256]:
                        - generic [ref=f1e257]:
                          - generic [aria-hidden] [ref=f1e258]: ✓
                          - generic [ref=f1e259]: 검증 완료
                        - generic [ref=f1e260]: 원문 비율 미제공
          - region "공식 제공 연간값" [ref=f1e261]:
            - paragraph [ref=f1e262]: 공식 제공 연간값은 회차별 자료와 별도인 원천 자료입니다. 자체 회차 합산에 중복으로 더하지 않습니다.
            - generic [ref=f1e263]:
              - region "공식 제공 연간값" [ref=f1e264]:
                - heading "공식 제공 연간값" [level=3] [ref=f1e265]
                - paragraph [ref=f1e266]: 2025년 필기 · 완료 자료
                - paragraph [ref=f1e267]: 47.0%
                - generic [ref=f1e268]:
                  - generic [ref=f1e269]:
                    - term [ref=f1e270]: 응시자
                    - definition [ref=f1e271]: 1,000명
                  - generic [ref=f1e272]:
                    - term [ref=f1e273]: 합격자
                    - definition [ref=f1e274]: 470명
              - paragraph [ref=f1e275]:
                - text: "출처 원문 비율:"
                - generic [ref=f1e276]: 미제공
              - generic [ref=f1e277]:
                - generic [ref=f1e278]:
                  - generic [aria-hidden] [ref=f1e279]: ✓
                  - generic [ref=f1e280]: 검증 완료
                - generic [ref=f1e281]: 원문 비율 미제공
          - complementary "자료 출처와 확인 시각" [ref=f1e282]:
            - paragraph [ref=f1e283]: "↗ 출처: 합성 레코드 · 공식 출처 아님"
            - paragraph [ref=f1e284]: "자료 기준: 기준 시점 미확인"
            - generic [ref=f1e285]:
              - generic [ref=f1e286]:
                - term [ref=f1e287]: 공식 발표
                - definition [ref=f1e288]: 미확인
              - generic [ref=f1e289]:
                - term [ref=f1e290]: 자료 수집
                - definition [ref=f1e291]:
                  - time [ref=f1e292]: 2026. 10. 21. 10:00 (한국시간)
              - generic [ref=f1e293]:
                - term [ref=f1e294]: 마지막 자동 검증
                - definition [ref=f1e295]:
                  - time [ref=f1e296]: 2026. 10. 21. 11:00 (한국시간)
              - generic [ref=f1e297]:
                - term [ref=f1e298]: 운영자 대조
                - definition [ref=f1e299]:
                  - time [ref=f1e300]: 2026. 10. 21. 11:30 (한국시간)
      - region [ref=f1e301]:
        - generic [ref=f1e302]:
          - paragraph [ref=f1e303]: 04 · 시험 정보와 출처
          - heading "확인된 범위 안에서 준비하세요" [level=2] [ref=f1e304]
        - generic [ref=f1e305]:
          - paragraph [ref=f1e306]: 화면과 계산 연결을 확인하는 합성 설명입니다. 실제 종목의 응시자격·수수료·시험기준은 제공하지 않습니다.
          - paragraph [ref=f1e307]: "응시자격 · 수수료 · 시험기준: 미확인"
        - complementary "자료 출처와 확인 시각" [ref=f1e308]:
          - paragraph [ref=f1e309]: "↗ 출처: 합성 레코드 · 공식 출처 아님"
          - paragraph [ref=f1e310]: "자료 기준: 기준 시점 미확인"
          - generic [ref=f1e311]:
            - generic [ref=f1e312]:
              - term [ref=f1e313]: 공식 발표
              - definition [ref=f1e314]: 미확인
            - generic [ref=f1e315]:
              - term [ref=f1e316]: 자료 수집
              - definition [ref=f1e317]:
                - time [ref=f1e318]: 2026. 10. 21. 10:00 (한국시간)
            - generic [ref=f1e319]:
              - term [ref=f1e320]: 마지막 자동 검증
              - definition [ref=f1e321]:
                - time [ref=f1e322]: 2026. 10. 21. 11:00 (한국시간)
            - generic [ref=f1e323]:
              - term [ref=f1e324]: 운영자 대조
              - definition [ref=f1e325]:
                - time [ref=f1e326]: 2026. 10. 21. 11:30 (한국시간)
        - paragraph [ref=f1e327]: 위 시각은 합성 레코드의 테스트용 메타데이터입니다. 실제 공식 발표·수집·대조의 증거가 아닙니다.
        - generic [ref=f1e328]:
          - heading "자료가 다르게 보이나요?" [level=3] [ref=f1e329]
          - paragraph [ref=f1e330]: 시행기관의 최신 공고에서 종목·연도·회차를 먼저 확인해 주세요. 정정 요청 접수 기능은 아직 제공하지 않습니다.
          - generic [ref=f1e331]:
            - link "공식 공고 확인 ↗" [ref=f1e332] [cursor=pointer]:
              - /url: https://www.q-net.or.kr/
            - link "준비 계획 화면으로" [ref=f1e333] [cursor=pointer]:
              - /url: /my-plan
  - contentinfo [ref=f1e334]:
    - paragraph [ref=f1e335]: 자격인사이트는 비공식 정보 서비스입니다.
    - paragraph [ref=f1e336]: 최종 일정과 접수 기준은 시행기관의 공식 안내를 확인해 주세요.
  - navigation "모바일 메뉴" [ref=f1e337]:
    - link "홈" [ref=f1e338] [cursor=pointer]:
      - /url: /
    - link "일정" [ref=f1e343] [cursor=pointer]:
      - /url: /calendar
    - link "비교" [ref=f1e348] [cursor=pointer]:
      - /url: /compare
    - link "내 준비" [ref=f1e352] [cursor=pointer]:
      - /url: /my-plan
  - alert [ref=f1e357]
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
> 25  |   if (selector) await page.locator(selector).screenshot({ path: filename, animations: "disabled" });
      |                                              ^ Error: locator.screenshot: Test timeout of 30000ms exceeded.
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
```