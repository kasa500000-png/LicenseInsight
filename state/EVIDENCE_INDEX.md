# 구현·점검 증거 인덱스

현재 Git 게시·새 컴퓨터 인수인계는 [2026-10-24 보고서](../docs/reports/GIT_HANDOFF-2026-10-24.md)를 따른다. 아래 과거 절의 unborn/미배포/당시 push 미실행은 해당 단계 시점의 기록이다.

기준: 2026-10-21. M0·STEP-02~07 절은 당시 증거다. STEP-05는 실제 로컬 PostgreSQL 수집/게시·Node driver, STEP-06은 순수 계산, STEP-07은 공통 UI·셸 근거다. 최신 STEP-08에는 분리된 합성 상세의 repository 계약→domain→SSR→브라우저·격리 근거가 있다. 실제 공공 API 인증·Supabase Auth/PostgREST·원격 DB·배포 증거는 없다. 새 slug SQL은 mock 계약만 검증했다. 원본 PACKAGE_VALIDATION은 과거 패키지 기준선이다.

| 범위 | 근거 | 실제 확인 | 미실행 |
|---|---|---|---|
| M0 / TASK-001 = STEP-01 | [결과 보고서](../docs/reports/STEP-01.md) | 저장소·환경·범위·준비물·후속 계획 | 제품 구현·제품 QA |
| Git·도구·설정 | [environment-audit.json](../docs/reports/evidence/environment-audit.json) | 버전·설치·변수 존재 여부, 빈 원격·로컬 branch | 브라우저 launch/E2E·Docker daemon·DB·호스팅 연결 |
| 공개 카탈로그 | [API_CATALOG_AUDIT](../docs/reports/API_CATALOG_AUDIT.md), [JSON](../docs/reports/evidence/api-catalog.json) | 공개 HTTPS 3건503 + DS-02 진단503 | 명세 재확인 성공·계정 승인·API 인증 호출 |
| 범위·위험 | [M0_SCOPE_AND_PLAN](../docs/reports/M0_SCOPE_AND_PLAN.md) | PRD/계약/QA/로드맵 검토 | 기능·통계·날짜 구현 테스트 |
| 3종목·테스트 준비 | [STEP-02 준비](../docs/reports/STEP-02_VALIDATION_PREP.md), [대장 JSON](../docs/reports/evidence/three-qualification-readiness.json) | null 코드·미검증 상태·후보 연도·15개 테스트 설계 | 실제 코드·일정·통계·crosswalk·공식 대조·테스트 실행 |
| 설정 안내 | [M0_SETTINGS](../docs/reports/M0_SETTINGS.md), [.env.example](../.env.example) | 값 없는 설정 예시·누락사항 기록 | secret 설정·키 활성화·연결 |
| 로컬 문서 검증 | [m0-validation.json](../docs/reports/evidence/m0-validation.json) | 원본 보존·JSON·링크·secret 패턴·Git 상태 검사 | 앱 lint/typecheck/build·unit/integration·UI·RLS·배포 |

Git commit: 없음(unborn branch). remote push/PR: NOT_RUN. 문서 기준선 외 변경은 보고서에 기록한다. 키·auth state·개인 계획은 증거에 포함하지 않는다.

## STEP-02 — 이번 실행

