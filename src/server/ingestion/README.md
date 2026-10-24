# STEP-05 수집·게시 경계

이 모듈은 오프라인 계약과 실제 로컬 PostgreSQL로 검증했다. 공공 API 5종은
`docs/contracts/public-api-sources.json`의 확인된 endpoint/operation/응답이 없어서
`src/data/adapters/source-registry.ts`에서 모두 비활성이다. inherited 값은 연결 설정으로 사용하지 않는다.
공식 소스의 실제 operation별 mapper는 승인된 응답과 명세를 확인한 뒤 작성해야 한다.
현재 transport의 합성 프로토콜은 단위 테스트 안에만 있으며 실제 API 명세를 뜻하지 않는다.

## 흐름

1. `collectAndStage`가 source·환경을 확인한다. 실제 소스는 확인된 registry 활성화가 필요하다.
2. `PostgresIngestionStore.startRun`이 scope의 lease를 잡는다. source+operation+종목+연도+취득방식+데이터종류가 식별 범위다.
3. 매 HTTP 시도 전에 DB 호출 예산을 원자적으로 예약한다. 재시도도 소비하며 lease가 만료되면 새 시도를 거부한다.
4. transport가 크기·깊이·시간·페이지 수·totalCount를 검증한다. redirect/HTTP 강등은 없고 중간 실패는 staging 성공이 아니다.
5. mapper가 CandidateRecord를 만들고 normalizer가 코드 문자열·날짜·정밀도·통계·출처를 검사한다. sourceCode는 확인된 매핑 값이 필요하며 없는 공식 코드를 생성하지 않는다.
6. 정화된 snapshot과 검증된 projection을 staging에 저장한다. 검토된 crosswalk가 정확히 하나가 아니면 격리한다.
7. 별도의 신뢰 서버가 `prepareReview`를 실행한다. 변경 batch는 검토 대기이며 기존 공개본을 보존하고 pending_change를 표시한다.
8. 서버에서 검증한 사용자 identity로 `approveRun`, `publishReviewedRun`을 호출한다. DB는 현재 publisher 역할과 기대 revision/승인 hash를 다시 검사한다.
9. 공개 upsert·dataset_status·audit는 같은 transaction이다. 성공 commit 뒤에만 cache invalidation을 호출한다.

`collectAndStage`는 자동 게시하지 않는다. `publisher` pool과 actor UUID는 서버 인증 경로에서만 전달한다.
현재 HTTP 관리 endpoint·Auth 로그인·cron 실행기는 없다. UUID 인수만으로 사용자 인증이 된 것은 아니다.
`internal.*` 함수는 SECURITY INVOKER이고 비공개 schema에만 있다. 브라우저 역할은 실행할 수 없다.
실제 Supabase Auth/PostgREST·원격 연결은 별도 미검증이다.

## 보존·검토

- 날짜를 event identity에 넣지 않는다. 날짜 정정은 같은 공개 ID를 갱신하며 검토 전에는 이전 값을 유지한다.
- 같은 scope 동시 실행과 만료된 run의 쓰기를 막는다. 서로 다른 scope가 같은 공개 행을 가져가는 것도 막는다.
- 0건·부분 실패·충돌·매핑 모호성은 기존 행을 DELETE하지 않는다. 일부 행의 소멸도 자동 삭제하지 않는다.
- 내용 hash에서 수집/자동검증 시각을 분리하여 동일 내용 재수집이 새 정정으로 바뀌지 않는다.
- A 게시→B 검토대기→A 복귀 시 B 검토와 변경 안내를 정리한다. 기존 사람 검토 시각을 재수집 시각으로 바꾸지 않는다.
- 관련 override가 있으면 활성/만료 여부와 관계없이 `OVERRIDE_REVIEW_REQUIRED`로 막는다. 적용·만료 재검토 workflow는 후속 관리자 구현에서 연결해야 한다.
- 현재 review diff는 batch old/new hash·run·건수다. 항목별 old/new 비교 화면은 STEP-14 범위다.

## 설정과 재현

`pg` **8.23.1**, `saxes` **6.0.0**, `@types/pg` **8.23.1**을 exact lockfile로 설치했다.
Pool은 외부에서 주입한다. 이 모듈은 .env/DB URL을 자동으로 읽거나 다른 프로젝트에 연결하지 않는다.
collector/publisher/일반 읽기 연결을 구분하며 공개 repository는 `anon` 읽기 transaction만 사용한다.
애플리케이션 페이지는 아직 repository에 연결하지 않았다. DB가 없으면 합성 데이터로 대체하지 않는다.

```sh
pnpm test
pnpm test:db
pnpm test:ingestion-db
```

`test:db`는 새 DB 두 개에서 기존 권한과 STEP-05 SQL을 검증한다.
`test:ingestion-db`는 별도 새 Docker DB에 제한된 테스트 login을 만들고 실제 node-postgres로 전체 경로를 검사한다.
TCP/호스트 포트는 없으며 새로 만든 Unix socket 디렉터리만 공유하고 종료 때 컨테이너·디렉터리를 정리한다.
기존 DB·원격 DB 인수는 받지 않는다. 테스트 fixture는 공개 운영 seed 경로에 넣지 않는다.

bigint/numeric는 드라이버가 읽기 전에 SQL에서 text로 변환하며 날짜/시각도 ISO text DTO로 제공한다.
계산 엔진은 큰 수를 Number로 무조건 변환하면 안 된다. published/null/0/연간·회차 구분도 유지해야 한다.
safe_text는 plain text로 렌더링하며 HTML 실행 경로에 전달하지 않는다.

DB의 KST 일별 budget은 내부 상한이다. 실제 공급자의 quota 단위·reset은 아직 UNKNOWN이며 live 연결 전 확인해야 한다.
로그·오류에는 고정 code/안전한 ID·건수만 남긴다. snapshot은 parsed JSON에서 키 필드·credential echo·민감 URL을 제거한 결과다.
원문 retention·스케줄링·복구/운영 모니터링은 STEP-17 범위다.
