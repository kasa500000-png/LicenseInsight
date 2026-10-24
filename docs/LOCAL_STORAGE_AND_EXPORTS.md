# 브라우저 저장·계획 내보내기 계약

개인기록 서버 저장은 MVP 제외. 기능은 localStorage 중심으로 구현하고 데이터 삭제 가능성을 명시한다.
JSON은 P0 내보내기만. 파일 가져오기·복원 UI는 후속 기능이다.

## 저장 envelope
key 예: `qi:user-state:v1`. 타 앱의 localStorage key를 읽거나 삭제하지 않는다.
```json
{
  "schemaVersion": 1,
  "updatedAt": "synthetic-placeholder",
  "revision": 1,
  "favorites": [],
  "plans": []
}
```
위 문자열은 타입 설명용이며 실제 timestamp가 아니다. 구현 시 ISO instant를 저장한다.
favorite는 내부 qualification ID만. plan은 id,종목/단계,start/target LocalDate,요일별분,제외일,
학습항목,배분 결과,체크 상태,생성/수정시각,근거 공식 event ID/revision(있을 때)을 포함한다.

## 읽기·쓰기
hydration 전 localStorage 접근 금지. 초기 read 완료 전에 빈 기본값을 자동 write하지 않는다.
스키마 검증 후 사용하고 손상 JSON은 안전한 임시 모드로 분리한다. 강제 초기화 전에 원본 내보내기 경로 제공.
쓰기 실패/quota/security error는 catch하고 메모리 모드로 전환해 상태를 명시한다.
기본 최대 관심10개. 계획 수와 입력 길이/저장크기 상한은 구성 가능하고 UI에서 설명한다.
마이그레이션 함수는 버전별로 테스트하고 원본을 보존한 뒤 성공할 때만 새 버전으로 교체한다.
다른 탭의 변경은 storage event/revision으로 감지하고 현재 편집을 조용히 덮어쓰지 않는다.
자유문구는 plain text로 저장/표시하며 innerHTML로 렌더링하지 않는다.

## ICS — RFC 5545 [S19]
검증된 라이브러리의 기능·유지보수·라이선스를 확인해 사용한다.
날짜만 있는 공식 이벤트는 DTSTART;VALUE=DATE와 배타적 DTEND를 사용한다.
2026-11-01~2026-11-03의 가상 기간이면 DTSTART=20261101, DTEND=20261104.
개인 계획이 공부 분량만 알고 시작 시각을 모르면 종일 이벤트로 하고 DESCRIPTION에 분량을 적는다.
임의 19:00 같은 시각으로 약속을 만들지 않는다. 명시 입력/공식 근거 있는 시각만 datetime으로.
UID는 이벤트 logical ID와 앱 식별자 기반으로 안정적으로 생성한다. 도메인은 실제 확인 값 또는 안전한 로컬 UUID 방식.
줄바꿈/쉼표/세미콜론/backslash escaping, CRLF, UTF-8 line folding은 라이브러리/파서로 검증한다.
공식 URL·기준일·“가져온 일정은 자동 갱신되지 않음” 문구를 포함한다.
수신 캘린더가 중복을 제거하거나 알림을 울린다고 보장하지 않는다. RSVP/초대 메일 발송은 하지 않는다.

## JSON 내보내기
서버 전송 없이 Blob/다운로드로 생성한다. schemaVersion과 exportedAt을 포함한다.
파일은 개인 자유문구를 포함할 수 있으므로 공개 저장소/오류 보고에 첨부하지 않도록 안내한다.
다운로드 filename에는 개인 이름/이메일을 넣지 않는다.

## 테스트
새로고침 유지/처음 read race/저장 거부/손상 JSON/빈값/한도/동시 탭/마이그레이션 실패.
개인 텍스트가 SSR HTML·분석 request·server log·URL에 없는지 검사한다.
ICS round-trip parser, 한국어·특수문자·기간끝 다음날·시간대 테스트.
최소1개 실제 캘린더 가져오기는 사용자 또는 접근 가능한 실제 도구로 검증하고 근거를 남긴다.
도구가 없으면 NOT_RUN으로 남기며 파서 통과만으로 실제 가져오기 완료라고 하지 않는다.
