# STEP-06 — 날짜·통계·준비 계획 계산 엔진

상태: **DONE(순수 계산·synthetic 검증 범위)**. STEP-02·live 검증은 **BLOCKED** 유지.
데이터 모드: synthetic 단위 입력/메모리 검증 문서, 제품 앱은 live 설정의 빈 상태.
시작: 2026-10-20 11:40:24 UTC. 종료: evidence/step-06/validation.json의 실제 시각.
루트 `/workspace/licenseinsight` / branch `audit/m0-task-001` / commit 없음(unborn).

## 목표·범위

이번에는 STEP-06 하나만 수행했다. FR-03·FR-04·FR-07, NFR-04의 계산 계약을
UI/DB/API와 독립된 순수 함수로 구현했다. 실제 자격 데이터·제품 상세/계획 UI·저장·내보내기·
새 디자인 시스템·운영 연결은 이 단계의 완료 범위가 아니다.

## 사전 점검

- AGENTS·START_HERE·상태/차단/승인·STEP_INDEX·STEP-06·ROADMAP과 DOMAIN_RULES·DATA_CONTRACT·TEST_STRATEGY 및 관련 PRD/QA를 확인했다.
- STEP-05 보고서와 실제 단위202·SQL410·Node17·build/브라우저8·validation 근거를 읽고 당시 실행 source SHA가 현재와 일치함을 확인했다. 기존 251개 파일을 시작 hash로 보존했다. [preflight](evidence/step-06/preflight.json), [기준선](evidence/step-06/prior-work-baseline.json).
- 선행 STEP-03은 충족했고 STEP-02/04 계약을 검토했다. API·DB가 없어도 이 STEP은 독립 완료 가능하다. `DATA_GO_KR_SERVICE_KEY`·Supabase 서버 설정·DATABASE_URL은 현재 환경에 없었다. 값은 출력하지 않았다.
- 공개 명세 확인·계정 승인·실제 인증/업무 성공은 별개다. STEP-02 마지막 카탈로그503은 과거 관측으로 보존했으며 조건 변화 없는 재시도를 하지 않았다. DS-01~05는 비활성, 3종목 코드는 null·일정/통계도 미검증이다.
- Node24.19.0·pnpm11.25.0·Python3.12.14, 설치된 Vitest5.0.5·Playwright1.64.1·Chromium을 사용했다. cloud runtime 스킬과 설치 Next의 data-security 문서를 확인했다. 의존성·DB schema·환경 설정 파일·앱 route는 변경하지 않았다.

## 계획과 변경 파일

Audit → Plan → Implement → Validate → Report를 따랐으며 구현 → 테스트 → 실제 화면 → 문서 갱신 순서로 진행했다.

| 파일 | 실제 변경 |
|---|---|
| [date.ts](../../src/domain/date.ts) | 엄격한 달력 날짜·주입 clock·KST D-day·정밀 일정·안전 상태·단계별 다음 후보·시험 목표일 제안 |
| [statistics.ts](../../src/domain/statistics.ts) | 정확한 count/비율·회차 중복/충돌·공식연간 분리·완전성·원천 반올림 검증·%p 비교 |
| [planner.ts](../../src/domain/planner.ts) | 정수 분 capacity/배분·제외일·가중치·명시적 완료분 보존/초기화·진행 중 재계산 |
| [result.ts](../../src/domain/result.ts), [index.ts](../../src/domain/index.ts), [안내](../../src/domain/README.md) | 직렬화 가능한 typed result·namespace export·호출 계약 |
| tests/unit/domain-{date,statistics,planner,oracles,boundary}.test.ts | 고정 oracle·오류/경계·불변성·96회 계획/50회 통계 property sweep·순수 의존 경계 |
| [독립 oracle](../../tests/fixtures/synthetic/domain/calendar-oracles.json) | Python Gregorian으로 산출한 14개 날짜/요일·10개 잘못된 날짜·5개 capacity 기대값 |
| tests/support/domain-*.ts, [시간대 검사](../../scripts/check-domain-timezones.mjs) | 같은 입력을 별도 5개 TZ 프로세스에서 실행 |
| [domain.spec.ts](../../tests/e2e/domain.spec.ts), scripts/domain-browser-bundle.{mjs,d.mts} | 실제 엔진을 브라우저로 bundle, 메모리 전용 합성 결과 확인·4폭 screenshot |
| README·state 3개 파일·이 보고서·evidence/step-06/ | 상태·차단·증거·실행 기록 갱신 |

기존 AGENTS·공식 source 계약·migration·수집/repository·package/lockfile·제품 UI를 보존했다.
전체 새 파일/기존 변경/보존·실행 source hash는 [validation](evidence/step-06/validation.json)에 기록한다.

## 수용 기준별 결과

