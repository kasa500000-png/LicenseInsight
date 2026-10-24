# STEP-05 — 수집 어댑터·정규화·안전한 게시

상태: **DONE(오프라인 계약·로컬 DB 기반)** / **live BLOCKED**
데이터: synthetic 응답·격리 테스트 DB / 앱은 live 설정의 빈 상태이며 페이지 DB 미연결.
시작: 2026-10-20 19:38:54 Asia/Seoul. 종료 근거 시각은 evidence/step-05/validation.json.
루트 `/workspace/licenseinsight` / branch `audit/m0-task-001` / commit 없음(unborn).

## 목표·범위

STEP-05 하나만 수행했다. 누락·오류·정정·중복 실행에도 마지막 정상 공개본을 유지하는
수집→정규화→staging→검토→원자적 게시→일반 공개 읽기 경계를 구현하고 실제 로컬 DB로 검증했다.
공식 operation/응답이 없는 API 5종은 활성화하지 않았다. 실제 source별 mapper, live 데이터 증명,
Supabase Auth/PostgREST, 관리자 HTTP/UI, 운영 스케줄러, 공개 상세 화면은 미구현/미실행 범위다.

## 사전 점검

- AGENTS·START_HERE·상태/차단/승인·STEP_INDEX/STEP-05와 지정된 데이터 계약·API_VALIDATION·DATABASE·ARCHITECTURE를 읽었다.
- STEP-04 실제 SQL328 PASS·validation19 PASS와 당시 migration/test source SHA 일치를 확인했다. 기존 파일201개를 시작 hash로 보존했다. [preflight](evidence/step-05/preflight.json), [기준선](evidence/step-05/prior-work-baseline.json).
- STEP-03/04 선행 기반은 충족했다. 공공 API 키·Supabase URL/서버 키·DATABASE_URL은 현재 환경에 없었다. 실제 계정 승인·공식 quota는 UNKNOWN이다.
- STEP-02의 카탈로그503은 역사적 관측으로 유지하고 변경 없는 조건에서 반복 조회하지 않았다. 공개 명세 확인·계정 승인·인증/업무 호출 성공을 구분했다.
- Docker28.4.0 관리 Unix socket·PG17.11을 사용했다. Supabase/클라우드 실행 스킬과 Postgres 규칙, 현재 changelog/docs, 설치 Next의 data-security guide를 적용했다. [공식/버전 검토](evidence/step-05/official-review.json).
- 원격 대상·권한을 만들지 않았다. `.env` 원문·credential 값·auth state를 읽어 출력하지 않았다.

## 계획과 변경 파일

구현 → 단위/실제 DB/정적/build 테스트 → 새 build 실화면 → 보고 순서로 진행했다.

| 파일 | 실제 변경 |
|---|---|
| [transport.ts](../../src/server/ingestion/transport.ts), [source-registry.ts](../../src/data/adapters/source-registry.ts) | 검증된 declarative 계약용 HTTPS 요청/파서/페이지/예산. DS-01~05 endpoint/operation/format=null·enabled=false |
| [normalize.ts](../../src/server/ingestion/normalize.ts), [safety.ts](../../src/server/ingestion/safety.ts), [contracts.ts](../../src/server/ingestion/contracts.ts) | 내부4개 projection 모델 검증·코드/날짜/비율·JSON정밀도·key echo 제거·typed 경계 |
| [service.ts](../../src/server/ingestion/service.ts), [postgres-store.ts](../../src/server/ingestion/postgres-store.ts) | source guard·수집/stage·DB 호출 예약·실패 기록·분리된 검토/게시·commit 후 cache 경계 |
| [추가 migration](../../supabase/migrations/20261020104213_ingestion_publication.sql) | 실제 CLI2.121.0 migration new로 생성. 내부3개 테이블·추가 컬럼·lease/예산/검토/게시 invoker 함수. 기존 migration 수정 없음 |
| [public-repository.ts](../../src/data/repositories/public-repository.ts), src/data/database.types.ts | anon read-only·명시적 projection·정밀도 보존 DTO. 실제 catalog로 타입 재생성 |
| tests/unit/ingestion-*·public-repository.test.ts, [SQLcases](../../tests/database/step05/cases.py), [Node ingestion](../../tests/database/node/ingestion.test.ts)·[repository](../../tests/database/node/public-repository.test.ts) | 합성 파서/정규화/권한/보존 및 실제 driver 통합 |
| scripts/test-database.py, [test-ingestion-db.py](../../scripts/test-ingestion-db.py), tests/database/cases.py, vitest*.mts, tests/support/server-only.ts | 두 새 DB 재현·추가 SQL·별도 driver runner·테스트 전용 server-only alias. 기존 RLS 기대 테이블 수15→18 |
| package.json·pnpm-lock.yaml, .github/workflows/ci.yml | pg8.23.1/saxes6.0.0/@types/pg8.23.1 exact 고정, test:ingestion-db와 비밀 없는 CI 초안 |
| README·docs/DATABASE·supabase/README·[수집 안내](../../src/server/ingestion/README.md)·state 3개 파일 | 현재 경계·보존·실행·차단·다음 STEP 갱신 |
| evidence/step-05/ | 실제 명령·JSON·schema catalog·source SHA·스크린샷·초기 실패 근거 |

