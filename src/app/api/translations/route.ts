// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";

import * as store from "@/lib/translation/translations-store";
import { TRANSLATION_STATUSES, TRANSLATION_TYPES } from "@/lib/translation/types";

export const runtime = "nodejs";

// GET /api/translations?language=&type=&status=
// Translation rows are created by the auditor (Find missing / on-enable), not by
// a manual "add" flow — every translatable string comes from a content source
// (UI strings, the active announcement, inventory).
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const language = url.searchParams.get("language") ?? undefined;
    const typeParam = url.searchParams.get("type") ?? undefined;
    const statusParam = url.searchParams.get("status") ?? undefined;
    const type = TRANSLATION_TYPES.includes(typeParam as never) ? (typeParam as never) : undefined;
    const status = TRANSLATION_STATUSES.includes(statusParam as never) ? (statusParam as never) : undefined;
    const translations = await store.list({ language, type, status });
    return NextResponse.json({ translations }, { status: 200 });
  } catch (error) {
    console.error("[Translations] GET failed:", error);
    return NextResponse.json({ error: "Unable to load translations." }, { status: 500 });
  }
}
