// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";

import * as store from "@/lib/ai/system-prompt-store";
import { systemPromptInputSchema } from "@/app/api/system-prompts/route";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const parseId = async (context: Context): Promise<number | null> => {
  const params = await context.params;
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function PUT(request: Request, context: Context) {
  const id = await parseId(context);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = systemPromptInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const prompt = await store.update(id, parsed.data);
    if (!prompt) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ prompt }, { status: 200 });
  } catch (error) {
    console.error("[SystemPrompts] PUT failed:", error);
    return NextResponse.json({ error: "Unable to update system prompt." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const id = await parseId(context);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  try {
    const removed = await store.remove(id);
    if (!removed) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[SystemPrompts] DELETE failed:", error);
    return NextResponse.json({ error: "Unable to delete system prompt." }, { status: 500 });
  }
}
