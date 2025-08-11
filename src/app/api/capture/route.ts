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

    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot({ fullPage: true, type: "jpeg", quality: 80 });
    const title = await page.title();
    console.log("[api/capture] captured", { title, bytes: (screenshot as Buffer).length });
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