| 범위 | 근거 | 실제 확인 | 미실행·제한 |
|---|---|---|---|
| 단계 결과 | [STEP-02](../docs/reports/STEP-02.md), [API_VALIDATION](../docs/reports/API_VALIDATION.md) | BLOCKED와 독립 완료 구분 | G0 실데이터 미충족 |
| 공식 카탈로그 재조회 | [catalog-recheck.json](../docs/reports/evidence/step-02/catalog/catalog-recheck.json) | DS-01~05 HTTPS 문서 GET 총5회 모두503, 진단 SHA 보존 | 명세 재확인 성공·API 인증 호출 없음 |
| source 계약 | [public-api-sources.json](../docs/contracts/public-api-sources.json), [설명](../docs/contracts/README.md) | confirmed null·inherited 별도·승인 UNKNOWN | 실제 schema/operation/quota 미검증 |
| 키·3종목 대장 | [preflight.json](../docs/reports/evidence/step-02/preflight.json) | 환경변수 존재만, 키 absent·exit3·코드 null·후보연도 계산 | live transport 없음, 인증 호출0 |
| 합성 테스트 | [fixture-tests.json](../docs/reports/evidence/step-02/fixture-tests.json), [manifest](../tests/fixtures/synthetic/api-proof/manifest.json) | Python unittest36개 PASS, fixture9개 synthetic | 실제 응답·공식 오류코드·운영 파이프라인 증거 아님 |
| 실화면 | [screen-check.json](../docs/reports/evidence/step-02/screen-check.json) | 앱·route 없음 확인 | UI/브라우저 NOT_RUN, screenshot 없음 |
| 보존·정합성 | [validation.json](../docs/reports/evidence/step-02/validation.json), [시작 해시](../docs/reports/evidence/step-02/prior-work-baseline.json) | 이전 증거 보존·변경범위·JSON/링크/비밀 패턴 점검 | 임의 비밀값 부재·제품 QA 보증 아님 |

## STEP-03 — 로컬 웹 기반

| 범위 | 근거 | 실제 확인 | 제한 |
|---|---|---|---|
| 단계·버전 | [STEP-03](../docs/reports/STEP-03.md), [의존성](../docs/reports/STEP-03_DEPENDENCIES.md) | 선행 계약·공식 지원·기반 범위 | STEP-02·G0 BLOCKED 유지 |
| 설치·정적·단위 | [설치](../docs/reports/evidence/step-03/installation.json), [lint](../docs/reports/evidence/step-03/lint-final.json), [typecheck](../docs/reports/evidence/step-03/typecheck.json), [tests](../docs/reports/evidence/step-03/tests-final.json) | frozen 재설치·명령 PASS·73개 테스트 | API/DB 키 미사용 |
| 정상/부정 build | [build](../docs/reports/evidence/step-03/build.json), [negative](../docs/reports/evidence/step-03/negative-builds.json) | 정상 build PASS, 필수 env/운영fixture/URL 거부 | 실제 배포 아님 |
| 런타임 경계 | [dev](../docs/reports/evidence/step-03/dev-smoke.json), [production](../docs/reports/evidence/step-03/runtime-production.json), [fixture 거부](../docs/reports/evidence/step-03/runtime-fixture-rejected.json), [bundle](../docs/reports/evidence/step-03/client-boundary.json) | 홈200·test route404·시작 거부·알려진 이름/직접 import 검사 | 도메인 소유권·preview 인증은 미검증 |
| 브라우저·화면 | [browser](../docs/reports/evidence/step-03/browser-tests.json), [360](../docs/reports/evidence/step-03/screenshots/foundation-home-360.png), [390](../docs/reports/evidence/step-03/screenshots/foundation-home-390.png), [768](../docs/reports/evidence/step-03/screenshots/foundation-home-768.png), [1440](../docs/reports/evidence/step-03/screenshots/foundation-home-1440.png) | 실제 Chromium8 PASS·4폭 수동 검수 | 전체 접근성·성능·서비스 여정 아님 |
| 보존·문서 | [validation](../docs/reports/evidence/step-03/validation.json), [시작 해시](../docs/reports/evidence/step-03/prior-work-baseline.json) | 기존 근거 보존·변경범위·링크·secret 패턴 확인 | 임의 비밀 부재 보증 아님 |
| 자동 추가 지침 | [next-agent-rules](../docs/reports/evidence/step-03/next-agent-rules.json) | Next dev template와 AGENTS 추가 블록 일치, 기존 규칙 보존 | 프로젝트 권한·승인 변경 아님 |

## STEP-04 — 격리 PostgreSQL 스키마·RLS

