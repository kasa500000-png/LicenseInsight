# 공공 API 실호출 검증 플레이북

## 범위와 현재 상태
공개 카탈로그와 HTML 명세만 확인했다. 실제 계정 승인·API 키·응답은 아직 검증하지 않았다.
이 문서는 STEP-02에서 실행하고, STEP-05/13에서 자료 범위를 확장한다.
인증키가 없을 때 SAMPLE을 REAL로 표시하지 않는다.

## 소스
| ID | 공공데이터 식별번호 | 목적 | 필수 여부 |
|---|---|---|---|
| DS-01 | 15003024 | 종목 목록·공식 코드·등급·분야 | 필수 |
| DS-02 | 15074408 | 접수·시험·발표 일정 | 필수 |
| DS-03 | 15089380 | 회차·단계별 응시·합격 통계 | 제공 범위 검증 필수 |
| DS-04 | 15003003 | 종목별 시험정보 | 공개 설명 범위 검증 |
| DS-05 | 15003029 | 보조 시험정보·수수료 | optional; 정확한 operation 확인 |
공식 주소와 확인 범위는 SOURCES.md [S01~S05].

## 검증 절차
1. 도구와 계정 범위를 확인한다. 대시보드에 로그인할 수 있다고 키 사용/원격 변경까지 승인된 것은 아니다.
2. API별 승인 상태·operation·요청 키·응답 키·format·quota 단위와 reset 주기를 표로 기록한다.
3. DS-01에서 전기기사·전기산업기사·전기기능사의 실제 코드와 등급을 찾는다.
4. DS-02로 현재 한국 연도와 차년도, 해당 종목을 조회한다. 실제 현재 연도는 실행 시 계산한다.
5. DS-03으로 등급·연도 범위를 조회하고 종목명을 검증된 crosswalk로 연결한다.
6. 최근 최대 5개 완료연도의 존재를 확인한다. 없으면 실제 범위와 누락 이유만 기록한다.
7. 일정/통계 일부를 공식 원문과 대조하고 fetched/validated/reviewed 시각을 구분한다.
8. key·Authorization·민감 URL이 제거된 응답만 tests/fixtures/recorded에 저장한다.

## 실호출 주의
키를 채팅·CLI 인수·스크린샷에 붙이지 않는다. 로컬 환경변수/secret manager에 직접 설정한다.
로그에는 source ID, operation 이름, 안전한 파라미터, 상태코드, 건수만 저장한다.
serviceKey와 ServiceKey 같은 대소문자·encoding을 API별 명세와 실제 응답으로 확인한다.
키 이중 URL encoding, HTTP200 내부 오류, XML 단건/다건 형식 차이를 테스트한다.
공식 HTTPS 경로를 검증하며 실패 시 HTTP로 자동 강등하지 않는다.
쿼터·개발/운영 승인 조건은 카탈로그 표시만으로 실제 계정 상태가 확인된 것으로 쓰지 않는다.

## 증거 형식
`templates/API_VALIDATION_REPORT.md`를 복사해 docs/reports/API_VALIDATION.md에 작성한다.
각 검증은 NOT_RUN/PASS/FAIL/BLOCKED/NOT_PROVIDED 상태 중 하나로 기록한다.
NOT_PROVIDED는 실제 조회/공식 근거로 제공되지 않는 범위를 확인했을 때만 쓴다.
빈 응답만 받은 경우 `EMPTY_UNCONFIRMED` 사유를 기록하고 미발표 확정과 구분한다.

## 자동 파서 필수 케이스
정상 단건/다건, 빈 목록, null item, totalCount string/int, 누락 header,
HTTP200 business error, auth error, quota error, 429, 500, timeout,
깨진 XML/JSON, HTML 에러 페이지, oversized payload, 외부 엔티티/DOCTYPE,
pagination 중간 실패, 중복 record, 날짜 변경, 불명확 종목명, 통계 수치 불일치.

## G0 판정
출시 대상 종목별 코드·일정·통계 의미와 실제 제공 범위·정확성 근거가 있어야 한다.
일부 통계가 공식적으로 제공되지 않는다면 해당 칸은 지원범위에 명시하고 제품 책임자가 제한 공개를 결정한다.
핵심 일정조차 검증되지 않은 종목을 완전 지원으로 게시하지 않는다.
개발 가능 판정과 운영 API 승인·호출량 준비 완료는 별도 항목이다.
