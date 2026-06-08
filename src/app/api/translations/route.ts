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
  language: z.string().min(1).max(64).optional(),
  targetLanguages: z.array(z.string().min(1).max(64)).min(1).max(100).optional(),
  type: z.enum(TRANSLATION_TYPES).optional(),
  translate: z.boolean().optional(),
}).refine((data) => Boolean(data.language || data.targetLanguages?.length), {
  message: "Provide a language or targetLanguages.",
  path: ["targetLanguages"],
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

// POST /api/translations — add custom translation row(s) and optionally translate them now.
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
    const targetLanguages = Array.from(
      new Set(parsed.data.targetLanguages ?? (parsed.data.language ? [parsed.data.language] : [])),
    );
    const records = await Promise.all(
      targetLanguages.map((language) =>
        store.upsert(
          {
            originalText: parsed.data.originalText,
            language,
            type: parsed.data.type ?? "custom",
          },
          { status: "pending", translatedText: null, metadata: null },
        ),
      ),
    );
    if (parsed.data.translate !== false) {
      try {
        await translateRowsByIds(records.map((record) => record.id));
      } catch (error) {
        if (error instanceof NoActiveConfigError) {
          return NextResponse.json(
            {
              translation: records[0] ?? null,
              translations: records,
              warning: error.message,
            },
            { status: 201 },
          );
        }
        throw error;
      }
    }
    const fresh = await Promise.all(records.map((record) => store.get(record.id)));
    const translations = fresh.map((record, index) => record ?? records[index]);
    return NextResponse.json({ translation: translations[0] ?? null, translations }, { status: 201 });
  } catch (error) {
    console.error("[Translations] POST failed:", error);
    return NextResponse.json({ error: "Unable to add the translation." }, { status: 500 });
  }
}
