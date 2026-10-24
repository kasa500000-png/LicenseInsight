# M0 / TASK-001 — 공공 API 공개 카탈로그 재확인

상태: **BLOCKED(이번 공개 명세 재확인)**. 인증 API 연결·실호출: **NOT_RUN**. 실제 개발·운영 활용 승인: **UNKNOWN**.
검증일: 2026-10-20 UTC. 작업 루트: `/workspace/licenseinsight`.

## Audit

`AGENTS.md`, `DATA_CONTRACT.md`, `SOURCES.md`, `API_VALIDATION.md`를 읽었다. 실행 환경의 네트워크 정책은 HTTP unrestricted이며 기존 HTTPS 프록시·TLS 검증을 유지했다. 로그인·인증키 열람·활용 신청·원격 변경은 수행하지 않았다.

## Plan

공식 공개 카탈로그 DS-01~03을 HTTPS로 조회하고, 명세 확인·계정 승인·인증 호출을 서로 다른 상태로 기록한다. 원문을 받을 수 없다면 기존 패키지에서 계승한 내용을 새 검증 결과로 승격하지 않는다.

## Implement — 실제 읽기 결과

| 소스 | 공식 공개 주소 | 조회 UTC | 관측 결과 | 이번 명세 확인 | 계정 개발/운영 승인 | 인증 호출 |
|---|---|---|---|---|---|---|
| DS-01 | https://www.data.go.kr/data/15003024/openapi.do | 01:33:42 | HTTP 503 | BLOCKED | UNKNOWN / UNKNOWN | NOT_RUN |
| DS-02 | https://www.data.go.kr/data/15074408/openapi.do | 01:33:42 | HTTP 503 | BLOCKED | UNKNOWN / UNKNOWN | NOT_RUN |
| DS-03 | https://www.data.go.kr/data/15089380/openapi.do | 01:33:42 | HTTP 503 | BLOCKED | UNKNOWN / UNKNOWN | NOT_RUN |

Python `urllib`로 3개 공개 페이지를 각 1회 요청했다. 이후 DS-02 공개 페이지에만 `curl` 진단 1회를 실행했으며 동일하게 HTTP 503이었다. 진단 응답은 `server: envoy`, `content-type: text/plain`, 본문은 `upstream connect error or disconnect/reset before headers. reset reason: connection timeout`이었다. 원천 사이트 장애와 중간 네트워크 연결 문제 중 어느 쪽인지 확정할 수 없다. HTTP로 강등하지 않았고, DS-02 추가 진단 1회 후 반복 재시도하지 않았다.

공식 HTML 명세 본문을 받지 못했으므로 **공식 명세 원문의 SHA256은 없음(null)**이다. 실패 진단 본문만 로컬 [catalog-503.txt](evidence/catalog-503.txt)에 보존했으며, SHA256은 [기계 판독 근거](evidence/api-catalog.json)의 `diagnostic.body_sha256`에 기록했다. 이 파일은 명세 또는 실제 API 응답 fixture가 아니다. 원본 진단 파일은 scratch에도 남아 있으나 보고서 근거는 저장소에 보존한 동일 바이트 파일이다.

## 기존 패키지에서 계승한 미재검증 정보

아래는 `docs/DATA_CONTRACT.md`의 기재사항이며 **inherited_unverified**다. 이번 세션에서 공식 페이지로 재확인하지 못했다.

| 소스 | 기재된 연결/필드 | 이번에 남은 확인 |
|---|---|---|
| DS-01 | `qualgbcd`, `seriescd`, `seriesnm`, `jmcd`, `jmfldnm`, 분야 코드·명칭 | 실제 서비스/operation/요청·응답, 개발·운영 승인 정책, quota 단위·주기, HTTPS API 연결 |
| DS-02 | `https://apis.data.go.kr/B490007/qualExamSchd/getQualExamSchdList`; `serviceKey`, `numOfRows`, `pageNo`, `dataFormat`, `implYy`, `qualgbCd`, `jmCd` | 응답·format·quota·운영단계 심의조건, 실제 계정 승인 및 HTTPS API 연결 |
| DS-03 | 요청 `serviceKey`, `grdCd`, `baseYY`, `pageNo`, `numOfRows`; 응답 `examPassCnt`, `examTypCcd`, `grdNm`, `implSeq`, `implYy`, `jmFldNm`, `passRate`, `recptNoCnt` | 실제 서비스/operation/format, 등급 교차표, 운영단계 심의조건·quota·제공 범위·HTTPS API 연결 |

무료 안내나 심의승인 정책 설명은 실제 계정의 승인·키 활성화·잔여 쿼터 증거가 아니다. DS-01 `seriescd`와 DS-03 `grdCd`의 동일성을 가정하지 않는다. DS-03 `recptNoCnt`의 응시자수 의미도 실제 응답·공식 자료와 대조해야 한다.

## Validate

- 공개 HTTPS 읽기 시도 3회와 DS-02 진단 1회의 실패를 기록했다. API endpoint에 대한 인증 호출은 **0회**다.
- 인증키, Authorization 헤더, 키가 포함된 URL을 요청·출력·저장하지 않았다.
- 전기기사·전기산업기사·전기기능사의 공식 코드, 일정, 통계는 **모두 NOT_RUN**이다. 종목코드는 `null`이며 샘플·기억으로 채우지 않았다.
- 공식 명세 접근 성공, 개발/운영 승인 확인, 실제 HTTPS API 연결 성공, 페이지네이션·오류·통계 대조 테스트를 완료했다고 판정하지 않는다.

## Report — 다음 검증

STEP-02에서 공개 명세가 접근 가능해지면 operation·요청/응답·HTTPS 경로·format·쿼터 단위와 주기·개발/운영 승인 정책을 재확인한다. 별도로 각 API의 실제 활용 승인 상태를 확인하고 서버 환경에 인증키 존재가 확인된 뒤 제한된 인증 호출을 수행한다. 코드 3종목 검증, 2026/2027 일정, 2021~2025 완료연도 통계는 실제 응답과 공식 원문으로 대조한다. 2026 통계는 진행 중 자료로 구분한다. 실행 시 한국 현재 연도를 다시 계산해야 한다. 빈 응답만으로 미발표·미제공·완전성을 확정하지 않는다.

근거: [api-catalog.json](evidence/api-catalog.json). 이 보고서는 M0 준비 범위이며 STEP-02 또는 G0 완료 근거가 아니다.
