# STEP-08 — 한 종목 상세·일정·통계 수직 구현

상태: **DONE(분리된 합성 상세 범위), live BLOCKED**
데이터 모드: fixture(명시적 local/test 데모); 서버 DATA_MODE=live에서도 자동 fallback 없음
시작: 2026-10-21T00:39:49Z / 종료: 2026-10-21T00:59:09.039678+00:00
작업 루트: `/workspace/licenseinsight` / branch: `audit/m0-task-001` / commit: 없음(unborn)

## 목표·범위

STEP_INDEX와 상태표에서 다음 미착수 단계인 STEP-08 하나만 진행했다. 상세 진입 → 공개 repository 계약 → 일정·통계 계산 → 서버 HTML → 연도/단계 선택 → 관심·계획 화면 진입을 구현했다. FR의 상세/일정/통계, NFR의 SSR·접근성·데이터 신뢰 경계가 대상이다.

검증된 실제 종목은 아직 선택할 수 없다. STEP-08 프롬프트의 차단 시 지침에 따라 `/detail-demo/synthetic-electrical`에서 **합성 전기설비 자격**을 사용한다. 실제 전기기사·전기산업기사·전기기능사의 코드·crosswalk·일정·통계는 여전히 미확인이다. 제품 `/qualifications/*`는 미등록404이며 실제 종목 상세를 공개한 것이 아니다. 관심 저장·계획 편집·내보내기·탐색·원격 연결은 구현하지 않았다.

## 사전 점검

AGENTS·START_HERE·상태/차단/승인·STEP-08 전체와 지정 문서의 관련 부분을 확인했다. STEP-05 로컬 수집/게시·STEP-06 계산·STEP-07 UI 선행 작업을 확인하고, 직전 실제 근거의 484 테스트·브라우저34·접근22·최종검사30 및 **실행 소스106개 SHA 일치**를 재확인했다. [preflight](evidence/step-08/preflight.json), [착수 기준선383개](evidence/step-08/prior-work-baseline.json) 참조. 이전 결과를 이번 실행 결과로 대체하지 않았다.

Node24.19.0·pnpm11.25.0·Next16.4.2·TypeScript6.0.3·Vitest5.0.5·Playwright1.64.1·시스템 Chromium을 사용했다. 관리 환경은 실행 중이며 HTTP 네트워크 정책은 unrestricted, 구성된 secret/runtime variable은 없었다. 실제 키 파일·auth state 원문을 읽지 않았다. 승인 범위는 로컬 구현·검증이며 원격 변경·push/PR·배포 승인은 없다.

설치된 Next의 동적 route·loading/not-found·cache 문서를 확인했다. Cloud runtime, Sites의 기존 로컬 저장소 흐름, Supabase의 공개 읽기 경계, React best practices, Vercel verification/routing-middleware 스킬을 적용했다. 새 Supabase 제품/API·스키마·원격 프로젝트를 구성하지 않았다.

## 계획과 변경 파일

Audit → Plan 후 **구현 → 테스트 → 실화면 → 보고** 순서로 진행했고 실패를 수정한 뒤 같은 경계를 재검증했다.

| 파일 | 변경과 이유 |
|---|---|
| `src/features/qualification-detail/model.ts`, `service.ts`, `official-url.ts` | 공개 DTO → 도메인 읽기 service, 일정/통계/부가정보/상태의 독립 실패, 제한된 페이지 조회, URL 재검증 |
| `src/data/repositories/public-repository.ts` | 읽기 전용·anon 역할의 parameterized slug 조회 추가. 기존 decoder·권한·projection 재사용 |
| `src/features/qualification-detail/detail-view.tsx`, `statistics-section.tsx`, 각 CSS | 필기/실기·추가 접수·범위형 시험·출처·선택기·표본·비율·차트/표·미지원/오류/갱신 경고 |
| `src/features/qualification-detail/demo-policy.ts`, `src/app/detail-demo/[slug]/page.tsx`, `src/proxy.ts` | local/test 및 단일 slug만 허용, 서버 재검사, 동적 SSR·noindex, query로 권한 변경 불가 |
| `src/app/loading.tsx` → `src/app/ui-gallery/loading.tsx` | 공통 streaming Suspense가 JS 비활성 상세를 숨기는 실제 문제를 해결하도록 로딩 범위를 갤러리로 이동 |
| `tests/fixtures/synthetic/detail/repository.ts` | 명시적 합성 repository와 고정 시계, 실제 코드 없이 오류·부분자료·지연·검증근거 부족 시나리오 |
| `tests/unit/qualification-detail-service.test.ts`, `tests/unit/public-repository.test.ts` | slug SQL 계약·허용 URL·시간 재평가·캐시 격리·페이지 제한·검증근거·오류 원문 제거 |
| `tests/e2e/qualification-detail.spec.ts`, `scripts/check-detail-demo-isolation.mjs` | 실제 HTML/브라우저/차트·표/404/환경별 격리 검증 |
| `src/features/qualification-detail/README.md`, `README.md`, 본 보고서·증거, `state/PROJECT_STATUS.md`, `BLOCKERS.md`, `EVIDENCE_INDEX.md` | 사용 계약·완료/차단·인수인계 |

