# STEP-02 — API 실검증 결과

상태: **BLOCKED**. 독립 오프라인 probe/합성 테스트는 PASS, 실제 3종목 데이터 증명은 NOT_RUN이다.
기준일: 2026-10-20 Asia/Seoul. 정확한 조회 UTC는 [카탈로그 근거](evidence/step-02/catalog/catalog-recheck.json), 준비 실행 UTC는 [preflight](evidence/step-02/preflight.json)에 기록했다. G0: **BLOCKED**. 공개 가능 종목: **0개(검증되지 않음)**.

## 환경·권한

- 작업 루트 `/workspace/licenseinsight`, branch `audit/m0-task-001`, commit 없음. Python 3.12.14 표준 라이브러리를 사용했다.
- `DATA_GO_KR_SERVICE_KEY`는 현재 환경에 absent다. 값·.env·인증 상태 파일을 열람하지 않았다. 포털 로그인 세션·개발/운영 승인·키 활성화·계정 쿼터는 UNKNOWN이다.
- 실제 HTTP 정책은 unrestricted/enforced, observations_current=true이며 기존 HTTPS proxy·TLS 검증을 유지했다. 별도 설정 secret/runtime variable/outbound identity는 0개다. 새 설정 변경은 하지 않았다.
- 공개 문서 GET은 총 5회, API 인증 호출은 0회다. 각 문서 요청 timeout 20초, 요청당 1회, redirect/retry/HTTP 강등 없음. 카탈로그 실패는 실제 API 게이트웨이 상태를 증명하지 않는다.

## source별 결과

| source | 공개 명세 재확인 | 개발 승인 | 운영 승인 | 인증 실호출 | operation·제공 범위 |
|---|---|---|---|---|---|
| DS-01 / 15003024 | BLOCKED, HTTPS HTTP503 | UNKNOWN | UNKNOWN | NOT_RUN(0회) | 공식 코드·등급·분야 미확인 |
| DS-02 / 15074408 | BLOCKED, HTTPS HTTP503 | UNKNOWN | UNKNOWN | NOT_RUN(0회) | 일정 operation·연도·회차·정밀도 미확인 |
| DS-03 / 15089380 | BLOCKED, HTTPS HTTP503 | UNKNOWN | UNKNOWN | NOT_RUN(0회) | 등급별 통계·실제 연도·회차·분모 의미 미확인 |
| DS-04 / 15003003 | BLOCKED, HTTPS HTTP503 | UNKNOWN | UNKNOWN | NOT_RUN(0회) | 설명·정보구분·갱신시점 미확인 |
| DS-05 / 15003029 | BLOCKED, HTTPS HTTP503 | UNKNOWN | UNKNOWN | NOT_RUN(0회) | optional 수수료 operation·금액 미확인(null) |

[공공 소스 준비 계약](../contracts/public-api-sources.json)에 공식 출처별 `confirmed`와 `inherited_unverified`를 분리했다. 이번에 확인된 operation/endpoint/요청·응답 필드는 없다. DS-02 기존 endpoint는 미재검증 참고값이며 연결 성공으로 사용하지 않는다. HTTPS 카탈로그 주소와 HTTPS API 지원은 서로 다르다.

공개 승인 정책·무료 안내와 해당 계정의 실제 승인을 혼동하지 않는다. 현재 quota 단위·기간·reset·개발/운영 한도·상업 재이용 조건은 미확인이다. 개발 승인으로 가능한 실검증과 운영 승인·공개 준비도 별도로 판정해야 한다.

## 3종목 crosswalk·지원 범위

| 요청한 대상명 | 공식명·코드 | 원천 등급·통계 등급 교차표 | 일정 | 통계 | 공식 대조 | 공개 |
|---|---|---|---|---|---|---|
| 전기기사 | null / 미검증 | null / 미검증 | NOT_RUN | NOT_RUN | NOT_RUN | 불가(미검증) |
| 전기산업기사 | null / 미검증 | null / 미검증 | NOT_RUN | NOT_RUN | NOT_RUN | 불가(미검증) |
| 전기기능사 | null / 미검증 | null / 미검증 | NOT_RUN | NOT_RUN | NOT_RUN | 불가(미검증) |

