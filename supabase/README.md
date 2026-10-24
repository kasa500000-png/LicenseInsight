# STEP-04 로컬 DB 경계

PostgreSQL 17 이상용 최초 migration이다. Supabase CLI **2.121.0**의 실제
`migration new foundation_schema_rls`로 파일명을 생성하고 SQL을 작성했다.
키·seed·원격 project link·개인 학습기록 테이블은 없다.

## 재현

Docker 로컬 Unix socket과 Python 3.11 이상이 필요하다.

```sh
pnpm test:db
python3 scripts/generate-db-types.py test-results/database/qi_first-metadata.json --check
```

명령은 고정 digest의 PostgreSQL 컨테이너를 새로 만들고 `qi_first`와 `qi_replay`
두 새 DB에 migration을 적용한다. 기존 컨테이너/DB는 사용하지 않는다.
컨테이너는 `network=none`, TCP listener 없음, 호스트 포트/사용자 볼륨 없음,
tmpfs 데이터 경로이며 trust 인증은 이 격리 컨테이너의 Unix socket에만 사용한다.
테스트 fixture는 이 컨테이너에만 삽입하고 실행마다 고유 label 확인 후 컨테이너를 제거한다.
실패해도 종료 시 정리를 시도하며 결과 JSON의 cleanup을 확인한다.
결과 기본 경로는 `test-results/database/`다. 이미지 pull만 외부 네트워크를 사용한다.

실제 PostgreSQL 제약/GRANT/RLS 검증이며 Supabase Auth·JWT·PostgREST를 실행한 검증은 아니다.
`SET LOCAL SESSION AUTHORIZATION`으로 각 DB 역할의 세션 권한을 낮춘다.
로컬 `config.toml`은 공개 schema만 노출하고 자동 grant와 seed를 끈다.
이 설정의 HTTP 적용, 원격 Dashboard의 노출 schema, Supabase CLI의 전체 start/reset은 NOT_RUN이다.

## 권한과 다음 구현 경계

| 주체 | 허용 | 거부 |
|---|---|---|
| anon / authenticated / 관리자 브라우저 | 검토된 published 자료 SELECT | 초안·internal·모든 쓰기·capability role 전환 |
| qi_ingestion (NOLOGIN) | 원천 설정 읽기, staging/실행 기록, 감사 append | 공개 게시·역할 관리·원문 snapshot 수정·삭제 |
| qi_admin_server (NOLOGIN) | 내부 조회, 검토/override, 공개본 INSERT/UPDATE, 감사 append | 역할 자가 부여·역사 삭제·원문/감사 수정 |
| service_role | 이 migration의 자료 접근 권한 없음 | BYPASSRLS가 GRANT를 대신하지 않음 |

두 capability role에는 브라우저 membership이 없고 로그인도 발급하지 않았다.
운영 role 연결은 별도 대상·승인과 최소 권한 설계가 필요하다.
`internal.has_admin_role`은 SECURITY INVOKER이며 role 확인만 수행한다.
미래 서버 경로는 매 요청마다 다음 순서를 지켜야 한다:

1. 서버에서 검증된 세션으로 사용자 UUID를 확정한다. body/query/user_metadata의 역할을 신뢰하지 않는다.
2. 현재 `internal.admin_roles`를 조회하여 필요한 reviewer/publisher 권한을 확인한다.
3. 권한 확인과 기대 revision 검사를 게시 transaction 안에서 다시 수행하고 audit를 append한다.
4. 오류·관리 응답은 private/no-store로 반환한다. 서버 자격증명은 브라우저에 전달하지 않는다.

이 문서는 서버 경로의 설계이며 로그인·server action·원자적 게시 엔진 구현 완료가 아니다.
실제 수집/게시 transaction은 STEP-05, 관리자 로그인/검토 UI는 STEP-14 범위다.
위 문단은 STEP-04 당시 경계다. STEP-05에서 로컬 invoker 수집/검토/게시 transaction과 실제 SQL·node-postgres 통합을 구현·검증했다.
현재 경계는 [수집 안내](../src/server/ingestion/README.md)와 [STEP-05](../docs/reports/STEP-05.md)를 따른다. 실제 Auth/관리자 HTTP handler는 계속 미구현이다.
DB 소유자는 RLS를 우회하므로 일반 공개 읽기에 사용하지 않는다.
다른 DB 생성자가 객체를 추가하면 그 생성자의 default privileges도 별도로 검증해야 한다.

## 타입과 데이터 주의

`src/data/database.types.ts`는 실제 row-free catalog에서 생성한 SQL repository 경계 타입이다.
Supabase CLI SDK 타입 생성 결과가 아니며 아직 DB driver/repository를 연결하지 않았다.
향후 decoder는 bigint/numeric의 정밀도를 유지하고 날짜/시각을 ISO 문자열로 변환해야 한다.
PostgREST가 이미 JSON number로 반올림한 값을 사후 문자열 변환해 복구할 수는 없다.
STEP-05 공개 repository는 실제 SQL에서 bigint/numeric/date를 text, timestamptz를 UTC ISO text로 조회한 뒤 DTO를 검증한다.
`safe_text`와 public_notice는 HTML로 실행하지 않는다. URL allowlist의 추가 host는 실제 명세 검증 후 변경한다.
원문 payload의 키 제거·크기 제한·실제 crosswalk·중복 범위 충돌 검토는 STEP-05 수집 경계에서 검증한다.

공식 검토 근거: [GRANT/API 보안](https://supabase.com/docs/guides/api/securing-your-api),
[RLS와 view](https://supabase.com/docs/guides/database/postgres/row-level-security),
[수동 migration](https://supabase.com/docs/guides/deployment/managing-environments),
[공식 changelog](https://supabase.com/changelog.md).
