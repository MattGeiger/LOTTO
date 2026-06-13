// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";

import { NoActiveConfigError, translatePending } from "@/lib/translation/engine";

export const runtime = "nodejs";
// Headroom for one chunk of provider calls; callers loop until remaining is 0.
export const maxDuration = 60;

// POST /api/translations/process — translate the next staged chunk of pending
// rows (announcement → UI strings → inventory). Returns counts + how many
// pending rows remain, so the admin/client can poll until complete.
export async function POST() {
  try {
    const result = await translatePending();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof NoActiveConfigError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[Translations] process failed:", error);
    return NextResponse.json({ error: "Unable to process translations." }, { status: 500 });
  }
}
