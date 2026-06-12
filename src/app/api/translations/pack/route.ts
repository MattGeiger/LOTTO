// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";

import { buildLanguagePack } from "@/lib/translation/pack";

export const runtime = "nodejs";

// GET /api/translations/pack?code=<bcp47> — public: the completed UI-string
// translations + translated active announcement for one language. Visitors load
// this when they pick a non-English language.
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code")?.trim().toLowerCase();
    if (!code) {
      return NextResponse.json({ error: "Missing language code." }, { status: 400 });
    }
    const pack = await buildLanguagePack(code);
    if (!pack) {
      return NextResponse.json({ error: "Unknown language code." }, { status: 404 });
    }
    return NextResponse.json({ pack }, { status: 200 });
  } catch (error) {
    console.error("[Translations] pack failed:", error);
    return NextResponse.json({ error: "Unable to load the language pack." }, { status: 500 });
  }
}
