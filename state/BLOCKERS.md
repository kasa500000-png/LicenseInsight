# 차단·미확인 준비 사항

확인일: 2026-10-21 STEP-08. 웹·격리 DB·오프라인 수집/게시·순수 계산·공통 UI와 분리된 합성 상세를 검증했다. 아래 차단은 STEP-02 실검증·실제 source adapter·Supabase 원격 연결·공개 준비에 적용된다. 환경에 값이 없다는 관측과 사용자 계정의 보유 여부를 구분한다. 키 값은 기록하지 않는다.

| ID | 항목 | 현재 상태 | 근거·영향 | 필요한 최소 설정·해소 조건 | 독립 진행 |
|---|---|---|---|---|---|
| B01 | 저장소·웹 개발 기반 | RESOLVED(STEP-03) | Node24.19/pnpm11.25, lockfile 및 실제 Next.js 앱 설치·lint/typecheck/build·73개 테스트·8개 브라우저 검사 PASS | [STEP-03](../docs/reports/STEP-03.md). 원격 CI·실DB·배포는 별도 | 다음 로컬 설계/검증 |
| B02 | API 키·계정 승인·실호출 | BLOCKED(live) | STEP-02 preflight에서도 `DATA_GO_KR_SERVICE_KEY` absent. 실제 개발/운영 승인·쿼터 UNKNOWN, 인증 호출 0회 | 실제 개발 승인 범위·쿼터 확인 후 서버 secret으로 키 설정. 공식 HTTPS·인증·업무 성공·페이지 완결성 검증 필요. 운영 승인은 공개 준비에서 별도 확인 | 오프라인 probe·합성 fixture·36개 테스트 완료 |
| B03 | 전용 DB·도구 | RESOLVED(local) / NOT_VERIFIED(remote) | Docker28.4/CLI2.121.0/PG17.11. STEP-05 SQL410·실제 node-postgres17 PASS·정리 PASS. 원격 project/ref·DB 환경변수 없음 | Supabase 대상·Auth/PostgREST·원격 연결은 별도 검증. 원격 생성/쓰기 승인 없으며 다른 앱 DB 재사용 금지 | 로컬 수집/게시/repository 완료; 페이지 DB 연결은 미실행 |
| B04 | 호스팅·예산·도메인 | NOT_VERIFIED | 상업 플랜·team/project·비용 상한·소유 도메인 미확정, Vercel CLI NOT_AVAILABLE | STEP-19 전 실제 대상·상업 조건·비용 경보·공개 승인 확인 | 로컬 개발 가능 |
| B05 | 운영 연락처·정책 | NOT_VERIFIED | 공개 가능한 실제 운영 주체·수신처 미제공 | STEP-15/19 실제 값 확정 및 수신 검증. 임의 메일·도메인 공개 금지 | 정책 초안 가능 |
| B06 | 광고·사이트 승인 | NOT_VERIFIED | 계정·사이트·publisher ID 미확인. 실행 코드 없음 | STEP-20 실제 승인·정책·동의·활성화 승인 필요 | 광고 OFF 구조로 후속 개발 |
| B07 | 공개 카탈로그 재확인 | BLOCKED(network observation) | STEP-02 DS-01~05 HTTPS 각1회 총5회 모두503. upstream timeout; 원천/중간망 원인 확정 불가. 이번 재시도·redirect·강등 없음 | 공식 페이지 접근·operation·필드·format·HTTPS API 지원·정책·쿼터 단위/기간 재확인 | confirmed=null과 inherited_unverified를 분리한 계약 작성 |

B02와 B07은 별개다. 공개 카탈로그 503은 API 게이트웨이의 인증 실패·서비스 중단·자료 미제공을 증명하지 않는다. 계정 승인이 없다고 단정한 것도 아니다. 이전 M0의 DS-02 추가 진단 1회와 이번 STEP-02 각1회 재조회는 다른 실행이며 증거 파일도 분리했다.

초기 3종목의 코드·crosswalk·2026/2027 일정·2021~2025 통계는 전부 미검증이다. 범위·연도는 후보이며 제공 보장이 아니다. G0는 BLOCKED(인증·공식 대조 NOT_RUN)로 유지한다.

