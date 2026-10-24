# 여기서 시작하세요

버전: 2.0 · 작성일: 2026-10-20 (Asia/Seoul)
이 ZIP은 **개발 지시용 Markdown 패키지**다. 실행 가능한 앱 소스나 API 키는 들어 있지 않다.

## 1. 준비
ZIP을 새 `qualification-insight` 작업 폴더에 풀고 그 폴더를 Codex에서 연다.
압축 안 최상위 폴더 안의 AGENTS.md가 실제 프로젝트 루트에 오도록 한다.
기존 저장소에 넣는 경우 기존 AGENTS.md/README.md/docs를 덮어쓰지 말고 diff 후 병합한다.
기존 로컬 변경이 있으면 Codex가 먼저 목록을 보고 보존하도록 한다.
PowerShell과 macOS 모두 파일 탐색기로 압축을 풀 수 있다. 특정 사용자 경로를 전제하지 않는다.

## 2. 처음 전달할 한 문장
```text
START_HERE.md를 읽고 prompts/MASTER_PROMPT.md를 이번 작업의 지침으로 실행해줘.
MODE=GUIDED로 STEP-01부터 시작하고, 완료 증거와 다음 단계만 보고해줘.
```
`GUIDED`: 이번 지정 STEP 하나를 완료하고 결과 확인 후 다음으로 진행.
`AUTO_SAFE`: 현재 세션에서 안전하고 선행 조건이 충족된 STEP을 순차 진행.
두 모드 모두 외부 승인·유료 구매·운영 변경 경계를 넘지 않는다.

## 3. 이후 작업
각 단계의 전체 프롬프트는 prompts/steps/ 아래에 있다.
STEP_INDEX.md에서 필요한 파일을 열어 `Codex에 전달할 전체 프롬프트`를 복사한다.
모든 프롬프트를 한 번에 보고 싶을 때는 prompts/ALL_STEP_PROMPTS.md를 사용한다.
이 합본을 매 세션 통째로 읽힐 필요는 없다.

```text
prompts/STEP_INDEX.md에서 STEP-02 파일을 찾아 해당 프롬프트대로 진행해줘.
이전 단계의 실제 결과를 확인하고, API 키가 없으면 실호출 부분만 BLOCKED로 남겨줘.
```

## 4. GPT와 역할 분담
Codex 단계 결과와 실제 스크린샷/테스트 결과를 GPT에 전달한다.
GPT에는 prompts/GPT_REVIEW_PROMPT.md를 사용한다. GPT는 로그 없는 성공을 추정하지 않는다.
수정이 필요하면 그 결과를 Codex에 전달하고 동일 STEP을 보완한다.
UI 변경은 실화면을 확인한다. 코드만 보고 디자인 검수가 끝났다고 하지 않는다.

## 5. 준비물이 아직 없을 때
공공데이터 API 키: 계약 검토·synthetic fixture·순수 함수·UI 개발을 먼저 할 수 있다.
Supabase 프로젝트: 스키마·로컬 테스트 준비는 가능하지만 원격 연결 완료는 아니다.
광고 계정: 광고 OFF로 출시 가능. 심사 승인과 실제 게시자 ID 확보 전 광고 활성화는 차단한다.
연락처/도메인/상업 호스팅: 출시 전 실제 값을 확정한다. 임의 이메일·도메인을 공개하지 않는다.
누락 내용을 state/BLOCKERS.md에 모으고 같은 질문을 반복하지 않는다.

## 6. 진행 기록
- state/PROJECT_STATUS.md: 20단계 상태와 출시 게이트. 초기값은 모두 TODO.
- state/APPROVALS.md: 실제 외부 작업 승인. 초기값은 모두 미승인.
- docs/reports/STEP-NN.md: 구현 때 작성할 증거 보고서. 아직 없음.
- state/EVIDENCE_INDEX.md: 코드·테스트·화면·실데이터 근거 위치.

## 7. 파일 우선순위
기존 승인된 제품 방향은 유지하며, v2에서 단계 번호와 구현 세부를 정리했다.
제품 요구는 docs/PRD.md, 데이터 규칙은 docs/DATA_CONTRACT.md 및 DOMAIN_RULES.md,
구현 순서는 docs/ROADMAP.md를 기준으로 한다. 충돌은 state/DECISIONS.md에 기록한다.
사용자 명시 지시도 도구/시스템의 안전·권한 제약을 넘을 수 없다.

## 8. 실데이터 공개와 광고
코드를 완성해도 API 범위 검증(G0)과 출시 게이트가 남을 수 있다.
STEP-19는 먼저 preview/운영 준비를 검증하고 승인된 대상에만 공개한다.
STEP-20에서 승인·정책 조건이 충족되어야 실광고를 활성화한다.
STEP-20의 30일/90일 평가는 미래 시점의 실행 체크리스트이지 현재 자동 예약이 아니다.
