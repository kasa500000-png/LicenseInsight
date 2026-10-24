# 공통 UI — STEP-07

디자인 값은 `src/app/tokens.css`, 페이지 기본/셸은 `src/app/globals.css`, 컴포넌트는
CSS Modules를 사용한다. 한국어 시스템 폰트와 명시적인 상태 텍스트를 사용하며 외부 폰트·광고·
분석·UI 라이브러리 의존성을 추가하지 않았다. 입력 경계는 장식용 border와 다른 control-border다.

| 파일 | 컴포넌트 | 호출 계약 |
|---|---|---|
| primitives.tsx | Button, ActionLink, Badge, Alert, Toast, Skeleton, EmptyState, Card, AdSlotPlaceholder | native 버튼/링크 의미 유지, 로딩 중 disabled, 중요 실패는 본문 Alert에 유지 |
| form-controls.tsx | Input, Select, Checkbox, SearchBox, DateField, DurationField | label·hint·error 연결, Enter/버튼 검색 동일, 달력 검증·정수 분 입력 |
| interactions.tsx | Tabs, Dialog | roving tab/방향키/Home/End, modal 초기 focus·양방향 Tab 순환·Esc·trigger 복귀 |
| data-display.tsx | SourceStamp, FreshnessNotice, ScheduleRow/ScheduleEventRow, QualificationCard, NextActionCard, StatisticSummary, DataTable, AccessibleChart, CompareTray, PlanWeekCard | 전달된 값과 출처/기준만 표시, 계산·수집·저장 없음 |
| chart-boundary.tsx | ChartBoundary | 차트의 client render 오류만 격리하며 대체 표는 바깥에서 유지 |

날짜/통계/계획 계산은 `src/domain`을 사용한다. 표시용 문자열을 받아 공식 근거를 추정하지 않는다.
null은 미확인/산출 불가다. SourceStamp의 공식 발표·수집·자동 검증·운영자 대조 시각을 구분하고
없는 시각을 현재 시각으로 채우지 않는다. 모든 데이터 블록의 기준/범위/출처 전달은 호출자 책임이다.

`DurationField`는 `value`/`onValueChange`로 마지막 유효 정수 분을 전달하고 invalid draft를
사용자가 수정할 수 있도록 유지한다. **부모 검증/저장 버튼은 `onValidityChange`도 연결해야 한다.**
두 native input의 customValidity도 설정하여 form.checkValidity()/reportValidity()/native submit이
잘못된 입력을 차단한다. 실제 입력 변경/외부 prop 변경에 유효성을 갱신한다. 부모는 첫 오류로
focus를 옮기고 잘못된 draft에서 이전 유효값을 새 제출로 사용하지 않아야 한다.

Tabs는 자동 활성화 방식이며 disabled 탭을 건너뛴다. Dialog는 native modal의 inert 동작과
명시적인 Tab/Shift+Tab 순환을 병행한다. 닫힌 뒤 원래 trigger로 focus를 복귀시킨다.
이번 검증 범위는 일반 입력/버튼이다. iframe·shadow DOM·복합 위젯의 focus 관리와 실제 보조기기
조합은 별도 검증해야 한다. 차트의 서버 렌더링 오류는 client boundary가 처리하는 범위가 아니다.

`/ui-gallery`는 APP_ENV=local/test에서만 열리는 합성 컴포넌트 검증 경로다.
preview/production은 proxy와 서버 guard가 차단한다. query/localStorage로 변경할 수 없다.
제품 nav에서 연결하지 않고 noindex·광고 OFF를 유지한다. 합성 예제는 운영 데이터 fallback이 아니다.
저장 실패는 표시 상태 예시이며 실제 저장소 adapter의 실패 복구를 증명하지 않는다.

모바일은 홈/일정/비교/내 준비 네 메뉴와 safe-area를 사용한다. ResizeObserver로 실제 메뉴 높이를
측정하여 본문/푸터 여백과 scroll-padding을 예약한다. 일정·비교·내 준비 목적지는 현재 **준비 중 셸**이며
필터·비교 계산·관심/계획 저장은 후속 STEP에서 구현한다. 홈페이지의 검증 데이터 빈 상태를 유지한다.

검증 명령은 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`다.
빌드는 필수 APP_ENV/DATA_MODE를 명시해야 한다. `node scripts/check-ui-gallery-isolation.mjs`는
로컬 loopback 서버에서 환경별 접근을 확인하고 자신이 시작한 서버만 종료한다.
실제 실행 결과·스크린샷·제한은 [STEP-07 보고서](../../../docs/reports/STEP-07.md)를 따른다.
