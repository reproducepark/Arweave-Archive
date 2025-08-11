# arweave-archive 진행 기록

### 기록 템플릿

```
## YYYY-MM-DD

- 개요: 해당 일자 핵심 변경사항 1~3줄 요약

- 구현
  - 백엔드/API:
  - 프론트엔드:
  - 유틸/구성:

- 개선/버그수정

- UX/UI

- 캡처 안정화/스텔스

- 문서

- 빌드/품질

- 다음 할 일

- 참고 파일
```

## 2025-08-11

- 개요: MVP 기능을 연결(캡처 → 비용 조회 → 결제/업로드 → 결과/검색)하고, 스텔스/전체 캡처 안정화를 적용했습니다. 기본 UX와 안내 페이지를 구성하고 로그/문서를 정리했습니다.

- 구현
  - 백엔드/API: `POST /api/capture` 구현(Playwright로 전체 페이지 JPEG 캡처, base64 반환)
  - 프론트엔드: 홈 UI(입력/아카이브/검색/결과), 업로드 전 미리보기, 결과 링크/목록 표시, 결제 전 확인(confirm) 추가, 로딩 상태(아카이브/검색) 분리
  - 유틸/구성: Arweave 유틸(게이트웨이/링크/GraphQL), Irys 브라우저 클라이언트(`getWebIrys`), URL 정규화 `normalizeUrlForTag()`, 의존성 설치 및 `postinstall`로 Chromium 자동 설치

- 개선/버그수정
  - WebIrys 초기화 오류(`this.wallet.getSigner is not a function`) 해결: `wallet.provider` 전달 및 `ready()` 호출 보장
  - 체인/토큰 매핑 및 폴백: BNB 등 EIP-1559 미지원 시 viem 경로 선호, 폴리곤 네트워크 강제 및 `MATIC` 표시
  - 클라이언트 로깅 보강: 아카이브/업로드 단계별 로그

- UX/UI
  - 홈 페이지 전면 개편, 업로드 전 미리보기(Object URL), 업로드 완료 카드 닫기(X) 버튼, 헤더에 `/about` 링크 추가
  - 로딩 상태를 아카이브/검색으로 분리, 결제 전 금액 확인(confirm) 추가

- 캡처 안정화/스텔스
  - 스텔스: 실제 Chrome UA, `navigator.webdriver`/`languages`/`plugins`/WebGL 패치, 헤더 보강, 랜덤 뷰포트, `bypassCSP` 및 애니메이션/오버레이 제거 CSS
  - 전체 캡처: 단계적 자동 스크롤, 모든 프레임(iframe) 순회, 내부 스크롤 컨테이너 끝까지 스크롤, 이미지 로드 대기, `networkidle` 대기, `reducedMotion` 적용
  - 선택적 프록시: `CAPTURE_PROXY_SERVER`, `CAPTURE_PROXY_USERNAME`, `CAPTURE_PROXY_PASSWORD`

- 문서
  - Polygon → Irys(WebIrys) → Arweave 업로드/수수료 흐름 정리(`src/lib/irys-web.ts`, `src/app/page.tsx`)
  - README.md 초안 작성: 개요/동작 원리/빠른 시작/아키텍처/API/한계 포함

- 빌드/품질
  - 빌드 성공(경고만 존재: `pino-pretty` optional), 기능상 문제 없음

- 다음 할 일
  - 비용 표시 개선(단위/네트워크별 안내), 에러/로딩 상태 세분화
  - 캡처 예외 도메인 룰(배너/오버레이 셀렉터) 보강, 필요 시 CDP 직접 캡처 fallback 옵션 추가
  - 테스트 강화 및 프로덕션 배포 준비, 기본 안내 문서 추가

- 참고 파일
  - `src/app/api/capture/route.ts`, `src/app/page.tsx`, `src/lib/arweave.ts`, `src/lib/irys-web.ts`, `src/app/layout.tsx`, `src/app/about/page.tsx`