전체 실제 변경 목록은 validation.json에 있다. 앱 route·화면·기존 AGENTS·원본 STEP-02 계약은 변경하지 않았다.

## 수용 기준별 결과

| 기준 | 결과 | 근거·제한 |
|---|---|---|
| source operation/format/schema 경계 | PASS(오프라인), live BLOCKED | generic 선언형 계약+mapper interface. 실제5종목 API 계약은 null·비활성. 공식 소스 operation별 mapper는 아직 없음 |
| HTTP/business 오류·JSON/XML 안전 파싱 | PASS(D1) | 단/다건·빈값·HTML·깨짐·크기/깊이·DOCTYPE/entity·중복 JSON키·수치 lexeme 보존 |
| pagination/retry/quota/동시 실행 | PASS(D1/D2) | 중간 실패/429/timeout·memory budget·DB 호출 예약·scope lease·만료 run fencing |
| snapshot→stage→crosswalk→review | PASS(D1/D2) | 키/echo 제거, 검토된 정확한 crosswalk 하나만 통과, 모호 매핑 격리, 내용 hash별 검토 |
| 날짜 정정/중요 변경 | PASS(D2) | 같은 event ID, 승인 전 이전 값·변경확인중 유지. 모든 내용 변경을 보수적으로 검토 대상으로 함 |
| 빈 응답/부분 실패/게시 실패 보존 | PASS(D2) | DELETE 없음, 중간 실패는 미완료, projection/status/audit transaction 전체 rollback |
| 재실행/소유권/정정 복귀 | PASS(D2) | 동일 내용 변경 없음, 중복 key 충돌 차단, scope 공개 ID 소유권, A→B검토대기→A 복귀 시 대기 표시 정리 |
| 공개 읽기 repository | PASS(D1/D2) | 실제 pg driver→anon read-only→DTO, bigint/numeric/null/ISO·microsecond·pool 설정 복원 |
| 비밀/fixture 운영 경계 | PASS(해당 테스트) | 고정 오류·로그, raw/percent/mixedcase/double encoded echo 제거, 실제 source 비활성, synthetic production 거부 |
| 새 build 실화면 | PASS(D3) | 브라우저8개·4폭 직접 검수. 빈 상태 유지, DB 연결/관리 UI 증거 아님 |

내부 scope는 source+operation+qualification+year+track+dataset_type이다. DB KST 일별 호출 상한은
공급자의 실제 quota/reset을 확인한 설정이 아니다. 공식 scope/기간/쿼터는 live 이전에 검증해야 한다.
현재 crosswalk 입력은 확인된 sourceCode/name/grade를 요구한다. 코드가 없는 원천의 실제 매핑 방식도
승인된 응답을 본 뒤 확정해야 하며 가상의 공식 코드를 생성하지 않는다.

## 실행한 검증

