# STEP-03 — Next.js·TypeScript·테스트 기반

상태: **DONE(로컬 개발 기반 범위)**. STEP-02·G0는 **BLOCKED 유지**. 서비스 전체 구현·실데이터·공개 준비 완료가 아니다.
데이터 모드: 로컬 `live` 빈 상태. 실제 API·DB 호출·합성 시험정보 게시 없음.
시작/종료: [시작 해시](evidence/step-03/prior-work-baseline.json)의 captured_at_utc / [최종 문서 검사](evidence/step-03/validation.json)의 checked_at_utc. 명령별 실제 시각은 개별 JSON에 기록했다.
루트 `/workspace/licenseinsight`, repo `kasa500000-png/LicenseInsight`, branch `audit/m0-task-001`, commit 없음(unborn). 모든 변경은 로컬 미커밋이다.

## 사전 점검·단계 선택

AGENTS, START_HERE, STEP_INDEX, PROJECT_STATUS/BLOCKERS/APPROVALS, STEP-02 보고서와 테스트36 PASS·문서검사14 PASS·preflight·screen 근거를 읽었다. 환경에는 여전히 API 키가 없고 계정 승인도 미확인이다. 이전 실검증이 완료됐다고 승격하지 않았다. 공공 API 카탈로그를 이번에 다시 호출하지 않았다. 마지막 HTTP503 관측은 STEP-02의 과거 결과다.

가장 앞선 미완료 STEP-02의 실호출은 외부 조건 때문에 막혀 있다. ROADMAP은 STEP-03 선행 조건을 **STEP-01 및 STEP-02 계약 검토(실호출 별도)**로 정의하고, 키가 막혀도 03기반은 진행 가능하다고 명시한다. 그 근거로 다음 미착수·독립 실행 가능 STEP-03 하나를 선택했다. 이전 상태의 “다음 미완료도 STEP-02” 안내는 이 실행 가능 의존성을 충분히 반영하지 못했으므로 이번에 바로잡았다. STEP-02는 BLOCKED 그대로다.

기존 앱·package.json·lockfile은 없었다. 이전108개 파일의 해시를 시작 전에 보존했다. 선행 보고서·fixture·Python probe·원본 기획은 유지하고 현재 실행에 필요한 파일만 추가·갱신했다. 상위 AGENTS/override는 없고 루트 AGENTS를 적용했다.

## 구현

