// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";
import { z } from "zod";

import { getConfig, getDecryptedApiKey } from "@/lib/ai/ai-config-service";
import { AI_SERVICE_TYPES } from "@/lib/ai/types";
import { validateApiKey } from "@/lib/ai/validate";

export const runtime = "nodejs";

// Validate either a freshly-entered key ({ serviceType, apiKey }) or an existing
// stored config ({ id }), which is decrypted server-side before the check.
const schema = z.union([
  z.object({ serviceType: z.enum(AI_SERVICE_TYPES), apiKey: z.string().min(1).max(512) }),
  z.object({ id: z.number().int().positive() }),
]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if ("id" in parsed.data) {
      const config = await getConfig(parsed.data.id);
      if (!config) {
        return NextResponse.json({ error: "Configuration not found." }, { status: 404 });
      }
      const apiKey = await getDecryptedApiKey(parsed.data.id);
      if (!apiKey) {
        return NextResponse.json(
          { result: { ok: false, message: "No stored API key to validate." } },
          { status: 200 },
        );
      }
      const result = await validateApiKey(config.serviceType, apiKey);
      return NextResponse.json({ result }, { status: 200 });
    }

    const result = await validateApiKey(parsed.data.serviceType, parsed.data.apiKey);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("[AIConfig] validate failed:", error);
    return NextResponse.json({ error: "Unable to validate the API key." }, { status: 500 });
  }
}
