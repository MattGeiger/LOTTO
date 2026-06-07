// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";

import { deleteConfig, updateConfig } from "@/lib/ai/ai-config-service";
import { isEncryptionConfigured } from "@/lib/ai/encryption";
import { aiConfigInputSchema } from "../route";

export const runtime = "nodejs";

const parseId = (raw: string): number | null => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid configuration id." }, { status: 400 });
  }

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
  if (parsed.data.apiKey && !isEncryptionConfigured()) {
    return NextResponse.json(
      { error: "Server encryption is not configured (ENCRYPTION_MASTER_KEY)." },
      { status: 503 },
    );
  }

  try {
    const config = await updateConfig(id, parsed.data);
    if (!config) {
      return NextResponse.json({ error: "Configuration not found." }, { status: 404 });
    }
    return NextResponse.json({ config }, { status: 200 });
  } catch (error) {
    console.error("[AIConfig] PUT failed:", error);
    return NextResponse.json({ error: "Unable to update AI configuration." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid configuration id." }, { status: 400 });
  }

  try {
    const removed = await deleteConfig(id);
    if (!removed) {
      return NextResponse.json({ error: "Configuration not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[AIConfig] DELETE failed:", error);
    return NextResponse.json({ error: "Unable to delete AI configuration." }, { status: 500 });
  }
}