모든 DB는 고정 이미지 `postgres@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826`
(실제 PG17.11)로 새로 만들었다. network=none, TCP listener/호스트 포트 없음, tmpfs 데이터 사용이다.
driver 검증은 세션이 새로 만든 Unix socket 디렉터리만 공유했다. 원격 DB 주소는 받지 않는다.

| 명령/검증 | 결과/exit | 실제 근거 |
|---|---|---|
| `pnpm install --frozen-lockfile` | PASS/0 | [install](evidence/step-05/install.json) |
| `pnpm lint`, `pnpm typecheck` | 각각 PASS/0 | [lint](evidence/step-05/lint.json), [typecheck](evidence/step-05/typecheck.json) |
| `pnpm test` | **202 PASS / 0 FAIL**, exit0 | [tests](evidence/step-05/tests.json) |
| `python scripts/test-database.py --evidence-dir docs/reports/evidence/step-05/sql-final` | **410 PASS / 0 FAIL**, exit0 | [SQL 결과](evidence/step-05/sql-final/database-tests.json) |
| SQL 세부 | 기존162+STEP-05 40+setup1 ×두 DB, 별도 설정/권한보존/재현4 =410 | 두 fresh DB schema dump 일치·소스 SHA·예상 오류·정리 PASS |
| `python scripts/test-ingestion-db.py --evidence-dir docs/reports/evidence/step-05/node-final` | **17 PASS / 0 FAIL**, exit0 | [runner](evidence/step-05/node-final/ingestion-db.json), [개별 결과](evidence/step-05/node-final/node-tests.json) |
| Node 세부 | 수집/stage/승인/게시/cache9 + public repository8 | 실제 제한된 login의 pg Pool 사용; 응답 fetch만 주입 |
| 실제 catalog 타입 생성·`--check` | PASS/0 | [types-check](evidence/step-05/types-check.json), [catalog](evidence/step-05/sql-final/qi_first-metadata.json) |
| `pnpm build`, `pnpm check:client-boundary` | 각각 PASS/0 | [build](evidence/step-05/build.json), [client](evidence/step-05/client-boundary.json) |
| `pnpm test:e2e` | **8 PASS / 0 FAIL**, exit0 | [browser](evidence/step-05/browser-tests.json) |

DB SQL 검증은 기존 권한 부정 검사도 다시 실행했다. INVOKER 함수/비공개 schema·최소 grant를 유지하며
worker는 공개 종목의 id/취득방식 두 컬럼만 추가로 읽어 scope 식별을 검사한다. 공개 쓰기·관리 역할 수정은 허용하지 않는다.
통계/상세의 logical key와 자연키가 어긋나 공개 행의 소유권이 빠지는 경우도 차단한다.
실패 run의 실제 시도 수와 예약 budget을 분리하여 실패가 호출0회로 기록되지 않게 했다.

검토에서 키 인코딩 대소문자·소유권·scope 취득방식·실패 호출 수·A→B→A 상태 복구를 보완하고 최종 DB를 재생성했다.
독립 source review에서 남은 P0/P1 미발견을 확인했으며 최종 증거의 현재 source SHA는 validation에서 확인한다.

초기 드라이버 probe는 이미지 entrypoint가 기대하는 socket 경로와 맞지 않아 실패했다. 기본 경로 bind로 수정하여 실제 연결을 확인했다.
첫 Node 실행은16/17 PASS였고, 앞선 의도적 권한 오류가 pg-pool 연결을 폐기하여 세션 baseline이 사라진 테스트 가정을 수정했다.
수정 후 같은 backend PID·역할·DateStyle·timezone·search_path가 읽기 전후 동일한지 확인했다.
첫 bind 디렉터리 cleanup 소유권 오류도 해당 세션 경로만 소유자를 복원해 제거했고 runner의 finally에서 복원/정리를 검증하도록 고쳤다.
[초기 결과](evidence/step-05/node-first/runner-first.json), [초기 Node 개별 결과](evidence/step-05/node-first/node-tests.json), [probe 정리](evidence/step-05/probe-cleanup.json)를 보존했다.

## 화면 검증

