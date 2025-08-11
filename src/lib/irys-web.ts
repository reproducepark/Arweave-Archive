"use client";

import { WebIrys } from "@irys/sdk";
import { BrowserProvider } from "ethers";
import { createWalletClient, custom, createPublicClient, http } from "viem";
import { mainnet, polygon, arbitrum, optimism, base, bsc, avalanche, linea, scroll } from "viem/chains";

function mapChainIdToViemChain(chainId: number) {
  switch (chainId) {
    case 1:
      return mainnet;
    case 137:
      return polygon;
    case 10:
      return optimism;
    case 42161:
      return arbitrum;
    case 8453:
      return base;
    case 56:
      return bsc;
    case 43114:
      return avalanche;
    case 59144:
      return linea;
    case 534352:
      return scroll;
    default:
      return mainnet;
  }
}

function mapChainIdToIrysToken(chainId: number): string {
  // 폴리곤 전용 제한: 폴리곤 외 체인은 지원하지 않음
  if (chainId !== 137) throw new Error("현재는 폴리곤 네트워크만 지원합니다. 폴리곤 메인넷으로 전환해주세요.");
  return "matic";
}

async function getInjectedChainId(injected: any): Promise<number> {
  const hexId = await injected.request?.({ method: "eth_chainId" });
  return typeof hexId === "string" ? parseInt(hexId, 16) : 1;
}

async function createWithEthersV6(injected: any, network: string) {
  try { await injected.request?.({ method: "eth_requestAccounts" }); } catch {}
  const provider = new BrowserProvider(injected);
  const chainId = await getInjectedChainId(injected);
  const token = mapChainIdToIrysToken(chainId);
  const client = new WebIrys({
    network,
    token,
    wallet: { name: "ethersv6", provider },
  } as any);
  await (client as any).ready();
  return client as any;
}

async function createWithViemV2(injected: any, network: string) {
  try { await injected.request?.({ method: "eth_requestAccounts" }); } catch {}
  const chainId = await getInjectedChainId(injected);
  const chain = mapChainIdToViemChain(chainId);
  const walletClient = createWalletClient({ chain, transport: custom(injected) });
  const publicClient = createPublicClient({ chain, transport: http() });
  const token = mapChainIdToIrysToken(chainId);
  const client = new WebIrys({
    network,
    token,
    wallet: { name: "viemv2", provider: walletClient, publicClient },
  } as any);
  await (client as any).ready();
  return client as any;
}

export async function getWebIrys() {
  const network = process.env.NEXT_PUBLIC_IRYS_NETWORK || "devnet";
  const injected = (globalThis as any).ethereum;
  if (!injected) {
    throw new Error("브라우저 지갑(provider)을 찾을 수 없습니다. 메타마스크를 설치하거나 활성화하세요.");
  }
  const chainId = await getInjectedChainId(injected);
  const token = mapChainIdToIrysToken(chainId);
  const preferViem = token === "bnb" || token === "matic"; // 일부 RPC에서 EIP-1559 필드 미지원 케이스 대응
  if (preferViem) {
    try {
      console.log("[irys] init via viemv2 (preferred for token)", { chainId, token, network });
      return await createWithViemV2(injected, network);
    } catch (e: any) {
      console.warn("[irys] viemv2 init failed, fallback to ethersv6", e?.message || e);
      return await createWithEthersV6(injected, network);
    }
  } else {
    try {
      console.log("[irys] init via ethersv6", { chainId, token, network });
      return await createWithEthersV6(injected, network);
    } catch (e: any) {
      console.warn("[irys] ethersv6 init failed, fallback to viemv2", e?.message || e);
      return await createWithViemV2(injected, network);
    }
  }
}