| 범위 | 근거 | 실제 확인 | 제한 |
|---|---|---|---|
| 단계·선행 | [STEP-04](../docs/reports/STEP-04.md), [prior-proof-review](../docs/reports/evidence/step-04/prior-proof-review.json) | STEP-03 실제 JSON/hash·앱 runtime 소스 보존·설정 존재 여부 | STEP-02·G0 BLOCKED |
| 공식 검토·CLI | [official-review](../docs/reports/evidence/step-04/official-review.json), [DB 안내](../supabase/README.md) | changelog·현재 docs·CLI2.121.0 help, 실제 migration new/init | 원격 작업 없음 |
| 실제 DB·권한 | [database-tests](../docs/reports/evidence/step-04/database-tests.json), [migration](../supabase/migrations/20261020090856_foundation_schema_rls.sql), [cases](../tests/database/cases.py) | PG17.11 두 새 DB, 각162개(부정120개), 전체328 PASS/0 FAIL, schema replay 일치 | Auth/JWT·PostgREST 미실행; 같은 격리 cluster의 두 DB |
| 타입·회귀 | [catalog](../docs/reports/evidence/step-04/qi_first-metadata.json), [types-check](../docs/reports/evidence/step-04/types-check.json), [lint](../docs/reports/evidence/step-04/lint.json), [typecheck](../docs/reports/evidence/step-04/typecheck.json), [tests](../docs/reports/evidence/step-04/tests.json) | 실제 catalog 기반 타입·생성 정합·compile 부정4개·기존73개 PASS | DB driver/repository decoder 미구현 |
| 홈 실화면 | [browser](../docs/reports/evidence/step-04/browser-tests.json), [화면 검수](../docs/reports/evidence/step-04/screen-review.json), [360](../docs/reports/evidence/step-04/screenshots/foundation-home-360.png), [1440](../docs/reports/evidence/step-04/screenshots/foundation-home-1440.png) | 홈6 PASS·JS OFF SSR·4폭 직접 검수·외부 HTTP0 | 새 DB UI 없음, 기존 STEP-03 build 사용 |
| 정리·보존 | [DB 정리](../docs/reports/evidence/step-04/development-db-cleanup.json), [validation](../docs/reports/evidence/step-04/validation.json), [시작 기준선](../docs/reports/evidence/step-04/prior-work-baseline.json) | 세션 생성 컨테이너만 제거·변경범위·JSON/링크/민감패턴 확인 | 원격CI·배포·임의 비밀 부재 보증 아님 |

## STEP-05 — 오프라인 수집·검토·게시·읽기

| 범위 | 근거 | 실제 확인 | 제한 |
|---|---|---|---|
| 단계·선행 | [STEP-05](../docs/reports/STEP-05.md), [preflight](../docs/reports/evidence/step-05/preflight.json), [공식 검토](../docs/reports/evidence/step-05/official-review.json) | STEP-04 결과·소스 SHA 일치, 키 존재 false, 현재 docs·exact dependency | actual source·G0 BLOCKED |
| 파서·정규화·경계 | [단위/CLI](../docs/reports/evidence/step-05/tests.json), [수집 안내](../src/server/ingestion/README.md), [registry](../src/data/adapters/source-registry.ts) | 전체202 PASS, JSON정밀도·XML보안·페이지/예산·소스 비활성·검증 규칙 | 합성 응답이며 공식 API 응답 아님 |
| SQL·재현·보존 | [SQL410](../docs/reports/evidence/step-05/sql-final/database-tests.json), [migration](../supabase/migrations/20261020104213_ingestion_publication.sql), [SQLcases](../tests/database/step05/cases.py) | 두 새 DB, 기존162+추가40씩, 설정/재현 포함410 PASS·정리PASS | 같은 격리 cluster, 실제 Auth/JWT 아님 |
| 실제 Node 전체 경로 | [runner](../docs/reports/evidence/step-05/node-final/ingestion-db.json), [tests17](../docs/reports/evidence/step-05/node-final/node-tests.json) | 주입 응답→정규화→stage→승인→게시→anon read, 실제 드라이버17 PASS, bigint/null/시간·pool·cache commit | 신뢰된 테스트 actor이며 로그인/API 검증 아님 |
| 설치·정적·build | [설치](../docs/reports/evidence/step-05/install.json), [lint](../docs/reports/evidence/step-05/lint.json), [types](../docs/reports/evidence/step-05/typecheck.json), [build](../docs/reports/evidence/step-05/build.json), [client](../docs/reports/evidence/step-05/client-boundary.json) | frozen install·타입 재생성·검사 PASS | 원격 CI 실행 없음 |
| 새 build 실화면 | [browser](../docs/reports/evidence/step-05/browser-tests.json), [직접 검수](../docs/reports/evidence/step-05/screen-review.json), [360](../docs/reports/evidence/step-05/screenshots/foundation-home-360.png), [1440](../docs/reports/evidence/step-05/screenshots/foundation-home-1440.png) | Chromium8·4폭·SSR·error/404·외부HTTP0 PASS | 앱 DB 연결/새관리 UI 없음 |
| 보존·정리·초기 실패 | [validation](../docs/reports/evidence/step-05/validation.json), [기준선](../docs/reports/evidence/step-05/prior-work-baseline.json), [초기Node](../docs/reports/evidence/step-05/node-first/runner-first.json), [probe 정리](../docs/reports/evidence/step-05/probe-cleanup.json) | 이전 근거 보존·현재 source SHA·모든 컨테이너/소켓 정리 확인 | 임의 비밀 부재 보증 아님 |

