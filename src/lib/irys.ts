"use server";

import Irys from "@irys/sdk";
import { sha256 } from "js-sha256";

type InitIrysParams = {
  rpcUrl?: string;
};

export function createIrysClient(_: InitIrysParams = {}) {
  const network = process.env.NEXT_PUBLIC_IRYS_NETWORK || "devnet"; // e.g., 'mainnet' | 'devnet'
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || undefined;
  const providerUrl = rpcUrl;

  const client = new Irys({
    network, // Arweave L2 via Irys
    token: "ethereum",
    wallet: { name: "ethersv6" },
    providerUrl,
  } as any);

  return client;
}

export function buildArweaveTags(params: {
  originalUrl: string;
  capturedAtIso: string;
  pageTitle?: string;
}) {
  const urlHash = sha256(params.originalUrl);
  return [
    { name: "Content-Type", value: "image/jpeg" },
    { name: "App-Name", value: "arweave-archive" },
    { name: "Original-URL", value: params.originalUrl },
    { name: "Url-Hash", value: urlHash },
    { name: "Captured-At", value: params.capturedAtIso },
    { name: "Page-Title", value: params.pageTitle ?? "" },
  ];
}


