# 기술 아키텍처와 구현 경계

상태: 구현 전 설계. 특정 계정·프로젝트·버전·배포는 아직 확인하지 않았다.
기준 기술: Next.js App Router / TypeScript / Supabase Postgres. 공식 문서 [S10~S13].

## 시스템 경계
```text
[공공데이터 API 5종]
  -> 서버 전용 source adapter (키·쿼터·파싱)
  -> 내부 스냅샷 / staging / 검증 / 매핑 / 변경 검토
  -> 트랜잭션으로 공개 projection 갱신
  -> 공개 읽기 repository -> Next.js 서버 HTML + 캐시
  -> 방문자 브라우저 (관심·계획·ICS·JSON 생성)

[운영자] -> 검증된 로그인 -> 서버 권한 확인 -> 검토/게시/재수집 -> 감사로그
[광고/분석] -> 환경 + route + 운영 설정 + 동의 확인 -> 독립 어댑터
```
MVP에 지도·벡터 DB·메시지 큐 서비스·실시간 AI·방문자 계정은 필요하지 않다.
대규모 별도 검색엔진·마이크로서비스도 먼저 만들지 않는다.

## 계층
| 계층 | 책임 | 금지 |
|---|---|---|
| src/domain | 일정·통계·계획 순수 함수, 명시적 clock 입력 | DB·환경변수·브라우저 접근 |
| src/data/adapters | 외부 응답 해석·버전별 변환 | UI·개인계획 처리 |
| src/server | 비밀키·DB 쓰기·수집·관리 권한 | 브라우저 번들 export |
| src/data/repositories | 공개 projection 조회, pagination | 방문자 요청별 공공 API 호출 |
| src/components | 접근 가능한 UI, typed props | source 원문 파싱·비율 중복 계산 |
| src/features/local-plan | 브라우저 저장·계획 편집·내보내기 | 서버 개인 기록 전송 |
| content/guides | Git 기반 검토된 설명 글 | 외부에서 받은 실행 가능한 MDX |

## 권장 코드 구조 — STEP-03에서 실제 생성
```text
src/app/(public)/...
src/app/(personal)/my-plan/...
src/app/admin/...
src/app/api/...                # 실제 필요한 경로만
src/components/ui/...
src/components/qualification/...
src/domain/{date,statistics,planner}/...
src/data/{adapters,repositories,schemas}/...
src/server/{auth,ingestion,publication}/...
src/features/{favorites,local-plan,exports}/...
content/guides/...
tests/{unit,integration,e2e,fixtures}/...
supabase/migrations/...
docs/reports/...
```
Route Group은 URL을 바꾸지 않는 구현 분류안이다. 동일 URL을 두 파일로 생성하지 않는다.
기존 저장소가 있으면 구조를 조사하고 동일 책임의 기존 모듈을 재사용한다.

## 서버·브라우저·환경
공개 상세의 제목/핵심 날짜/통계 표/출처는 서버 HTML에 존재한다.
차트·관심 버튼·계획 편집기만 필요한 범위에서 client component로 둔다.
SSR 첫 렌더에서 localStorage를 읽지 않는다. hydration 중 개인기록을 빈 값으로 덮어쓰지 않는다.
관리자 관련 응답은 private/no-store로 처리하고 공개 캐시에 섞지 않는다.
서버 공개 읽기는 publishable/일반 읽기 권한으로 실행한다. service role은 수집/승인된 관리 작업만.

## 데이터 제공 모드
- `DATA_MODE=fixture`: 로컬·테스트·인증 보호된 preview 전용. 명확한 데모 배지, noindex, 광고 OFF.
- `DATA_MODE=live`: 검증된 DB 공개본만 읽는다. 데이터가 없으면 빈 상태/오류를 표시한다.
- production에서 fixture 또는 fixture fallback이면 startup/build gate 실패.
`NODE_ENV=production`만으로 공개 운영을 판단하지 않는다. preview build도 production 최적화일 수 있다.
실제 배포 환경과 허용 호스트를 별도 `APP_ENV`/검증된 설정으로 판정한다.

## 캐시 설계
정적인 소개/대표 페이지 metadata는 장기 캐시 가능. 일정·통계는 source version 기반 태그를 쓴다.
기본 일정 캐시 TTL은 최대 1시간을 제안하되 자정·확인된 이벤트 경계를 넘겨 잘못된 상태를 유지하지 않는다.
현재 상태는 명시적 한국 날짜 기준으로 재계산한다. stale 데이터에서는 과한 현재형 CTA를 제한한다.
수집 성공 이후에만 연관 종목 캐시를 갱신한다. 실패 응답을 정상 데이터처럼 캐싱하지 않는다.
호스팅 프레임워크별 API 이름은 구현 시 공식 버전에 맞게 선택하고 단위·통합 테스트로 검증한다.

## 동시 수집·부분 공개
수집 범위는 source + operation + qualification/grade + year + track으로 명시한다.
동일 범위 lease/lock과 run_id로 중복을 제한한다. 여러 범위 중 하나 실패 시 다른 정상 범위는 보존한다.
해당 범위의 모든 페이지가 성공해야 staging을 검증 완료로 전환한다.
게시 transaction이 실패하면 공개본과 dataset_status 모두 이전 버전으로 유지한다.
빈 응답/일정 정정은 자동 대량 DELETE 신호로 사용하지 않는다.

## 장애 경계
공공 API 장애: 마지막 정상 공개본 + 갱신 지연.
DB 장애: 안전한 기존 캐시가 있으면 기준시각과 함께 표시, 없으면 재시도·공식 출처.
광고/분석 장애: 핵심 조회·저장·내보내기 정상 유지.
브라우저 저장 오류: 메모리 모드 + 비영구 안내 + JSON 내보내기.

## 개발·CI
패키지 관리자는 기존 lockfile을 우선한다. 새 저장소는 하나를 선택하고 혼용하지 않는다.
프레임워크·Node·Supabase·test runner 버전은 공식 지원 확인 후 고정한다.
CI 기본: lint/typecheck/unit/build + fixture E2E. 키가 필요한 live integration은 승인된 비공개 환경에서 별도.
fork PR에는 운영 비밀키를 제공하지 않는다. `pull_request_target`으로 미검토 코드를 비밀키와 함께 실행하지 않는다.
