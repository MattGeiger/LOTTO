// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";
import { z } from "zod";

import * as store from "@/lib/translation/translations-store";

export const runtime = "nodejs";

const schema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(1000) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    const removed = await store.bulkRemove(parsed.data.ids);
    return NextResponse.json({ removed }, { status: 200 });
  } catch (error) {
    console.error("[Translations] bulk-delete failed:", error);
    return NextResponse.json({ error: "Unable to delete translations." }, { status: 500 });
  }
}
