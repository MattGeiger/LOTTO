// SPDX-License-Identifier: AGPL-3.0-or-later
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { publishPublicConfiguration } from "@/lib/realtime/configuration-publication";

export const runtime = "nodejs";
export const maxDuration = 60;

// Explicit operator bootstrap/repair, never called by a public read or timer.
export async function POST(request: Request) {
  if (!(await auth())?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ activate: z.boolean().optional() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    return NextResponse.json(await publishPublicConfiguration(parsed.data));
  } catch (error) {
    console.error("[Configuration] Explicit publication failed.", error);
    return NextResponse.json({ error: "Publication failed; the previous public document is retained." }, { status: 503 });
  }
}
