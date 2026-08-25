// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";
import { z } from "zod";

import { createConfig, listConfigs } from "@/lib/ai/ai-config-service";
import { isEncryptionConfigured } from "@/lib/ai/encryption";
import { AI_SERVICE_TYPES, UNIT_PRICES } from "@/lib/ai/types";
import { MAX_TRANSLATION_MAX_OUTPUT_TOKENS } from "@/lib/ai/output-budget";

export const runtime = "nodejs";

export const aiConfigInputSchema = z.object({
  name: z.string().min(1).max(100),
  serviceType: z.enum(AI_SERVICE_TYPES),
  model: z.string().min(1).max(120),
  apiKey: z.string().min(1).max(512).optional(),
  inputCost: z.number().min(0).optional(),
  outputCost: z.number().min(0).optional(),
  unitPrice: z.enum(UNIT_PRICES).optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  topP: z.number().min(0).max(1).nullable().optional(),
  thinkingLevel: z.string().max(20).nullable().optional(),
  maxTokens: z.number().int().min(1).max(MAX_TRANSLATION_MAX_OUTPUT_TOKENS).nullable().optional(),
  inputTokenLimit: z.number().int().min(1).nullable().optional(),
  outputTokenLimit: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const configs = await listConfigs();
    return NextResponse.json(
      { configs, encryptionConfigured: isEncryptionConfigured() },
      { status: 200 },
    );
  } catch (error) {
    console.error("[AIConfig] GET failed:", error);
    return NextResponse.json(
      { error: "Unable to load AI configurations." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = aiConfigInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (!parsed.data.apiKey) {
    return NextResponse.json({ error: "An API key is required." }, { status: 400 });
  }
  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      { error: "Server encryption is not configured (ENCRYPTION_MASTER_KEY)." },
      { status: 503 },
    );
  }

  try {
    const config = await createConfig(parsed.data);
    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error("[AIConfig] POST failed:", error);
    return NextResponse.json(
      { error: "Unable to create AI configuration." },
      { status: 500 },
    );
  }
}
