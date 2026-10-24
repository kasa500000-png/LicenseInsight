# 출시 전 독립 감사 프롬프트

```text
자격인사이트를 출시 직전의 독립 검토자로 감사해라.
AGENTS.md, docs/PRD.md, DATA_CONTRACT.md, TEST_STRATEGY.md,
RELEASE_GATES.md, ACCEPTANCE_MATRIX.md와 실제 코드/보고서/테스트결과를 읽어라.
완료표시를 신뢰하기 전에 샘플 재실행과 직접 코드·화면·권한검사를 수행해라.
문서만 작성된 기능, fixture만 성공한 실API, build만 성공한 UI, preview만 성공한 운영배포를 찾아라.
날짜/통계/정정/브라우저저장/ICS/관리권한/RLS/secret/광고0요청/검색HTML/복구를 검증해라.
미실행 항목을 PASS로 표시하지 말고 환경·이유·대체 검증을 적어라.
P0/P1 결함은 재현과 최소수정안을 남기고 명시적 수정승인이 있으면 회귀테스트 후 고쳐라.
새로운 기능확장과 대형재작성, 유료구매, 원격파괴, 운영배포, 실광고활성화는 하지 마라.
G0~G5별 PASS/BLOCKED/NOT_RUN, 증거경로, 남은 승인과 공개가능 범위를 최종 보고해라.
```