schema·migration·환경변수·의존성·lockfile·API 계약의 confirmed 값은 변경하지 않았다. 실제 원천별 mapper·DB client factory도 추가하지 않았다.

## 수용 기준별 결과

| 기준 | 결과 | 실제 근거·제한 |
|---|---|---|
| 종목명/slug/등급·지원범위 읽기 | PASS(합성) / NOT_RUN(live) | fixture가 같은 repository interface를 구현. SQL slug 조회는 mock 계약만 검증 |
| 다음 접수/시험·공식 안내·관심/계획 진입 | PASS(합성) | 시각 미제공을 유지하고 접수·좌석을 보장하지 않음. `/my-plan` 진입만, 저장 없음 |
| 필기/실기·일반/추가 접수·시험/발표/서류 제출 | PASS | 9개 합성 일정과 도메인 결과 일치. 범위형은 개인 시험일로 확정하지 않음 |
| 연도/단계·표본·정확한 비율·차트/표 | PASS | (20+450)/(100+900)=47.0%, 회차20.0/50.0 동일. 공식 연간값은 중복 합산하지 않음 |
| 부분·null·모집단 미확인 | PASS | 2026 진행 중·누락 회차·합격자 미확인; null/미지원/오류를0으로 채우지 않음. 모집단 미확인이면 비율/합계 보류 |
| JS 없는 핵심 HTML 및 선택기 | PASS | 실제 JS 비활성 Chromium에서 이름·일정·통계·출처 확인 및 native GET으로 실기50.0% 전환. [SSR 원문](evidence/step-08/detail-ssr.html) |
| 부분 오류·갱신 지연·변경 확인·상태 조회 실패 | PASS | 통계 실패에도 일정9개 유지. 특정 연도 실패는 empty로 표시하지 않음. 상태 미확인은 경고+다음 행동/합산 보류 |
| 알 수 없는 slug·공식 URL·fixture 격리 | PASS(로컬) | HTTP404, exact HTTPS host/민감 query 거부, 4환경40검사. 원격 preview 인증/배포는 미검증 |
| cache | PASS(요청 내부) | raw DTO memo만 재사용, 평가마다 clock 재계산, 실패/null 재시도. no-store·전역/HTTP 캐시 없음. 운영 캐시 무효화 미검증 |
| 수수료/응시자격·정정 | PASS(미확인 고지) | 값/연락처를 지어내지 않고 공식 공고 확인·정정 접수 미제공 표시 |

## 실행한 검증

| 명령/검증 | 환경·모드 | 결과 | 근거 |
|---|---|---|---|
| `pnpm lint`, `pnpm typecheck` | 로컬 소스 | exit0 | [lint](evidence/step-08/lint-final-command.json), [typecheck](evidence/step-08/typecheck-command.json); 최종 build도 타입 검사 통과 |
| `pnpm test --reporter=json --outputFile=...` | fixture·mock | **539 PASS**, 실패0(기존484+신규55) | [명령](evidence/step-08/tests-command.json), [결과](evidence/step-08/tests.json) |
| `pnpm build` | APP_ENV=test, DATA_MODE=live, 광고·분석OFF | exit0 | [최종 build](evidence/step-08/build-command.json) |
| `pnpm check:client-boundary` | 최종 build | exit0, 소스59·client 파일16 | [결과](evidence/step-08/client-boundary-command.json) |
| `pnpm test:e2e` | Chromium·loopback·합성 상세 | **48 PASS**(기존34+신규14), 실패/skip0 | [명령](evidence/step-08/browser-command.json), [결과](evidence/step-08/browser-tests.json) |
| `node scripts/check-detail-demo-isolation.mjs` | local/test/preview/production **설정의 로컬 서버** | **40/40 PASS**, 소유 서버4개 종료 | [명령](evidence/step-08/detail-isolation-command.json), [결과](evidence/step-08/detail-isolation.json) |
| 원본·소스 SHA/JSON/링크·알려진 비밀 패턴·client 합성 marker | 로컬 파일 | [최종 결과](evidence/step-08/validation.json) | [실행 소스](evidence/step-08/executed-source-hashes.json) |

첫 E2E는41/46이었다. 원인은 JS 비활성 화면을 숨기는 root loading, native label 연결, 첫 일정 캡처 selector, 시각 미확인 당일을 D-Day로 기대한 테스트였다. [초기 결과](evidence/step-08/browser-tests-initial.json)와 [실패 화면/진단](evidence/step-08/initial-browser-failures/)을 보존했고, 공식 installed Next 문서를 확인해 로딩을 국소화했다. 도메인 정책을 바꾸지 않았다. 독립 검토가 찾은 상태 조회 실패 경고·일부 연도 오류의 empty 오표시도 수정하고 E2E를 추가했다. 최종48개를 재실행해 통과했다.

