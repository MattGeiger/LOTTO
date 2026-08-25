// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { type NextRequest, NextResponse } from "next/server";

import { authHandlers } from "@/lib/auth";

export const runtime = "nodejs";

const scannerSafeEmailProviders = new Set(["resend", "email"]);

/**
 * Magic Link GETs consume nothing.
 *
 * Microsoft Defender and similar inbound-mail scanners prefetch emailed URLs.
 * Delegating that GET directly to Auth.js would spend the single-use token
 * before the recipient saw it. The confirmation page below requires a human
 * POST, which is the only request delegated to Auth.js for consumption.
 */
export async function GET(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/\/callback\/([^/]+)$/);
  const provider = match?.[1];

  if (provider && scannerSafeEmailProviders.has(provider)) {
    const confirmationUrl = new URL("/login/confirm", request.url);
    confirmationUrl.searchParams.set("provider", provider);

    for (const key of ["token", "email", "callbackUrl"] as const) {
      const value = request.nextUrl.searchParams.get(key);
      if (value) confirmationUrl.searchParams.set(key, value);
    }

    return NextResponse.redirect(confirmationUrl);
  }

  return authHandlers.GET(request);
}

export const POST = authHandlers.POST;
