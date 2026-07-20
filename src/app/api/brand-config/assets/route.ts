// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Staff-gated upload endpoint for the Appearance wizard (nested under
// /api/brand-config so the proxy's write gating covers it). Accepts one image
// per request: a light/dark logo (stored + measured) or a square mark
// (expanded into the full generated icon set).

import { NextResponse } from "next/server";

import {
  generateIconSet,
  storeLogoAsset,
  UnsafeSvgError,
} from "@/lib/brand-config/assets";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const kind = form.get("kind");
    const file = form.get("file");
    if (
      (kind !== "logo-light" && kind !== "logo-dark" && kind !== "icon") ||
      !(file instanceof File)
    ) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Please upload a PNG, JPEG, WebP, or SVG image." },
        { status: 415 },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Images must be 8 MB or smaller." },
        { status: 413 },
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    if (kind === "icon") {
      const backgroundRaw = form.get("backgroundColor");
      const background =
        typeof backgroundRaw === "string" && HEX_COLOR.test(backgroundRaw)
          ? backgroundRaw
          : "#ffffff";
      const iconSet = await generateIconSet(buffer, background);
      return NextResponse.json({ iconSet }, { status: 200 });
    }

    const asset = await storeLogoAsset(kind, buffer);
    return NextResponse.json({ asset }, { status: 200 });
  } catch (error) {
    if (error instanceof UnsafeSvgError) {
      return NextResponse.json({ error: error.message }, { status: 415 });
    }
    console.error("[BrandAssets] Upload failed:", error);
    return NextResponse.json(
      { error: "Unable to process the image. Please try a different file." },
      { status: 500 },
    );
  }
}
