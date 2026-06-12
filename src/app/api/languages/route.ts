// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";
import { z } from "zod";

import { bulkSetEnabled, listEnabledLanguages, listLanguages } from "@/lib/translation/languages-store";

export const runtime = "nodejs";

const bulkUpdateSchema = z.object({
  languages: z
    .array(
      z.object({
        name: z.string().min(1).max(64),
        isEnabled: z.boolean(),
      }),
    )
    .min(1)
    .max(200),
});

// GET /api/languages          → all catalog rows (with is_enabled)
// GET /api/languages?enabled  → only enabled rows
// GET /api/languages?client   → visitor-facing options (core + completed packs)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.has("client")) {
      const { listClientLanguages } = await import("@/lib/translation/pack");
      const languages = await listClientLanguages();
      return NextResponse.json({ languages }, { status: 200 });
    }
    const enabledOnly = url.searchParams.has("enabled");
    const languages = enabledOnly ? await listEnabledLanguages() : await listLanguages();
    return NextResponse.json({ languages }, { status: 200 });
  } catch (error) {
    console.error("[Languages] GET failed:", error);
    return NextResponse.json(
      { error: "Unable to load languages. Please try again shortly." },
      { status: 500 },
    );
  }
}

// PUT /api/languages — bulk enable/disable (write; gated by proxy auth).
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const languages = await bulkSetEnabled(parsed.data.languages);
    return NextResponse.json({ languages }, { status: 200 });
  } catch (error) {
    console.error("[Languages] PUT failed:", error);
    return NextResponse.json(
      { error: "Unable to update languages. Please try again shortly." },
      { status: 500 },
    );
  }
}
