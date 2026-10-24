# STEP-04 — DB 스키마·RLS·마이그레이션

상태: **DONE(격리 로컬 PostgreSQL 스키마·권한 검증)**
데이터 모드: synthetic fixture는 테스트 DB에만 사용 / 앱은 live 설정의 빈 상태(DB 미연결)
시작: 2026-10-20 18:05:28 Asia/Seoul. 종료 근거 시각: evidence/step-04/validation.json.
작업 루트: `/workspace/licenseinsight` / branch `audit/m0-task-001` / commit 없음(unborn).

## 목표·범위

STEP-04 하나만 수행했다. 공개 projection과 내부 운영 데이터를 분리하고 실제 PostgreSQL에서
마이그레이션 재현, 데이터 제약, 익명·인증·서버 역할 권한을 검증했다.
공공 API 어댑터·수집/게시 transaction·DB repository·관리자 로그인/화면은 구현하지 않았다.
STEP-02와 G0는 BLOCKED를 유지하며 원격 자원·운영 DB·배포·광고는 변경하지 않았다.

## 사전 점검

- AGENTS, 상태/차단/승인, STEP_INDEX의 STEP-04, DATABASE·SECURITY_PRIVACY·ARCHITECTURE·TEST_STRATEGY 및 내부 데이터 계약을 확인했다.
- 이전 STEP-03의 validation(16 PASS), 단위/통합73 PASS, 브라우저8 PASS, build exit0 JSON과 SHA를 확인했다. [선행 근거](evidence/step-04/prior-proof-review.json).
- 기존 로컬 변경169개 파일을 시작 hash로 보존했다. 기존 앱 runtime 소스는 변경하지 않았다. Git 원격은 `kasa500000-png/LicenseInsight`, push/PR 승인은 없다.
- 공공 API 키·Supabase URL/서버 키·DATABASE_URL은 환경에서 존재하지 않았다. 값·.env 원문을 출력하지 않았다. 기존 STEP-02 503 근거를 읽었으며 같은 공공 카탈로그를 재시도하지 않았다.
- Docker28.4.0의 관리된 로컬 Unix socket을 실제 확인했다. host psql/상주 Supabase CLI가 없어 컨테이너 psql과 exact CLI2.121.0 임시 실행을 사용했다. 원격 프로젝트를 선택하거나 연결하지 않았다.
- Supabase 스킬·Postgres 모범 규칙과 클라우드 Docker/네트워크 지침을 적용했다. 현재 공식 changelog/docs와 CLI help를 읽었다. Data API 명시 GRANT 전환, PG17 기본 전환, 함수 PUBLIC EXECUTE, invoker view를 반영했다. [공식 검토](evidence/step-04/official-review.json).

## 계획과 변경 파일

구현 → DB/정적 테스트 → 기존 홈 실화면 → 결과 보고 순서로 수행했다.

| 파일 | 실제 변경 |
|---|---|
| [migration](../../supabase/migrations/20261020090856_foundation_schema_rls.sql) | 실제 CLI `migration new foundation_schema_rls`로 생성. public6/internal9 테이블, FK/index/check/NULLS NOT DISTINCT, 역할·GRANT·RLS·invoker 함수/뷰 |
| [config](../../supabase/config.toml), [DB 안내](../../supabase/README.md), supabase/.gitignore | CLI init 후 로컬 공개 schema만 설정, 자동노출/seed OFF, 최소 서비스 설정, 재현·서버 권한 설계 |
| [DB runner](../../scripts/test-database.py), [cases](../../tests/database/cases.py), [setup](../../tests/database/setup.sql) | 고정 digest·새 격리 컨테이너·두 새 DB·실제 SQLSTATE/읽기 결과·정리·메타데이터 증거 |
| [생성기](../../scripts/generate-db-types.py), [타입](../../src/data/database.types.ts), [타입 부정 검사](../../tests/types/database-contract.ts) | 실제 row-free catalog 기반 타입. nullable/default/generated 반영, bigint/numeric 정밀도 경계 |
| package.json, .github/workflows/ci.yml | `test:db` 추가, 비밀키 없는 DB CI 초안 job. lockfile/dependency 변경 없음 |
| README.md, docs/DATABASE.md, state/PROJECT_STATUS.md·BLOCKERS.md·EVIDENCE_INDEX.md | 현재 구현·로컬/원격 차이·다음 STEP 갱신 |
| docs/reports/evidence/step-04/ | 실행 JSON·실화면·보존 근거. 완전한 목록은 validation.json |

문자열 코드는 앞자리0을 보존한다. 일정의 `date|datetime`과 `single|range`를 분리하고
시각을 채우려면 한국 날짜·순서가 맞아야 한다. 통계는 nullable counts와 공식 발표 비율을
보존하며 calculated_rate는 generated column으로 수동 위조를 막는다.
연간 null round 중복은 UNIQUE NULLS NOT DISTINCT로 차단한다.

