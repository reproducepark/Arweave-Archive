"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { format } from "date-fns";
import { Loader2, Upload, Search } from "lucide-react";
import { sha256 } from "js-sha256";
import { buildArweaveTxUrl, buildArweaveExplorerUrl, queryByOriginalUrl } from "@/lib/arweave";
import { getWebIrys } from "@/lib/irys-web";
import { formatEther } from "viem";
import { Buffer } from "buffer";

type CaptureResponse = {
  ok: boolean;
  title?: string;
  bytes?: number;
  imageBase64?: string;
  contentType?: string;
  error?: string;
};

  function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

export default function Home() {
  const { isConnected } = useAccount();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ txId: string; link: string } | null>(null);
  const [searchResults, setSearchResults] = useState<{ txId: string; capturedAt: string; pageTitle?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingCapture, setPendingCapture] = useState<{
    imageBase64: string;
    bytes: number;
    contentType: string;
    title?: string;
  } | null>(null);
  const [priceAtomic, setPriceAtomic] = useState<bigint | null>(null);
  const [isFunding, setIsFunding] = useState(false);
  const [tokenTicker, setTokenTicker] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleArchive() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      console.log("[archive] start", { url });
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as CaptureResponse;
      if (!json.ok || !json.imageBase64 || !json.bytes) throw new Error(json.error || "capture failed");

      if (!isConnected) throw new Error("지갑을 먼저 연결하세요.");

      const webIrys = await getWebIrys();
      console.log("[archive] webIrys ready", { token: (webIrys as any)?.tokenConfig?.name, ticker: (webIrys as any)?.tokenConfig?.ticker });
      try {
        setTokenTicker((webIrys as any)?.tokenConfig?.ticker ?? null);
      } catch {}
      const price = await (webIrys as any).getPrice(json.bytes);
      console.log("[archive] price", price);

      setPendingCapture({
        imageBase64: json.imageBase64,
        bytes: json.bytes,
        contentType: json.contentType || "image/jpeg",
        title: json.title,
      });
      // 미리보기 URL 생성
      try {
        const blob = new Blob([Buffer.from(json.imageBase64, "base64")], { type: json.contentType || "image/jpeg" });
        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return objectUrl;
        });
      } catch {}
      try {
        const asBigInt = typeof price === "bigint" ? price : BigInt(price.toString());
        setPriceAtomic(asBigInt);
      } catch {
        setPriceAtomic(null);
      }
    } catch (e: any) {
      console.error("[archive] error", e);
      setError(e?.message || "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    setError(null);
    setSearchResults([]);
    setLoading(true);
    try {
      const items = await queryByOriginalUrl(url);
      setSearchResults(items);
    } catch (e: any) {
      setError(e?.message || "검색 실패");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!pendingCapture) return;
    setError(null);
    setIsFunding(true);
    try {
      const webIrys = await getWebIrys();
      console.log("[upload] webIrys ready", { token: (webIrys as any)?.tokenConfig?.name });
      if (priceAtomic != null) {
        console.log("[upload] fund", priceAtomic.toString());
        try {
          await (webIrys as any).fund(priceAtomic);
        } catch (err: any) {
          console.warn("[upload] fund failed, retrying with getFee(0) bypass if BNB/Legacy chain", err?.message || err);
          // 일부 레거시 체인(BNB 등)은 EIP-1559 관련 eth_maxPriorityFeePerGas를 제공하지 않음
          // viemv2 경로로 재초기화하여 수수료 계산을 우회
          const reClient = await getWebIrys();
          await (reClient as any).fund(priceAtomic);
        }
      }

      const capturedAtIso = new Date().toISOString();
      const data = Buffer.from(pendingCapture.imageBase64, "base64");
      const urlHash = sha256(url);
      const tags = [
        { name: "Content-Type", value: pendingCapture.contentType },
        { name: "App-Name", value: "arweave-archive" },
        { name: "Original-URL", value: url },
        { name: "Url-Hash", value: urlHash },
        { name: "Captured-At", value: capturedAtIso },
        { name: "Page-Title", value: pendingCapture.title || "" },
      ];
      console.log("[upload] upload start", { size: data.byteLength });
      const receipt = await (webIrys as any).upload(data, { tags });
      console.log("[upload] receipt", receipt);
      const explorer = buildArweaveExplorerUrl(receipt.id);
      setResult({ txId: receipt.id, link: explorer });
      setPendingCapture(null);
      setPriceAtomic(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (e: any) {
      console.error("[upload] error", e);
      setError(e?.message || "업로드 실패");
    } finally {
      setIsFunding(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">arweave-archive</h1>
        <ConnectButton />
      </div>

      <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm">
        <label className="block text-sm font-medium mb-2">URL</label>
        <input
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleArchive}
            disabled={loading || !url}
            className="inline-flex items-center gap-2 bg-black text-white rounded-lg px-3 py-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 아카이브
          </button>
          <button
            onClick={handleSearch}
            disabled={loading || !url}
            className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} 검색
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {pendingCapture && (
          <div className="mt-3 rounded-lg border p-3 bg-black/2">
            <div className="text-sm mb-2">예상 비용</div>
            <div className="text-sm">
              {priceAtomic != null ? (
                <span>
                  {formatEther(priceAtomic)} {tokenTicker ?? "ETH"}
                </span>
              ) : (
                <span>알 수 없음</span>
              )}
            </div>
            {previewUrl && (
              <div className="mt-3">
                <div className="text-sm mb-1">미리보기</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="capture preview" className="max-h-80 rounded border" />
              </div>
            )}
            <button
              onClick={handleUpload}
              disabled={isFunding}
              className="mt-3 inline-flex items-center gap-2 bg-black text-white rounded-lg px-3 py-2 disabled:opacity-60"
            >
              {isFunding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 결제 및 업로드
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-6 bg-white border border-black/10 rounded-xl p-4">
          <div className="text-sm text-black/70 mb-1">업로드 완료</div>
          <div className="text-sm mb-1 break-all">TxID: {result.txId}</div>
          <div className="flex gap-3 flex-wrap">
            <a href={buildArweaveTxUrl(result.txId)} target="_blank" className="text-blue-600 underline">원본 링크</a>
            <a href={buildArweaveExplorerUrl(result.txId)} target="_blank" className="text-blue-600 underline">Explorer 보기</a>
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="mt-6 bg-white border border-black/10 rounded-xl p-4">
          <div className="text-sm font-medium mb-2">검색 결과</div>
          <ul className="space-y-2">
            {searchResults.map((item) => (
              <li key={item.txId} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{item.pageTitle || "(제목 없음)"}</div>
                  <div className="text-xs text-black/70">{item.capturedAt ? format(new Date(item.capturedAt), "yyyy-MM-dd HH:mm:ss") : ""}</div>
                </div>
                <a href={buildArweaveTxUrl(item.txId)} target="_blank" className="text-blue-600 text-sm underline">보기</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
