# 데이터베이스 상세 설계

아래 내부 스키마는 [STEP-04 migration](../supabase/migrations/20261020090856_foundation_schema_rls.sql)으로 구현했다.
외부 API 필드 그대로가 아니며 실제 종목 데이터는 아직 검증하지 않았다.
격리 PostgreSQL의 두 새 DB에서 재현·권한 테스트를 통과했다. Supabase 원격 적용·Auth·Data API는 미실행이다.
[실행 보고서](reports/STEP-04.md)와 [로컬 실행·서버 권한 경계](../supabase/README.md)를 따른다.
STEP-05는 [추가 migration](../supabase/migrations/20261020104213_ingestion_publication.sql)으로 scope lease·공유 예산·게시 소유권과 invoker 수집/검토/게시 함수를 구현했다.
[STEP-05 보고서](reports/STEP-05.md)의 오프라인·실제 로컬 DB 근거와 live 차단을 구분한다.
Supabase 노출 스키마/GRANT/RLS는 모두 확인한다.[S12][S13]

## 설계 선택
`internal`에는 원문·staging·검토·관리자를 두고 Data API에 노출하지 않는다.
`public`에는 검토 통과 후 공개할 projection을 둔다. 공개 projection도 RLS를 켠다.
공개 projection에는 인증키·raw response·운영 메모·사용자 식별정보를 절대 넣지 않는다.
마스터 레코드는 logical ID를 유지하며 공개 데이터 변경은 원자적 transaction으로 적용한다.

## 공통 provenance 컬럼
원천 기반 public 레코드는 source_id, source_url, source_published_at(nullable), data_as_of(nullable),
fetched_at, validated_at, reviewed_at(nullable), verification을 갖거나 명확한 FK로 같은 공개 provenance를 조회한다.
아래 표는 반복 컬럼 일부를 생략한 요약이다. `validated_at`은 자동 검증이며 사람의 대조는 `reviewed_at`이다.
DTO는 camelCase 변환을 일관되게 적용한다. 기존 v1의 verified_at은 v2에서 validated_at으로 명확화한다.
`verification`은 pending/verified/review_required 등 품질 상태이고, 최신성 freshness 및 availability와 별개다.

## public 테이블
| 테이블 | 핵심 컬럼 | 제약/인덱스 |
|---|---|---|
| qualifications | id uuid, provider text, qualification_type text, acquisition_track text, source_code text, canonical_name text, grade text, domain text, slug text, active_state text, publication_state text, created_at/updated_at timestamptz | unique(provider,type,track,source_code), unique(slug), 이름·등급 인덱스 |
| qualification_aliases | id, qualification_id FK, alias text, normalized_alias text, valid_from/valid_to date nullable | qualification_id+alias+적용기간 중복 검증; 모호 별칭 자동 게시 금지 |
| exam_events | id uuid, qualification_id FK, source_id text, logical_key text, year int, round text, stage text, event_type text, subtype text, ordinal text, date_start/date_end date, starts_at/ends_at timestamptz nullable, temporal_precision text, extent text, timezone text, source_url text, source_published_at nullable, fetched_at/validated_at timestamptz, reviewed_at nullable, revision_hash text | unique(source_id,logical_key); end>=start; 종목+year+stage+date_start 인덱스 |
| pass_statistics | id, qualification_id FK, year int, round text nullable, stage text, acquisition_track text, aggregation_level text, examinees/passed bigint nullable, published_rate numeric nullable, source_rate_text text, source_precision int nullable, calculated_rate numeric nullable, completeness text, source_id/url, 검증·수집 시각, revision_hash | 회차/연간 총계 구분 키; null 포함 unique 동작 명시; count/rate CHECK |
| qualification_details | id, qualification_id FK, info_type text, safe_text text, numeric_value numeric nullable, unit text nullable, valid_from/valid_to nullable, source_id/url, 검증·수집 시각 | 종목+정보종류+유효범위; XSS 정화된 내용만 |
| dataset_status | scope_key text PK, qualification_id nullable, dataset_type text, published_revision_hash text nullable, availability text, freshness text, verification text, last_fetch_at nullable, last_validated_at nullable, last_reviewed_at nullable, source_as_of nullable, pending_change bool, public_notice text nullable | 상태별 공개 가능한 필드만; private 오류원문 없음 |

stage = written/practical. exam event_type = registration/exam/result/document_submission 등 검증된 값만.
subtype은 ordinary/additional/vacancy/unknown 등 원천 하위구분을 보존한다.
결과 발표일이 둘 이상이면 ordinal/원천 event key로 분리한다. 단순 날짜를 identity로 쓰지 않는다.
일정 범위와 시각 정밀도를 분리한다. date-only이면 starts_at/ends_at은 null이다.

