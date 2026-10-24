# 프로젝트 상태

기준: 패키지 v2.0 / 구현 근거2026-10-21, Git 인수인계2026-10-24
현재 단계: STEP-08 한 종목 상세·일정·통계 DONE(분리된 합성 상세 범위). STEP-02 및 live 연결은 BLOCKED 유지.
작업 루트: `/workspace/licenseinsight`, repo `kasa500000-png/LicenseInsight`, 현재 branch `main`(최초 게시 준비). STEP-08 당시 branch는 `audit/m0-task-001`·unborn이었으며 기존 보고서는 당시 기록으로 보존한다. 실제 최신 commit은 `git log -1`로 확인한다.
현재 배포: 없음. 웹·로컬 DB·오프라인 수집/게시·순수 계산·공통 UI와 분리된 합성 상세를 구현했다. STEP-08 전체539 테스트·브라우저48·로컬4모드 접근40 PASS, 최종 캡처55장 중 새 상세17장을 직접 검수했다. `/detail-demo/synthetic-electrical`은 local/test 전용이며 실제 종목 공개 페이지가 아니다. 일정/비교/내 준비는 준비 중 셸이다. 앱 DB 연결·실제 API·계획 저장/복원은 미구현/미실행이다. 새 slug SQL은 mock 계약만 검증했고 STEP-05 SQL410/Node17은 재실행하지 않았다. 광고·분석은 OFF다.
문서 패키지 생성과 앱 구현 완료를 혼동하지 않는다.

| STEP | 주제 | 상태 | 코드 | fixture 검증 | live 데이터 | UI 검수 | 보고서 |
|---|---|---|---|---|---|---|---|
| STEP-01 | 프로젝트 점검·범위·환경 확정 | DONE(점검 범위) | N_A(앱 구현 범위 아님) | NOT_RUN(설계만) | NOT_RUN(키 부재) | NOT_RUN(앱 없음) | [STEP-01](../docs/reports/STEP-01.md) |
| STEP-02 | API 승인·3종목 데이터 가능성 검증 | BLOCKED(키·명세·승인) | PASS(오프라인 probe만) | PASS(36 synthetic) | NOT_RUN(차단) | NOT_RUN(자체 앱 없음) | [STEP-02](../docs/reports/STEP-02.md) |
| STEP-03 | Next.js·TypeScript·테스트 기반 | DONE(로컬 기반) | PASS(lint/typecheck/build) | PASS(단위·통합73) | NOT_RUN(별도 차단) | PASS(브라우저8·4폭) | [STEP-03](../docs/reports/STEP-03.md) |
| STEP-04 | DB 스키마·RLS·마이그레이션 | DONE(로컬 DB) | PASS(migration·타입·정적 검사) | PASS(DB328·기존73) | NOT_RUN(API·원격) | PASS(홈6·4폭 회귀) | [STEP-04](../docs/reports/STEP-04.md) |
| STEP-05 | 수집 어댑터·정규화·안전한 게시 | DONE(오프라인·로컬 DB); live BLOCKED | PASS(lint/typecheck/build) | PASS(단위202·SQL410·Node17) | NOT_RUN(명세·키·승인) | PASS(기반8·4폭 회귀) | [STEP-05](../docs/reports/STEP-05.md) |
| STEP-06 | 날짜·통계·준비 계획 계산 엔진 | DONE(순수 계산) | PASS(lint/typecheck/build) | PASS(전체468·TZ5) | NOT_RUN(별도 차단) | PASS(메모리 계산6+기반8·4폭 직접 검수) | [STEP-06](../docs/reports/STEP-06.md) |
| STEP-07 | 디자인 시스템·공통 UI·모바일 셸 | DONE(로컬 UI·셸) | PASS(lint/typecheck/build) | PASS(전체484·접근22) | NOT_RUN(별도 차단) | PASS(브라우저34·4폭/200%·25장 직접 검수) | [STEP-07](../docs/reports/STEP-07.md) |
| STEP-08 | 한 종목 상세·일정·통계 수직 구현 | DONE(분리된 합성 상세); live BLOCKED | PASS(lint/typecheck/build) | PASS(전체539·접근40) | NOT_RUN(G0·실DB 차단) | PASS(브라우저48·상세390/1440·JS off·17장 직접 검수) | [STEP-08](../docs/reports/STEP-08.md) |
| STEP-09 | 관심 저장·개인 준비 계획 | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-10 | ICS·JSON 내보내기 | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-11 | 홈·검색·자격증 탐색·일정 달력 | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-12 | 2~3개 비교·공유 URL | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-13 | 검증된 최대10종목 확대 | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-14 | 운영자 로그인·검토·정정 | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-15 | 가이드·신뢰 페이지·SEO | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-16 | 광고OFF 구조·분석·동의 경계 | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-17 | 예약 수집·모니터링·백업·복원 | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-18 | 통합 QA·접근성·보안·성능 | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-19 | Preview 검증·승인된 운영 공개 | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |
| STEP-20 | 승인된 광고 활성화·출시 후 검증 | TODO | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | 없음 |

