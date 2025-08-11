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

/**
 * 사용자가 입력한 URL을 태그와 검색에 일관되게 사용하기 위한 정규화 함수
 * - 프로토콜 누락 시 https:// 보정
 * - 호스트 소문자화, 기본 포트 제거(http:80 / https:443)
 * - 해시 제거, 경로의 말미 슬래시는 루트가 아닌 경우 제거
 */
export function normalizeUrlForTag(input: string): string {
  if (!input) return input;
  let withProtocol = input.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(withProtocol)) {
    withProtocol = `https://${withProtocol}`;
  }
  let urlObj: URL;
  try {
    urlObj = new URL(withProtocol);
  } catch {
    // URL 파싱 실패 시 원본 반환(유효성 검증은 별도 단계에서 수행)
    return input.trim();
  }
  urlObj.hash = "";
  urlObj.hostname = urlObj.hostname.toLowerCase();
  if ((urlObj.protocol === "https:" && urlObj.port === "443") || (urlObj.protocol === "http:" && urlObj.port === "80")) {
    urlObj.port = "";
  }
  if (urlObj.pathname !== "/" && urlObj.pathname.endsWith("/")) {
    urlObj.pathname = urlObj.pathname.replace(/\/+$/, "");
  }
  return urlObj.toString();
}


