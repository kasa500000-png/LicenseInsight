# STEP-03 의존성·공식 지원 검토

확인일: 2026-10-20 UTC. 공개 공식 문서와 npm registry의 실제 metadata를 조회했다. 설치·lint·build·브라우저 실행은 이 하위 작업에서 수행하지 않았다. [기계 판독 근거](evidence/step-03/dependency-research.json)에 URL·HTTP·확인시각·문서 SHA256·peer/engine·선택 이유를 기록했다.

## 실행 환경과 공식 문서

- 현재 executor: Node `24.19.0`, pnpm `11.25.0`. 값은 실제 `--version`으로 확인했다.
- [Next 설치 문서](https://nextjs.org/docs/app/getting-started/installation)는 HTTP200으로 확인했고 최소 Node `20.9`, TypeScript `5.1.0`을 명시한다. 문서 응답은 Markdown이었다. 현재 Next 버전은 별도로 공식 npm metadata에서 확인했다.
- [Node 릴리스 페이지](https://nodejs.org/en/about/previous-releases)와 [공식 Release schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json)은 HTTP200이었다. Node24는 2025-10-28 LTS 진입, 2026-10-20 maintenance 전환, 2028-04-30 지원 종료다. 현재는 maintenance 지원 기간이다.
- Node24.19.0은 Next·ESLint10·Vitest5·Vite8·pnpm11의 명시된 engine 조건에 들어간다. 이것은 metadata 호환 판정이며 실제 설치·동작 성공과는 별도다.

## 권고 exact pin

| 패키지 | 버전 | Node engine | 라이선스 |
|---|---|---|---|
| `next` | `16.4.2` | `>=20.9.0` | MIT |
| `react` | `19.3.1` | `>=0.10.0` | MIT |
| `react-dom` | `19.3.1` | `명시 없음` | MIT |
| `typescript` | `6.0.3` | `>=14.17` | Apache-2.0 |
| `eslint` | `10.13.0` | `^20.19.0 \|\| ^22.13.0 \|\| >=24` | MIT |
| `vitest` | `5.0.5` | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` | MIT |
| `@playwright/test` | `1.64.1` | `>=20` | Apache-2.0 |
| `server-only` | `0.0.1` | `명시 없음` | MIT |
| `tsx` | `4.23.15` | `>=18.0.0` | MIT |
| `@types/node` | `24.19.2` | `명시 없음` | MIT |
| `@types/react` | `19.3.0` | `명시 없음` | MIT |
| `@types/react-dom` | `19.3.0` | `명시 없음` | MIT |
| `typescript-eslint` | `8.72.0` | `^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0` | MIT |
| `@next/eslint-plugin-next` | `16.4.2` | `명시 없음` | MIT |
| `@eslint/js` | `10.0.1` | `^20.19.0 \|\| ^22.13.0 \|\| >=24` | MIT |
| `vite` | `8.3.4` | `^20.19.0 \|\| >=22.12.0` | MIT |
| `pnpm` | `11.25.0` | `>=22.13` | MIT |

위 표는 root에 전달한 exact pin 권고다. 실제 채택 여부는 package.json과 pnpm-lock.yaml을 따르며, 이 파일이 lockfile이나 설치 근거를 대신하지 않는다. `@types/node`는 최신 전체 major26 대신 실행 runtime major24에 맞춰 `24.19.2`를 택했다. `@eslint/js`의 JS recommended 규칙이 필요하지 않으면 필수 의존성은 아니다. Vitest가 요구하는 Vite peer는 `^6.4.0 || ^7.0.0 || ^8.0.0`이며 Vite8.3.4는 그 안에 있다.

## 최신 버전을 그대로 쓰지 않은 이유

1. TypeScript 최신 dist-tag는 `7.0.2`였지만 typescript-eslint `8.72.0`의 TypeScript peer는 `>=4.8.4 <6.1.0`이다. 따라서 지원 범위 안의 `6.0.3`을 선택했다. Next의 최소 `5.1.0` 조건도 충족한다.
2. ESLint9 최신 패치 `9.39.5`는 registry의 exact metadata에서 deprecated/no longer supported였다. ESLint10 `10.13.0`을 선택한다.
3. eslint-config-next `16.4.2` 자체는 ESLint `>=9`를 허용하지만, 하위 react/import/jsx-a11y 플러그인은 ESLint10을 peer 범위에 포함하지 않았다. 따라서 전체 preset을 제외하고 ESLint10 지원을 명시한 typescript-eslint8.72.0과 Next plugin16.4.2를 직접 flat config로 조합한다. Next plugin은 별도 ESLint peer를 선언하지 않았으므로 실제 lint로 동작을 확인해야 한다.
4. 전체 preset의 React/hooks/a11y 규칙을 적용한 것으로 보고하지 않는다. 최소 기반 단계의 키보드·버튼 라벨·대비·실화면은 별도로 브라우저에서 검증해야 한다.

React DOM19.3.1의 peer는 React `^19.3.1`, Next16.4.2의 React/React DOM peer는 `^19.0.0`을 포함한다. 이 조합의 선언 범위는 맞는다.

## 범위·미실행

신규 의존성 설치·앱/CI/lockfile 수정은 root가 수행한다. 이 연구 작업은 두 문서만 작성했다. API 키·DB·LLM·CMS·결제·광고 SDK·외부 폰트 라이브러리는 도입하지 않았다. 실제 설치·clean install·lint/typecheck/unit/build·브라우저 E2E 결과는 STEP-03 본 보고서에서 실제 실행 근거로 판정해야 한다.
