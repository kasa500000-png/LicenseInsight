# 환경·계정 준비 가이드

## 전제
이 문서는 준비 순서다. 계정 생성·API 활용신청·유료 결제·비밀키 발급을 실제로 수행하지 않았다.
Windows PowerShell/WSL 또는 macOS 중 실제 실행 환경을 확인한다. 두 환경의 경로·도구를 혼용하지 않는다.
특정 최신 버전 번호를 미리 고정하지 않는다. 착수 시 공식 지원과 기존 lockfile을 확인한다.

## 로컬 도구
Git, 프로젝트와 호환되는 Node LTS, 패키지 관리자 하나, Codex, 실행 가능한 브라우저 테스트 도구.
Supabase 로컬 환경이 필요하면 CLI/컨테이너 런타임을 확인한다. 없으면 설치 안내와 blocked 기록.
`git status`, `node --version`, 패키지 관리자 version, 해당 CLI `--help`는 읽기 점검이다.
로그/환경 점검에서 .env 원문이나 token 값을 출력하지 않는다.

## 계정 준비표
| 대상 | 필요 시점 | 직접 확인할 값 | 승인/행동 구분 |
|---|---|---|---|
| 공공데이터포털 | STEP-02 live | API별 활용 승인·키 존재·quota | 개발/운영 승인 별도 |
| Git 저장소 | STEP-01/03 | 실제 root/remote/branch | 로컬 준비와 push/PR 구분 |
| Supabase | STEP-04 이후 원격 | 정확한 project/env/ref | 생성/원격 migration 별도 승인 |
| 호스팅 | STEP-19 | team/project/env/상업조건 | 유료 결제·배포 별도 |
| 운영 도메인 | STEP-19 | 실제 소유 도메인 | 구매/DNS 변경 별도 |
| 연락수단 | STEP-15/19 | 공개해도 되는 실제 수신처 | 개인 메일을 임의 사용하지 않음 |
| 검색 도구 | STEP-19 이후 | Search Console/네이버 소유권 | 인증·제출 실행 승인 |
| AdSense | STEP-20 | 실제 사이트 승인·publisher ID | 앱 AdMob과 구분 |

## 환경변수 설계 — 실제 .env 파일은 구현 때 생성
| 이름 예시 | 범위 | 설명 |
|---|---|---|
| APP_ENV | 서버 | local/test/preview/production 구분 |
| DATA_MODE | 서버 | fixture/live |
| PUBLIC_SITE_URL | 서버 | 검증된 canonical origin; 미확정이면 운영 차단 |
| DATA_GO_KR_SERVICE_KEY | 서버 secret | 승인된 API 인증키; API별 다르면 분리 |
| SUPABASE_URL | 서버 | 실제 선택한 DB URL |
| SUPABASE_PUBLISHABLE_KEY | 서버/필요시 공개 client | 공개 읽기·인증 구성에 따라 최소 노출 |
| SUPABASE_SECRET_KEY | 서버 secret | 수집/권한 있는 서버 작업만; legacy는 이름 분리 |
| CRON_SECRET | 서버 secret | 예약 수집 인증; URL query로 전달하지 않음 |
| ADS_ENABLED | 서버 | default false |
| ANALYTICS_ENABLED | 서버 | default false |
| AD_PUBLISHER_ID | 공개 설정 | 실계정 확인 후만, secret은 아님 |
| AD_SLOT_IDS | 공개 설정 | 실제 승인된 슬롯 설정 |
| AUTOMATION_NO_ADS | 서버/테스트 설정 | 테스트에서 비활성만 가능 |

변수명은 제안이다. 라이브러리가 요구하는 공개 변수는 구현 시 공식 규칙에 맞게 매핑한다.
`NEXT_PUBLIC_...SECRET` 같은 이름은 금지. 실제 키 값 대신 `<사용자가 로컬에 설정>`이라고 문서화한다.
기존 API 키가 있으리라 추정해 다른 프로젝트의 키를 찾아 복사하지 않는다.

## 의존성 선정
새 프로젝트는 TypeScript strict, 접근성 있는 UI 기반, 테스트 도구, 안전한 XML parser,
날짜 처리/ICS 라이브러리를 작은 수로 선택한다. 유지보수·라이선스·번들 영향 기록.
불필요한 벡터 DB, Redis, 결제 SDK, LLM SDK, 이메일 SDK, 대형 CMS를 넣지 않는다.
도구 버전과 설치 명령은 확인된 공식 문서와 lockfile로 재현한다.

## 환경 격리
preview의 DB/광고/수집은 production과 분리. preview가 운영 migration을 자동 실행하면 실패.
외부 PR은 secret 없이 fixture tests만. 운영 secret은 승인된 job에만 제공.
지출 예상은 docs/OPERATIONS.md 기준으로 계정/요금/세금/추가사용량을 확인한 후 채운다.
Vercel Hobby의 비상업 제한은 상업 서비스 배포 전에 확인한다.[S07]