public 자료는 검토된 published 행만 읽는다. 자식 projection도 parent 공개 여부를 검사한다.
내부 schema USAGE·테이블·함수는 브라우저에 허용하지 않는다. 기본 PUBLIC 함수 실행은 전역 default와
개별 REVOKE로 차단한다. 다른 public 테이블에는 새 읽기 권한을 주지 않는다.
qi_ingestion/qi_admin_server는 NOLOGIN·NOBYPASSRLS이며 브라우저 membership이 없다.
원문 snapshot·audit 수정과 역사 DELETE는 서버 역할에도 부여하지 않았다.

## 수용 기준별 결과

| 기준 | 결과 | 실제 근거 |
|---|---|---|
| 새 DB 마이그레이션·재현 | PASS(D2) | 같은 새 격리 cluster의 qi_first/qi_replay, schema-only dump fingerprint 일치 |
| public/internal 구조·typed constraints | PASS(D2) | public6/internal9, 실제 catalog·FK·NULL unique·날짜·비율·코드 검사 |
| anon/authenticated 공개 읽기만 | PASS(D2) | 각6개 테이블의 정확한 공개행, 초안/withdrawn/초안 parent 자식 제외 |
| 모든 공개 쓰기·내부 데이터 거부 | PASS(D2) | INSERT/UPDATE/DELETE/TRUNCATE, 내부9개 테이블 접근에서 SQLSTATE42501 |
| 역할·view/function 우회 거부 | PASS(D2) | 세션 권한 하향, forged claims 무효, role 전환 거부, invoker view·함수 ACL/실호출 |
| 서버 역할 최소 범위·역할 회수 | PASS(D2) | staging 허용/게시 거부, 감사 append만, admin helper 즉시 false 전환 |
| 서버 관리 경로 권한 설계 | PASS(D0) | 검증 identity→현재 admin_roles→transaction 내 재확인→audit 설계. handler 구현은 미실행 |
| config 노출 schema·seed | PASS(정적) | public만, internal search path 제외, 자동 grant/seed OFF. 실제 HTTP 동작은 NOT_RUN |
| 기존 홈 실화면 유지 | PASS(D3) | Chromium6, JS OFF SSR, 360/390/768/1440px 직접 검수 |

## 실행한 검증

실제 PostgreSQL은 **17.11**, 이미지 `postgres:17-bookworm`을 가져온 뒤
`postgres@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826`으로 고정했다.
초기 17.6 이미지도 내려받았으나 최종 검증에는 사용하지 않았다.
컨테이너는 network=none, TCP listener 없음, 호스트 포트/사용자 볼륨 없음, tmpfs 사용이다.

| 명령/검증 | 환경·데이터 | 결과 | 증거 |
|---|---|---|---|
| CLI2.121.0 --version / migration new·gen types·init --help / 실제 migration new·init | 로컬 CLI | exit0 | official-review.json·생성 파일명 |
| `python scripts/test-database.py --evidence-dir docs/reports/evidence/step-04` | 실제 PG17.11·synthetic | **328 PASS / 0 FAIL, exit0** | [database-tests.json](evidence/step-04/database-tests.json) |
| 각 DB162개 case | 각 부정120개 포함 | 324 PASS(예상 SQL 오류240개 포함) | 위 JSON 각 case·SQLSTATE |
| 별도 검사 | config1·다른 테이블 권한 보존2·schema replay1 | 4 PASS | 위 JSON |
| `python scripts/generate-db-types.py docs/reports/evidence/step-04/qi_first-metadata.json --check` | 실제 catalog·행 없음 | exit0 | [types-check](evidence/step-04/types-check.json) |
| `pnpm lint` / `pnpm typecheck` | 타입 부정4개 포함 | 각각 exit0 | [lint](evidence/step-04/lint.json)·[typecheck](evidence/step-04/typecheck.json) |
| `pnpm test` | 기존 웹 단위/CLI 통합 | 73 PASS, exit0 | [tests](evidence/step-04/tests.json) |
| `pnpm test:e2e --grep 'home '` | 기존 STEP-03 build·시스템 Chromium·앱 DB 미연결 | 6 PASS, exit0 | [browser](evidence/step-04/browser-tests.json) |
| 컨테이너 정리 | runner 고유 label, 개발용 exact label | PASS | 위 DB JSON cleanup·[개발 DB 정리](evidence/step-04/development-db-cleanup.json) |

