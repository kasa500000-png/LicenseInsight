# STEP-02 공공 API probe 계약

[public-api-sources.json](public-api-sources.json)은 공개 명세·계정 승인·인증 호출을 구분하는 준비 계약이다. 이번 DS-01~05 공개 카탈로그 재조회는 모두 HTTP503이었다. `confirmed`는 미확인/null로 유지하며 `inherited_unverified`는 이전 기획의 참고 자료다. 실행 가능한 운영 어댑터가 아니다.

실제 확인 결과와 3종목 지원 범위는 [API_VALIDATION 보고서](../reports/API_VALIDATION.md)를 따른다. 실제 종목코드·등급 crosswalk·일정·통계·수수료는 아직 검증하지 못했다.

## 키 없는 오프라인 실행

저장소 루트에서 Python 3.12 표준 라이브러리로 실행한다. 앱 패키지 설치·STEP-03 scaffold는 필요하지 않다.

```sh
python scripts/api_proof_contract.py --help
python scripts/api_proof_contract.py --preflight --output docs/reports/evidence/step-02/preflight.json
python -m unittest discover -s tests -p 'test_api_proof_contract.py' -v
```

preflight는 환경변수 존재 여부만 보고하고 실제 키 값이나 `.env`를 읽지 않는다. **차단 상태는 exit 3**이며 API 성공이 아니다. 현재 CLI는 네트워크 전송을 구현하지 않았다. 키가 생겨도 자동 호출하지 않는다. 후속 실검증에는 공식 operation·HTTPS 경로·실제 승인·쿼터 확인과 별도 검토한 호출 구현이 필요하다.

`scripts/api_proof_contract.py`의 요청 조합과 응답 판독은 [synthetic fixture](../../tests/fixtures/synthetic/api-proof/README.md) 전용 실험이다. 호스트는 HTTPS `.invalid`만 허용하고 공식 호스트·미확인 계약은 거부한다. 오류 코드 `00/30/22`, wrapper, pagination 의미는 합성 규칙이며 실제 공공 API와 일치한다고 확인한 것이 아니다.

테스트는 앞자리 0 보존, 명시적인 key 인코딩·대소문자, credential을 제외한 요약, 단건/다건/빈 응답, HTTP/업무 오류, XML DTD·중복 필드·크기·깊이 제한, 전체 페이지 완결성, 정확한 이름·등급·연도의 검토 매핑을 다룬다. 중복 판정은 **동일 합성 레코드 전체 내용**에 한정한다. 실제 source의 안정 식별자·날짜 정정·DB 멱등성·last-good 보존·운영 fixture 차단은 구현/검증하지 않았다.

`tests/fixtures/recorded`는 만들지 않았다. 합성 테스트 통과는 G0·실호출·공식 대조 통과가 아니다. 실제 실행 명령과 결과는 [STEP-02 보고서](../reports/STEP-02.md)에 남긴다.
