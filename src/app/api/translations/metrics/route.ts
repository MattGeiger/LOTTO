// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";

import * as store from "@/lib/translation/translations-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const all = await store.list();
    const byStatus = { pending: 0, completed: 0, failed: 0 } as Record<string, number>;
    const byLanguage: Record<string, number> = {};
    for (const row of all) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      byLanguage[row.language] = (byLanguage[row.language] ?? 0) + 1;
    }
    return NextResponse.json({ total: all.length, byStatus, byLanguage }, { status: 200 });
  } catch (error) {
    console.error("[Translations] metrics failed:", error);
    return NextResponse.json({ error: "Unable to load metrics." }, { status: 500 });
  }
}
