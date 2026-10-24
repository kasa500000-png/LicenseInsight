# 전체 Markdown 파일 목록

총 65개 Markdown. 모두 UTF-8. 코드·로그·이미지는 구현 단계에서 생성한다.

|파일|역할|
|---|---|
|[AGENTS.md](AGENTS.md)|Qualification Insight — repository working rules|
|[CHANGELOG.md](CHANGELOG.md)|변경 이력|
|[CHECKSUMS.md](CHECKSUMS.md)|Markdown 파일 SHA-256 검증값|
|[FILE_INDEX.md](FILE_INDEX.md)|전체 파일 목록|
|[PACKAGE_VALIDATION.md](PACKAGE_VALIDATION.md)|패키지 파일/링크/프롬프트 검증 결과|
|[README.md](README.md)|자격인사이트 · GPT & Codex 전체 구현 패키지 v2|
|[START_HERE.md](START_HERE.md)|여기서 시작하세요|
|[docs/ACCEPTANCE_MATRIX.md](docs/ACCEPTANCE_MATRIX.md)|요구사항 ↔ STEP ↔ 테스트 추적표|
|[docs/ADS_ANALYTICS.md](docs/ADS_ANALYTICS.md)|광고·분석 설계와 활성화 게이트|
|[docs/API_VALIDATION.md](docs/API_VALIDATION.md)|공공 API 실호출 검증 플레이북|
|[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)|기술 아키텍처와 구현 경계|
|[docs/CONTENT_SEO.md](docs/CONTENT_SEO.md)|콘텐츠·검색 구현 지침|
|[docs/DATABASE.md](docs/DATABASE.md)|데이터베이스 상세 설계|
|[docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md)|데이터 계약·수집 설계 v2.0|
|[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)|디자인 시스템 v1 — 구현 기준안|
|[docs/DOMAIN_RULES.md](docs/DOMAIN_RULES.md)|날짜·통계·계획 계산 규칙|
|[docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md)|환경·계정 준비 가이드|
|[docs/INTERNAL_API_SPEC.md](docs/INTERNAL_API_SPEC.md)|내부 애플리케이션 API / Repository 계약|
|[docs/LOCAL_STORAGE_AND_EXPORTS.md](docs/LOCAL_STORAGE_AND_EXPORTS.md)|브라우저 저장·계획 내보내기 계약|
|[docs/OPERATIONS.md](docs/OPERATIONS.md)|운영·예약 수집·비용·복구|
|[docs/PRD.md](docs/PRD.md)|자격인사이트 — PRD v2.0|
|[docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md)|출시 QA 체크리스트|
|[docs/RELEASE_GATES.md](docs/RELEASE_GATES.md)|출시·활성화 게이트|
|[docs/RISKS_AND_SCOPE.md](docs/RISKS_AND_SCOPE.md)|위험·의사결정·범위 관리|
|[docs/ROADMAP.md](docs/ROADMAP.md)|20단계 구현 로드맵 v2|
|[docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md)|보안·개인정보·권한 검토|
|[docs/SERVICE_PLAN.md](docs/SERVICE_PLAN.md)|자격인사이트 — 서비스 기획서|
|[docs/SOURCES.md](docs/SOURCES.md)|공식 출처와 확인 범위|
|[docs/TEST_STRATEGY.md](docs/TEST_STRATEGY.md)|테스트 전략과 증거 수준|
|[docs/UX_SCREEN_SPEC.md](docs/UX_SCREEN_SPEC.md)|전체 화면 명세|
|[prompts/ALL_STEP_PROMPTS.md](prompts/ALL_STEP_PROMPTS.md)|20단계 전체 프롬프트 합본|
|[prompts/FINAL_AUDIT_PROMPT.md](prompts/FINAL_AUDIT_PROMPT.md)|출시 전 독립 감사 프롬프트|
|[prompts/GPT_REVIEW_PROMPT.md](prompts/GPT_REVIEW_PROMPT.md)|GPT 기획·결과 검토 프롬프트|
|[prompts/MASTER_PROMPT.md](prompts/MASTER_PROMPT.md)|전체 마스터 프롬프트|
|[prompts/REPAIR_PROMPT.md](prompts/REPAIR_PROMPT.md)|오류 수정·회귀 검증 프롬프트|
|[prompts/RESUME_PROMPT.md](prompts/RESUME_PROMPT.md)|중단 후 이어하기 프롬프트|
|[prompts/STEP_INDEX.md](prompts/STEP_INDEX.md)|STEP별 프롬프트 목차|
|[prompts/steps/STEP-01_PROJECT_AUDIT.md](prompts/steps/STEP-01_PROJECT_AUDIT.md)|STEP-01 · 프로젝트 점검·범위·환경 확정|
|[prompts/steps/STEP-02_API_PROOF.md](prompts/steps/STEP-02_API_PROOF.md)|STEP-02 · API 승인·3종목 데이터 가능성 검증|
|[prompts/steps/STEP-03_FOUNDATION.md](prompts/steps/STEP-03_FOUNDATION.md)|STEP-03 · Next.js·TypeScript·테스트 기반|
|[prompts/steps/STEP-04_DATABASE_RLS.md](prompts/steps/STEP-04_DATABASE_RLS.md)|STEP-04 · DB 스키마·RLS·마이그레이션|
|[prompts/steps/STEP-05_INGESTION.md](prompts/steps/STEP-05_INGESTION.md)|STEP-05 · 수집 어댑터·정규화·안전한 게시|
|[prompts/steps/STEP-06_DOMAIN_LOGIC.md](prompts/steps/STEP-06_DOMAIN_LOGIC.md)|STEP-06 · 날짜·통계·준비 계획 계산 엔진|
|[prompts/steps/STEP-07_DESIGN_SYSTEM.md](prompts/steps/STEP-07_DESIGN_SYSTEM.md)|STEP-07 · 디자인 시스템·공통 UI·모바일 셸|
|[prompts/steps/STEP-08_QUALIFICATION_DETAIL.md](prompts/steps/STEP-08_QUALIFICATION_DETAIL.md)|STEP-08 · 한 종목 상세·일정·통계 수직 구현|
|[prompts/steps/STEP-09_PERSONAL_PLAN.md](prompts/steps/STEP-09_PERSONAL_PLAN.md)|STEP-09 · 관심 저장·개인 준비 계획|
|[prompts/steps/STEP-10_EXPORTS.md](prompts/steps/STEP-10_EXPORTS.md)|STEP-10 · ICS·JSON 내보내기|
|[prompts/steps/STEP-11_DISCOVERY_CALENDAR.md](prompts/steps/STEP-11_DISCOVERY_CALENDAR.md)|STEP-11 · 홈·검색·자격증 탐색·일정 달력|
|[prompts/steps/STEP-12_COMPARE.md](prompts/steps/STEP-12_COMPARE.md)|STEP-12 · 2~3개 비교·공유 URL|
|[prompts/steps/STEP-13_DATA_EXPANSION.md](prompts/steps/STEP-13_DATA_EXPANSION.md)|STEP-13 · 검증된 최대10종목 확대|
|[prompts/steps/STEP-14_ADMIN_REVIEW.md](prompts/steps/STEP-14_ADMIN_REVIEW.md)|STEP-14 · 운영자 로그인·검토·정정|
|[prompts/steps/STEP-15_CONTENT_SEO_TRUST.md](prompts/steps/STEP-15_CONTENT_SEO_TRUST.md)|STEP-15 · 가이드·신뢰 페이지·SEO|
|[prompts/steps/STEP-16_ADS_ANALYTICS_OFF.md](prompts/steps/STEP-16_ADS_ANALYTICS_OFF.md)|STEP-16 · 광고OFF 구조·분석·동의 경계|
|[prompts/steps/STEP-17_OPERATIONS.md](prompts/steps/STEP-17_OPERATIONS.md)|STEP-17 · 예약 수집·모니터링·백업·복원|
|[prompts/steps/STEP-18_FINAL_QA.md](prompts/steps/STEP-18_FINAL_QA.md)|STEP-18 · 통합 QA·접근성·보안·성능|
|[prompts/steps/STEP-19_DEPLOYMENT.md](prompts/steps/STEP-19_DEPLOYMENT.md)|STEP-19 · Preview 검증·승인된 운영 공개|
|[prompts/steps/STEP-20_MONETIZATION.md](prompts/steps/STEP-20_MONETIZATION.md)|STEP-20 · 승인된 광고 활성화·출시 후 검증|
|[state/APPROVALS.md](state/APPROVALS.md)|외부 작업 승인 기록|
|[state/BLOCKERS.md](state/BLOCKERS.md)|차단 사항|
|[state/DECISIONS.md](state/DECISIONS.md)|결정 기록|
|[state/EVIDENCE_INDEX.md](state/EVIDENCE_INDEX.md)|구현 증거 인덱스|
|[state/PROJECT_STATUS.md](state/PROJECT_STATUS.md)|프로젝트 상태|
|[templates/API_VALIDATION_REPORT.md](templates/API_VALIDATION_REPORT.md)|API 실호출 검증 보고서|
|[templates/RELEASE_REPORT.md](templates/RELEASE_REPORT.md)|공개/광고 릴리스 보고서|
|[templates/STEP_REPORT.md](templates/STEP_REPORT.md)|STEP-NN — 실제 작업 보고서|
