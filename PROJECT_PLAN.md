# 웹사이트 스크린샷 아카이빙 서비스 (arweave-archive) — 신규 개발 계획서

## 1. 개요
웹의 정보는 끊임없이 변하고 사라집니다. `arweave-archive`는 특정 시점의 웹페이지를 시각적으로 완벽하게 보존하여 영구적으로 저장하고 검색할 수 있는 서비스입니다.

사용자는 보존하고 싶은 웹사이트의 URL을 입력하고, 암호화폐 지갑(메타마스크)을 통해 소액의 저장 비용을 직접 지불합니다. 서비스는 해당 웹페이지의 전체 페이지 스크린샷을 생성하여 분산형 영구 스토리지인 Arweave에 기록합니다. Arweave의 특성상 한번 저장된 데이터는 삭제되거나 변경되지 않으며, 누구나 URL을 통해 과거의 기록을 조회할 수 있습니다.

본 문서는 `arweave-archive` 서비스의 목표, 아키텍처, 핵심 파이프라인 및 구현 계획을 정의합니다.

## 2. 목표 기능
- 간편한 아카이빙: 사용자가 URL을 입력하면 해당 웹사이트의 전체 모습을 담은 스크린샷 이미지를 생성
- 사용자 주도 결제: 서비스 대납이 아닌 사용자의 메타마스크 지갑으로 저렴한 비용 직접 결제
- 영구 저장: 생성된 스크린샷을 Arweave 네트워크에 영구 저장
- URL 기반 검색 및 조회: 저장된 아카이브를 URL 기준으로 검색하고 캡처 시간 순서대로 조회

## 3. 시스템 아키텍처
서비스는 크게 3개의 주요 구성 요소로 나뉩니다.

### 프론트엔드 (Next.js)
- 사용자 인터페이스(UI) 제공
- URL 입력, 검색, 결과 조회
- 지갑 연결(MetaMask) 및 Irys SDK를 통한 결제/업로드 처리

### 캡처 워커 (Playwright API)
- 자체 서버의 백엔드 API에서 동작
- 프론트엔드로부터 URL을 전달받아 헤드리스 브라우저(Playwright) 실행
- 전체 페이지 스크린샷 생성 및 파일 크기 등 메타데이터 반환

### 영구 스토리지 (Arweave & Irys)
- Irys(구 Bundlr): Arweave 업로드 및 결제 L2 솔루션(즉시 업로드, 저렴한 체인 결제)
- Arweave: 스크린샷 데이터가 영구적으로 저장되는 블록체인 스토리지
- Arweave Gateway(GraphQL): 태그 기반 검색 API 제공(별도 DB 불필요)

## 4. 핵심 동작 파이프라인

### 4.1 아카이빙(보존) 파이프라인
1) 사용자: 프론트엔드에 보존할 URL 입력 후 '아카이브' 버튼 클릭  
2) 프론트엔드: `POST /api/capture`로 URL 전송  
3) 캡처 워커: Playwright로 전체 페이지 스크린샷(`image.jpg`) 생성, 이미지 바이트 크기 계산  
4) 캡처 워커: 이미지 데이터와 파일 크기를 프론트엔드에 응답  
5) 프론트엔드:  
   - Irys SDK `getPrice(bytes)`로 Arweave 저장 비용 계산 및 표시  
   - 사용자가 메타마스크로 결제를 승인하면(`fund`), Irys SDK `upload` 호출로 이미지와 메타데이터 태그를 Arweave에 업로드  
6) Arweave: 업로드 완료 후 고유 트랜잭션 ID(`txId`) 생성  
7) 프론트엔드: `txId`로 영구 링크 `https://arweave.net/{txId}` 제공 및 성공 메시지 표시

### 4.2 검색 및 조회 파이프라인
1) 사용자: 검색창에 조회하고 싶은 URL 입력  
2) 프론트엔드: Arweave GraphQL에 특정 태그가 포함된 트랜잭션 조회 쿼리 전송  
   - `tags: { name: "Original-URL", values: "..." }`  
   - `sort: HEIGHT_DESC` (최신순)  
