# 테스트 전략과 증거 수준

## 증거 수준
D0 문서/명세 검토, D1 synthetic 단위, D2 기록 응답/DB 통합,
D3 브라우저 실화면/E2E, D4 live API/공식 원문 대조, D5 승인된 운영 smoke.
높은 숫자가 다른 검증을 자동 대체하지 않는다. 기능별 필요한 조합을 기록한다.
실제 실행하지 않은 검증은 NOT_RUN. fixture 통과는 live 가능성 증거가 아니다.

## 스크립트 계약
STEP-03에서 package.json에 실제 실행 가능한 lint,typecheck,test,test:unit,test:integration,
test:e2e,build를 선택·정의한다. 이름은 기존 규약에 맞춰 조정 가능.
없는 script를 성공했다고 쓰지 않는다. 설치/네트워크/브라우저 차단을 분리한다.
필요한 명령과 exit code·중요 결과·환경을 보고서에 남긴다.

## 단위
날짜 LocalDate/Asia-Seoul 경계, 검증된 시각과 range, stale 상태,
통계47%/분모0/null/중복/부분연도/공식연간총계 분리/percentage-point,
계획660분·제외일·경계·잔여분·동일입력 동일출력,
검색 정규화/공식코드 문자열·comparison URL 정규화·safe link.

## 통합
XML/JSON 단건/다건/오류/size/doctype, pagination 중간 실패, scope 중복 lease,
staging→검증→review→publication transaction, pending override 만료,
DB empty install/migration replay, unique(null 포함)/check constraints,
RLS anon/authenticated/admin/service와 view/function 권한,
로그 secret redaction·API key encoding·429 retry budget·cache invalidation.

## E2E 주요 시나리오
| ID | 경로 | 핵심 검증 |
|---|---|---|
| E2E-01 | 홈→검색→상세 | 공식 이름/다음 일정/출처 |
| E2E-02 | 상세→관심→새로고침 | 해당 브라우저 저장 유지 |
| E2E-03 | 상세→계획→저장→체크 | 총시간 보존·목표일·상태 유지 |
| E2E-04 | 계획→ICS/JSON | 다운로드 바이트/파서/개인정보 미전송 |
| E2E-05 | 탐색→3개 비교→공유 | 같은 연도·표본/결측·URL |
| E2E-06 | 달력→월/필터→상세 | 기간·월말·현재한국일 |
| E2E-07 | stale/empty/error | 가상 대체 없음·정상기능 유지 |
| E2E-08 | 익명/일반 인증→admin | 접근·쓰기 거부 |
| E2E-09 | 관리자 검토→승인→충돌 | audit·expectedRevision |
| E2E-10 | preview/테스트/개인계획 | 실광고 request 0 |
| E2E-11 | JS 비활성 HTML 조회 | 종목 핵심정보·출처 |
| E2E-12 | 저장 거부/손상/탭충돌 | 페이지 유지·데이터 손실 방지 |

브라우저 테스트는 자체 앱만 대상으로 한다. 실제 광고 클릭/원서접수/외부 로그인 자동완료를 하지 않는다.
ICS 실제 캘린더 가져오기는 별도 수동/도구 검증이며 E2E 다운로드만으로 대체하지 않는다.

## UI·접근성
360/390/768/1440, 200% zoom, keyboard only, visible focus, label/aria/error,
차트 table fallback, long Korean name, large counts, loading/empty/error/stale,
모바일 하단 safe-area·dialog·scroll containment·광고 차단.
자동 접근성 scan 통과와 사용자 실화면 검수는 별도로 기록한다.

## 성능
내부 목표 LCP≤2.5s, INP≤200ms, CLS≤0.1 [S15]. 실측 결과는 아직 없다.
production build의 상세/일정/계획에서 동일 조건으로 반복 측정하고 네트워크/기기 조건을 기록한다.
실험실 Lighthouse 점수로 현장 INP가 충족되었다고 단정하지 않는다.
광고 OFF와 승인 후 ON 상태를 구분한다. synthetic 광고 placeholder 성능은 real ad 측정이 아니다.

## 오류 우선순위
P0: 정보 오류로 일정 오인, 비밀 노출, 무단 관리자 쓰기, 데이터 삭제, fixture 운영 노출, 실광고 자동 클릭.
P1: 핵심여정 실패, 모바일 조작불가, 중요한 접근성/성능 저하.
P2: 비핵심 polish, P1/P2 확장 기능.
출시 기준은 P0/P1 미해결0, 핵심 PRD 테스트 통과, 미실행 live/운영 검증의 명확한 처리.
범위가 제한된 종목은 정직하게 제외/부분지원하고 별도 결정기록을 남긴다.

## 결과 보존
reports에는 성공/실패/미실행 수와 실제 command/commit을 남긴다.
큰 영상/스크린샷은 비밀 제거 후 팀이 승인한 저장 위치에 두고 경로만 기록할 수 있다.
테스트 기대값을 현재 버그에 맞춰 바꾸거나 테스트를 삭제해 통과시키지 않는다.