## 출시 게이트
G0 BLOCKED(키 부재·승인 UNKNOWN·마지막 STEP-02 명세조회503; 인증/공식대조 NOT_RUN) / G1 NOT_RUN / G2 NOT_RUN / G3 NOT_RUN / G4 NOT_RUN / G5 NOT_RUN. 로컬 STEP-03~08 PASS가 출시 게이트 통과를 뜻하지 않는다.

## 마지막 작업
2026-10-21 STEP-08: STEP-07 실제484/브라우저34/접근22/최종검사30과106개 실행 source SHA 일치를 확인했다. 공개 repository slug 조회 계약·부분 실패를 격리한 읽기 service·일정/통계 domain 연결·native GET 선택기·SSR 상세를 분리된 합성 경로에 구현했다. root loading으로 JS off 상세가 숨겨지는 문제를 해결해 로딩을 갤러리로 이동했다. 상태 조회 실패 경고와 일부 연도 오류/빈 결과 구분을 보완했다.
전체539 PASS(기존484+신규55), Chromium48 PASS(기존34+신규14), 로컬4모드 접근40/40 PASS다. 상세390/1440·JS off·통계/일정/부가정보 오류·stale/pending/상태 오류·범위형/시각 미확인·미지원을 확인했고 새 상세17장 전부를 직접 열었다. lint/typecheck/build/client 경계 PASS다. [STEP-08](../docs/reports/STEP-08.md), [증거 인덱스](EVIDENCE_INDEX.md) 참조.
공공 API/카탈로그0회, 실제 종목·앱 DB 연결·새 slug의 실제 PostgreSQL 실행·원격 CI/배포·push/PR은 미실행이다. preview/production 설정의 로컬 서버에서 합성 상세의 실제404·합성 HTML 부재를 확인했다. 관심/계획은 진입만 제공하고 저장하지 않는다. STEP-09~20은 TODO 유지.
## 다음 작업
다음 미착수 작업 1개: **STEP-09 관심 저장·개인 준비 계획**. 해당 프롬프트·선행 STEP 근거를 확인한다. 이번에는 시작하지 않았다. live는 G0가 필요하며 source별 operation mapper·실제 종목 자료·상세 DB 연결은 STEP-02 근거가 준비될 때 보완해야 한다.
STEP-02는 여전히 미완료다. 키·공식 명세·실제 승인·쿼터가 준비되면 실호출·공식 대조를 재개해야 한다. 준비물 변화 없이 같은 차단을 반복 실행하거나 DONE으로 바꾸지 않는다. 다음 선택은 BLOCKED를 보존한 채 의존성이 충족된 미착수 STEP을 따른다.

## Git 인수인계 — 2026-10-24

사용자 지시에 따라 현재 누적 결과의 최초 main 게시와 새 컴퓨터용 [clone·Codex 프롬프트](../prompts/LOCAL_CODEX_HANDOFF.md)를 준비했다. 원격은 기존 refs 없는 빈 저장소였으며 source119 SHA가 STEP-08 실행 근거와 일치함을 확인했다. 이번에는 STEP-09 구현을 시작하거나 기존 단위/브라우저/DB 검증을 재실행하지 않았다. 실제 게시·clone 확인 결과는 후속 인수인계 보고서와 Git refs를 따른다.

## 기록 규칙
상태 열은 실제 선행조건/수용기준으로 업데이트한다. 개별 검증은 PASS/FAIL/NOT_RUN/N_A(사유필수).
기능이 없는데 N_A로 지우지 않는다. DOT/파일/체크박스만으로 외부승인을 만들지 않는다.
