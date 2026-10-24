# 자격인사이트

새 컴퓨터에서 시작하려면 [Clone·설정·Codex 이어하기 프롬프트](prompts/LOCAL_CODEX_HANDOFF.md)를 따른다. 인수 기준 다음 작업은 STEP-09다.

공공데이터 기반 국가자격 정보·비교·준비 계획 웹사이트. 웹·로컬 DB·오프라인 수집/게시·순수 계산·공통 UI와 STEP-08의 분리된 합성 상세를 검증했다. 제품 홈은 검증된 데이터가 없을 때의 화면을 제공하며 DB에 아직 연결하지 않았다. 실제 API·Supabase 원격 연결·전체 기능·배포는 미완료다. STEP-02와 G0는 BLOCKED다.

## 로컬 실행

Node 24.19.0과 pnpm 11.25.0을 사용한다. 최초 설정 시 `.env.example`을 무시되는 `.env.local`로 복사한다. 기존 파일이 있으면 보존한다. 예시에는 키가 없고 로컬 live 모드에서도 데이터를 지어내지 않는다.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`http://127.0.0.1:3000`에서 확인한다. 환경변수는 Next.js 서버가 읽으며 비밀키를 `NEXT_PUBLIC_` 변수로 설정하지 않는다. 광고·분석은 OFF다.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:client-boundary
pnpm test:e2e
```

격리 DB 검증은 Docker 로컬 Unix socket과 Python 3.11 이상에서 `pnpm test:db`로 실행한다. 실제 Node PostgreSQL 수집·게시·읽기 통합은 `pnpm test:ingestion-db`로 실행한다.
새 임시 PostgreSQL 컨테이너 안의 두 DB만 사용하며 기존 DB·원격 DB를 변경하지 않는다.
상세 경계와 재현 절차는 [DB 안내](supabase/README.md), 실제 결과는 [STEP-04](docs/reports/STEP-04.md)에 있다.
수집 모듈·차단 조건은 [수집 안내](src/server/ingestion/README.md), 최신 결과는 [STEP-05](docs/reports/STEP-05.md)를 따른다.

날짜·통계·계획 함수는 [계산 엔진 안내](src/domain/README.md), 실제 468개 테스트·5개 실행 시간대·14개 브라우저 검사 결과는 [STEP-06](docs/reports/STEP-06.md)에 있다. `node scripts/check-domain-timezones.mjs`로 시간대별 고정 oracle을 확인한다. 계산 결과의 합성 화면은 E2E 메모리에서만 실행하며 제품 route로 제공하지 않는다. 저장·계획 UI는 후속 단계다.

공통 UI 사용 계약은 [UI 안내](src/components/ui/README.md), 당시 484개 테스트·34개 브라우저 검사·22개 로컬 접근 검사 결과는 [STEP-07](docs/reports/STEP-07.md)에 있다. `/ui-gallery`는 APP_ENV=local/test에서만 열리고 preview/production은 404다. 일정·비교·내 준비는 준비 중 셸이며 실제 기능은 후속 단계다.

상세 흐름은 [STEP-08](docs/reports/STEP-08.md), 계약은 [상세 안내](src/features/qualification-detail/README.md)를 따른다. `/detail-demo/synthetic-electrical`은 local/test 전용이며 실제 종목·일정·통계가 아닌 합성 자료임을 표시한다. 전체539 테스트·브라우저48·로컬4모드 접근40 및 상세390/1440·JS off 검증을 통과했다. 실제 종목 공개 route·DB 연결은 미완료이며 관심·계획 버튼은 진입만 제공한다. 다음 미착수는 STEP-09다.

브라우저 테스트에는 Chromium이 필요하다. `pnpm exec playwright install chromium`으로 로컬에 설치하거나, 시스템 Chromium을 쓸 때는 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`에 실행 경로를 지정한다. E2E는 3103 포트의 로컬 서버를 직접 시작·종료한다. CI 초안은 secret 없이 같은 검사를 실행하도록 작성했으며 원격 실행은 아직 하지 않았다.

`APP_ENV`·`DATA_MODE`는 필수다. production fixture, 잘못된 공개 URL, 필수 설정 누락, 광고/분석 활성화는 거부한다. preview fixture는 보호 선언과 별도의 실제 배포 접근 보호 검증이 필요하다. 현재 모든 화면은 noindex다. 자세한 실행 근거·제한은 [STEP-03 보고서](docs/reports/STEP-03.md)를 참조한다.