| 기준 | 결과 | 실제 근거·제한 |
|---|---|---|
| KST 자정·윤일·연말·다른 기기 시간대 | PASS(D1/D3) | 자정 전 D-1/후0, Gregorian 독립 oracle, 프로세스5 TZ·브라우저3 TZ 동일 |
| date/datetime·single/range·시간 미확인 접수 | PASS(D1) | 명시 offset·최대 microsecond6자리, `[시작,종료)`, date-only 시각/휴일/개인조건 경고, 접수 보장 false |
| stale/pending/취소/미발표·다음 후보 | PASS(D1) | 48시간 초과 stale, 미래 검증시각 거부, 검증 근거 필수·확인 중 후보 억제·필기/실기 분리 |
| 기간형 시험 목표 | PASS(D1) | 첫날 제안, 개인 시험일 미확정·사용자 수정 가능, 지난 날짜 경고·자동 계획 변경 없음 |
| 합산 비율·null/0·중복·공식연간 분리 | PASS(D1) | 470/1000=47.0%, null≠0, 완전 동일 행만 제거·수정/자연키 충돌 검토, 공식연간을 더하지 않음 |
| 표본·완전성·원문·정밀도·%p | PASS(D1) | BigInt→직렬화 문자열 유리수, confirmed coverage·완료연도만 complete, exact half_up/버림, 40→45는 +5.0%p |
| 비교 근거 부족·요약 오염 | PASS(D1) | 모집단/연속성/완료 범위 미확인 비교 보류, 요약 재계산으로 조작 count/rate/official scope 거부 |
| 정수 분·제외일·목표일 제외·안정 배분 | PASS(D1) | 660/600분, 366일 기본·3660일 설정상한, 0~1440분/일, 단계/항목/일 합계 보존 |
| 완료분 보존·진행 중 재계산·입력 불변 | PASS(D1) | 명시 preserve/reset, 과거 완료분만 남기고 신규 공부는 오늘 이후, 충돌 시 typed error |
| UI/DB 없는 실행·브라우저 호환 | PASS(D1/D3) | 전체468 테스트와 별도 Node TZ 검사, 브라우저 실제 bundle·메모리 입력 실행 |

원천 통계의 회차 coverage·반올림 방식·모집단 연속성, 공식 일정의 근거를 이 엔진이 외부에서
증명하지는 않는다. 호출 계층에서 확인된 값만 넘겨야 한다. 난이도/개인 합격확률/공식 학습시간은 만들지 않는다.

진행 중 계획 검토에서 기존 시작일이 과거가 되면 재계산이 차단되는 문제를 발견해 보완했다.
수요일 현재 월요일 완료30분은 보존하고 과거 미완료는 제거하여 총570분, 목요일 재계산은510분이다.
reset은 수요일부터540분이다. 새 요일 설정으로 과거 실적을 소급 축소하지 않는다.
사용자가 목표/시간을 줄여 완료분이 새 항목 배분과 충돌하면 기존 계획을 수정하지 않고 오류를 반환한다.

## 실행한 검증

| 명령/검증 | 환경/데이터 | 결과/exit | 근거 |
|---|---|---|---|
| `pnpm lint` | 로컬 전체 소스 | PASS/0 | [lint](evidence/step-06/lint-command.json) |
| `pnpm typecheck` | TypeScript strict | PASS/0 | [typecheck](evidence/step-06/typecheck-command.json) |
| `pnpm test --reporter=json --outputFile=docs/reports/evidence/step-06/tests.json` | synthetic·DB 없음 | **468 PASS/0 FAIL**, exit0 | [실행](evidence/step-06/tests-command.json), [개별 결과](evidence/step-06/tests.json), [요약](evidence/step-06/test-summary.json) |
| 단위 세부 | 기존202+신규266 | 날짜111·통계71·계획54·독립oracle29·경계1 | 위 개별 결과. property loop 횟수는 테스트 개수에 추가하지 않음 |
| `node scripts/check-domain-timezones.mjs` | UTC/Seoul/Los_Angeles/Honolulu/Kiritimati | **5 PASS**, exit0·동일 결과 SHA | [명령](evidence/step-06/timezones-command.json), [결과](evidence/step-06/timezones.json) |
| `pnpm build` | APP_ENV=test·DATA_MODE=live·광고/분석false | PASS/0 | [build 및 비밀 없는 설정](evidence/step-06/build-command.json) |
| `pnpm check:client-boundary` | 새 build | PASS/0 | [client 경계](evidence/step-06/client-boundary-command.json) |
| `pnpm test:e2e` | 새 build·실제 Chromium·합성 메모리 문서 | **14 PASS/0 FAIL**, exit0 | [명령](evidence/step-06/browser-command.json), [개별 결과](evidence/step-06/browser-tests.json) |
| 독립 source review | 날짜·통계·계획·추가 adversarial probe | 미해결 P0/P1 미발견 | [검토자 보고](evidence/step-06/independent-review.json); root 실행 증거와 구분 |