## STEP-06 — 날짜·통계·계획 순수 계산

| 범위 | 근거 | 실제 확인 | 제한 |
|---|---|---|---|
| 단계·선행 | [STEP-06](../docs/reports/STEP-06.md), [preflight](../docs/reports/evidence/step-06/preflight.json), [시작 기준선](../docs/reports/evidence/step-06/prior-work-baseline.json) | STEP-05 실제 결과·source SHA 일치·251개 시작 hash·키 존재 false | STEP-02·G0 BLOCKED, API/카탈로그0회 |
| 순수 계산·oracle | [전체 결과](../docs/reports/evidence/step-06/tests.json), [요약](../docs/reports/evidence/step-06/test-summary.json), [계산 안내](../src/domain/README.md), [독립 oracle](../tests/fixtures/synthetic/domain/calendar-oracles.json) | 전체468 PASS=기존202+날짜111+통계71+계획54+oracle29+경계1, 96계획/50통계 property loop | synthetic, 공식 데이터/개인확률 증거 아님 |
| 실행 시간대 | [명령](../docs/reports/evidence/step-06/timezones-command.json), [결과](../docs/reports/evidence/step-06/timezones.json) | 별도 Node 프로세스5 TZ, 자정·47.0%·660/600분 결과 SHA 동일 | 외부 clock/원천 데이터 정확성은 별도 |
| 정적·build | [lint](../docs/reports/evidence/step-06/lint-command.json), [typecheck](../docs/reports/evidence/step-06/typecheck-command.json), [build](../docs/reports/evidence/step-06/build-command.json), [client](../docs/reports/evidence/step-06/client-boundary-command.json) | 명시 로컬 env·새 build·클라이언트 경계 PASS | 원격 CI/배포 미실행 |
| 브라우저·실화면 | [browser14](../docs/reports/evidence/step-06/browser-tests.json), [직접 검수](../docs/reports/evidence/step-06/screen-review.json), [계산360](../docs/reports/evidence/step-06/screenshots/domain-oracle-360.png), [계산1440](../docs/reports/evidence/step-06/screenshots/domain-oracle-1440.png), [홈360](../docs/reports/evidence/step-06/screenshots/foundation-home-360.png) | 실제 browser 합성계산6+기반8 PASS, 두 화면4폭씩8장 직접 검수·외부HTTP0 | 메모리 문서, 제품 계산 UI/DB/API/저장 구현 아님 |
| 독립 검토·보존 | [review](../docs/reports/evidence/step-06/independent-review.json), [실행 source](../docs/reports/evidence/step-06/executed-source-hashes.json), [validation](../docs/reports/evidence/step-06/validation.json) | 완료분 과거 재배정 방지·요약 오염 거부·이전 증거 보존·현재 hash 확인 | 검토자 보고와 root 실행을 구분, 임의 비밀 부재 보증 아님 |
| 초기 실패 | [설정 없는 build](../docs/reports/evidence/step-06/build-unconfigured-command.json), [첫 browser](../docs/reports/evidence/step-06/browser-first-command.json) | 필수 env 가드 거부·test helper import.meta/CJS 충돌 기록 후 수정·재검증 | 현재 미해결 장애 없음 |

