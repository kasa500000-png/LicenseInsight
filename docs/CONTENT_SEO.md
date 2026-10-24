# 콘텐츠·검색 구현 지침

## 대표 페이지
/qualifications/[slug]는 종목의 안정적인 대표 URL이다. 공식 이름 변경 시 검증된 redirect를 유지한다.
서버 HTML에 종목명·기준 일정·통계 표·출처를 제공한다. metadata API는 실제 Next.js 버전에 맞춘다.[S11]
목록 검색 query·비교 조합·개인계획·admin·preview는 기본 noindex.
가치 있는 공개 상세/가이드/정보성 공통 페이지는 검수 후 sitemap에 추가한다.
필터·연도·종목 조합으로 내용이 거의 같은 URL을 대량 색인하지 않는다.[S09]

## route 정책
| 페이지 | index 기본 | canonical/sitemap |
|---|---|---|
| 홈 | 검수 후 yes | 운영 canonical / 포함 |
| 종목 상세 | 검증 데이터 있을 때 yes | 안정 slug / 포함 |
| 탐색 query/filter | no | 전략 검증 후 설정 / 제외 |
| 일정 / 비교 | no(초기안) | 무한 변형 금지 / 제외 |
| 내 준비 / admin / preview | no | 제외; admin은 인증도 별도 |
| 가이드 | reviewed+published만 yes | 실제 콘텐츠 / 포함 |
| 404/503/초안 | no | 제외 |

preview는 X-Robots-Tag/noindex와 가능한 접근보호를 적용한다.
robots.txt disallow만으로 비밀 보호나 색인 삭제가 보장된다고 생각하지 않는다.
운영 PUBLIC_SITE_URL이 미확정이면 canonical을 임의 도메인으로 발행하지 않는다.
OG는 실제 콘텐츠 기반 텍스트 카드로 시작하고 가짜 이미지/기관 로고를 쓰지 않는다.
구조화 데이터는 실제 내용에 맞는 WebSite/BreadcrumbList/Article 등을 검토한다.
FAQ/리치결과 노출을 보장하거나 없는 리뷰·평점 schema를 넣지 않는다.

## 가이드 frontmatter 설계
slug, title, description, status(draft/reviewed/published), createdAt, reviewedAt,
relatedQualificationIds, sources[], factualClaimsChecked, editorNote(private).
editorNote와 draft는 공개 빌드에서 제외한다. 공개 Markdown은 안전한 parser로 처리한다.
외부에서 수집한 MDX/HTML을 실행 가능한 코드로 컴파일하지 않는다.

## 초기 6개 가이드 후보
1. 접수기간·시험기간·개인 시험일을 구분하는 법.
2. 합격률 47%는 어떻게 계산되는가: 응시자 수와 가중 집계.
3. 직장인의 요일별 공부시간으로 준비 계획 만드는 법.
4. 필기·실기 통계를 비교할 때 주의할 점.
5. 캘린더로 내보낸 시험 일정의 변경을 확인하는 법.
6. 데이터가 없거나 오래되었을 때 공식 출처 확인 방법.
후보일 뿐 글이 이미 작성/검수되었다고 표시하지 않는다.
각 가이드는 도구 이용에 실질적 도움이 되어야 하며 페이지 개수는 광고 승인 기준이 아니다.

## 사실 검수
공식 사실 / 자체 계산 / 편집 제안을 문장별로 구분한다.
시험과목·수수료·합격기준·일정은 공식 근거와 적용연도를 확인한다.
개인 응시자격 판정·합격 예측·근거 없는 학습시간·난이도 순위는 금지한다.
재작성만으로 저작권 문제가 없어지는 것은 아니며 외부 원문 전체 복제나 문제 무단 수집을 하지 않는다.

## 검증
HTTP status/title/description/canonical/OG/sitemap/robots와 JS 없는 HTML 확인.
미존재 slug404, 가이드 draft 비공개, malicious slug/query, 없는 미래연도 title 자동 생성 금지.
Search Console/네이버 서치어드바이저 계정 연결·소유권 인증·사이트맵 제출은 실제 승인 후 수행한다.
검색 색인·순위·유입·광고 수익은 실제 측정 전 보장하지 않는다.
