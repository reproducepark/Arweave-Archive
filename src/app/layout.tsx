'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { cookieStorage, createStorage } from "wagmi";
import { Buffer } from "buffer";
import { WagmiProvider } from "wagmi";
import { polygon } from "wagmi/chains";
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: "arweave-archive",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [polygon],
  ssr: true,
  // 코인베이스 지갑 계열 자동 활성화를 줄이고 불필요한 원격 호출을 줄이기 위해 storage 커스터마이즈
  storage: createStorage({ storage: cookieStorage }),
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Buffer polyfill for browsers */}
        <script dangerouslySetInnerHTML={{ __html: `window.global=window;window.Buffer=window.Buffer||${JSON.stringify({})};` }} />
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider theme={lightTheme()}>
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