## STEP-07 — 공통 UI·모바일 셸

| 범위 | 근거 | 실제 확인 | 제한 |
|---|---|---|---|
| 단계·선행 | [STEP-07](../docs/reports/STEP-07.md), [preflight](../docs/reports/evidence/step-07/preflight.json), [기준선299](../docs/reports/evidence/step-07/prior-work-baseline.json) | STEP-06 실제468/14/25·85개 source SHA 일치 | STEP-02·G0 BLOCKED, API/카탈로그0회 |
| 토큰·컴포넌트 | [UI 안내](../src/components/ui/README.md), [tokens](../src/app/tokens.css), [단위484](../docs/reports/evidence/step-07/tests.json) | 필수 UI·native 입력 유효성·integer16개 추가·기존468 회귀 PASS | UI 상태 예제이며 실제 데이터/저장 기능 아님 |
| 상호작용·대비 | [browser34](../docs/reports/evidence/step-07/browser-tests.json), [대비15](../docs/reports/evidence/step-07/contrast.json), [요약](../docs/reports/evidence/step-07/result-summary.json) | 키보드·label/오류·dialog trap/복귀·차트 실제throw/표 유지·4폭/200%·텍스트최저5.17:1 | Chromium·선택한 조합, 전체 WCAG/실기기/보조기기 아님 |
| 실제 실화면 | [검수 기록](../docs/reports/evidence/step-07/screen-review.json), [홈390](../docs/reports/evidence/step-07/screenshots/foundation-home-390.png), [gallery1440](../docs/reports/evidence/step-07/screenshots/ui-gallery-overview-1440-unborn.png), [긴이름360](../docs/reports/evidence/step-07/screenshots/ui-long-name-360-unborn.png), [dialog](../docs/reports/evidence/step-07/screenshots/ui-dialog-390-unborn.png) | 38장 캡처 중25장 직접 검수, 상태·확대·푸터 확인 | 나머지13장은 자동 캡처/회귀만 |
| 로컬 모드별 격리 | [접근22](../docs/reports/evidence/step-07/gallery-isolation.json), [명령](../docs/reports/evidence/step-07/isolation-command.json) | local/test 허용·preview/production 실제404, noindex·서버4개 종료 | loopback 검사, 원격 운영/배포 접근보호·네트워크전체 계측 아님 |
| 정적·build | [lint](../docs/reports/evidence/step-07/lint-command.json), [typecheck](../docs/reports/evidence/step-07/typecheck-command.json), [build](../docs/reports/evidence/step-07/build-command.json), [client](../docs/reports/evidence/step-07/client-boundary-command.json) | 최종 소스·명시 test/live 설정의 새 build PASS | 설치/원격CI/배포 미실행 |
| 초기 문제·보존 | [초기browser29/31](../docs/reports/evidence/step-07/browser-first-command.json), [초기lint](../docs/reports/evidence/step-07/lint-first-command.json), [독립검토](../docs/reports/evidence/step-07/independent-review.json), [validation](../docs/reports/evidence/step-07/validation.json), [실행 SHA](../docs/reports/evidence/step-07/executed-source-hashes.json) | 초기 실패 보존·수정후34PASS·이전 증거/코어 보존 | secret 검사는 알려진 패턴 한정 |

## STEP-08 — 분리된 합성 상세·일정·통계

