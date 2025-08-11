import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chromium } from "playwright";

const RequestSchema = z.object({
  url: z.string().url(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { url } = RequestSchema.parse(json);
    console.log("[api/capture] request", { url });

    // 1) 브라우저/컨텍스트 생성 (스텔스/지문 최소화)
    const proxyServer = process.env.CAPTURE_PROXY_SERVER;
    const proxyUsername = process.env.CAPTURE_PROXY_USERNAME;
    const proxyPassword = process.env.CAPTURE_PROXY_PASSWORD;
    const browser = await chromium.launch({
      args: [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
      proxy: proxyServer
        ? {
            server: proxyServer,
            username: proxyUsername,
            password: proxyPassword,
          }
        : undefined,
    });

    // UA를 실제 크롬 문자열로 구성 (HeadlessChrome → Chrome 치환)
    const chromeVersionMatch = browser.version().match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    const chromeVersion = chromeVersionMatch ? chromeVersionMatch[1] : "121.0.0.0";
    const baseUA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;

    // 가벼운 스텔스 헤더/컨텍스트 설정
    const randomWidth = 1366 + Math.floor(Math.random() * 400); // 1366~1765
    const randomHeight = 800 + Math.floor(Math.random() * 280); // 800~1079
    const context = await browser.newContext({
      viewport: { width: randomWidth, height: randomHeight },
      userAgent: baseUA,
      deviceScaleFactor: 1,
      locale: "en-US",
      timezoneId: "Asia/Seoul",
      colorScheme: "light",
      hasTouch: false,
      bypassCSP: true,
      // 일부 사이트는 UA-CH를 검사하지만 Playwright가 자동 설정하는 범위 내에서
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });
    const page = await context.newPage();

    // 탐지 회피용 Init Script (webdriver/languages/plugins 등 최소한의 패치)
    await page.addInitScript(() => {
      try {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        // minimal chrome object
        // @ts-ignore
        if (!window.chrome) (window as any).chrome = { runtime: {} };
        Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
        Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
        // permissions query fix for notifications
        const originalQuery = (navigator as any).permissions?.query;
        if (originalQuery) {
          (navigator as any).permissions.query = (parameters: any) =>
            parameters.name === "notifications"
              ? Promise.resolve({ state: Notification.permission })
              : originalQuery(parameters);
        }
        // WebGL vendor/renderer spoof
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
          // UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL
          if (parameter === 37445) return "Intel Inc.";
          if (parameter === 37446) return "Intel Iris OpenGL Engine";
          return getParameter.call(this, parameter);
        };
      } catch {}
    });

    // 네비게이션 및 로딩 안정화
    page.setDefaultNavigationTimeout(45000);
    await page.goto(url, { waitUntil: "networkidle" });
    // 약한 오버레이/모달 제거 및 애니메이션/트랜지션 최소화
    try {
      await page.addStyleTag({
        content: `
          *, *::before, *::after { animation: none !important; transition: none !important; }
          html, body { height: auto !important; overflow: auto !important; }
          [class*="cookie" i], [id*="cookie" i], [class*="consent" i], [id*="consent" i],
          [class*="modal" i], [id*="modal" i], [class*="overlay" i], [id*="overlay" i] {
            display: none !important;
          }
        `,
      });
    } catch {}

    // 동적 콘텐츠/지연 로딩 대비: 단계적 스크롤 ↓
    async function autoScroll(p: typeof page) {
      await p.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = Math.max(200, Math.floor(window.innerHeight * 0.6));
          const timer = setInterval(() => {
            const { scrollHeight } = document.body;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight - window.innerHeight - 2) {
              clearInterval(timer);
              resolve();
            }
          }, 120);
        });
      });
    }
    // 프레임까지 모두 스크롤하여 지연 로딩 유도
    async function scrollAllFrames(root: any): Promise<void> {
      try { await autoScroll(root); } catch {}
      let frames: any[] = [];
      try {
        if (typeof root.frames === "function") frames = root.frames();
        else if (typeof root.childFrames === "function") frames = root.childFrames();
      } catch {}
      for (const f of frames) {
        try { await scrollAllFrames(f); } catch {}
      }
    }
    // 큰 스크롤 컨테이너 스크롤 (가상화 리스트/내부 스크롤 대비)
    async function scrollScrollableContainers() {
      await page.evaluate(async () => {
        function isScrollable(el: Element) {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY;
          const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && (el.scrollHeight - el.clientHeight > 200);
          return canScroll;
        }
        const candidates = Array.from(document.querySelectorAll('*')).filter((el) => isScrollable(el)).slice(0, 30) as HTMLElement[];
        for (const el of candidates) {
          try {
            el.scrollTop = 0;
            const step = Math.max(200, Math.floor(window.innerHeight * 0.6));
            let progressed = 0;
            while (progressed < el.scrollHeight - el.clientHeight - 2) {
              el.scrollTop += step;
              progressed += step;
              await new Promise((r) => setTimeout(r, 80));
            }
          } catch {}
        }
      });
    }
    await scrollAllFrames(page);
    await scrollScrollableContainers();
    await page.waitForLoadState("networkidle");

    // 이미지 로드 대기(최대 3초)
    await Promise.race([
      page.evaluate(async () => {
        const imgs = Array.from(document.images);
        await Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => {
                  img.addEventListener("load", () => res(), { once: true });
                  img.addEventListener("error", () => res(), { once: true });
                })
          )
        );
      }),
      page.waitForTimeout(3000),
    ]);

    // 최상단 복귀 후 애니메이션 감소
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.emulateMedia({ reducedMotion: "reduce" });

    const screenshot = await page.screenshot({
      fullPage: true,
      type: "jpeg",
      quality: 80,
      animations: "disabled",
    });
    const title = await page.title();
    console.log("[api/capture] captured", { title, bytes: (screenshot as Buffer).length });

    await context.close();
    await browser.close();

    return NextResponse.json({
      ok: true,
      title,
      bytes: (screenshot as Buffer).length,
      imageBase64: Buffer.from(screenshot as Buffer).toString("base64"),
      contentType: "image/jpeg",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/capture] error", message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}


