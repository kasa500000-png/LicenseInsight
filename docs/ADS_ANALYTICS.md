# 광고·분석 설계와 활성화 게이트

MVP 광고 구조는 STEP-16, 실제 활성화는 STEP-20. 광고 없이도 핵심 서비스가 완전하게 작동한다.
AdSense는 웹 광고이며 기존 모바일 AdMob 설정/ID를 그대로 사용하지 않는다.
정책의 근거는 SOURCES.md [S08][S14][S16][S20]. 아래 세부 배치는 우리 제품의 보수적 설계다.

## 기본 OFF
실광고 로더 호출 조건을 하나의 서버 정책으로 중앙화한다.
조건: 승인된 production host + APP_ENV=production + ADS_ENABLED=true + 계정/사이트 승인 검토 +
route allowlist + 정상 publisher content + 필요한 동의 조건 + 관리자/테스트 세션 제외.
정확한 정책/지역별 동의 방식은 실제 광고 구현 시 재확인한다. 직접 만든 배너로 모든 요구를 충족했다고 하지 않는다.
데이터 fixture·preview·e2e는 ADS_ENABLED를 잘못 설정해도 fail-closed로 차단한다.
클라이언트 query/localStorage는 광고 허용 권한의 근거가 아니다. 테스트 비활성 값은 광고를 끄는 방향으로만 가능.
운영자/자동화 검증은 인증된 광고 억제 테스트 경로 또는 광고 OFF 환경에서 진행한다.

## 초기 슬롯
검수된 종목 상세의 핵심 일정 이후 / 충분한 자체 해설 뒤의 제한된 슬롯부터 시작.
내 준비, 관리자, 로그인, 비교/탐색 빈결과, 에러, 초안 화면에는 광고 로더 요청 자체가 없어야 한다.
광고 라벨을 명확히 표시하고 공식 접수 버튼·내비·저장/내보내기 CTA와 분리한다.
전면/앵커/자동 광고는 초기 OFF로 하고 라우트 단위 제어와 레이아웃 영향 검증 후 별도 결정한다.
게재 실패·차단·동의 거부·CMP 오류에도 일정/통계/저장 기능은 작동한다.

## 스크립트 생명주기
한 페이지 lifecycle 내 중복 loader 삽입을 막는다. SPA route 전환·strict mode에서 중복 초기화 테스트.
동의가 바뀌면 vendor 지침에 맞춰 상태를 갱신하고 임의 개인정보 전송을 시작하지 않는다.
CSP 허용 origin은 실제 vendor 문서와 네트워크 관측으로 최소화하며 '*'로 문제를 숨기지 않는다.
ads.txt와 publisher ID는 사용자가 확인한 실제 계정 값만. 가짜 ID로 승인된 것처럼 화면을 만들지 않는다.

## 분석 — 기본 adapter OFF
이벤트: qualification_view, comparison_completed, favorite_saved, plan_created, plan_saved,
calendar_exported, official_link_clicked.
허용 속성 예: 내부 종목 ID, stage, 기준연도, device category, event 종류.
금지: 이름/이메일/IP를 직접 속성으로 수집, 자유검색 원문, 학습 자유문구, 개인계획 JSON, 토큰, 광고 click 자체 추적.
집계 세션은 공급자/동의/보존 정책을 검토해 선택한다. fingerprint로 추적 거부를 우회하지 않는다.
동의 거부/차단으로 누락되는 사용자가 있어 관측 기반 지표임을 표시한다.

## 핵심 지표
상세 방문 세션 중 관심저장/계획저장/내보내기/공식이동 하나 이상 수행한 세션 비율.
세션당 여러 행동은 전환율 분자에서 1회. 정의·관측누락을 문서화한다.
월 수익 = PV/1000 × 실측 page RPM. 실제 수치 전에는 예시 계산과 실측을 구분한다.
광고 CTR 높이기를 위해 클릭을 유도하거나 방문·광고 클릭 자동화를 하지 않는다.

## QA
- local/preview/e2e/admin/개인계획에서 광고 도메인 request 0.
- production 설정에서도 fixture면 시작/배포 실패.
- ad blocker, vendor timeout, CMP 오류, 거부/동의 철회, route 전환, 중복 mount.
- 레이아웃 높이·CLS·핵심 버튼 접근 확인; 실광고를 자동 클릭하지 않음.
- kill switch OFF 뒤 후속 광고 요청이 중단되는 실제 정책을 검증. 전파 지연과 재배포 필요 여부 기록.

## 활성화 체크
실제 광고 승인, 올바른 사이트/ID, 정책·개인정보·동의 검토, production 대상 확인,
운영자 승인 근거, 광고 OFF 회복 방법, 비용/성능 기준선이 준비되어야 한다.
승인 대기면 STEP-20은 BLOCKED/PARTIAL이다. 서비스는 광고 OFF로 유지할 수 있다.
