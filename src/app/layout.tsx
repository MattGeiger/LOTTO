// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { Metadata, Viewport } from "next";
import {
  Bodoni_Moda_SC,
  Geist_Mono,
  IBM_Plex_Mono,
  Lato,
  Open_Sans,
} from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { HapticsProvider } from "@/components/haptics-provider";
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

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const bodoniModaSc = Bodoni_Moda_SC({
  variable: "--font-bodoni-moda-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
  const { brand, themeCss } = await getResolvedRuntimeBrand();

  return (
    <html
      lang="en"
      data-brand={brand.brandId}
      suppressHydrationWarning
      className={`${lato.variable} ${geistMono.variable} ${openSans.variable} ${bodoniModaSc.variable} ${ibmPlexMono.variable}`}
    >
      <head>
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
                <LanguageProvider>{children}</LanguageProvider>
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
