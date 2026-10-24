# STEP-02 합성 probe fixture

이 디렉터리의 JSON/XML은 오프라인 계약 테스트를 위해 직접 만든 **synthetic** 자료다. 실제 API 응답·공식 명세·recorded 자료가 아니며 운영에 게시할 수 없다. 실제 호출 없이 만들었다.

- `request-contract.json`의 호스트는 연결할 수 없는 예제용 `.invalid` 도메인이다. operation도 테스트 전용 문자열이다.
- 종목명 `합성종목A/B`, 코드 문자열 `0007/0012`는 앞자리 0 보존을 확인하는 가상 표식이다. 전기기사·전기산업기사·전기기능사와 연결하지 않는다.
- 업무 코드 `00/30/22`는 성공·인증·쿼터 사례를 나누는 합성 규칙이다. 실제 공급 API의 오류 코드 확인을 대신하지 않는다.
- `unsafe-doctype.xml`은 DTD/외부 엔티티 거부 테스트다. 파일·네트워크 접근을 수행해서는 안 된다.
- [manifest.json](manifest.json)에 출처 구분과 각 fixture SHA256을 기록했다. `tests/fixtures/recorded`는 이번 작업에서 만들지 않았다.

테스트 실행 명령은 저장소 루트에서 `python -m unittest discover -s tests -p 'test_api_proof_contract.py' -v`다. 문서에 명령이 있다는 사실은 실행·통과 증거가 아니다. 실제 실행 결과는 STEP-02 보고서가 기록한다.