| 범위 | 근거 | 실제 확인 | 제한 |
|---|---|---|---|
| 단계·선행 | [STEP-08](../docs/reports/STEP-08.md), [preflight](../docs/reports/evidence/step-08/preflight.json), [기준선383](../docs/reports/evidence/step-08/prior-work-baseline.json) | STEP-07 실제484/34/22/30 및 실행 source106 SHA 일치 | G0/live BLOCKED·API/카탈로그0회 |
| 읽기 service·SQL 계약 | [상세 안내](../src/features/qualification-detail/README.md), [단위539](../docs/reports/evidence/step-08/tests.json), [명령](../docs/reports/evidence/step-08/tests-command.json) | 신규55·기존484 PASS, 공개 slug SQL·URL·정밀 계산·원자료 memo/clock 재평가·페이지/오류 분리 | SQL slug는 mock만, 실제 DB 재실행 없음 |
| SSR·사용자 흐름 | [브라우저48](../docs/reports/evidence/step-08/browser-tests.json), [명령](../docs/reports/evidence/step-08/browser-command.json), [원문HTML](../docs/reports/evidence/step-08/detail-ssr.html) | 신규14·기존34 PASS, JS off/native GET·47.0%/표본·차트/표·일정 유지·오류/빈값 구분 | 합성 상세만, 실제 종목/API/DB/저장 아님 |
| 실제 실화면 | [직접 검수17](../docs/reports/evidence/step-08/screen-review.json), [390](../docs/reports/evidence/step-08/screenshots/detail-overview-390-unborn.png), [1440](../docs/reports/evidence/step-08/screenshots/detail-overview-1440-unborn.png), [통계390](../docs/reports/evidence/step-08/screenshots/detail-statistics-390-unborn.png), [통계1440](../docs/reports/evidence/step-08/screenshots/detail-statistics-1440-unborn.png) | 총55장 중 새 상세17장 전부 직접 검수, 상태·기간·시각 미확인·JS off | 실기기/스크린리더/다른 브라우저·전체 WCAG 아님 |
| 로컬 모드별 격리 | [접근40](../docs/reports/evidence/step-08/detail-isolation.json), [명령](../docs/reports/evidence/step-08/detail-isolation-command.json) | 4모드×10경로, preview/production404·합성HTML0·서버4개 종료·no-store/noindex | 원격 배포/preview 인증·전체 outbound 감시 아님 |
| 정적·build·보존 | [lint](../docs/reports/evidence/step-08/lint-final-command.json), [타입](../docs/reports/evidence/step-08/typecheck-command.json), [최종build](../docs/reports/evidence/step-08/build-command.json), [client](../docs/reports/evidence/step-08/client-boundary-command.json), [실행SHA](../docs/reports/evidence/step-08/executed-source-hashes.json), [validation](../docs/reports/evidence/step-08/validation.json) | 최종 build·소스·문서 정합성·이전 증거/승인/마이그레이션/lockfile 보존 | 비밀 패턴 검사는 한정적; 원격 CI/배포 미실행 |
| 초기 실패·검토 | [처음41/46](../docs/reports/evidence/step-08/browser-tests-initial.json), [실패 근거](../docs/reports/evidence/step-08/initial-browser-failures/), [독립 검토](../docs/reports/evidence/step-08/independent-review.json) | root loading/label/selector/test 기대 수정, 상태미확인·부분연도 오류 회귀 추가 후48PASS | 로컬 합성 범위의 수정·검토 |

## Git 게시·새 컴퓨터 인수인계 — 2026-10-24

| 범위 | 근거 | 실제 확인 | 제한 |
|---|---|---|---|
| 사용자 승인·원격·검사 | [APPROVALS](APPROVALS.md), [preflight](../docs/reports/evidence/git-handoff-2026-10-24/preflight.json), [tracked 검사](../docs/reports/evidence/git-handoff-2026-10-24/staging.json) | 이번 스냅샷 main push 승인, 빈 원격·권한·source119 SHA·알려진 비밀패턴0 | 포괄적인 배포/원격 DB/후속 STEP 게시 승인 아님 |
| 최초 게시·fresh clone | [push](../docs/reports/evidence/git-handoff-2026-10-24/push-snapshot.json), [clone](../docs/reports/evidence/git-handoff-2026-10-24/clone-snapshot.json) | a55b9f8 main push exit0, 원격 clone492개 파일 byte/119SHA 일치·clean | 관리 환경의 별도 폴더, 실제 사용자 컴퓨터에서 설치·브라우저 실행 아님 |
| 프롬프트·인수인계 | [로컬 Codex 안내](../prompts/LOCAL_CODEX_HANDOFF.md), [보고서](../docs/reports/GIT_HANDOFF-2026-10-24.md), [최종 검사](../docs/reports/evidence/git-handoff-2026-10-24/validation.json) | clone/버전/키 없는 설정·STEP09만 진행·차단/개인정보/실행근거 보존 | 기존539/48/40/29는 과거 실행, 이번 로컬 기능 검사 재실행 없음 |
