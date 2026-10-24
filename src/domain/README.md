# 날짜·통계·계획 계산 엔진 — STEP-06

UI/API/DB에 의존하지 않는 순수 함수다. `index.ts`에서 `dates`, `statistics`,
`planner` namespace를 내보낸다. 현재 시각은 `{now: "2026-10-20T15:00:00Z"}`처럼
호출자가 주입한다. 환경변수·네트워크·저장소·브라우저 상태를 읽지 않는다.
일반 입력 오류는 `{ok:false,code,fieldErrors}`이며 원문을 오류에 복사하지 않는다.
성공은 `{ok:true,value,warnings}`이고 표시 문구는 호출 UI가 상태 코드로 만든다.

| 모듈 | 주요 API | 계산 계약 |
|---|---|---|
| date.ts | `parseLocalDate`, `daysBetween`, `addDays`, `weekday`, `todayInSeoul`, `dDay` | Gregorian 0001~9999년, ISO 요일 월1~일7, 한국 달력 날짜 차이 |
| date.ts | `evaluateSchedule`, `selectNextEvent`, `suggestPlanTarget` | 날짜/정밀시각·단일/기간 독립, 단계별 후보·안전 상태·목표일 제안 |
| statistics.ts | `summarizeStatistics`, `formatRate`, `compareStatistics` | 문자열 정수/유리수 정밀도, 회차·공식연간 분리, 합산 비율·%p |
| planner.ts | `createPlan`, `recalculatePlan` | 시작일 포함·목표일 제외, 정수 분·제외일·명시적 완료 기록 재계산 |

정밀시각은 명시적인 offset/Z와 최대 6자리 소수초를 검증하며 `[시작, 종료)`로
판정한다. 날짜만 있는 접수 당일은 시각 확인이 필요한 상태다. 휴일·예외·개인 자격을
자동 확정하지 않으며 `registrationGuaranteed`는 항상 false다. 검증 시각이 없거나
검토/변경 중이면 다음 행동 후보를 억제한다. 기본 stale 경계는 **48시간 초과**이며
`staleAfterHours`로 명시적으로 변경한다. 취소/공식 미발표는 별도 검증 근거가 필요하다.
같은 날짜의 혼합 시각 정밀도는 날짜 전용 확인 후보→정밀시각→ID 순으로 결정한다.
이는 알 수 없는 시각을 자정으로 만드는 규칙이 아니다.

기간형 시험의 첫날은 수정 가능한 목표 **제안**이며 개인 시험일을 뜻하지 않는다.
이미 지난 첫날을 오늘로 조작하지 않고 경고한다. 일정 정정은 개인 계획을 자동 변경하지 않는다.

통계 count 입력은 SQL bigint 범위의 정수 문자열 또는 null이며 합계는 그 범위를
넘어도 BigInt로 정확히 계산한다. 반환값은 JSON 직렬화 가능한 문자열이다.
`ExactRate`는 이미 100을 곱한 백분율 유리수다. 표시는 `formatRate`에서만 반올림한다.
0/0은 null, 0/양수는 0.0%다. 같은 source/logical key/revision의 완전히 같은 행만
제거한다. 수정본 충돌·서로 다른 키의 같은 회차는 임의 선택 없이 검토 대상으로 둔다.
공식 연간 행은 회차 합산에 더하지 않는다.

완료 연도·확인된 예상 회차·누락 없음·검증된 count가 갖춰져야 자체 연간을 complete로
표시한다. 당해 연도는 partial이다. 원천 비율은 원문/정밀도/확인된 반올림 방식과 함께
유지하고 half_up/버림을 정확히 검사한다. 방식 미확인은 검토 대상이다. 비교는 입력 요약을
재계산하여 오염된 count/rate/범위를 거부하고, 같은 모집단·완료 범위와 확인된 연속성이
없으면 보류한다. 공식 출처의 coverage/반올림/연속성 근거는 호출자가 별도로 검증해야 한다.
이 엔진은 난이도나 개인 합격 확률을 산출하지 않는다.

계획은 요일별 0~1440 정수 분, 단계/항목별 0~1,000,000 정수 가중치를 받는다.
기본 최대 기간 366일(`DEFAULT_MAX_PLAN_DAYS`), 명시 설정 상한 3660일이다.
단계·항목·일별 배분은 최대 나머지와 입력 순서로 분을 보존한다.
완료 기록이 있으면 `preserve` 또는 `reset`을 명시해야 한다. 보존한 완료 분이 새 날짜·시간·
항목 할당과 충돌하면 기존 계획을 변경하지 않고 `COMPLETED_WORK_CONFLICT`를 반환한다.
새 계획은 과거 시작일을 거부한다. 진행 중 계획의 재계산은 지난 날짜의 보존된 완료 분만
인정하고 미완료 분은 오늘 이후에 배정한다. 새 요일 시간으로 과거 완료 기록을 축소하지 않는다.
재계산 목표일은 오늘 이후여야 하며 reset을 선택하면 과거 날짜의 배정은 0분이다.
입력과 이전 계획은 변경하지 않는다. 완료 기록 저장/새로고침 복원·사용자 선택 UI는 STEP-09다.
공식 필요 학습시간은 추정하지 않으며 `officialRequiredHours:null`이다.

검증은 `pnpm test`, `node scripts/check-domain-timezones.mjs`로 실행한다.
`tests/fixtures/synthetic/domain/calendar-oracles.json`의 날짜·요일·capacity는 Python
`datetime.date`로 독립 산출했다. E2E의 합성 결과 화면은 `page.setContent`로 메모리에만
생성하며 앱 route·public fixture·데이터 fallback으로 제공하지 않는다.
실제 결과와 제한은 [STEP-06 보고서](../../docs/reports/STEP-06.md)를 따른다.