설정은 [M0_SETTINGS](../docs/reports/M0_SETTINGS.md), 공개 조회 오류는 [API_CATALOG_AUDIT](../docs/reports/API_CATALOG_AUDIT.md), 다음 절차는 [STEP-02 준비표](../docs/reports/STEP-02_VALIDATION_PREP.md)에 모았다. 같은 누락 키를 반복 질문하지 않는다.

## STEP-02 실제 결과

[STEP-02 보고서](../docs/reports/STEP-02.md), [API 검증 결과](../docs/reports/API_VALIDATION.md), [새 카탈로그 근거](../docs/reports/evidence/step-02/catalog/catalog-recheck.json), [preflight](../docs/reports/evidence/step-02/preflight.json)를 따른다. 기존 M0 증거는 그대로 보존했다.

독립 구현·합성 테스트36개는 PASS다. 실제 source 계약·3종목 데이터·공식 대조는 NOT_RUN이며 BLOCKED를 DONE으로 바꾸지 않는다. 자체 웹 앱이 없어 실화면도 NOT_RUN이다. STEP-03은 키 없이 가능한 다음 별도 작업이지만 이번에는 시작하지 않았다.

## STEP-03 후속 확인

위 STEP-02 절은 당시 기록이다. 이번에는 ROADMAP에 따라 독립 가능한 STEP-03 기반만 구현·검증했다. 키 부재는 재확인했으나 공개 API/카탈로그를 재호출하지 않았다. B02/B07을 해결한 것으로 표시하지 않는다. 현재 자체 최소 화면은 있고 실제4폭·브라우저8개 검사가 통과했다.

새 설치의 esbuild 스크립트 미허용, 최초 TS 타입 오류, 숨긴 테스트 경로의 streaming HTTP200은 로컬 범위에서 수정·재검증했다. production fixture build/start 거부와 local/production test route404가 PASS다. 미해결 설치 장애는 없다. preview 보호 선언은 실제 인증이 아니므로 실제 preview 접근 제어는 배포 전 검증해야 한다. [보고서](../docs/reports/STEP-03.md) 참조.

## STEP-04 후속 확인

로컬 DB 실행환경을 실제 확보해 B03의 로컬 부분을 해소했다. 테스트용 synthetic 자료만 격리 컨테이너에 넣고 모두 정리했다. 앱은 DB 미연결이며 기존 빈 상태를 유지한다. API 키·원격 DB 설정 값의 존재는 이번에도 false였고 B02/B07·G0를 해소하지 않았다. 재준비 없는 공공 API 재시도는 하지 않았다.

Supabase `config.toml`의 노출 schema/자동 grant/seed OFF는 정적으로 확인했다. 실제 Auth/JWT·PostgREST API 노출·원격 migration은 NOT_RUN이다. 서버 capability role이 요청별 사용자 인증을 대신하지 않으며 실제 관리자 handler는 STEP-14에서 강제해야 한다. bigint/numeric·날짜 문자열 decoder는 STEP-05 repository 연결 시 검증해야 한다. [STEP-04](../docs/reports/STEP-04.md) 참조.

## STEP-05 후속 확인

오프라인 transport·정규화·lease/예산·검토·게시 transaction·공개 repository를 실제 로컬 DB로 검증했다. bigint/numeric/date/시각 decoder도 실제 node-postgres 경로에서 확인했다. SQL410/Node17/단위202·새 build/브라우저8은 PASS이며 fixture는 격리 테스트 DB에만 사용하고 제거했다.

B02/B07·G0는 유지한다. DS-01~05는 confirmed endpoint/operation/실제 응답이 없어 모두 비활성이며 inherited endpoint로 호출하지 않는다. 실제 operation별 mapper, code 없는 원천의 확정 crosswalk, 승인·업무 성공·공식 quota/reset은 실제 응답과 명세가 준비될 때 확인해야 한다. KST DB 일별 budget은 내부 상한이며 공급자 quota 의미를 검증한 것이 아니다.

관련 override는 자동 무시/적용하지 않고 게시를 차단한다. 관리자 로그인·실제 요청별 인증·항목별 diff UI·override 적용/만료 재검토는 후속 STEP-14 범위다. 앱 페이지는 아직 DB 미연결이며 새 홈은 빈 상태를 유지한다. [STEP-05](../docs/reports/STEP-05.md)와 [수집 안내](../src/server/ingestion/README.md) 참조.

