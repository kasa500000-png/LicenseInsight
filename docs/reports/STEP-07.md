# STEP-07 — 디자인 시스템·공통 UI·모바일 셸

상태: **DONE(로컬 공통 UI·셸 범위)**. STEP-02·G0 및 실제 데이터 연결은 **BLOCKED** 유지.
데이터 모드: 제품 홈/셸은 live 설정의 빈 상태, 갤러리는 local/test에서만 synthetic 예제.
시작: 2026-10-20 21:42:56 UTC. 종료: evidence/step-07/validation.json의 실제 시각.
루트 `/workspace/licenseinsight` / branch `audit/m0-task-001` / commit 없음(unborn).

## 목표·범위

STEP-07 하나만 수행했다. 읽기 쉬운 토큰·재사용 UI·반응형 셸·접근성 상호작용을 구현하고
정상/예외 상태를 실제 Chromium에서 확인했다. 일정·비교·내 준비 목적지는 **준비 중 셸**이다.
검색/달력/비교 로직·계획 저장·종목 상세·실데이터 연결 등 STEP-08 이후 기능을 완료한 것이 아니다.

## 사전 점검

- AGENTS·START_HERE·상태/차단/승인·STEP_INDEX·ROADMAP·STEP-07과 DESIGN_SYSTEM·UX_SCREEN_SPEC·PRD를 읽었다.
- STEP-06 보고서와 실제 unit468·browser14·validation25·build/시각/화면 증거를 확인했다. 실행 source85개 SHA가 현재와 일치했고 기존299개 파일을 시작 hash로 보존했다. [preflight](evidence/step-07/preflight.json), [기준선](evidence/step-07/prior-work-baseline.json).
- 선행 STEP-03은 충족했다. API 키·원격 DB 설정 부재는 이번 UI 작업의 차단이 아니다. 계정 승인/쿼터는 UNKNOWN이며 공개 명세 확인·계정 승인·실제 호출 성공을 구분했다. 변경 없는 카탈로그/API 재시도는0회다.
- Node24.19.0·pnpm11.25.0, 기존 Next16.4.2·React19.3.1·Playwright1.64.1·Vitest5.0.5·시스템 Chromium을 사용했다. 새 의존성 설치 없이 기존 lockfile을 보존했다.
- cloud runtime·Sites의 local-only 지침·React 품질 스킬과 설치 Next의 layout/CSS/navigation guide를 적용했다. 원격 등록·배포·Git 변경 승인은 없으므로 로컬 체크아웃에서만 작업했다.

## 계획과 변경 파일

Audit → Plan → Implement → Validate → Report. 구현 → 단위/정적/build → 브라우저/실화면 → 보고 순서로 진행했다.

