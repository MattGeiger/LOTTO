// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";
import { z } from "zod";

import * as store from "@/lib/ai/system-prompt-store";
import { PROMPT_TYPES } from "@/lib/ai/system-prompt-types";

export const runtime = "nodejs";

export const systemPromptInputSchema = z.object({
  name: z.string().min(3).max(100),
  promptType: z.enum(PROMPT_TYPES),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  description: z.string().max(1000).nullable().optional(),
  translationApproach: z.string().max(1000).nullable().optional(),
  contextGuidance: z.string().max(1000).nullable().optional(),
  additionalGuidance: z.string().max(4000).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  topP: z.number().min(0).max(1).nullable().optional(),
});

export async function GET() {
  try {
    const prompts = await store.list();
    return NextResponse.json({ prompts }, { status: 200 });
  } catch (error) {
    console.error("[SystemPrompts] GET failed:", error);
    return NextResponse.json({ error: "Unable to load system prompts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const prompt = await store.insert(parsed.data);
    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    console.error("[SystemPrompts] POST failed:", error);
    return NextResponse.json({ error: "Unable to create system prompt." }, { status: 500 });
  }
}
