// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { NextResponse } from "next/server";

import { NoActiveConfigError } from "@/lib/translation/engine";
import { recoverStuck } from "@/lib/translation/recovery";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await recoverStuck();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof NoActiveConfigError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[Translations] recover-stuck failed:", error);
    return NextResponse.json({ error: "Unable to recover stuck translations." }, { status: 500 });
  }
}
