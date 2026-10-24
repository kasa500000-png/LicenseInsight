# Git 게시·로컬 Codex 인수인계 — 2026-10-24

범위: 사용자가 요청한 현재 누적 작업의 Git 업로드와 새 컴퓨터용 프롬프트 작성. STEP-09 구현은 하지 않았다.
대상: [kasa500000-png/LicenseInsight](https://github.com/kasa500000-png/LicenseInsight), `main`.
최초 게시 스냅샷: [`a55b9f8615489fd67be0af8f6a54b7644b865d27`](https://github.com/kasa500000-png/LicenseInsight/commit/a55b9f8615489fd67be0af8f6a54b7644b865d27).
이후 인수인계 확인 기록을 담는 문서 커밋의 최신 SHA는 `git log -1` 또는 원격 main ref를 따른다.

## 완료

- 실제 원격 메타데이터·권한·refs를 확인했다. public·default main이며 기존 branch/commit은 없었다. 기존 로컬 unborn `audit/m0-task-001`을 `main`으로 바꿔 최초 커밋했다. 원격 기존 이력 덮기·force push·branch 삭제·PR은 하지 않았다.
- 사용자 지시를 [APPROVALS](../../state/APPROVALS.md)에 최초 스냅샷·인수인계 기록 게시 범위로 기록했다. 배포·운영 DB·추가 STEP 게시 승인으로 확대하지 않았다.
- 소스·기획/상태 문서·lockfile·단계별 테스트 JSON/HTML/캡처·합성 fixture와 새 프롬프트를 포함해 **492개 파일**을 최초 게시했다. `.env.example`은 키 없는 예시다. 실제 `.env`·인증 상태·node_modules·.next·test-results·로컬 DB는 포함하지 않았다.
- [Clone·설정·Codex 이어하기 프롬프트](../../prompts/LOCAL_CODEX_HANDOFF.md)를 만들고 README와 PROJECT_STATUS에서 연결했다. Node24.19.0/pnpm11.25.0·기존 설정 보존·Chromium·E2E 포트3103과 STEP-09 범위를 실제 설정에 맞췄다.
- `git push --set-upstream origin main` **exit0**, 원격에서 새 branch main 생성을 확인했다. 이후 별도 새 폴더에 실제 GitHub URL로 clone했다. HEAD 일치·스냅샷 파일 **492/492 byte 일치**·STEP-08 소스 SHA **119/119 일치**·새 clone의 clean status를 확인했다.

## 검증·실행 근거

| 확인 | 결과 | 근거 |
|---|---|---|
| 원격·이전 실행 소스·문서 링크·JSON | PASS | [preflight](evidence/git-handoff-2026-10-24/preflight.json) |
| 커밋 후보와 tracked 파일 경계·알려진 비밀 패턴 | PASS(한정 검사) | [staging](evidence/git-handoff-2026-10-24/staging.json), 읽기 전용 독립 검토 |
| 최초 push | PASS, exit0, 2026-10-24 19:12:49 KST 완료 | [push](evidence/git-handoff-2026-10-24/push-snapshot.json) |
| 원격 새 clone·492개 파일·119개 실행 소스 | PASS | [clone](evidence/git-handoff-2026-10-24/clone-snapshot.json) |
| 문서 인수인계 확인·현재 소스/링크/추가 파일 경계 | [최종 검증 결과](evidence/git-handoff-2026-10-24/validation.json) | 이 보고서·증거를 포함하는 후속 문서 커밋에서 보존 |

`git show --check`에는 기존 Playwright 실패 진단5개 파일의 공백과 기존 소스/SQL/Python3개 파일의 EOF 빈 줄 경고가 있다. 과거 실행 소스/증거 SHA 보존을 위해 임의 정리하지 않았다. 처음 검사에서 경고 경로를 진단 파일로만 가정해 중단된 사실과 전체 tracked 검사를 재수행한 순서는 staging 근거에 기록했다. 기능 오류나 비밀 탐지가 확인된 것은 아니다.

## 이번에 다시 실행하지 않은 것

이번 변경은 문서·Git 인수인계와 초기 게시에서 발견한 CI 부트스트랩 설정2줄 보완이다. 앱/테스트/마이그레이션/lockfile은 변경하지 않았다. STEP-08의 **539 테스트·브라우저48·접근40·정합성29 PASS**는 과거 실제 근거로 보존했다. 이번 로컬 작업에서 lint/typecheck/unit/build/브라우저/DB를 재실행했다고 보고하지 않는다. 위 fresh clone은 이 관리 실행 환경의 별도 폴더이며 사용자의 새 컴퓨터·새 OS에서 실행한 검증이 아니다. fresh clone의 dependency install/브라우저 실행은 NOT_RUN이다.

main push가 기존 GitHub Actions 검사 workflow를 시작했다. 최초 [Foundation checks](https://github.com/kasa500000-png/LicenseInsight/actions/runs/40085018362)는 실패했다. 로그에서 Node24.19.0 설치는 성공했고 `actions/setup-node@v5`가 packageManager를 보고 pnpm 설치 전에 자동 캐시를 조회해 `Unable to locate executable file: pnpm`으로 두 job이 종료된 것을 확인했다. database job의 PostgreSQL migration/권한 및 타입 대조 단계는 이미 성공했으나 Node driver 단계는 실행되지 않았다.

공식 [setup-node v5 문서 근거](evidence/git-handoff-2026-10-24/setup-node-reference.json)에 따라 Node 설치2곳에 `package-manager-cache: false`를 명시했다. 기존 Node→pnpm→frozen install 순서와 버전·lockfile은 보존하며 자동 캐시만 끈다. 이 보고서를 포함한 후속 commit push에서 원격 CI를 다시 실행하며 **완료 결과를 확인하기 전에는 PASS로 표시하지 않는다**. 최신 상태는 [Actions](https://github.com/kasa500000-png/LicenseInsight/actions)를 따른다. CI workflow에는 배포 명령이 없다.

## 남은 상태와 다음 작업

STEP-02/G0·실데이터 상세는 BLOCKED다. 공공 API/카탈로그 호출·앱의 실제 DB 연결·운영/기존 원격 DB 변경·운영 배포·유료 구매·메일·실광고는 이번에 실행하지 않았다. GitHub CI의 임시 PostgreSQL 검사는 운영 DB 연결과 별개다. key/계정 승인/공식 operation/3종목 코드·일정·통계·crosswalk를 검증했다고 보고하지 않는다. 합성 자료는 local/test에만 유지한다.

다음은 **STEP-09 관심 저장·개인 준비 계획** 하나다. 새 컴퓨터에서는 프롬프트대로 이전 실제 근거·현재 Git 변경·도구를 먼저 확인하고 구현→테스트→실화면→보고를 수행한다. 개인 자료는 브라우저에만 저장하며 서버/SSR HTML/URL에 보내지 않는다. STEP-10 이상은 이번 인수인계에 포함하지 않았다.