기계 판독 대장은 [preflight.json](evidence/step-02/preflight.json)의 targets다. 입력한 이름을 공식 응답으로 확인한 이름처럼 표시하지 않는다. DS-01 `seriescd`와 DS-03 `grdCd`는 별도 체계로 검증해야 한다. 합성 코드 `0007/0012`는 이 표와 연결하지 않는다.

실행 시 한국 연도는 2026이었다. 일정 조회 후보는 2026·2027, 최근 최대 5개 완료연도 통계 후보는 2021~2025다. 현재 2026 통계는 진행 중 자료로 분리할 계획이다. 실제 제공 연도·회차는 확인하지 못했다. 후보 연도는 제공 보장이 아니며 다음 실행 때 재계산한다.

## 실제 응답과 독립 테스트

실제 API 응답·recorded fixture·API format/count/pagination 증거는 **없다**. 카탈로그 진단 텍스트 5개는 `network_diagnostic_not_spec`이며 실제 API 응답이나 공식 명세가 아니다. [catalog-recheck.json](evidence/step-02/catalog/catalog-recheck.json)에 각 SHA256·조회 UTC·HTTP 상태를 남겼다.

합성 fixture 9개와 [출처 manifest](../../tests/fixtures/synthetic/api-proof/manifest.json)를 만들고 표준 unittest **36개를 실행해 전부 통과**했다. [실행 원문](evidence/step-02/fixture-tests.json)의 data_mode는 synthetic_only다. 범위는 요청 인코딩/키 대소문자, 요약에서 credential 제외, 단건/다건/빈/null, HTTP200 업무 오류, HTTP429/500/timeout 모델, 깨진/HTML/과대/깊은/DTD XML, 부분 페이지·중복 합성 레코드, 정확한 검토 매핑이다.

업무 코드 `00/30/22`·wrapper·pagination은 합성 테스트 계약일 뿐 실제 공급 API에서 확인된 규칙이 아니다. 현재 스크립트는 네트워크 client·DB 게시·운영 파이프라인을 구현하지 않았다. 실제 key 인코딩·source 오류 코드·HTTP200 업무 오류·전체 페이지 완결성은 여전히 live NOT_RUN이다. 통계47%·D-day·계획·ICS 엔진과 DB last-good 보존은 이번 STEP에서 구현/검증하지 않았다.

## 공식 대조·실화면

종목별 접수/시험/발표·통계 원문 대조는 NOT_RUN이다. `source_published_at`, 실데이터 `fetched_at/validated_at/reviewed_at`도 없다. 카탈로그 `requested_at`을 시험 발표·사람 검토 시각으로 사용하지 않는다.

자체 앱·route·UI 변경이 없어 실화면 검증은 **NOT_RUN**이다. [확인 사유](evidence/step-02/screen-check.json)에 route 없음·browser 미실행·screenshot null을 기록했다. CLI 실행이나 HTTP 요청을 브라우저 UI 검증으로 대신하지 않는다.

## 불확실성·판정

G0 **BLOCKED**: 공식 명세 재확인503, API key absent, 실제 승인·쿼터 UNKNOWN, 실제 코드·일정·통계·공식 대조 없음. `NOT_PROVIDED`·`not_announced`로 판정한 항목은 없다. 빈 합성 응답 테스트는 `EMPTY_UNCONFIRMED` 상태만 검증했다. 서비스의 지원 여부·통계 완전성·미래 일정은 확인되지 않았다.

다음은 STEP-02 차단 해소다. 공식 명세의 operation·HTTPS·필드·format·오류·쿼터를 확인하고, API별 실제 개발 승인과 서버 키를 준비한 뒤 검토된 제한 호출을 수행한다. 운영 승인·상업 재이용·운영 쿼터는 공개 준비와 별도로 확인한다. 키는 채팅이나 Git 파일로 전달하지 않는다. STEP-03은 독립 기반 작업으로 가능하지만 이번에는 수행하지 않았다.