아래는 첨부 v2 문서 패키지의 안내다. 실제 진행 상태는 state/PROJECT_STATUS.md와 STEP별 보고서를 따른다.

## 가장 먼저 볼 파일
|목적|파일|
|---|---|
|사용법·첫 실행|[START_HERE](START_HERE.md)|
|전체 개발 지휘|[MASTER_PROMPT](prompts/MASTER_PROMPT.md)|
|단계 선택|[STEP_INDEX](prompts/STEP_INDEX.md)|
|20단계 복사용 합본|[ALL_STEP_PROMPTS](prompts/ALL_STEP_PROMPTS.md)|
|제품 요구|[PRD](docs/PRD.md)|
|작업 순서·의존성|[ROADMAP](docs/ROADMAP.md)|
|작업 상태|[PROJECT_STATUS](state/PROJECT_STATUS.md)|
|전체 파일목록|[FILE_INDEX](FILE_INDEX.md)|

## 실행
ZIP의 최상위 폴더 안을 프로젝트 루트로 사용한다. 기존 저장소는 파일을 덮어쓰지 않고 비교·병합한다.
Codex에 다음을 전달한다.
```text
START_HERE.md와 prompts/MASTER_PROMPT.md를 읽고 MODE=GUIDED로 STEP-01부터 진행해줘.
실제 저장소·도구·기존 변경을 확인하고 단계의 수용 기준과 검증 결과를 보고해줘.
```
다음은 해당 STEP 프롬프트만 실행한다. 자동안전연속 모드는 MASTER의 MODE=AUTO_SAFE.
계정/비용/원격DB/배포/실광고의 승인 경계는 두 모드 모두 동일하다.

## 패키지 구성
`docs/` 제품·설계·데이터·UI·보안·QA·운영 문서.
`prompts/steps/` STEP-01~20 개별 완성 프롬프트.
`prompts/` 마스터·합본·목차·이어하기·오류수정·GPT검토·독립감사.
`state/` 실제 작업상태·차단·승인·결정·근거 인덱스, 모두 미착수로 초기화.
`templates/` 단계/실API/릴리스 결과 기록 양식.
`AGENTS.md` Codex의 짧은 저장소 작업규칙. 상세문서는 해당STEP에서 선택해 읽는다.[S10]

## 중요한 경계
실API 인증 호출·실제검색량 조사·광고심사·원격 DB 생성·배포는 수행하지 않았다. 웹 기반과 격리 로컬 DB 검증 결과는 STEP-03/04 보고서를 따른다.
첫3종목은 데이터 가능성 검증 대상이며 코드/합격률/일정은 아직 확정하지 않았다.
공개 API 카탈로그/공식 기술·정책 출처는 [SOURCES](docs/SOURCES.md)에 기록했다.
API key·개인정보·계정 ID·유료플랜 값·실제 도메인은 들어 있지 않다.
Markdown 검증은 [PACKAGE_VALIDATION](PACKAGE_VALIDATION.md), 파일 해시는 [CHECKSUMS](CHECKSUMS.md) 참고.

## M0 작업 당시 기록 — 2026-10-20

`kasa500000-png/LicenseInsight` 빈 저장소에서 M0 / TASK-001(v2 STEP-01)을 진행했다. 최신 상태는 [PROJECT_STATUS](state/PROJECT_STATUS.md), 당시 결과는 [STEP-01 보고서](docs/reports/STEP-01.md), 다음 검증 준비는 [STEP-02 준비표](docs/reports/STEP-02_VALIDATION_PREP.md)에 있다. M0 당시 앱은 없었고 API 인증 호출·DB·배포·push/PR은 미수행이었다. 공개 카탈로그 재조회는 HTTP503, 계정 승인은 UNKNOWN이었다.

[IMPLEMENTATION_PLAN](docs/IMPLEMENTATION_PLAN.md)은 이번에 추가한 ROADMAP 연결 안내다. [설정 안내](docs/reports/M0_SETTINGS.md)와 [.env.example](.env.example)은 실제 키 없는 준비물이며 연결 완료가 아니다. 원본 CHECKSUMS와 PACKAGE_VALIDATION은 첨부 패키지 기준선이다. 현재 변경 파일·검증은 STEP-01 보고서를 따른다.