## internal 테이블
| 테이블 | 역할·주요 필드 |
|---|---|
| source_registry | source_id, catalog_url, 실제 승인/한도 설정, adapter_version. 키 본문은 저장하지 않음 |
| source_crosswalks | source_id, source_code/name/grade, valid_from/to, qualification_id, 검토 근거와 검토자 |
| source_snapshots | run_id, scope_key, sanitized response 위치/본문, hash, fetched_at, parse_version |
| sync_runs | id, scope_key, 상태, 시작/종료, 호출/페이지/레코드/격리 수, 안전한 error_code, lease 만료 |
| staged_records | run_id, entity_type, logical_key, normalized payload, hash, 검증 결과 |
| review_items | 종류, 대상키, old/new hash, 변경 diff, 근거, 상태, optimistic version |
| overrides | 대상키+필드, 이전/새 값, 공식 근거, 적용/만료, 승인자; 원문은 유지 |
| admin_roles | auth user UUID PK, role, active, granted_at/revoked_at. 자기 수정 금지 |
| audit_logs | actor UUID/system, action, target, revision, 사유, 시각. 키·개인계획 미포함 |

## 식별자와 중복
코드는 숫자가 아닌 문자열로 저장한다. `0010`을 `10`으로 바꾸지 않는다.
통계에 공식 종목코드가 없으면 명칭+등급+적용연도 crosswalk로 연결한다.
source seriescd와 grdCd를 동일 코드로 가정하지 않는다.
통계 자연키에 aggregation_level을 포함한다. 공식 연간 총계와 회차 데이터를 합산하지 않는다.
round가 null인 연간 자료의 unique 중복 문제는 DB 지원 버전에 맞는 제약/별도 키로 해결한다.
종목명 변경/폐지 시 history·alias와 redirect를 남긴다. 과거 통계를 무조건 새 명칭에 합치지 않는다.

## 무결성
counts >= 0, passed <= examinees(둘 다 존재할 때), rate는 0~100.
examinees=null/0이면 calculated_rate=null. passed가 null인 회차는 연간 합산 분자에서 몰래 제외하지 않는다.
FK 삭제는 기본 RESTRICT. 운영자 삭제 버튼으로 역사 데이터를 cascade 삭제하지 않는다.
공식 URL은 프로토콜/기관 host allowlist로 검증한다. 사용자 입력 URL을 서버가 임의 fetch하지 않는다.

## 게시 transaction
1. 동일 scope lock 및 예상 old revision 확인.
2. 검증된 staged records와 승인된 override를 적용한 공개 레코드 생성.
3. 관련 projection을 upsert. 원천에서 사라진 값은 명시적 정정 근거가 있을 때만 처리.
4. dataset_status의 revision/시각/상태 갱신.
5. audit 기록. transaction 성공 후 cache invalidation.
오래된 검토 화면에서 새 revision을 덮으면 409 conflict로 중단한다.
현재 DB 함수는 고정 `REVISION_CONFLICT` 오류를 반환한다. HTTP handler/409 응답 매핑은 아직 없다.
관련 override의 자동 적용·만료 처리는 미구현이며 존재하면 게시를 차단하여 정상본을 보존한다.
현재 review diff는 batch hash·run·건수이며 항목별 비교 UI는 STEP-14에서 제공해야 한다.

## 권한 모델
| 주체 | 공개 게시자료 | 초안/내부 데이터 | 쓰기 |
|---|---|---|---|
| anon | SELECT 허용된 게시자료만 | 금지 | 금지 |
| 일반 authenticated | anon과 동일 | 금지 | 금지 |
| 관리자 브라우저 | 공개 읽기 + 승인된 서버 경로 | 직접 Data API 접근 금지 | 직접 쓰기 금지 |
| 관리자 서버 | 매 요청 유효 세션+admin_roles 확인 | 해당 업무 범위만 | 검토/게시 경로만 |
| 수집 worker | 필요한 수집 데이터 | 제한된 서버 자격증명 | staging·게시된 수집 flow |

private schema는 노출 제외+REVOKE를 적용하고 필요시 RLS를 방어적으로 추가한다.
공개 view를 도입하면 security_invoker 등 실제 버전 권한 동작을 테스트한다.
SECURITY DEFINER로 권한 오류를 무조건 해결하지 않는다. 불가피한 함수는 최소 grant/search_path/권한 점검 필수.

## migration·복구
처음에는 비운영 로컬/전용 테스트 DB에서 검증한다. CLI 명령은 설치 버전 --help로 확인한다.
migration 생성·버전 기록·DDL diff·새 DB 적용·권한 부정 테스트를 모두 남긴다.
운영에 적용된 migration 파일을 수정하지 않고 새 migration으로 보완한다.
파괴적 변경은 expand → migrate → contract 단계를 분리하고 별도 승인·백업·복원을 요구한다.
브라우저 개인기록 테이블은 만들지 않는다. public 사용자 프로필·회원가입 테이블도 MVP 제외다.
