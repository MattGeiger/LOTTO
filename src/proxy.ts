// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/state",
    "/api/state/:path*",
    "/api/languages",
    "/api/languages/:path*",
    "/api/ai-config",
    "/api/ai-config/:path*",
    "/api/system-prompts",
    "/api/system-prompts/:path*",
    "/api/translations",
    "/api/translations/:path*",
    "/api/brand-config",
    "/api/brand-config/:path*",
    "/api/integrations/feed/token",
    "/arcade/zombie-attack/:path*",
  ],
};

// API prefixes whose write methods (anything but GET/HEAD/OPTIONS) require an
// authenticated staff session.
const GATED_API_PREFIXES = [
  "/api/state",
  "/api/languages",
  "/api/ai-config",
  "/api/system-prompts",
  "/api/translations",
  "/api/brand-config",
  "/api/integrations/feed/token",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isZombieAttack = pathname.startsWith("/arcade/zombie-attack");
  const isAdmin = pathname.startsWith("/admin");
  const isGatedApi = GATED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isWriteApi =
    isGatedApi && !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());
  const isLocalDevelopment = process.env.NODE_ENV === "development" && !process.env.VERCEL;
  const authBypass = process.env.AUTH_BYPASS === "true" || isLocalDevelopment;

  if (isZombieAttack && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/arcade", request.url));
  }

  if (process.env.AUTH_BYPASS === "true" && process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_BYPASS must not be enabled in production. Remove AUTH_BYPASS from your environment variables.",
    );
  }

  if ((isAdmin || isWriteApi) && !authBypass) {
    const session = await auth();
    if (!session) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}
