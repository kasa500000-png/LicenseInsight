# 내부 애플리케이션 API / Repository 계약

이 문서는 우리 웹 내부 계약 제안이며 공공 API 명세가 아니다.
서버 컴포넌트가 직접 repository를 호출해도 된다. 필요하지 않은 REST endpoint를 전부 만들지 않는다.
경로·쿼리는 STEP-03/08에서 실제 저장소 구조에 맞춰 고정하고 호출부와 테스트를 함께 수정한다.

## 공통
공개 목록 기본 limit 20, 최대 50; 긴 검색어·중복 ID·허용되지 않은 sort를 검증한다.
response에 원천 raw, secret, 관리자 기록을 넣지 않는다. 모든 URL은 서버 allowlist 또는 내부 경로로 만든다.
실데이터 모드는 typed nullable 값을 사용한다. missing field를 빈 문자열/0으로 일괄 바꾸지 않는다.

| 계약 | 입력 | 출력/행동 |
|---|---|---|
| listQualifications | q 최대80자, grade/domain, cursor, limit | items, nextCursor, total(확인 가능 시) |
| getQualification | slug | public qualification + feature별 상태 + provenance |
| getExamEvents | qualificationIds 최대10, 연/월/기간, stage/type | 정규화된 events, scope, data status |
| getPassStatistics | qualificationId, 검증된 year range, stage | rounds/officialAnnual/derivedAnnual 분리, 표본·완전성 |
| compareQualifications | unique ids 최대3, year, stage | 같은 기준의 columns, missingReason, warnings |
| getGuide | slug | 검토 후 published된 안전한 본문·출처 |
| getPublicStatus | 선택 scope | 운영 상태 요약만; 내부 오류/키 없음 |

## 필요 시 구현할 route 예
`GET /api/qualifications`, `GET /api/qualifications/[slug]`, `GET /api/calendar`,
`GET /api/compare`, `GET /api/status`.
서버 렌더링에 충분하면 GET route를 추가하지 않고 같은 typed service를 재사용한다.
GET 요청으로 DB 쓰기·전체 API 수집을 시작하지 않는다.

## 오류
400 입력 오류, 401 인증 없음, 403 권한 없음, 404 미존재/비공개 자원,
409 revision 충돌, 429 속도 제한, 503 의존 서비스 제공 불가.
빈 검색결과는 200 + items=[]이다. upstream에 항목이 없다고 전체 서버 500으로 바꾸지 않는다.
부가 통계 실패 때문에 정상 종목/일정 페이지를 404로 만들지 않는다.
requestId는 안전한 추적용 값이고 인증키/사용자 이메일을 넣지 않는다.

## 관리자
`GET /api/admin/sync-runs`, `GET /api/admin/reviews`는 권한 있는 server handler를 통해서만.
`POST /api/admin/reviews/[id]/approve|reject`, `POST /api/admin/sync`,
`POST /api/admin/qualifications/[id]/publication`은 입력 검증·CSRF/Origin 확인·서버 역할 확인·rate limit·audit.
mutation 입력에는 `expectedRevision`과 `reason`을 포함한다. 오래된 검토는 409.
중복 sync 버튼은 동일 scope active run을 돌려주거나 안전하게 거절한다. 무한 작업 생성 금지.
자동 예약 수집 endpoint는 플랫폼이 요구하는 HTTP method를 허용하되 별도의 machine 인증과 idempotency가 필수다.
그 경로는 방문자 UI의 GET 수집 경로가 아니다. 인증 전에는 절대로 호출하지 않는다.

## 개인기록
관심 저장·계획 생성·계획 JSON·개인 ICS는 브라우저에서 처리한다.
`POST /api/plans` 같은 개인기록 서버 API는 MVP에 만들지 않는다.
compare 공유 URL에는 종목 ID/연도/단계만 허용한다. 학습 내용/개인 자유문구 금지.

## 상태 응답 예 — 데이터 없는 계약 샘플
```json
{
  "data": null,
  "status": {"availability": "unknown", "freshness": "unknown", "verification": "pending"},
  "provenance": {"sourceUrl": null, "fetchedAt": null, "validatedAt": null, "reviewedAt": null},
  "warnings": [{"code": "NO_VERIFIED_DATA", "message": "확인 가능한 자료가 없습니다."}]
}
```
이 샘플은 실제 API 응답이 아니며 외부 provider payload로 사용하지 않는다.