초기 compile 부정 예제의 큰 숫자 리터럴은 lint의 정밀도 오류를 일으켜 숫자 타입 거부 예제로 수정했다.
첫 Playwright `^home` 필터는 전체 test title의 prefix와 맞지 않아 0개 발견/exit1이었다.
`home `로 필터를 수정해 실제6개를 실행했다. 두 초기 결과도 lint-first.json·browser-discovery-first.json에 보존했다.
스키마 검토에서 snapshot UPDATE, 함수 global PUBLIC EXECUTE, 날짜 계약, public 전체 GRANT를 보완한 뒤 최종 DB를 재생성해 검증했다.
최종 독립 검토는 기록된 migration/runner/cases/setup/config SHA 일치와 남은 P0/P1 미발견을 확인했다.

## 화면 검증

`http://127.0.0.1:3103/`, APP_ENV=test / DATA_MODE=live. 기존 앱 runtime 파일은 시작 기준선과 동일하다.
이번에 build를 다시 실행하지 않았으며 STEP-03에서 검증한 로컬 production build로 홈 회귀만 확인했다.
헤더·빈 상태 안내·Q-Net 링크·주의문·footer를 4폭에서 직접 열어 확인했다.
스크롤 가로 넘침, 겹침, 가상 종목/통계 표시는 없었다. JS OFF에서도 핵심 안내가 보이고
자동 브라우저 검사에서 시도된 외부 HTTP 요청은 0이다.

[360](evidence/step-04/screenshots/foundation-home-360.png) ·
[390](evidence/step-04/screenshots/foundation-home-390.png) ·
[768](evidence/step-04/screenshots/foundation-home-768.png) ·
[1440](evidence/step-04/screenshots/foundation-home-1440.png).
새 관리자/DB 화면은 만들지 않았다. 이 화면 확인은 DB 연결 증거가 아니다.

## 데이터·보안·광고·비용

테스트 fixture는 `SYNTHETIC-STEP04`와 가상 코드 `0007` 등으로 실제 전기 3종목에 연결하지 않았다.
운영 seed 경로가 없으며 테스트 DB는 제거했다. 공공 API 인증 호출은 이번에도0회다.
공개 명세 조회·실제 API 승인·인증/업무 호출 성공을 구분하며 STEP-02의 승인 UNKNOWN과 코드 null을 유지한다.
원격 DB·자원 생성·운영 데이터 변경·배포·실광고·구매·메일·push/PR은0회다.
이미지/공개 문서/CLI 읽기 다운로드만 사용했고 Docker/브라우저 실행은 로컬이다.
증거에는 키/환경값·개인기록·auth state를 넣지 않았다. 정적 민감패턴 검사는 임의 비밀값 부재의 보증이 아니다.

## 미완료·차단

| 미실행 항목 | 이유·다음 조건 | 독립 완료와의 관계 |
|---|---|---|
| Supabase 전체 start/reset·Auth/JWT·PostgREST 실제 API | 이번에는 격리 PG만 실행. 전용 Supabase 환경과 실제 HTTP/인증 검증 필요 | SQL/RLS PASS를 플랫폼 검증으로 확대하지 않음 |
| 원격 migration·호스팅·CI·배포 | 승인된 대상/자격증명 없음. 원격 변경 승인 없음 | 로컬 migration·CI 초안만 완료 |
| 실제 3종목·공식 명세·crosswalk·일정·통계·키 승인 | STEP-02 키 부재·승인 UNKNOWN·마지막 카탈로그503 | G0 BLOCKED 유지, 재준비 전 반복 호출 없음 |
| DB repository/decoder·원자적 게시 | STEP-05 범위 | 타입만 존재. bigint/numeric·날짜 문자열 decoder를 실제 연결 시 검증해야 함 |
| 관리자 인증/서버 handler | STEP-14 범위 | capability role은 신뢰 서버 권한이며 DB가 사용자 인증을 자동 강제하지 않음 |
| 이번 새 build·전체 여정·성능·전체 접근성 | runtime 변경 없음/아직 기능 없음 | prior build 근거와 홈6 회귀만 사용 |

원문 sanitization·중복 기간/crosswalk의 모호성 검토·게시 transaction/lease/권한 재확인은 STEP-05에서
추가 검증해야 한다. 새 DB 생성자가 객체를 만들면 해당 생성자의 default privileges도 다시 확인한다.

## 인수인계

state/PROJECT_STATUS.md·BLOCKERS.md·EVIDENCE_INDEX.md를 실제 로컬 완료/원격 미검증으로 갱신했다.
기존 근거·사용자 변경은 보존했다. 모든 변경은 로컬 미커밋이며 push/PR은 없다.
다음 STEP 하나는 **STEP-05 — 수집 어댑터·정규화·안전한 게시**다.
STEP-03/04 기반으로 오프라인 구현·DB transaction 테스트는 가능하지만 live는 STEP-02 실제 승인/응답이 선행한다.