3) Arweave GraphQL: 조건에 맞는 트랜잭션 목록(ID, 캡처 시간, 제목 등) 반환  
4) 프론트엔드: 목록을 최신순으로 UI에 표시  
5) 사용자: 특정 항목 클릭  
6) 프론트엔드: 해당 `txId`로 `https://arweave.net/{txId}`의 스크린샷 이미지를 화면에 표시

## 5. 데이터 모델(Arweave 태그 설계)
검색과 데이터 분류를 위해 모든 업로드에 표준화된 태그를 사용합니다.

- Content-Type: `image/jpeg` — 브라우저에 파일 형식 알림  
- App-Name: `arweave-archive` — 본 서비스로 생성된 아카이브 식별  
- Original-URL: `https://example.com/some-page` — 정규화된 원본 URL(핵심 검색 키)  
- Url-Hash: `<SHA-256 of Original-URL>` — 긴 URL 대비 대체 검색 키  
- Captured-At: `<ISO 8601 Timestamp>` — 캡처 시점(정렬/표시)  
- Page-Title: `<Captured Page Title>` — 검색 결과 목록 가독성 향상

## 6. 기술 스택
- 프론트엔드: Next.js, TypeScript, Tailwind CSS  
- 지갑/결제: Wagmi, RainbowKit(MetaMask 연동), Irys SDK  
- 백엔드(캡처): Next.js API Routes(Node.js 런타임), Playwright  
- 스토리지/DB: Arweave, Arweave GraphQL  
- 배포: 자체 서버(프론트/API/캡처 워커)

## 7. 구현 로드맵

### Phase 1: 기반 구축 및 핵심 로직 개발
- Next.js 프로젝트 생성 및 기본 UI 레이아웃 구성  
- `POST /api/capture` 구현: Playwright로 URL을 받아 스크린샷 이미지와 크기 반환  
- Arweave GraphQL 기반 검색/조회 UI 프로토타입

진행 현황(2025-08-11):
- 완료: 의존성 설치, `postinstall` 설정, RainbowKit 환경변수 반영, `/api/capture` 구현, 검색/아카이브 UI 초안
- 진행중: 업로드 비용 표시/승인 UX, URL 정규화, 에러/로딩UX 개선

보완 사항(2025-08-11):
- 업로드 완료 카드에 닫기(X) 버튼 추가로 사용자 제어성 향상(`src/app/page.tsx`)

### Phase 2: 결제 및 업로드 연동
- Wagmi/RainbowKit 통합으로 메타마스크 지갑 연결  
- 캡처 결과(파일 크기)로 Irys SDK `getPrice` 연동 및 비용 표시  
- Irys SDK `fund` 및 `upload`로 실제 Arweave 업로드 로직 완성

진행 현황(2025-08-11):
- 완료: `getPrice` 계산 후 사용자 확인 단계 구현(클라이언트 UI), `fund`/`upload` 시나리오 구성
- 수정: WebIrys 초기화 시 `wallet.provider` 누락으로 인한 `this.wallet.getSigner is not a function` 오류 해결 (MetaMask provider 전달, `ready()` 호출)
- 예정: 금액 디스플레이 개선, 단위 변환/네트워크별 안내

### Phase 3: End-to-End 완성 및 고도화
- 아카이빙과 검색 파이프라인 완전 연결  
- 로딩 상태/오류 처리 등 UX 개선  
- URL 정규화 및 상세 태그 정보 적용

### Phase 4: 테스트 및 배포
- 다양한 웹사이트 대상 캡처 기능 테스트 및 예외 처리  
- 최종 코드 리뷰 및 자체 서버에 프로덕션 배포  
- 이용 안내, 서비스 소개 등 정적 페이지 작성

## 8. 주요 고려사항
- 기능적 한계: 본 서비스는 웹페이지의 시각적 모습만 보존합니다. 동영상 재생, 링크 클릭, 텍스트 선택 등 상호작용은 불가함을 명확히 고지  
- 캡처 안정성: SPA나 동적 콘텐츠가 많은 사이트는 완벽한 시점 캡처가 어려울 수 있어 Playwright `networkidle` 등 옵션 최적화 필요  
- 비용 최적화: JPEG 압축으로 파일 크기 최소화하여 Arweave 저장 비용 절약. 필요시 품질 조절 옵션 제공 고려  
- 법적/윤리: 약관, 개인정보 처리방침, 저작권 고지 명확화 및 `robots.txt` 규칙 존중 정책 고려