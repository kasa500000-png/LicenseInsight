# 한 종목 상세 — STEP-08

`createQualificationDetailService(repository, options).loadDetail(slug, clock)`는 공개 repository DTO를 일정·통계 도메인에 연결한다. 요청 내부에서 인스턴스를 만들며 모듈 전역 캐시를 두지 않는다. 자격·원자료 읽기만 같은 인스턴스 안에서 중복 제거한다. 호출마다 주입한 시계로 한국 날짜·일정·통계 기준연도를 다시 평가한다. 조회 실패와 없는 종목은 memo에서 제거하며, 반환 모델은 복제해 호출자의 변이가 다음 평가를 바꾸지 않게 한다.

- 종목 slug 조회 → 2개 일정 연도·최대6개 통계 연도·부가정보·데이터셋 상태를 병렬 조회한다. 각 목록은 50개씩 최대10페이지이며, 잘림·실패를 완료 또는 빈 결과로 단정하지 않는다.
- 일정·통계·부가정보·상태 조회를 각각 격리한다. 상태를 확인할 수 없거나 pending/stale이면 다음 행동을 제안하지 않는다. 공개 projection의 검증된 일정만 announced로 변환하며 휴일·예외와 개인 응시자격은 확인되지 않은 상태다.
- 기존 통계 DTO에 없는 모집단·반올림·예상 회차는 live에서 추정하지 않는다. 합성 모드에서만 그룹·정확한 revision 집합에 결합된 명시적 fixture 근거로 계산한다. live + syntheticEvidence 조합은 거부한다. 공식 연간 자료는 회차 합산에 더하지 않는다.
- `official-url.ts`는 공식 HTTPS host, 명시적 포트·userinfo·fragment 부재, 민감 query 이름과 중첩 인코딩을 검사한다. 오류 원문과 주입된 DTO의 추가 필드는 화면에 보내지 않는다.

현재 제품의 실데이터 상세 route와 DB client factory는 연결하지 않았다. G0와 검증된 종목이 없기 때문이다. `/qualifications/*`는 미등록404다. 새 `PublicRepository.getQualificationBySlug`는 mock SQL 계약만 검증했으며 실제 PostgreSQL 실행은 이번 STEP에 하지 않았다.

독립 가능한 화면은 `/detail-demo/synthetic-electrical`이다. local/test 환경만 허용하며 `DATA_MODE=live`여도 명시적 합성 경로로만 동작한다. preview/production에서는 proxy와 서버 페이지가 차단하며 query로 허용할 수 없다. 테스트 레코드는 `tests/fixtures/synthetic/detail`에만 있고 실제 종목코드는 없다. 합성 평가 시계는 2026-10-21 12:00 한국시간으로 고정한다.

핵심 상세는 `force-dynamic`·`no-store`로 제공하고 공통 streaming loading 경계 밖에서 렌더한다. 연도·필기/실기 변경은 native GET form이므로 JavaScript 없이도 HTML과 표를 읽고 선택할 수 있다. HTTP 캐시/서버 전역 캐시는 도입하지 않았고 source revision을 사용하는 운영 캐시·무효화는 검증되지 않았다.

관심/계획 링크는 준비 중인 `/my-plan` 진입만 제공한다. 저장·성공 알림·개인 데이터 전송은 구현하지 않았다. 실제 저장·편집은 STEP-09 범위다. 실 API·원격 DB·공개 배포를 완료한 상태가 아니다. 실행 근거와 제한은 [STEP-08 보고서](../../../docs/reports/STEP-08.md)에 기록한다.