## 화면 검증

최종 캡처55장 중 **새 상세17장 전부를 view_image로 직접 열었다**. [검수 목록/SHA](evidence/step-08/screen-review.json). 상세390/1440: 첫 화면·일정·통계, JS 비활성 실기, 2026부분자료, 통계/일정/부가정보 오류, stale/pending/상태 오류, 시험 기간·시각 미확인·미지원을 확인했다.

- [390 첫 화면](evidence/step-08/screenshots/detail-overview-390-unborn.png), [1440 첫 화면](evidence/step-08/screenshots/detail-overview-1440-unborn.png)
- [390 통계](evidence/step-08/screenshots/detail-statistics-390-unborn.png), [1440 통계](evidence/step-08/screenshots/detail-statistics-1440-unborn.png), [JS 비활성](evidence/step-08/screenshots/detail-no-js-statistics-unborn.png)
- [부분 자료](evidence/step-08/screenshots/detail-partial-statistics-390-unborn.png), [통계 오류](evidence/step-08/screenshots/detail-stats-error-390-unborn.png), [갱신 지연](evidence/step-08/screenshots/detail-stale-390-unborn.png)

모바일 표는 내부 가로 스크롤이며 페이지 넘침은 없다. 긴 element 캡처에는 당시 viewport 위치의 고정 하단 메뉴가 함께 찍힌다. 메뉴를 숨기는 캡처 CSS는 사용하지 않았으며 별도 E2E로 마지막 CTA가 메뉴 위로 스크롤되는 것을 확인했다. 기존 공통 UI/홈의360/390/768/1440·확대 검사는 브라우저 회귀에 포함됐지만 이번 직접 검수17장은 상세 화면이다. 실기기·다른 브라우저·실제 스크린리더·전체 WCAG·성능 인증은 NOT_RUN이다.

## 데이터·보안·광고·비용

공개 명세 확인, 계정 승인, 인증 실호출 성공은 각각 별개다. 명세의 마지막 관측은 STEP-02 카탈로그503이며 이번에는 재조회하지 않았다. API key/DB 설정 존재는 false, 계정 승인·쿼터 UNKNOWN, 공공 API·카탈로그 호출0회다. G0 BLOCKED를 유지한다.

live 통계 DTO에는 모집단·반올림·완료 회차의 확정 근거가 부족해 파생 비율을 보류한다. synthetic 근거는 합성 그룹/revision 집합에만 결합하며 live 주입을 거부한다. sourceStamp의 시각은 합성 메타데이터임을 화면에 표시한다. 공식 CTA는 Q-Net 홈페이지이며 검증되지 않은 종목별 접수 URL을 생성하지 않았다.

브라우저 검사에서는 외부 HTTP 요청을 차단·수집하고0건을 확인했다. 이는 서버 전체 outbound 감시나 실제 광고 정책 심사 증거가 아니다. 광고·분석OFF, 네트워크 SDK·개인 저장/전송 코드 없음. 알려진 비밀 패턴·fixture/client 경계 검사이며 임의의 모든 비밀 부재를 보장하는 검사는 아니다. 유료 구매·원격 DB 쓰기·외부 자원 생성·Git push/PR·메일·운영 배포·실광고 활성화는 하지 않았다.

## 미완료·차단

**차단:** 실제 검증된 종목1개 선택, 실 API 응답→source mapper→DB→페이지 흐름, 실제 DB slug 조회/RLS 회귀, 공식 수수료/일정/통계 대조, 운영 cache/공개 HTML·배포. 새 SQL slug 메서드는 mock만 통과했고 STEP-05 SQL410/Node17을 이번에 실행했다고 보고하지 않는다.

**독립 완료:** 위 합성 repository→계산→SSR→실화면 흐름과 경계 테스트·문서. 설정 준비물은 기존 B02/B03/B07과 M0_SETTINGS를 따른다. 최소 해소 조건은 공식 operation/필드/HTTPS·쿼터 근거, 실제 개발 승인과 서버 key, 검증된 코드/crosswalk 및 공식 대조 자료다. 원격 대상 연결/변경은 확인된 별도 승인 범위가 필요하다. 같은 키 부재 질문이나 재준비 없는 실호출을 반복하지 않았다.

## 인수인계

PROJECT_STATUS·BLOCKERS·EVIDENCE_INDEX와 README를 갱신했다. 이전 보고서·증거·승인 파일·migration·lockfile은 보존했다. 모든 변경은 로컬 미커밋이며 실제 commit/push/PR/배포는 없다. 실행한 소유 서버는 종료했다.

다음 미착수 STEP 하나는 **STEP-09 관심 저장·개인 준비 계획**이다. 이번에는 시작하지 않았다. G0/live 차단과 실제 데이터 검증 미완료를 보존한 상태에서 해당 프롬프트·선행 근거를 다시 확인해야 한다.
