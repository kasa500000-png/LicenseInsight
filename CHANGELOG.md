# 변경 이력

## v2.0 — 2026-10-20
기존 기획서/PRD/데이터계약/QA를 계승한 전체 구현용 Markdown 패키지.
- 전체 마스터 프롬프트,20단계 개별 프롬프트와 합본,이어하기/오류수정/GPT검토/독립감사 추가.
- 아키텍처/DB/내부API/날짜통계/저장·ICS/전체화면/디자인/광고/보안/환경/운영/테스트 상세화.
- 단계별 완료기준·실행검증·차단시대체작업·결과기록·출시게이트 연결.
- 광고OFF 구조를 STEP-16으로 당겨 공개 전에 검증. 실광고 활성화는 STEP-20 별도.
- 기존 precision의 date/datetime/range 혼합을 정밀도와기간으로 분리.
- 실제자료/fixture·기술검증/사람의대조·코드/운영공개 상태 분리.
- 모든 구현상태는 TODO/NOT_RUN,외부변경 승인은 없음으로 초기화.
- 앱 소스코드/API키/SQL실행결과/배포파일을 제공하거나 실행한 것은 아님.

## v1.0
제공된 qualification-insight-planning-v1.zip의 기획 기준선.
SERVICE_PLAN, PRD, DATA_CONTRACT, IMPLEMENTATION_PLAN, QA_CHECKLIST, SOURCES,
AGENTS, README, START_CODEX를 기반으로 범위를 계승했다.
구현 순서의 변경 대응표는 docs/ROADMAP.md 참고.