| 변경 파일 | 목적 |
|---|---|
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc` | Node/pnpm·직접 의존성 exact pin, 설치 정책·재현 |
| `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.mts` | App Router·strict TS·환경 gate·lint·단위/통합 설정 |
| `AGENTS.md` | `next dev`가 설치된 Next.js 번들 문서 안내 블록을 자동 추가. 기존 규칙은 byte 단위 보존 |
| `src/app/layout.tsx`, `page.tsx`, `globals.css`, `loading.tsx`, `error.tsx`, `not-found.tsx` | 한국어 최소 셸·데이터 없음·로딩/오류/404 경계·noindex |
| `src/components/data-unavailable.tsx` | 지어낸 일정·수치를 보여주지 않는 상태와 공식 Q-Net 링크 |
| `src/config/env.ts`, `src/server/env.ts`, `scripts/check-env.ts` | 순수 환경 schema, server-only, 값 없는 오류·CLI |
| `src/domain/README.md`, `src/data/README.md`, `src/features/README.md` | 순수 계산·외부 데이터·브라우저 개인기록의 후속 책임 경계 |
| `src/app/foundation-check/error/*`, `src/proxy.ts` | APP_ENV=test에서만 접근 가능한 오류 경계 검사. 다른 환경은 streaming 전 HTTP404 |
| `tests/unit/env.test.ts`, `tests/integration/env-cli.test.ts` | 환경·URL·fixture·OFF·secret 이름·CLI 실패 검증 |
| `playwright.config.ts`, `tests/e2e/foundation.spec.ts` | 홈/SSR/키보드/외부요청·4폭·오류·404 브라우저 smoke |
| `scripts/check-client-boundary.mjs` | 직접 client import·알려진 server 이름/표식의 client bundle 노출 검사 |
| `.github/workflows/ci.yml` | secret 없는 CI 초안. 실제 원격 설정/실행 없음 |
| `.env.example`, `README.md`, `state/{PROJECT_STATUS,BLOCKERS,DECISIONS,EVIDENCE_INDEX}.md` | 실제 로컬 실행·상태·후속 경계·결정 갱신 |
| `docs/reports/STEP-03_DEPENDENCIES.md`, `evidence/step-03/*` | 공식 버전 조사·실행 원문·스크린샷·변경 보존 |

Next16.4.2 / React19.3.1 / TypeScript6.0.3 / ESLint10.13.0 / Vitest5.0.5 / Playwright1.64.1을 고정했다. Node24.19.0·pnpm11.25.0을 사용했다. 공식 문서·registry와 제외한 버전의 이유는 [의존성 검토](STEP-03_DEPENDENCIES.md)에 있다. TS7는 parser peer 범위 밖, ESLint9는 지원 종료였으므로 제외했고, eslint-config-next 전체 대신 ESLint10과 TypeScript/Next rule을 직접 구성했다. React/a11y 플러그인의 전체 규칙·전체 접근성 검사는 수행하지 않았다.

APP_ENV/DATA_MODE는 필수다. production fixture, 잘못된 외부 URL, 필수 env 누락, NEXT_PUBLIC secret 이름, 광고·분석 true를 거부한다. server-only 모듈은 credential을 반환하지 않는다. 현재 API/DB 연결이 없으므로 그 키를 앱 기반 실행의 필수값으로 삼지 않았다. live는 빈 상태이며 fixture fallback이 없다. preview 보호 선언은 실제 인증·도메인 소유권을 증명하지 않는다. 실제 preview 접근 보호는 후속 배포 전 검증해야 한다.

## 테스트 — 실제 실행 결과

| 명령·검증 | 결과 | 근거 |
|---|---|---|
| `pnpm install --frozen-lockfile` (node_modules 없는 상태, store 재사용) | PASS/exit0,174개 추가. 최초 esbuild 차단 후 해당 패키지만 허용 | [설치 기록](evidence/step-03/installation.json) |
| `pnpm lint` | PASS/exit0 | [lint](evidence/step-03/lint-final.json) |
| `pnpm typecheck` | PASS/exit0. `.next` 없는 상태에서도 PASS | [typecheck](evidence/step-03/typecheck.json), [clean](evidence/step-03/clean-typecheck.json) |
| `pnpm test --reporter=dot` | **73 PASS**, 단위/통합2파일 | [단위·통합](evidence/step-03/tests-final.json) |
| `pnpm build` (`APP_ENV=test`, `DATA_MODE=live`) | PASS/exit0, production 최적화 build. 실제 운영 배포 아님 | [build](evidence/step-03/build.json) |
| 실제 build의 누락 env / production fixture / 잘못된 운영 URL | 모두 의도대로 exit1, 컴파일 전 차단 | [부정 build](evidence/step-03/negative-builds.json) |
| `pnpm dev --port 3104` (local/live) | 홈200·SSR 문구·테스트 전용 경로404 | [dev smoke](evidence/step-03/dev-smoke.json) |
| `pnpm start` (로컬 production/live 설정) | 홈200·테스트 경로404. shape-only URL은 요청/소유 확인 없음 | [runtime](evidence/step-03/runtime-production.json) |
| `pnpm start` (production/fixture) | 의도대로 exit1, 시작 차단 | [runtime 부정](evidence/step-03/runtime-fixture-rejected.json) |
| `pnpm check:client-boundary` | PASS. 직접 import와 알려진 문자열 검사 범위 | [bundle](evidence/step-03/client-boundary.json) |
| `pnpm test:e2e` (시스템 Chromium154, 로컬3103) | **8 PASS**, 외부 요청0·JS-disabled SSR·키보드·4폭·오류·404 | [브라우저](evidence/step-03/browser-tests.json) |

실패·보완도 구분했다. 최초 설치는 esbuild postinstall 미허용으로 exit1이었다. pnpm의 로컬 허용목록에 esbuild만 추가한 뒤, 기존 생성 node_modules를 scratch에 보존하고 빈 상태에서 frozen install을 다시 실행해 성공했다. pnpm이 만든 exact typescript-eslint release age 예외11개도 workspace 파일에 남겼다. 모든 의존성 스크립트를 일괄 허용하지 않았다.

최초 typecheck는 Next의 ProcessEnv가 NODE_ENV를 필수로 선언해 통합 테스트의 최소 env 객체가 타입에 맞지 않아 실패했다. `NODE_ENV=test`를 명시한 뒤 통과했다([최초 근거](evidence/step-03/typecheck-first.json)). Vitest config를 `.mts`로 바꿔 ESM 로더 경고도 해소했다. 최초 개발 smoke에서 숨긴 test route가 Next streaming 때문에 HTTP200으로 시작했다([최초 근거](evidence/step-03/dev-smoke-first.json)). Proxy에서 먼저404를 반환하고 페이지 내부 환경 검사도 유지한 뒤 local/production 모두404를 확인했다. 화면 검수 중 모바일 문장 간격·본문 크기를 보완한 뒤 최종 build·browser 검사를 다시 통과했다. 테스트 기대값을 낮추지 않았다.

## 실화면 확인

구현 → 위 명령 검증 → 실제 Chromium과 스크린샷 검수 → 보고 순서로 진행했다. `/`의 아래4개 폭을 실제 렌더링해 스크린샷으로 확인했다. 글자 잘림·가로 넘침 없이 공식 이동 버튼과 데이터 없음 상태가 보인다. 한글 시스템 폰트를 쓰며 외부 font 요청은 없다.

| 폭 | 실제 화면 |
|---|---|
| 360px | [screenshot](evidence/step-03/screenshots/foundation-home-360.png) |
| 390px | [screenshot](evidence/step-03/screenshots/foundation-home-390.png) |
| 768px | [screenshot](evidence/step-03/screenshots/foundation-home-768.png) |
| 1440px | [screenshot](evidence/step-03/screenshots/foundation-home-1440.png) |

`/foundation-check/error`는 test 환경에서 버튼을 눌러 실제 React 오류 boundary가 나타나는 것을 검사했다. 다시 시도 버튼의 노출까지만 검증했으며 reset 후 회복 완료를 주장하지 않는다. 알 수 없는 경로는 실제404다. 첫 Tab의 본문 바로가기, 한국어 lang·main 역할, JS 비활성 상태 HTML도 검사했다. 이는 전체 접근성·명암 실측·성능·핵심 서비스 여정 QA가 아니다. 실광고·캘린더·외부 원서접수·외부 로그인은 테스트하지 않았다.

## 수용 기준·남은 제한

| 기준 | 판정 |
|---|---|
| 재현 설치·명시 버전·strict TS·실제 스크립트 | PASS |
| 홈·loading/error/404 경계·작은 계층·server-only | PASS(기반 범위) |
| production fixture·필수 설정·URL fail-closed | PASS(build와 runtime 포함) |
| client bundle의 알려진 secret/서버 경계 | PASS(검사 범위 한정; 임의 비밀값 부재 보증 아님) |
| 로컬 실화면·최소 smoke | PASS(8개·4폭) |
| secret 없는 CI 파일 | 작성 완료. **원격 CI NOT_RUN** |
| API 실제 코드·일정·통계·공식 대조/G0 | **BLOCKED/NOT_RUN 유지** |

이번에 API 인증 호출·DB 생성/수정·원격 프로젝트·push/PR·유료 구매·preview/운영 배포·실광고 활성화는 없었다. 실제 키나 .env 원문을 출력하지 않았다. 로컬 설치 및 실행을 원격 배포로 보고하지 않는다. 운영 도메인·실제 계정·DB/RLS·백업·공개/검색 설정·전체 MVP·데이터 정확성은 후속 단계다.

최초 최종 보존 검사에서 예상 목록에 없던 AGENTS 변경을 검출했다. 설치된 Next.js의 `generate-agent-files.js`가 `next dev` 실행 시 추가하는 안내 블록과 정확히 일치하고, 이전 원문 전체가 그대로 유지됨을 [별도 근거](evidence/step-03/next-agent-rules.json)로 검증했다. 해당 번들의 설치·Proxy·오류·환경 가이드도 읽고 현재 구현을 확인했다. 이를 확인한 자동 생성 변경으로 기록했다. agent feedback 기능을 활성화하거나 외부로 보내지는 않았다.

## 인수인계

이번 실행은 STEP-03 하나이며 기반 범위 DONE이다. STEP-02·G0는 계속 BLOCKED, 이전 근거를 보존했다. 다음 실행 가능 미착수 작업은 **STEP-04 — DB 스키마·RLS·마이그레이션**이다. 로컬 설계/검증과 원격 DB 쓰기 승인은 구분해야 한다. 실제 공개 데이터 수집은 STEP-02 차단 해소가 여전히 필요하다. Git은 커밋·push·PR 없는 로컬 상태다.
