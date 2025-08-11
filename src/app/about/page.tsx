export default function AboutPage() {
  return (
    <div className="min-h-screen px-6 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">About</h1>
      <p className="text-sm text-black/80">
        arweave-archive는 웹페이지의 특정 시점을 전체 스크린샷으로 캡처하여 Arweave에 영구 저장하는 서비스입니다.
      </p>
      <ul className="list-disc pl-5 mt-4 space-y-1 text-sm text-black/80">
        <li>캡처: Playwright로 전체 페이지 스크린샷 생성</li>
        <li>업로드: Irys SDK로 Arweave에 업로드, 메타마스크 결제</li>
        <li>검색: Arweave GraphQL로 URL 기준 조회</li>
      </ul>
    </div>
  );
}


