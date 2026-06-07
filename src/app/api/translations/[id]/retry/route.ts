// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";

import { NoActiveConfigError, translateRowsByIds } from "@/lib/translation/engine";
import * as store from "@/lib/translation/translations-store";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const existing = await store.get(id);
  if (!existing) return NextResponse.json({ error: "Translation not found." }, { status: 404 });

  try {
    await store.update(id, { status: "pending", metadata: null });
    await translateRowsByIds([id]);
    const fresh = await store.get(id);
    return NextResponse.json({ translation: fresh }, { status: 200 });
  } catch (error) {
    if (error instanceof NoActiveConfigError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[Translations] retry failed:", error);
    return NextResponse.json({ error: "Unable to retry the translation." }, { status: 500 });
  }
}
