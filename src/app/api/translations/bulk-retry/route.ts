// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";
import { z } from "zod";

import { NoActiveConfigError, translateRowsByIds } from "@/lib/translation/engine";
import * as store from "@/lib/translation/translations-store";

export const runtime = "nodejs";

const schema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) });

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
    for (const id of parsed.data.ids) {
      await store.update(id, { status: "pending", metadata: null });
    }
    const result = await translateRowsByIds(parsed.data.ids);
    return NextResponse.json({ ...result }, { status: 200 });
  } catch (error) {
    if (error instanceof NoActiveConfigError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[Translations] bulk-retry failed:", error);
    return NextResponse.json({ error: "Unable to retry translations." }, { status: 500 });
  }
}