## STEP-06 후속 확인

날짜·통계·계획 계산은 외부 API/DB 없이 독립 완료했다. 전체468 테스트·프로세스5 TZ·브라우저14 및 두 종류 화면의4폭 직접 검수 PASS다. 완료 기록의 보존/초기화와 지난 미완료 시간 재배정 방지도 순수 함수로 검증했다. 새 STEP-06 차단은 없다.

B02/B07·G0는 유지한다. 공공 API/카탈로그 재시도0회이며 실제 명세/승인/인증 성공을 추가로 확인한 것이 아니다. 원천 coverage·반올림 방식·모집단 연속성은 외부 근거가 필요하며, 엔진은 미확인 값을 추측하지 않는다.

제품 상세/계획 UI·저장/새로고침 복원·DB 연결은 후속 STEP-08/09다. 계산 검증 화면은 page.setContent 메모리 문서이며 제품 route가 아니다. DB 변경이 없어 SQL/Node driver 검증은 재실행하지 않았고 STEP-05 실행 소스 SHA·근거를 보존했다. 원격 CI/배포·광고는 미실행이다. [STEP-06](../docs/reports/STEP-06.md), [계산 안내](../src/domain/README.md) 참조.

## STEP-07 후속 확인

키/DB 없이 가능한 공통 UI·모바일 셸을 독립 완료했다. 전체484·브라우저34·로컬4모드 접근22·대비15조합 PASS, 캡처38장 중25장을 직접 검수했다. STEP-07 자체의 새 차단은 없다. 초기 dialog focus 탈출과 자동 스크롤의 하단 메뉴 가림 경계를 보완하고 재검증했다.

B02/B07·G0는 유지한다. 공공 API/카탈로그 요청0회이며 실제 데이터 승인·연결을 증명한 결과가 아니다. 일정/비교/내 준비 목적지는 기능 미제공을 명시하는 준비 중 셸이다. 갤러리의 상태 예제는 실제 저장소 adapter 실패·DB/API 오류 복구를 검증한 것이 아니다.

local/test 갤러리는 preview/production **설정의 로컬 서버**에서 query/경로 변형 포함 실제404와 합성 HTML 부재를 확인했다. 원격 preview 접근 인증이나 운영 공개 검증은 NOT_RUN이다. client 차트 렌더 오류는 격리하지만 SSR 오류·실제 스크린리더·다른 브라우저/실기기·전체 WCAG 평가는 별도다. [STEP-07](../docs/reports/STEP-07.md), [UI 안내](../src/components/ui/README.md) 참조.

## STEP-08 후속 확인

독립 가능한 분리된 합성 상세를 완료했다. 공개 repository 계약→일정/통계 domain→SSR HTML→연도/단계 선택→관심/계획 진입을 연결했고 전체539·브라우저48·로컬4환경 접근40 PASS, 새 상세17장을 직접 검수했다. JS off에서 상세가 숨겨지는 공통 로딩 경계, 상태 조회 실패 경고, 일부 연도 오류와 빈 결과의 구분을 수정했다.

B02/B07·G0는 유지한다. 실제 검증된 종목이 없으므로 `/detail-demo/synthetic-electrical`만 local/test에서 허용하며 실제 `/qualifications/*`는 미등록404다. API·카탈로그0회, 실제 명세·승인·인증 성공·공식 대조는 추가 확인하지 않았다. 합성 sourceStamp의 시각도 공식 수집 증거가 아니다.

B03의 앱 DB 연결은 미완료다. 새 slug 조회는 mock SQL 계약만 통과했으며 실제 PostgreSQL·Auth/PostgREST·원격 RLS·운영 cache/무효화를 검증하지 않았다. 기존 STEP-05 SQL410/Node17은 보존했지만 재실행하지 않았다. live 통계의 모집단·반올림·확정 회차 근거는 DTO에 없어 합산을 보류한다.

preview/production 설정의 소유 로컬 서버에서 query/경로 변형 포함40개 검사가 통과했고 합성 상세 HTML은 노출되지 않았다. 원격 배포·접근 인증·다른 브라우저/실기기·스크린리더·전체 WCAG는 별도다. 관심/계획은 준비 중 셸 진입만 하며 실제 저장은 STEP-09 범위다. [STEP-08](../docs/reports/STEP-08.md) 참조.
