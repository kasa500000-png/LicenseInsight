# 새 컴퓨터에서 Codex로 이어하기

기준: 2026-10-24 (한국시간). 저장소: `kasa500000-png/LicenseInsight`, 기본 branch: `main`.
이 문서는 Git 업로드와 작업 인수인계용이며 STEP-09를 구현한 결과가 아니다.

## 1. Clone과 도구 준비

Git과 **Node.js 24.19.0**, **pnpm 11.25.0**을 사용한다. 정확한 요구 버전은 `.nvmrc`와 `package.json`을 따른다. Python 3.11 이상은 API proof/DB 테스트에 필요하고, Docker는 별도의 로컬 DB 검증을 실행할 때만 필요하다. DB 스크립트는 `/var/run/docker.sock`의 Linux Docker를 사용하므로 Windows에서는 해당 검증에 WSL2/Linux 환경이 필요하다. 기본 웹 개발에는 API 키나 DB가 필요하지 않다.

```sh
git clone --branch main https://github.com/kasa500000-png/LicenseInsight.git
cd LicenseInsight
git status --short
git log -3 --oneline
node --version
pnpm --version
```

Node 버전을 맞춘 뒤 pnpm이 없다면 다음 명령으로 설치한다.

```sh
npm install --global pnpm@11.25.0
```

잠긴 의존성을 설치하고, **기존 설정 파일을 덮어쓰지 않고** 키 없는 예시로 로컬 설정을 준비한다.

```sh
pnpm install --frozen-lockfile
node -e "const fs=require('node:fs');if(!fs.existsSync('.env.local'))fs.copyFileSync('.env.example','.env.local',fs.constants.COPYFILE_EXCL)"
pnpm exec playwright install chromium
```

`.env.local`의 기본은 APP_ENV=local, DATA_MODE=live, 광고/분석OFF다. 빈 key로 실제 API를 호출하지 않는다. Linux에서 Chromium의 시스템 라이브러리가 부족하면 설치 오류를 확인하고 공식 Playwright 의존성 설치 방법을 따른다. 브라우저를 설치하거나 실행하지 못하면 UI 검증을 NOT_RUN으로 기록한다.

웹만 확인하려면 `pnpm dev` 후 `http://127.0.0.1:3000`을 연다. 합성 상세는 `/detail-demo/synthetic-electrical`, 공통 UI는 `/ui-gallery`다. 이 둘은 local/test 전용이며 공식 자료가 아니다. 기본 홈은 검증된 데이터가 없다는 상태를 표시한다. 별도 설정 없이 운영 배포하지 않는다.

## 2. 인수 시 확인할 실제 기준선

- STEP-01~08 중 STEP-02 실데이터 검증은 BLOCKED다. STEP-08은 **분리된 합성 상세 범위만 DONE**이다. 다음 미착수는 **STEP-09 관심 저장·개인 준비 계획**이다.
- STEP-08 과거 실행 근거: 전체539 테스트, Chromium48, 로컬4환경 접근40, 최종 정합성29 PASS. 상세 캡처17장을 직접 검수했다. 새 컴퓨터에서 실행한 결과로 재사용하지 않는다.
- `docs/reports/evidence/step-08/executed-source-hashes.json`의119개 소스 SHA와 현재 파일을 비교한다. `.md`·Git 인수인계 기록은 별도로 바뀔 수 있다. 이전 source/evidence는 임의로 수정하지 않는다.
- 실제 API 키·공식 operation/필드·계정 승인/쿼터·3종목 코드/crosswalk/일정/통계는 미검증이다. 마지막 카탈로그503은 과거 관측이며 현재 장애를 확정하지 않는다.
- 앱은 실제 DB 미연결이다. STEP-08의 새 slug SQL은 mock만 검증했다. STEP-05 SQL410/Node17은 당시 로컬 DB 근거다. Supabase 원격·Auth/PostgREST·운영 cache·배포·실광고는 검증하지 않았다.
- 이전 보고서의 `/workspace/licenseinsight`·`audit/m0-task-001`·unborn은 당시 환경 기록이다. 현재 위치/branch/commit은 실제 Git에서 확인한다. Git 업로드 승인은 이 인수인계 스냅샷 게시 범위이며 후속 배포·원격 DB 변경·PR·추가 push의 포괄 승인이 아니다.

## 3. 저장소 폴더에서 Codex에 전달할 프롬프트

아래 전체를 붙여 넣는다.

