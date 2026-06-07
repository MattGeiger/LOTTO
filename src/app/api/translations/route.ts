// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";
import { z } from "zod";

import { translateRowsByIds, NoActiveConfigError } from "@/lib/translation/engine";
import * as store from "@/lib/translation/translations-store";
import { TRANSLATION_STATUSES, TRANSLATION_TYPES } from "@/lib/translation/types";

export const runtime = "nodejs";

const addSchema = z.object({
  originalText: z.string().min(1).max(4000),
  language: z.string().min(1).max(64),
  type: z.enum(TRANSLATION_TYPES).optional(),
  translate: z.boolean().optional(),
});

// GET /api/translations?language=&type=&status=
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

// POST /api/translations — add a (custom) translation row and optionally translate it now.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const record = await store.upsert(
      {
        originalText: parsed.data.originalText,
        language: parsed.data.language,
        type: parsed.data.type ?? "custom",
      },
      { status: "pending", translatedText: null, metadata: null },
    );
    if (parsed.data.translate !== false) {
      try {
        await translateRowsByIds([record.id]);
      } catch (error) {
        if (error instanceof NoActiveConfigError) {
          return NextResponse.json(
            { translation: record, warning: error.message },
            { status: 201 },
          );
        }
        throw error;
      }
    }
    const fresh = await store.get(record.id);
    return NextResponse.json({ translation: fresh ?? record }, { status: 201 });
  } catch (error) {
    console.error("[Translations] POST failed:", error);
    return NextResponse.json({ error: "Unable to add the translation." }, { status: 500 });
  }
}
