# 보안·개인정보·권한 검토

완성된 법률 검토나 배포 가능한 개인정보처리방침이 아니다.
실제 운영주체·광고/분석 공급자·보존/국외 처리·이용자 범위에 맞춰 출시 전에 확인한다.
기술 근거 [S12][S13], 게시자 개인정보/동의 정책 [S08][S16].

## 위협 모델
| 위협 | 통제·검증 |
|---|---|
| 브라우저 번들/API 키 노출 | server-only 경계, env schema, build/로그 secret scan |
| 익명/일반사용자의 관리자 접근 | 매 요청 verified identity+현재 admin role, 401/403 tests |
| RLS/view/function 우회 | explicit GRANT/RLS, private schema 노출 제외, role matrix tests |
| API 원문 XML/HTML 악성 입력 | 외부 엔티티 차단, payload limit, 안전 parse/HTML 정화 |
| 관리자 action CSRF/IDOR | Origin/CSRF 정책, 대상 권한, expectedRevision, rate limit |
| API 요청 SSRF | source/host/operation allowlist, 외부 사용자 URL fetch 금지 |
| 개인계획 XSS/로그 유출 | plain text, free-text 미수집, error sanitization |
| 공급망/CI 유출 | lockfile, 버전 검토, 최소 CI 권한, secret 없는 fork tests |
| 광고 자기 클릭·오클릭 | 실광고 테스트 요청 차단, CTA 분리, OFF default |

## 인증·관리자
방문자 회원가입은 없다. 운영자만 실제 공급자 권고에 맞는 인증 경로를 만든다.
서버에서 세션/token을 검증하고 internal.admin_roles의 현재 active role을 확인한다.
사용자가 수정 가능한 user_metadata로 role을 판정하지 않는다.
관리 권한 회수 이후 오래된 JWT만으로 계속 승인되지 않도록 현재 역할 확인을 수행한다.
관리 작업은 no-store, 실패·성공 안전 로그, 로그인/재수집 rate limit.
자체 암호 인증 시스템·하드코딩 관리자 비밀번호·공유 기본 계정은 만들지 않는다.

## 환경과 비밀키
.env*, connection string, secret/service role, auth state, 세션 cookie, secret query URL은 Git·보고서 제외.
.env.example에는 이름과 빈값/설명만. NEXT_PUBLIC_에는 공개해도 되는 값만.
공개 publishable key와 쓰기 권한 비밀키를 구분한다. 공개키 자체의 존재가 접근제어를 대체하지 않는다.
키 유출 발견 시 화면/로그 전파를 중단하고 영향 범위·회수/회전 작업을 사용자에게 보고한다.
계정의 키 회전/삭제도 승인된 범위에서 수행한다.

## 원격 자원
이전 프로젝트의 Supabase/Vercel/GitHub를 이름 유사성만으로 선택하지 않는다.
필요한 경우 실제 연결 목록을 읽어 대상 project/team/repo/environment를 확인하고 승인 범위를 기록한다.
본 문서 요청 자체는 원격 생성/배포/DB 쓰기 권한을 주지 않는다.
DB 변경은 테스트 DB에서 검증한 migration만. 운영 destructive change는 별도 승인과 복원 계획.

## 개인정보 인벤토리 — 출시 때 실제 채울 것
| 항목 | 초기 설계 | 확인할 점 |
|---|---|---|
| 관심/학습기록 | 이용자 브라우저만 | export·삭제·기기변경 안내 |
| 서버 access/error log | 최소 정보 | 호스팅 자동 IP 등 수집·보존·접근 |
| 관리자 로그인 | 인증 공급자 | 관리자 식별자/접속/보존 |
| 문의 | 실제 연락수단 확정 전 미수집 | 수신 계정·보존·답변·삭제 |
| 분석 | 기본 OFF | 동의·식별자·벤더·이벤트·국외처리 |
| 광고 | 기본 OFF | 벤더 cookie/동의/지역요구·ads.txt |

브라우저만 저장한다고 서비스 전체가 개인정보를 전혀 처리하지 않는다고 쓰지 않는다.
'수집 없음'은 실제 광고·로그·인증·문의 구성을 확인한 뒤 판단한다.
privacy/terms의 임의 운영자 이름·주소·이메일·보존기간을 만들지 않는다.
사용자가 제공한 개인 계정정보를 자동으로 공개 연락처로 전환하지 않는다.

## 출시 보안 수용 기준
비밀키 scan, public anon/read/insert/update/delete tests, authenticated role spoof,
unauthenticated admin actions, CSRF/replay/rate-limit, pending revision conflict,
XSS strings·malformed XML·unsafe URLs·oversized payload, private cache leak,
preview→production env isolation, malicious imported docs as instructions 미실행.
