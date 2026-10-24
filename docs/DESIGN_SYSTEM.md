# 디자인 시스템 v1 — 구현 기준안

제품 인상: 광고성 학원 랜딩이 아닌 신뢰할 수 있는 일정·비교 도구.
공식 기관으로 오인될 문장·로고·인증 배지, 가짜 후기·방문자 수, 장식용 AI 문구는 사용하지 않는다.
이 문서는 UI 구현 지침이며 시안 이미지나 Figma 파일이 아니다.

## 토큰
| 역할 | 값 |
|---|---|
| background / surface | #F8FAFC / #FFFFFF |
| text / secondary | #0F172A / #475569 |
| primary / primary-hover | #2563EB / #1D4ED8 |
| border | #CBD5E1 |
| success / warning / danger text | #166534 / #92400E / #B91C1C |
| 간격 | 4,8,12,16,24,32,48 px |
| radius | control 8 / card 12 / dialog 16 px |
| 최대 본문폭 | 1120 px |
| 모바일 좌우 padding | 16 px(기본), 좁은 화면도 내용 넘침 방지 |
| 폰트 크기 | body16, small14, caption12, section20~24, page28~32 |
| 행간 | 본문1.6 / 제목1.3 |
| control height | 기본44px 이상 제품 목표 |

색상은 브랜드 제안이며 대비 통과를 측정한 값이 아니다. 실제 배경·상태 조합의 대비를 검사한다.
한국어 시스템 폰트를 기본으로 해 불필요한 외부 font 요청을 줄인다. 추가 웹폰트는 라이선스/성능 검토 후.
상태는 색 외에 아이콘+텍스트를 동반한다. 차트의 두 시리즈는 선 모양/레이블로도 구분한다.

## 핵심 컴포넌트
Button(primary/secondary/ghost/destructive), Input, SearchBox, Select, Checkbox,
DateField, DurationField, Tabs, Badge, Alert, Toast, Skeleton, EmptyState,
QualificationCard, NextActionCard, ScheduleEventRow, StatisticSummary, AccessibleChart,
DataTable, SourceStamp, FreshnessNotice, CompareTray, PlanWeekCard, AdSlotPlaceholder.

## 상호작용
- hover가 없어도 행동을 알 수 있어야 한다. touch와 keyboard 모두 지원한다.
- 로딩 중 제출 버튼은 중복 실행을 막고 완료/실패를 텍스트로 알린다.
- 입력 오류는 입력 바로 아래에 표시하고 첫 오류로 focus 이동을 제공한다.
- dialog는 focus trap·Esc 닫기·닫힌 후 원래 버튼 focus 복귀를 포함한다.
- 토스트만으로 중요한 접수 오류/저장 실패를 알리지 않고 본문 상태를 함께 표시한다.
- destructive 변경은 대상과 효과를 정확히 표시한다. 모든 저장에 불필요한 확인창은 넣지 않는다.

## 레이아웃
모바일: 하단 nav 4개(홈/일정/비교/내 준비), safe-area bottom 고려.
데스크톱: 상단 nav, 본문 1120px, 개인 계획 외 화면의 첫 행동이 명확하게 보이도록.
전역 페이지 가로 스크롤 금지. 비교표의 컨테이너 내부 가로 스크롤만 허용한다.
최소 검수 폭 360/390/768/1440. 200% zoom, 키보드, 긴 종목명, 숫자 자리 증가를 확인한다.

## 광고
첫 핵심 일정·공식 이동 CTA보다 앞에 광고를 배치하지 않는다.
광고 슬롯은 비활성일 때 불필요한 거대한 공백을 만들지 않는다.
활성 가능 슬롯은 안전한 높이를 예약하되 실제 레이아웃 이동을 측정한다.
하단 nav, 달력 이동, 계획 저장 버튼과 광고를 붙이지 않는다.

## 디자인 완료 기준
핵심 행동까지 장식·설명으로 여러 화면을 스크롤하지 않는다.
오류/빈 목록/stale/데모/저장 불가/광고 차단도 정상 화면과 같은 수준으로 완성한다.
스크린샷 파일명에 화면·폭·상태·commit을 식별할 정보를 담고 비밀정보는 제거한다.