| 파일 | 변경 내용 |
|---|---|
| [tokens.css](../../src/app/tokens.css), [globals.css](../../src/app/globals.css) | 색·타이포·간격·상태·포커스·44px control·1120px 본문폭 중앙화. 입력 경계는 더 짙은 별도 색 사용 |
| [primitives.tsx](../../src/components/ui/primitives.tsx) 및 CSS Modules | Button/ActionLink·Badge·Alert/Toast·Skeleton·EmptyState·Card·비활성 광고 표시 |
| [form-controls.tsx](../../src/components/ui/form-controls.tsx), [interactions.tsx](../../src/components/ui/interactions.tsx) 및 CSS Modules | Input/Select/Checkbox·SearchBox·DateField·DurationField·Tabs·Dialog. label/오류/유효성·키보드·focus 계약 |
| [data-display.tsx](../../src/components/ui/data-display.tsx)·CSS, [chart-boundary.tsx](../../src/components/ui/chart-boundary.tsx) | 출처/4시각·상태·종목/일정/다음 행동·통계·표·차트 대체 표·비교 tray·주간 배분 표시 |
| [site-navigation.tsx](../../src/components/site-navigation.tsx), layout·loading·error·data-unavailable | 상단/하단 4개 메뉴·active 상태·safe-area·실측 높이 예약·공통 UI 재사용 |
| [shell-section.tsx](../../src/components/shell-section.tsx), app/{calendar,compare,my-plan}/page.tsx | dead link 대신 기능 미제공을 명시하는 공통 준비 중 셸 |
| app/ui-gallery/*, [proxy.ts](../../src/proxy.ts) | local/test 갤러리, 서버+proxy guard·noindex·공개 nav에서 미연결 |
| [duration-input.test.ts](../../tests/unit/duration-input.test.ts), [design-system.spec.ts](../../tests/e2e/design-system.spec.ts) | 입력16개 oracle·컴포넌트/셸/상태/대비/확대/오류 경계 E2E20개 |
| [격리 검사](../../scripts/check-ui-gallery-isolation.mjs) | 같은 build의 local/test/preview/production 모드를 loopback으로 검사·소유 서버 종료 |
| [UI 안내](../../src/components/ui/README.md), README·state 3개·이 보고서·evidence/step-07 | 호출 계약·한계·실제 결과·인수인계 |

전체 변경 목록·이전 파일 보존·최종 실행 source106개 SHA는 [validation](evidence/step-07/validation.json)에 있다.
기존 domain·수집/repository·DB migration·공식 source 계약·AGENTS·package/lockfile·기존 테스트를 보존했다.

## 수용 기준별 결과

| 기준 | 결과 | 근거·제한 |
|---|---|---|
| 중앙 토큰·필수 공통 UI | PASS(D1/D3) | 지정8종 및 디자인 명세의 카드/표/상태 UI. 새 외부 UI/폰트 의존성 없음 |
| 모바일4메뉴·데스크톱 nav·safe-area·1120px | PASS(D3) | 4폭, active 링크·목적지 준비 중 안내·SSR·마지막 CTA/푸터 도달 확인 |
| loading/empty/error/stale/demo/storage failure | PASS(D3) | 서로 다른 문구·아이콘·본문 상태·모바일/데스크톱 screenshot. 실제 저장소 adapter 검증 아님 |
| 입력/label/첫 오류 focus·중복 제출 차단 | PASS(D1/D3) | 검색 Enter/버튼 동일, invalid 시간 draft 보존·customValidity·부모 유효성 전달, 로딩 disabled |
| Tabs/dialog 키보드 | PASS(D3) | 방향키/Home/End·disabled skip, 초기 focus·양방향 순환·Esc·각 trigger 복귀 |
| 차트 실패 시 표 유지 | PASS(D3) | 실제 client render throw→차트 제거·고정 안내 출현·동일 caption/열/행/값 표 유지 |
| 긴 한국어·큰 숫자·null·출처 시각 | PASS(D3) | 4폭 긴 이름, bigint 표시 자릿수 유지, null 산출 불가, 발표/수집/검증/대조 구분·미확인 시각 유지 |
| 200% 확대·가로 넘침·하단 메뉴 가림 | PASS(D3) | CSS zoom2@720px 및 글자200%@360/390/768/1440px, 헤더 wrap·마지막 행동/푸터 검증 |
| 실제 색상 조합 | PASS(D3, 해당 조합) | 렌더된15개 조합: 텍스트 최저5.17:1, control 경계4.76:1, focus6.70:1. 전체 WCAG 인증 아님 |
| 갤러리의 비운영 격리 | PASS(로컬 런타임) | 4모드22개 접근 검사·noindex. preview/production 설정의 로컬 서버에서 query/경로 변형도 실제404·합성 HTML 없음 |

DurationField의 잘못된 draft가 이전 유효값으로 제출되지 않도록 `onValidityChange`와 native
customValidity를 함께 제공한다. 부모는 유효성을 연결하고 첫 오류로 focus를 옮겨야 한다.
중요 실패는 toast만 띄우지 않고 본문에 남긴다. SourceStamp에 없는 시각을 현재 시각으로 채우지 않는다.
날짜 입력 안내는 브라우저가 표시하는 형식에 맞추도록 했으며 내부 날짜는 기존 domain 계약을 따른다.

## 실행한 검증

| 명령/검증 | 환경/데이터 | 결과/exit | 실제 증거 |
|---|---|---|---|
| `pnpm lint` | 전체 현재 소스 | PASS/0 | [lint](evidence/step-07/lint-command.json) |
| `pnpm typecheck` | TypeScript strict | PASS/0 | [typecheck](evidence/step-07/typecheck-command.json) |
| `pnpm test --reporter=json --outputFile=docs/reports/evidence/step-07/tests.json` | synthetic·DB 없음 | **484 PASS / 0 FAIL**, exit0 = 기존468+시간입력16 | [명령](evidence/step-07/tests-command.json), [개별 결과](evidence/step-07/tests.json) |
| `pnpm build` | APP_ENV=test·DATA_MODE=live·광고/분석false | PASS/0 | [build·명시 설정](evidence/step-07/build-command.json) |
| `pnpm check:client-boundary` | 최종 build | PASS/0 | [client 경계](evidence/step-07/client-boundary-command.json) |
| `pnpm test:e2e` | 실제 Chromium·최종 build | **34 PASS / 0 FAIL**, skip/flaky0·exit0 = 기존14+신규20 | [명령](evidence/step-07/browser-command.json), [개별 결과](evidence/step-07/browser-tests.json) |
| `node scripts/check-ui-gallery-isolation.mjs` | 소유 loopback 서버·4개 APP_ENV | **22/22**, exit0·서버4개 종료 | [명령](evidence/step-07/isolation-command.json), [접근 결과](evidence/step-07/gallery-isolation.json) |
| 대비·확대·기하 검사 | 렌더된 DOM/CSS | 해당15조합 PASS·페이지 넘침 없음 | [contrast](evidence/step-07/contrast.json), browser 결과 |
| 독립 검토 | source·실행 JSON·native dialog probe | 미해결 P0/P1 미발견 | [검토자 보고](evidence/step-07/independent-review.json); root 실행과 구분 |

처음 E2E는29/31 통과했다. native modal의 Shift+Tab이 BODY로 탈출해 명시적인 순환을 추가했다.
고정 메뉴를 모르는 자동 scroll helper에서 푸터가 가려지는 경우를 확인하고 실측 높이를 root CSS에
공유하여 scroll-padding을 추가했다. native scrollIntoView와 실제 페이지 끝 이동 후 가림을 검증했다.
200% 글자 확대에서 헤더가 줄바꿈할 수 있게 했다. [초기 browser](evidence/step-07/browser-first-command.json),
[초기 개별 결과](evidence/step-07/browser-first-tests.json), [푸터](evidence/step-07/mobile-footer-first-failure.png),
[dialog](evidence/step-07/dialog-first-failure.png)를 보존했다.
새 Node 검사 스크립트의 fetch/AbortSignal lint globals 선언 누락도 수정 후 통과했다.
[초기 lint](evidence/step-07/lint-first-command.json).

## 화면 검증

최종 앱 `http://127.0.0.1:3103/`와 `/ui-gallery`를 실제 Chromium에서 확인했다.
**38장 캡처 중25장을 직접 열어 검수**했다. 홈4폭·갤러리4폭·긴 이름4폭·모바일 상태6종·
큰 숫자·대화상자·차트 fallback·확대3종·푸터가 직접 검수 대상이다. 목록/해시는 [화면 기록](evidence/step-07/screen-review.json)에 있다.

- 홈: [360](evidence/step-07/screenshots/foundation-home-360.png) · [390](evidence/step-07/screenshots/foundation-home-390.png) · [768](evidence/step-07/screenshots/foundation-home-768.png) · [1440](evidence/step-07/screenshots/foundation-home-1440.png).
- 갤러리: [360](evidence/step-07/screenshots/ui-gallery-overview-360-unborn.png) · [390](evidence/step-07/screenshots/ui-gallery-overview-390-unborn.png) · [768](evidence/step-07/screenshots/ui-gallery-overview-768-unborn.png) · [1440](evidence/step-07/screenshots/ui-gallery-overview-1440-unborn.png).
- 예외/경계: [로딩](evidence/step-07/screenshots/ui-state-loading-390-unborn.png) · [빈값](evidence/step-07/screenshots/ui-state-empty-390-unborn.png) · [오류](evidence/step-07/screenshots/ui-state-error-390-unborn.png) · [stale](evidence/step-07/screenshots/ui-state-stale-390-unborn.png) · [저장 실패](evidence/step-07/screenshots/ui-state-storage-390-unborn.png).
- 확대/조작: [CSS200%](evidence/step-07/screenshots/ui-gallery-css-zoom-200-unborn.png) · [글자200%](evidence/step-07/screenshots/ui-gallery-text-200-unborn.png) · [dialog](evidence/step-07/screenshots/ui-dialog-390-unborn.png) · [푸터](evidence/step-07/screenshots/ui-home-footer-390-unborn.png).

CSS zoom/글자 확대를 검사했으며 deviceScaleFactor2를 확대 근거로 사용하지 않았다.
실제 브라우저 chrome의 zoom 메뉴·실기기·Safari/Firefox·스크린리더·전체 접근성/성능 평가는 미실행이다.
safe-area inset은 CSS로 반영했으며 실제 노치 기기에서의 inset 값은 아직 검증하지 않았다.

## 데이터·보안·광고·비용

공공 API/카탈로그 요청0회, 실제3종목 코드·일정·통계·공식 대조 NOT_RUN이다. source5개는 비활성이다.
제품 페이지에 합성 데이터 fallback을 추가하지 않았다. 예제는 격리 갤러리에만 있고 운영/preview
환경 모드의 HTML 접근이 차단됨을 로컬에서 확인했다. 서버 설정은 query/localStorage로 바뀌지 않는다.
테스트 브라우저의 외부 HTTP 요청 시도는0이며, 별도 격리 스크립트는 loopback 대상만 호출한다.
격리 스크립트 결과를 전체 네트워크 트래픽 계측으로 확대하지 않는다. 테스트용 공개 URL 문자열은
기존 env 단위검사의 문법 검증 입력이며 해당 도메인에 요청하거나 소유권을 확인하지 않았다.

키 값·인증 상태를 출력하지 않았다. 새 텍스트의 알려진 비밀 패턴 검사는 validation에 있다.
DB/운영 데이터·원격 자원·Git push/PR·구매·배포·메일·실광고를 변경하지 않았다. 광고/분석은 OFF다.

## 미완료·차단

| 항목 | 상태·조건 | 이번 독립 완료 |
|---|---|---|
| STEP-02 실제 API/3종목/G0 | BLOCKED: 공식 명세·승인/쿼터·서버 키·응답/공식 대조 필요 | 공통 UI는 키 없이 완료 |
| 종목 상세·달력·실제 비교·계획 저장 | 후속 STEP-08~12 | 셸과 props 기반 UI만 구현. 실제 저장소 오류/복원 성공 아님 |
| 차트 SSR 오류·다른 브라우저/보조기기·전체 WCAG | NOT_RUN | Chromium client 오류/키보드·측정한 대비 조합 검증 |
| SQL/Node driver 재실행·Supabase Auth/PostgREST | NOT_RUN(이번 변경은 UI 경계) | STEP-05 소스/기존 증거 보존 확인 |
| 원격 CI·Preview/운영 배포·출시 게이트 | NOT_RUN/미승인 | 로컬 build·모드별 접근만 검증 |

STEP-07을 막는 새 선행조건은 없다. 기존 키/승인 누락을 반복 질문하지 않고 차단 상태를 유지한다.

## 인수인계

state/PROJECT_STATUS.md·BLOCKERS.md·EVIDENCE_INDEX.md를 갱신했다. 변경은 로컬 미커밋이며
이전 증거와 기존 사용자 파일을 보존했다. 출시 가능 판정은 아니다.
다음 STEP 하나는 **STEP-08 — 한 종목 상세·일정·통계 수직 구현**이다. 이번에는 시작하지 않았다.
live는 G0가 필요하며, 미확인 데이터는 공통 UI의 안전 상태로 표시하고 실제 연결 근거와 분리해야 한다.
