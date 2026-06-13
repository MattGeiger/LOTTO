// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";
import { z } from "zod";

import { findMissing } from "@/lib/translation/auditor";
import { NoActiveConfigError } from "@/lib/translation/engine";
import { TRANSLATION_TYPES } from "@/lib/translation/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z
  .object({
    process: z.boolean().optional(),
    types: z.array(z.enum(TRANSLATION_TYPES)).optional(),
    // English inventory names bridged from the admin browser, which can reach
    // FEED's public feed even when the server's egress to it is blocked.
    inventoryNames: z.array(z.string()).optional(),
  })
  .optional();

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = schema.safeParse(body);
  const process = parsed.success ? Boolean(parsed.data?.process) : false;
  const types = parsed.success ? parsed.data?.types : undefined;
  const inventoryNames = parsed.success ? parsed.data?.inventoryNames : undefined;

  try {
    const result = await findMissing(process, types, inventoryNames);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof NoActiveConfigError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[Translations] find-missing failed:", error);
    return NextResponse.json({ error: "Unable to scan for missing translations." }, { status: 500 });
  }
}
