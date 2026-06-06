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
  matcher: ["/admin/:path*", "/api/state", "/api/state/:path*", "/arcade/zombie-attack/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isZombieAttack = pathname.startsWith("/arcade/zombie-attack");
  const isAdmin = pathname.startsWith("/admin");
  const isApiState = pathname.startsWith("/api/state");
  const isWriteApi =
    isApiState && !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());
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
