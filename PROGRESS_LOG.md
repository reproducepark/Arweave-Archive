# arweave-archive 진행 기록

## 2025-08-11

- 의존성 설치: @irys/sdk, zod, js-sha256, date-fns, lucide-react, playwright
- postinstall 추가: chromium 바이너리 자동 설치
- RainbowKit projectId를 환경변수로 연동 (`layout.tsx`)
- 캡처 API 구현: `POST /api/capture` (Playwright로 전체페이지 JPEG 캡처, base64 반환)
- Arweave 유틸 추가: 게이트웨이 URL/트랜잭션 링크/GraphQL 검색
- Irys 브라우저 클라이언트 유틸 추가: `getWebIrys` (MetaMask provider 연동, `ready()` 호출 보장)
- Ethers v6 추가 설치 및 WebIrys 초기화 시 `new BrowserProvider(window.ethereum)` 사용
- WebIrys `wallet.name`을 `ethersv6`로 지정하여 Ethers v6 전용 래퍼 경로 강제 적용
- 여차하면 viem v2 경로로 폴백하도록 `getWebIrys()`에 viem 초기화 추가
- 체인별 토큰 매핑 추가: ethereum/matic/optimism/arbitrum/base-eth/bnb/avalanche/linea-eth/scroll-eth
- BNB 등 EIP-1559 미지원 체인에서 `eth_maxPriorityFeePerGas` 오류 발생 시 viem 경로 선호 및 펀딩 재시도 처리
- 폴리곤(ChainId 137) 자동 감지 → Irys token `matic` 사용, 비용 표시는 `MATIC`으로 노출되도록 UI 반영
- 체인 제한: RainbowKit/Wagmi를 폴리곤 전용으로 설정, Irys 초기화도 폴리곤 외 차단
- 업로드 전 미리보기 추가: 캡처 base64 → Blob → Object URL로 렌더링, 업로드/완료 시 revoke 처리
- 홈 페이지 UI 전면 교체: URL 입력, 아카이브, 검색, 결과 링크/목록 표시

디버깅/수정:
- 오류: `this.wallet.getSigner is not a function` 발생
  - 원인: WebIrys 초기화 시 `wallet.provider` 미전달로 내부 signer 획득 실패
  - 조치: `window.ethereum`을 `wallet: { name: 'metamask', provider }`로 전달하고 `ready()` 강제 호출
- 클라이언트 로깅 추가: 아카이브/업로드 단계별 `console.log`/`console.error`
- 빌드 확인: 경고(pino-pretty optional)만 존재, 기능상 문제 없음

설명/문서화:
- Polygon → Irys(WebIrys) → Arweave 업로드 및 수수료 흐름 정리(코드 기준): `src/lib/irys-web.ts`, `src/app/page.tsx`

다음: 비용 표시/확인 UX, URL 정규화 및 태그 강화, 에러/로딩 상태 세분화, 기본 안내 페이지 추가


