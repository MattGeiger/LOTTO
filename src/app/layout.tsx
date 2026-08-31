// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { Metadata, Viewport } from "next";
import { Geist_Mono, Lato } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { HapticsProvider } from "@/components/haptics-provider";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { BrandProvider } from "@/contexts/brand-context";
import { LanguageProvider } from "@/contexts/language-context";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getResolvedRuntimeBrand } from "@/lib/brand-config/resolve";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Brand identity (saved configuration or compiled profile) resolves per
// request so appearance changes appear without a rebuild
// (docs/CONFIGURABLE_BRANDING_PLAN.md).
export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getResolvedRuntimeBrand();
  return {
    title: {
      default: brand.appName,
      template: `%s | ${brand.appName}`,
    },
    description: brand.metadata.description,
    icons: {
      icon: brand.pwa.browserIcons.map(({ src, ...icon }) => ({
        url: src,
        ...icon,
      })),
      apple: brand.pwa.appleIcons.map(({ src, ...icon }) => ({
        url: src,
        ...icon,
      })),
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { brand } = await getResolvedRuntimeBrand();
  return { themeColor: brand.pwa.themeColor };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const enableTweakcnPreview = process.env.VERCEL !== "1";
  // Match FEED's production-bundle boundary: load the calibration subtree only
  // in local development instead of merely hiding an imported production UI.
  const PaletteDevTools =
    process.env.NODE_ENV === "development"
      ? (await import("@/components/dev/palette-dev-tools")).default
      : null;
  const { brand, themeCss } = await getResolvedRuntimeBrand();

  return (
    <html
      lang="en"
      data-brand={brand.brandId}
      suppressHydrationWarning
      className={`${lato.variable} ${geistMono.variable}`}
    >
      <head>
        {process.env.NODE_ENV === "development" ? (
          // Dev-only, legacy-WebKit shim. iOS/iPadOS 15 Safari refuses the
          // Next.js HMR WebSocket with a SecurityError ("The operation is
          // insecure"). Next constructs that socket inside its async
          // appBootstrap, so the synchronous throw becomes an unhandled
          // rejection that aborts bootstrap *before* hydrateRoot runs: the page
          // server-renders, no handlers attach, and client effects never fire.
          // Wrapping the constructor so it cannot throw costs us hot reload on
          // that engine and nothing else -- the app hydrates and is testable on
          // the declared support floor (docs/BROWSER_SUPPORT.md). Emitted only
          // in development, so production output is unchanged.
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(){var W=window.WebSocket;if(!W){return}" +
                "function S(u,p){try{return p?new W(u,p):new W(u)}catch(e){" +
                "if(window.console&&console.warn){console.warn('[LOTTO] HMR WebSocket unavailable on this engine; hot reload disabled.',e&&e.message)}" +
                "return{url:u,readyState:3,binaryType:'blob',bufferedAmount:0,extensions:'',protocol:''," +
                "send:function(){},close:function(){},addEventListener:function(){},removeEventListener:function(){}," +
                "dispatchEvent:function(){return false},onopen:null,onclose:null,onerror:null,onmessage:null}}}" +
                "S.prototype=W.prototype;S.CONNECTING=0;S.OPEN=1;S.CLOSING=2;S.CLOSED=3;" +
                "try{window.WebSocket=S}catch(e){}})();",
            }}
          />
        ) : null}
        {themeCss ? (
          // Server-rendered custom theme tokens: injected after the compiled
          // brand layers (see docs/CSS_THEME_ARCHITECTURE.md cascade contract)
          // so first paint carries the saved appearance with no flash of the
          // default brand.
          <style
            data-brand-theme="runtime"
            dangerouslySetInnerHTML={{ __html: themeCss }}
          />
        ) : null}
        {enableTweakcnPreview ? (
          <script
            async
            crossOrigin="anonymous"
            src="https://tweakcn.com/live-preview.min.js"
          />
        ) : null}
      </head>
      <body className="antialiased">
        <AuthSessionProvider>
          <ThemeProvider>
            <HapticsProvider>
              <BrandProvider brand={brand}>
                <LanguageProvider>
                  <PullToRefresh />
                  {children}
                  {PaletteDevTools ? <PaletteDevTools /> : null}
                </LanguageProvider>
              </BrandProvider>
              <Toaster />
            </HapticsProvider>
          </ThemeProvider>
        </AuthSessionProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
