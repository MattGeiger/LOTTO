// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";

import { createConfig, listConfigs } from "@/lib/ai/ai-config-service";
import { isEncryptionConfigured } from "@/lib/ai/encryption";
import { aiConfigInputSchema } from "@/lib/ai/input-schema";

export const runtime = "nodejs";

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