```text
이 저장소는 공공데이터 기반 국가자격 정보·비교·준비 계획 웹사이트 ‘자격인사이트’다.
현재 컴퓨터에서 clone한 kasa500000-png/LicenseInsight 저장소의 작업을 이어서 진행해라.
이전 대화나 /workspace 경로, 설치 도구, 인증키가 이 컴퓨터에도 있다고 가정하지 마라.

먼저 실제 작업 루트와 상위 AGENTS/override, AGENTS.md, START_HERE.md,
state/PROJECT_STATUS.md, state/BLOCKERS.md, state/APPROVALS.md,
state/EVIDENCE_INDEX.md, prompts/STEP_INDEX.md, 이 인수인계 문서를 읽어라.
Git remote/branch/HEAD/status/diff와 Node/pnpm/Python/브라우저/Docker 가용성을 확인하고
기존 사용자 변경 및 .env.local을 보존해라. 비밀키·auth state 원문을 읽거나 출력하지 마라.

이전 STEP-06/07/08 보고서와 실제 테스트 JSON·HTML·화면 검수 기록을 확인해라.
특히 docs/reports/evidence/step-08/executed-source-hashes.json의119개 소스 SHA가
현재 소스와 일치하는지 검사하고, 과거539/48/40/29 PASS와 새 실행 결과를 구분해라.
Node24.19.0/pnpm11.25.0 및 frozen lockfile을 사용한다.
의존성이 없으면 기존 프로젝트에 pnpm install --frozen-lockfile로 설치하고,
Next 코드를 수정하기 전에 node_modules/next/dist/docs의 해당 버전 문서를 읽어라.
새 scaffold나 전체 재작성, 원격/기존 DB 초기화를 하지 마라.

이번에는 prompts/STEP_INDEX.md와 상태표에서 다음 미착수 STEP 하나만 수행해라.
인수 기준 다음은 STEP-09 ‘관심 저장·개인 준비 계획’이며,
prompts/steps/STEP-09_PERSONAL_PLAN.md 전체와 거기 지정된 문서를 읽고 수행해라.
그 이후 실제 변경으로 STEP-09가 이미 완료됐다면 그 근거와 상태표를 확인하고
선행조건이 충족된 다음 미착수 STEP 하나를 선택해라. 여러 STEP을 한 번에 진행하지 마라.

STEP-02/G0와 실데이터 상세는 BLOCKED다. 선행조건에서 막힌 부분과 독립 가능한
브라우저 저장·계획 계산·로컬 UI 작업을 구분해라. 검증되지 않은 실제 종목/공식 일정/통계를
만들지 말고 합성 검증이 필요하면 local/test 전용 경로에서 합성임을 명확히 표시해라.
운영·preview에 합성 데이터를 공개하거나 live 실패 시 fixture로 자동 대체하지 마라.

STEP-09에서는 기존 domain/UI/detail을 재사용하고, 관심 최대10개·계획 생성/편집/삭제·
완료 체크·재방문 복원과 localStorage schema/revision·read-before-write·저장거부·손상·
마이그레이션·다른 탭 충돌·완료분 보존·일정 변경 검토를 해당 프롬프트대로 다뤄라.
개인 자유문구/학습기록을 SSR HTML·URL·서버·분석 요청으로 보내지 마라.
방문자 로그인/서버 개인기록 API·STEP-10 내보내기는 이번에 만들지 마라.

Audit → Plan 후 구현 → 테스트 → 실제 브라우저 화면 확인 → 결과 보고 순서로 진행해라.
필요한 lint/typecheck/unit/build와 브라우저 여정 검증을 실행하되,
660/600분 합계·반올림·새로고침·첫 read race·저장거부/손상·동시탭·개인정보/광고 경계를
실제로 확인하고 명령·exit·데이터 모드·화면 근거를 새 STEP 증거에 기록해라.
이전 증거를 덮어쓰거나 실제로 하지 않은 API·DB·브라우저·배포를 PASS로 보고하지 마라.
도구가 없으면 NOT_RUN과 원인/독립 완료 범위를 명확히 기록해라.

유료 구매·외부 자원 생성·원격 DB 변경·공개 배포·PR/추가 push·메일·실광고는
이번 로컬 이어하기에 포함되지 않는다. state/APPROVALS의 실제 범위와 신규 사용자 지시를 따라라.
state/PROJECT_STATUS.md, state/BLOCKERS.md, state/EVIDENCE_INDEX.md와
해당 docs/reports/STEP-NN.md를 갱신해라.
끝에 완료 범위·변경 파일·실행/미실행 검증·실화면 근거·남은 위험·Git 상태·다음 STEP 하나를
한국어로 보고해라.
```

## 4. 새 컴퓨터의 기준선 재검증 명령

설치와 키 없는 `.env.local`을 준비한 뒤 저장소에서 실행한다. 실제 실행 결과를 기록한다.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:client-boundary
pnpm test:e2e
```

E2E는 자체적으로 test/live·광고OFF 설정의3103 포트 서버를 시작/종료한다. 별도3103 서버를 먼저 띄우지 않는다. 기존 `docs/reports/evidence/step-08`에 결과를 쓰지 말고 새 STEP 증거나 무시되는 `test-results`를 사용한다. `pnpm build`는 `.env.local`을 읽지만 비밀 값을 로그에 출력하지 않는다. CI·실제 DB·배포 결과는 별도 근거가 있을 때만 PASS다.
