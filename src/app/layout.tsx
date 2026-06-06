// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { Metadata } from "next";
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
import { LanguageProvider } from "@/contexts/language-context";
import { SpeedInsights } from "@vercel/speed-insights/next";

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

export const metadata: Metadata = {
  title: {
    default: "William Temple House App",
    template: "%s | William Temple House App",
  },
  description:
    "See your place in line, check what's in stock, and play a few retro games while you wait at William Temple House.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const enableTweakcnPreview = process.env.VERCEL !== "1";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${lato.variable} ${geistMono.variable} ${openSans.variable} ${bodoniModaSc.variable} ${ibmPlexMono.variable}`}
    >
      <head>
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
              <LanguageProvider>{children}</LanguageProvider>
              <Toaster />
            </HapticsProvider>
          </ThemeProvider>
        </AuthSessionProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
