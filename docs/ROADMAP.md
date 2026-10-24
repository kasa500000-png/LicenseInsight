# 20단계 구현 로드맵 v2

모든 STEP 초기 상태는 TODO. 기간 약속보다 수용 기준과 실제 증거로 진행한다.
기본 흐름: 데이터 가능성 → 기반/계산/디자인 → 한 종목 핵심여정 → 탐색/비교/종목확대 → 운영/신뢰 → QA/공개 → 광고.

| STEP | 작업 | 선행 조건 | 실행 파일 |
|---|---|---|---|
| STEP-01 | 프로젝트 점검·범위·환경 확정 | 없음 | [프롬프트](../prompts/steps/STEP-01_PROJECT_AUDIT.md) |
| STEP-02 | API 승인·3종목 데이터 가능성 검증 | STEP-01 | [프롬프트](../prompts/steps/STEP-02_API_PROOF.md) |
| STEP-03 | Next.js·TypeScript·테스트 기반 | STEP-01; STEP-02 계약 검토(실호출은 별도) | [프롬프트](../prompts/steps/STEP-03_FOUNDATION.md) |
| STEP-04 | DB 스키마·RLS·마이그레이션 | STEP-03; STEP-02 데이터 계약 | [프롬프트](../prompts/steps/STEP-04_DATABASE_RLS.md) |
| STEP-05 | 수집 어댑터·정규화·안전한 게시 | STEP-03/04; live는 STEP-02 실제 승인·응답 필요 | [프롬프트](../prompts/steps/STEP-05_INGESTION.md) |
| STEP-06 | 날짜·통계·준비 계획 계산 엔진 | STEP-03; STEP-02/04 계약 검토 | [프롬프트](../prompts/steps/STEP-06_DOMAIN_LOGIC.md) |
| STEP-07 | 디자인 시스템·공통 UI·모바일 셸 | STEP-03 | [프롬프트](../prompts/steps/STEP-07_DESIGN_SYSTEM.md) |
| STEP-08 | 한 종목 상세·일정·통계 수직 구현 | STEP-05/06/07; live는 G0 필요 | [프롬프트](../prompts/steps/STEP-08_QUALIFICATION_DETAIL.md) |
| STEP-09 | 관심 저장·개인 준비 계획 | STEP-06/07/08 | [프롬프트](../prompts/steps/STEP-09_PERSONAL_PLAN.md) |
| STEP-10 | ICS·JSON 내보내기 | STEP-06/08/09 | [프롬프트](../prompts/steps/STEP-10_EXPORTS.md) |
| STEP-11 | 홈·검색·자격증 탐색·일정 달력 | STEP-05/07/08/09 | [프롬프트](../prompts/steps/STEP-11_DISCOVERY_CALENDAR.md) |
| STEP-12 | 2~3개 비교·공유 URL | STEP-06/07/08/11 | [프롬프트](../prompts/steps/STEP-12_COMPARE.md) |
| STEP-13 | 검증된 최대10종목 확대 | STEP-02/05/08/11/12 | [프롬프트](../prompts/steps/STEP-13_DATA_EXPANSION.md) |
| STEP-14 | 운영자 로그인·검토·정정 | STEP-04/05/07/13(확대 중이면 검증된 부분) | [프롬프트](../prompts/steps/STEP-14_ADMIN_REVIEW.md) |
| STEP-15 | 가이드·신뢰 페이지·SEO | STEP-08/11/12/13/14(공개 계약) | [프롬프트](../prompts/steps/STEP-15_CONTENT_SEO_TRUST.md) |
| STEP-16 | 광고OFF 구조·분석·동의 경계 | STEP-08/11/12/15 | [프롬프트](../prompts/steps/STEP-16_ADS_ANALYTICS_OFF.md) |
| STEP-17 | 예약 수집·모니터링·백업·복원 | STEP-04/05/14/16 | [프롬프트](../prompts/steps/STEP-17_OPERATIONS.md) |
| STEP-18 | 통합 QA·접근성·보안·성능 | STEP-06~17; live 검증은 G0 필요 | [프롬프트](../prompts/steps/STEP-18_FINAL_QA.md) |
| STEP-19 | Preview 검증·승인된 운영 공개 | STEP-18; G0~G4 및 실제 대상승인 | [프롬프트](../prompts/steps/STEP-19_DEPLOYMENT.md) |
| STEP-20 | 승인된 광고 활성화·출시 후 검증 | STEP-16/18/19; G5 및 광고활성화 승인 | [프롬프트](../prompts/steps/STEP-20_MONETIZATION.md) |

## 의존성과 병렬 범위
02가 키 때문에 막혀도03기반/06순수계산/07디자인 및 fixture UI는 진행할 수 있다.
04DB의 실제실행/05live/13확대/G0는 각각 필요한 실제 데이터·도구 증거를 요구한다.
독립 코드 작업을 진행해도 blocked 선행 STEP을 DONE으로 바꾸지 않는다.
GUIDED는 사용자 검토 후 다음 단계, AUTO_SAFE는 현재 세션 내 승인된 안전작업만 연속 수행한다.
03기반 뒤 06계산과07디자인은 별도 파일 소유 범위로 병렬가능하지만 실제 subagent 지원 시에만 사용한다.
04DB schema/계약/publication은 한 책임자가 관리하고 같은 migration을 병렬 수정하지 않는다.
처음에는 순차 진행을 권장한다. 병렬화 자체가 목표가 아니다.

## v1 TASK → v2 STEP 대응
| 기존 TASK | 새 STEP | 변경 이유 |
|---|---|---|
|001|01|환경·범위 유지|
|002,003|02|API 승인·3종목 검증 통합|
|004|03,07|개발기반과 디자인 상세 분리|
|005|04|DB/RLS|
|006|05|수집/게시|
|007,008|06,08|계산을 UI에서 분리|
|009|09,10|개인계획과 파일내보내기 분리|
|010|11|홈/탐색/달력|
|011|12|비교|
|012|13|종목확대|
|013|14|운영자|
|014,015|15|콘텐츠/신뢰/SEO 통합|
|019|16|광고OFF 구조를 공개 전에 검증|
|016|17|운영/복구|
|017|18|종합QA|
|018|19|실제 승인된 공개|
|020|20|광고활성화·실측검증|

v1 TASK 번호를 v2 STEP 번호와 동일하게 가정하지 않는다.
문서 구현범위의 핵심은 유지하며 기존 report가 있으면 이 표로 실제 상태를 이관한다.

## 상태 규칙
TODO 아직 시작안함 / IN_PROGRESS 현재작업 / PARTIAL 구현일부·검증일부 / BLOCKED 외부필수누락 /
REVIEW 구현·검증후 인수검토 / DONE 단계에 정의된 필수근거 확인.
추가 열로 code, fixture_tests, live_data, ui_review 상태를 각각 기록한다.
DONE은 문서 작성만으로 자동 부여하지 않는다.
보고서는 docs/reports/STEP-NN.md에 templates/STEP_REPORT.md 형식으로 구현시 생성한다.

## 작업 끝 인수인계
무엇을 만들었는지, 실제로 검증한 것, 미검증/차단, 현재커밋/미커밋, 다음 STEP 하나를 기록한다.
현재 세션이 종료되면 prompts/RESUME_PROMPT.md로 이어간다. 외부승인을 암묵 승격하지 않는다.