첫 build는 필수 APP_ENV/DATA_MODE 없이 실행해 환경 가드가 거부했다. 명시적인 로컬 설정으로 통과했다.
첫 브라우저 실행은 Playwright의 CJS 변환에서 테스트 helper의 import.meta와 충돌해 수집 단계에서 실패했다.
helper를 저장소 루트 경로의 createRequire로 수정한 뒤 lint·브라우저14가 통과했다.
[초기 build](evidence/step-06/build-unconfigured-command.json), [초기 browser](evidence/step-06/browser-first-command.json)를 보존했다.
esbuild0.28.2는 기존 tsx의 고정 의존성을 테스트 도구에서 재사용했다. 새 설치는 하지 않았다.
[브라우저 bundle](evidence/step-06/browser-bundle.json), [실행 source hash](evidence/step-06/executed-source-hashes.json).

## 화면 검증

`http://127.0.0.1:3103/`의 실제 홈과 `page.setContent`로만 만든 메모리 검증 문서를
360/390/768/1440px에서 캡처하고 **8개 모두 직접 열었다**. 한국어 가독성·줄바꿈·가로 넘침·겹침을 확인했다.
합성 문서에는 실제 함수의 D-1→D-day·47.0%·660/600분·목표일 제외가 표시되고 SYNTHETIC 안내가 있다.
브라우저 Seoul/LA/Honolulu의 고정 계산값도 같다. 테스트에서 외부 HTTP 요청 시도는0이다.

- 계산 문서: [360](evidence/step-06/screenshots/domain-oracle-360.png) · [390](evidence/step-06/screenshots/domain-oracle-390.png) · [768](evidence/step-06/screenshots/domain-oracle-768.png) · [1440](evidence/step-06/screenshots/domain-oracle-1440.png).
- 실제 홈: [360](evidence/step-06/screenshots/foundation-home-360.png) · [390](evidence/step-06/screenshots/foundation-home-390.png) · [768](evidence/step-06/screenshots/foundation-home-768.png) · [1440](evidence/step-06/screenshots/foundation-home-1440.png).

[화면 검수 기록](evidence/step-06/screen-review.json). 홈은 빈 상태·공식 링크를 유지하고 SSR·error·404도 통과했다.
메모리 문서는 앱 route·public seed로 저장되지 않는다. 이 화면을 제품 계획 UI/저장·DB/API 연결 완료로 해석하지 않는다.

## 데이터·보안·광고·비용

공공 API/카탈로그 호출0회, 실제 코드·일정·통계/공식 대조 NOT_RUN이다.
fixture는 tests 아래에 있고 운영 fallback이나 제품 페이지에 연결하지 않았다. secret 존재 여부만 확인했다.
새 텍스트의 알려진 비밀 패턴 검사 결과는 validation.json에 있으며 임의 비밀 부재 보증은 아니다.
원격 DB/CI·Supabase Auth/PostgREST·구매·배포·메일·실광고·Git push/PR은 수행하지 않았다.
제품의 광고·분석은 OFF다. DB/container를 시작하거나 운영 데이터를 변경하지 않았다.

## 미완료·차단

| 항목 | 상태·필요 조건 | 독립 완료 범위 |
|---|---|---|
| STEP-02 실제 API·3종목 자료 | BLOCKED: 공식 명세·개발 승인/쿼터·서버 키·실제 응답/대조 필요 | 이번 순수 계산은 키 없이 완료 |
| 공식 coverage/반올림/연속성 | NOT_VERIFIED: 원문 및 검토 근거 필요 | 값이 미확인이면 partial/review/비교 보류로 처리 |
| 앱 데이터→domain 연결 | 후속 STEP-08 | 현재 API는 독립 입력 계약; 페이지 DB 미연결 |
| 완료 기록 저장·새로고침 복원·선택 UI | 후속 STEP-09 | 재계산 순수 함수만 완료, 저장 성공을 주장하지 않음 |
| 실제 DB/권한 회귀 재실행 | NOT_RUN(이번 변경은 DB·수집 경로 무관) | STEP-05 실제 SQL410·Node17 source SHA 보존 확인 |
| 원격 CI/배포·전체 서비스/접근성/성능 QA | NOT_RUN | 로컬 정적·계산·기반 화면 검증만 완료 |

새 사용자 조치가 필요한 STEP-06 차단은 없다. 기존 키/승인 누락을 반복 질문하지 않는다.

## 인수인계

state/PROJECT_STATUS.md·BLOCKERS.md·EVIDENCE_INDEX.md를 실제 결과로 갱신했다.
모든 변경은 로컬 미커밋이며 원본/선행 증거를 보존했다. STEP-02와 G0는 BLOCKED다.
다음 STEP 하나는 **STEP-07 — 디자인 시스템·공통 UI·모바일 셸**이며 이번에는 시작하지 않았다.
후속 UI는 이 엔진의 상태/경고를 표시하고 계산을 재구현하지 않아야 한다.
