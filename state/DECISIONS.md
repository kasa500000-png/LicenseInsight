# 결정 기록

| ID | 결정 | 이유 | 상태 |
|---|---|---|---|
| ADR-001 | 기존 국가기술자격 MVP 유지 | 범위 일관성 | 기획 기준선 |
| ADR-002 | GPT 기획검토 + Codex 단계별 구현 | 비전문 개발자의 검수 흐름 | 기획 기준선 |
| ADR-003 | 서비스 내부 LLM 호출 없음 | 비용·오류·복잡성 절감 | 기획 기준선 |
| ADR-004 | 광고OFF 구조 STEP-16, QA18, 공개19, 광고20 | 공개 전 안전한 구조 검증 | v2 제안 |
| ADR-005 | temporal_precision과 extent 분리 | 기간/시각 혼동 방지 | v2 구현 명확화 |
| ADR-006 | 내부 staging + 공개 projection | 원문/검토/공개 경계 | v2 설계 제안 |

도메인·코드·플랜·패키지 버전·실제 프로젝트는 미확정.
새 결정은 문제/대안/선택/근거/영향/사용자 승인 필요 여부/관련 STEP을 남긴다.

## M0 / TASK-001 — 2026-10-20 결정

| ID | 문제·대안 | 선택·근거 | 영향·승인 경계 |
|---|---|---|---|
| ADR-007 | 기존 저장소 재사용 또는 초기화 | 실제 `kasa500000-png/LicenseInsight` clone 및 ls-remote로 커밋·파일 없음 확인. 첨부 65개 파일을 덮어쓰기 없이 도입 | 로컬 `audit/m0-task-001`, 초기 커밋 없음. push/PR 승인으로 해석하지 않음 |
| ADR-008 | IMPLEMENTATION_PLAN 부재·v1 번호 혼용 | ROADMAP의 TASK-001→STEP-01 적용. `docs/IMPLEMENTATION_PLAN.md`는 새 호환 진입점임을 표시 | 제품·로드맵 원본 유지. M0/STEP-01과 다음 검증 준비만 수행 |
| ADR-009 | 명세·승인·실호출 혼동 위험 | 패키지 명세 inherited_unverified, 이번 DS-01~03 HTTP503 재확인 차단, 계정 승인 UNKNOWN, 키 absent, 인증 호출 NOT_RUN | 코드·등급·일정·통계 추정 금지, null 유지. G0 BLOCKED |
| ADR-010 | 키 없는 상태에서 사이트 전체 구현으로 확장할지 | 문서·설정 예시·3종목 대장·테스트 입력/기대값까지만 준비 | 앱·파서·DB·배포 후속 STEP. 준비 테스트를 실행 결과로 표시하지 않음 |
| ADR-011 | 설치된 Node/패키지 관리자를 즉시 고정할지 | Node 24.19.0, npm 11.9.0, pnpm 11.25.0 실제 버전만 기록. STEP-03에서 공식 지원·호환·라이선스 확인 후 하나 선택·lockfile 고정 | 이번 설치·package.json 생성 없음. 설치됨과 앱 호환은 별개 |
| ADR-012 | 상태 변경으로 원본 해시가 달라짐 | CHECKSUMS/PACKAGE_VALIDATION 원본 기준선 보존. 현재 검증은 M0 증거에 기록 | README와 state 5개 변경을 허용목록으로 검증. 다른 원본 byte 유지 |

외부 작업 승인은 [APPROVALS](APPROVALS.md)를 따른다. 이번 결정은 실제 외부 변경 승인을 새로 만들지 않는다.

## STEP-02 — 2026-10-20 결정

| ID | 문제·선택 | 근거·영향 |
|---|---|---|
| ADR-013 | 다음 미완료 STEP-02 하나만 수행. 필수 실데이터 검증은 BLOCKED, 독립 계약·합성 테스트는 별도 PASS | STEP_INDEX/STEP-01 실제 증거 확인. STEP-03 scaffold·운영 수집·DB·UI로 범위 확대하지 않음 |
| ADR-014 | Python 표준 라이브러리의 오프라인 probe lab 사용 | 기존 Python3.12 사용, 새 의존성 설치 없음. 공식 호스트·미확인 계약을 거부하고 `.invalid` 합성 요청만 메모리 조합. 네트워크 전송 기능 없음. 운영 기술 스택 선택 아님 |
| ADR-015 | source별 confirmed와 inherited_unverified 분리 | 이번 DS-01~05 공개 문서 GET 각1회 모두503. 실제 operation·필드·승인·쿼터 미확인. 합성 오류 코드·wrapper를 공식 계약으로 승격하지 않음 |
| ADR-016 | 실제 source의 중복 키·날짜 정정·게시 보존은 미검증 유지 | 합성 테스트는 동일 전체 레코드 중복과 불완전 페이지 자료 미반환만 확인. 실제 stable source ID·DB last-good·운영 fixture 차단을 구현했다고 표시하지 않음 |
| ADR-017 | 자체 실화면 NOT_RUN 사유 기록 | 이번 단계는 API proof·CLI·계약, 앱/route/UI 없음. CLI 결과·HTTP 요청·문서 화면을 서비스 실화면 검증으로 대신하지 않음 |

## STEP-03 — 2026-10-20 결정

| ID | 결정 | 근거·영향 |
|---|---|---|
| ADR-018 | BLOCKED STEP-02를 보존하고 다음 실행 가능 미착수 STEP-03 하나 선택 | ROADMAP은 STEP-01+STEP-02 계약 검토를 선행 조건으로 정의하며 실호출은 별도다. 같은 차단의 반복 대신 의존성에 따라 진행. 실제 데이터는 계속 미검증 |
| ADR-019 | Node24/pnpm11 exact 기반 및 지원 peer 범위의 패키지 고정 | 공식 문서·registry 조사로 TS6·ESLint10 조합 선택. TS7/parser 범위·지원 종료 ESLint9 제외. 의존성 보고서와 lockfile에 실제 값 기록 |
| ADR-020 | API/DB 키 없이 실행되는 live 빈 상태, 전역 env는 fail-closed | 실제 source 연결은 후속 STEP. production fixture·필수 설정 누락·잘못된 URL·public secret·광고/분석 활성화 거부. noindex 유지 |
| ADR-021 | test 전용 오류 route는 Proxy와 페이지 두 곳에서 APP_ENV 검사 | streaming notFound가200을 시작하는 것을 실검사에서 발견. 응답 시작 전404와 force-dynamic으로 환경별 노출 방지. production/live 로컬 실행으로404 검증 |
| ADR-022 | CI는 secret 없는 파일 초안만 작성 | 원격 워크플로·Git push/PR·배포 승인으로 확대하지 않음. 실제 remote CI는 NOT_RUN |
| ADR-023 | Next.js가 AGENTS에 추가한 번들 문서 안내는 출처 확인 후 보존 | 최초 해시 검사가 예상 밖 변경을 검출. 설치된 generate-agent-files.js의 template와 정확히 일치하고 기존 규칙 byte 보존을 확인. feedback 기능·원격 전송은 활성화하지 않음 |