새 STEP-05 build를 `APP_ENV=test / DATA_MODE=live`, `http://127.0.0.1:3103`에서 실제 Chromium으로 확인했다.
홈 안내·공식 Q-Net 링크·skip link·JavaScript OFF SSR·error boundary·실제404를 자동 검증했고 외부 HTTP 시도는0이었다.
360/390/768/1440px 홈 screenshot을 각각 직접 열어 헤더·빈 상태·버튼·주의문·footer의 가독성과 가로 넘침/겹침을 확인했다.
가상 종목·일정·통계는 표시하지 않았다. UI 코드를 변경하지 않았으며 관리자/DB 화면을 새로 만들지 않았다.

[360](evidence/step-05/screenshots/foundation-home-360.png) · [390](evidence/step-05/screenshots/foundation-home-390.png) ·
[768](evidence/step-05/screenshots/foundation-home-768.png) · [1440](evidence/step-05/screenshots/foundation-home-1440.png).
[화면 검수 기록](evidence/step-05/screen-review.json). 이 화면은 앱 DB 연결이나 실데이터 정확성의 증거가 아니다.

## 데이터·보안·광고·비용

공공 API 인증 호출·실제 코드/일정/통계·공식 대조는 **0회/NOT_RUN**이다. 실제 API5개는 비활성이다.
합성 fetch가 테스트용 SYNTHETIC 응답을 반환하고, test actor가 격리 DB에서 승인 절차를 실행한 것이다.
이 결과를 공식 승인·실제 운영자 로그인·실제 API 성공으로 표현하지 않는다.
DB fixture는 테스트 경로에만 있고 공개 seed/fallback에 연결하지 않았다. 모든 컨테이너·socket을 정리했다.
원격 DB/CI/배포·유료 구매·메일·실광고·Git push/PR은 수행하지 않았다. 비밀키 값은 출력·저장하지 않았다.
새 snapshot/log/error 검사는 알려진 key/credential 패턴을 대상으로 하며 임의 비밀값 부재 보증은 아니다.

## 미완료·차단

| 항목 | 상태·해소 조건 | 독립 완료 범위 |
|---|---|---|
| 공공 API5종·3종목 live·source별 operation mapper | BLOCKED: 명세/승인 키/응답/쿼터·crosswalk/공식 대조 필요 | generic 계약/파서/내부 projection·합성 테스트 완료 |
| Supabase Auth/JWT·PostgREST·원격 migration | NOT_RUN: 실제 전용 대상·설정·승인 필요 | 실제 로컬 PG role/RLS/transaction 검증 완료 |
| 항목별 diff·관리자 요청 인증/UI·override 적용/만료 재검토 | 후속 STEP-14. 현재 batch hash/건수 검토이며 override가 있으면 게시 차단 | 현재 DB publisher 권한·승인 hash·version 확인 완료 |
| 앱 페이지 DB 연결·실제 종목 상세 | 후속 STEP-08. 아직 검증된 자료 없음 | 독립 public repository/실제 driver 검증 완료 |
| 스케줄링·보존·운영 복구 | 후속 STEP-17 | 수동 호출 가능한 안전한 수집/게시 모듈만 구현 |
| 원격 CI/배포·광고·전체 서비스 QA | NOT_RUN/미승인 | 로컬 CI 초안·새 build·기존 화면 회귀만 확인 |

server publisher 함수의 actor UUID는 검증된 서버 identity가 전제다. DB 역할 확인을 실제 Auth 검증으로 확대하지 않는다.
관련 override는 만료됐다고 자동 무시하지 않는다. 검토 workflow 구현 전에는 해당 범위를 차단해 이전 공개본을 유지한다.

## 인수인계

state/PROJECT_STATUS.md·BLOCKERS.md·EVIDENCE_INDEX.md를 갱신했다. STEP-02·G0는 BLOCKED이며 공개 가능 판정은 아니다.
모든 변경은 로컬 미커밋이고 기존 증거/원본 migration을 보존했다. 실제 변경/보존 검사는 validation.json에 있다.
다음 STEP 하나는 **STEP-06 — 날짜·통계·준비 계획 계산 엔진**이다. 이번에는 시작하지 않았다.
계산 엔진은 nullable counts·연간/회차 구분과 bigint/decimal 문자열 정밀도를 유지해야 한다.
