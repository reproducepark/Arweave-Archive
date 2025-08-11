export const ARWEAVE_GATEWAY = process.env.NEXT_PUBLIC_ARWEAVE_GATEWAY || "https://arweave.net";

export function buildArweaveTxUrl(txId: string) {
  return `${ARWEAVE_GATEWAY.replace(/\/$/, "")}/${txId}`;
}

export function buildArweaveExplorerUrl(txId: string) {
  const base = ARWEAVE_GATEWAY.replace(/\/$/, "");
  return `${base}/tx/${txId}`;
}

export async function queryByOriginalUrl(originalUrl: string): Promise<{ txId: string; capturedAt: string; pageTitle?: string }[]> {
  const endpoint = `${ARWEAVE_GATEWAY.replace(/\/$/, "")}/graphql`;
  const query = `
    query($url: [String!]) {
      transactions(
        tags: [
          { name: "App-Name", values: ["arweave-archive"] },
          { name: "Original-URL", values: $url }
        ],
        sort: HEIGHT_DESC
      ) {
        edges { node { id tags { name value } } }
      }
    }
  `;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { url: [originalUrl] } }),
    // Next.js app router 환경에서 캐싱 비활성화
    cache: "no-store" as any,
  });
  const json = (await res.json()) as any;

  const items: { txId: string; capturedAt: string; pageTitle?: string }[] = [];
  for (const edge of json?.data?.transactions?.edges ?? []) {
    const tags = new Map<string, string>();
    for (const t of edge.node.tags) tags.set(t.name, t.value);
    items.push({
      txId: edge.node.id,
      capturedAt: tags.get("Captured-At") || "",
      pageTitle: tags.get("Page-Title") || undefined,
    });
  }
  return items;
}


