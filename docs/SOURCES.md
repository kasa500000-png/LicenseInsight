# 공식 출처와 확인 범위

확인일: 2026-10-20. 공개 HTML 카탈로그/기술 문서/정책을 확인했다.
API 인증 실호출·계정 승인·앱 구현·배포·실광고 활성화는 수행하지 않았다.
공공데이터에 첨부된 DOCX/PDF 참고파일은 이번 작업에서 내려받아 분석하지 않았다.
정책·SDK·버전·제공범위는 실행 시 재확인한다. 수치는 제품 제안/테스트 예시와 사실을 구분한다.

## S01. 한국산업인력공단 국가자격 종목 목록 정보

주소: `https://www.data.go.kr/data/15003024/openapi.do`

확인/한계: 공개 카탈로그·HTML 명세 확인. 종목·등급·분야 조회의 출발점. 실제 승인/활성종목/응답은 미검증.

## S02. 한국산업인력공단 국가자격 시험일정 조회 서비스

주소: `https://www.data.go.kr/data/15074408/openapi.do`

확인/한계: 공개 일정 API의 연도·자격구분·종목 조회 및 운영단계 심의승인 안내 확인. 차년도/개인시각/좌석 제공을 보장하지 않음.

## S03. 한국산업인력공단 연도별 회별 국가기술자격 합격률

주소: `https://www.data.go.kr/data/15089380/openapi.do`

확인/한계: 공개 카탈로그·명세 확인. 실호출·모든 과거연도·종목매핑·회차완전성은 아직 미검증.

## S04. 한국산업인력공단 국가자격 종목별 자격정보

주소: `https://www.data.go.kr/data/15003003/openapi.do`

확인/한계: 공개 자격정보 API 확인. 실제 정보구분별 본문·갱신시점은 구현때 검증.

## S05. 한국산업인력공단 국가기술자격 종목별 시험정보

주소: `https://www.data.go.kr/data/15003029/openapi.do`

확인/한계: 공개 카탈로그 확인. 수수료는 세부 operation/적용종목 확인 전 optional.

## S06. Q-Net 컴퓨터활용능력 종목 안내(기존 v1 근거)

주소: `https://www.q-net.or.kr/crf005.do?id=crf00505&jmCd=0492`

확인/한계: 기존 제공 기획서의 시행기관 근거를 계승. 이번 패키지 작업에서 별도 재조회하지 않음. HRDK MVP에 컴활 자동 포함하지 않는 범위 유지.

## S07. Vercel Hobby Plan

주소: `https://vercel.com/docs/plans/hobby`

확인/한계: 비상업적 개인용 제한 안내 확인. 상업 운영의 실제 플랜/요금/승인은 실행 시 별도 확인.

## S08. Google Publisher Policies

주소: `https://support.google.com/adsense/answer/10502938?hl=en`

확인/한계: 가치 낮은/복제 콘텐츠·사용자 행동 방해 광고·개인정보 공개 등 정책 확인. 문서의 보수적 route/테스트 정책은 자체 설계.

## S09. Google Search Spam Policies

주소: `https://developers.google.com/search/docs/essentials/spam-policies`

확인/한계: 가치 낮은 대량 검색순위 조작 콘텐츠 정책 확인. 모든 자동화 페이지가 금지라는 의미는 아님.

## S10. OpenAI Codex AGENTS.md 안내

주소: `https://developers.openai.com/codex/guides/agents-md/`

확인/한계: 공식 개발자 주소에서 현재 안내 페이지로 redirect됨. 프로젝트 지침 파일의 탐색·계층·용량 제한 안내 확인. 모든 상세 md가 자동 로드된다고 가정하지 않음.

## S11. Next.js Metadata and OG images

주소: `https://nextjs.org/docs/app/getting-started/metadata-and-og-images`

확인/한계: 공식 metadata 기능 확인. 구체 버전·구현 API는 착수 시 다시 확인.

## S12. Supabase Row Level Security

주소: `https://supabase.com/docs/guides/database/postgres/row-level-security`

확인/한계: 공개 RLS/권한·view security_invoker·사용자 편집 metadata 권한 위험 안내 확인. 실제 프로젝트 검증 미수행.

## S13. Supabase API keys

주소: `https://supabase.com/docs/guides/getting-started/api-keys`

확인/한계: publishable/secret 용도 분리 안내 확인. 실제 키 발급/열람/회전은 수행하지 않음.

## S14. AdSense Program policies — 무효 클릭 포함

주소: `https://support.google.com/adsense/answer/48182?hl=ko`

확인/한계: 자기 클릭·부정 트래픽·광고 운영 정책 확인. 실광고 테스트 요청/클릭을 막는 설계 근거.

## S15. Google Core Web Vitals

주소: `https://developers.google.com/search/docs/appearance/core-web-vitals`

확인/한계: LCP/INP/CLS 목표의 참고 근거. 본 패키지에는 앱 성능 실측결과가 없음.

## S16. Google 광고 동의 관리 요구사항

주소: `https://support.google.com/adsense/answer/13554116?hl=en`

확인/한계: EEA/영국/스위스 관련 CMP 안내 확인. 실제 이용자지역/도구/법적 의무에 맞춘 별도 검토 필요.

## S17. Supabase Changelog

주소: `https://supabase.com/changelog`

확인/한계: 공식 변경이력 페이지 확인. changelog.md 경로 조회 오류 후 HTML 확인. 설치할 버전 관련 breaking change 재검토 필요.

## S18. Vercel Managing Cron Jobs

주소: `https://vercel.com/docs/cron-jobs/manage-cron-jobs`

확인/한계: 예약작업 운영·보안 안내 참고. 실제 cron 생성·플랜 제약 검증·모니터 설정 미수행.

## S19. IETF RFC 5545 iCalendar

주소: `https://www.rfc-editor.org/rfc/rfc5545`

확인/한계: 표준 HTML 확인. 종일 이벤트의 배타적 DTEND 등 내보내기 검증 기준. 실제 캘린더 가져오기 미수행.

## S20. Google AdSense 프로그램 정책

주소: `https://support.google.com/adsense/answer/48182?hl=ko`

확인/한계: 실제 계정 심사와 운영 정책을 확인할 기본 문서. 사이트·게시자 ID·승인은 미확인.

## 기존 기획 계승

제공된 qualification-insight-planning-v1.zip의 SERVICE_PLAN.md/PRD.md/DATA_CONTRACT.md/QA_CHECKLIST.md를 읽고 주요 범위를 유지했다.
문서에 붙은 외부 source 표기는 이 목록을 참조한다. 기존 심사·실호출이 완료되었다는 의미는 아니다.
