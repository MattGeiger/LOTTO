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
  BrandAssetStorageError,
  generateIconSet,
  ImageProcessingError,
  storeLogoAsset,
  UnsafeSvgError,
} from "@/lib/brand-config/assets";

export const runtime = "nodejs";

// Vercel Functions cap request bodies at 4.5 MB. Keep a safety margin so the
// multipart envelope cannot turn an advertised-valid upload into a platform
// rejection before LOTTO can return an ASK-compliant response.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
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
      return NextResponse.json(
        {
          error:
            "LOTTO did not receive an image and upload destination. Select the logo or app-icon control and choose a PNG, JPEG, WebP, or SVG file.",
          code: "BRAND_ASSET_REQUEST_INVALID",
        },
        { status: 400 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json(
        {
          error:
            "This image file is empty. Export the logo again as a PNG, JPEG, WebP, or SVG, then choose the new file.",
          code: "BRAND_ASSET_EMPTY",
        },
        { status: 422 },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error:
            "This image is larger than 4 MB. Export or compress a smaller PNG, JPEG, WebP, or SVG, then upload it again.",
          code: "BRAND_ASSET_TOO_LARGE",
        },
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
      let iconSet: Awaited<ReturnType<typeof generateIconSet>>;
      try {
        iconSet = await generateIconSet(buffer, background);
      } catch (error) {
        if (
          error instanceof UnsafeSvgError ||
          error instanceof ImageProcessingError ||
          error instanceof BrandAssetStorageError
        ) {
          throw error;
        }
        throw new ImageProcessingError(
          "LOTTO could not create install icons from this image. Export a square PNG, JPEG, WebP, or plain self-contained SVG, then try again.",
        );
      }
      return NextResponse.json({ iconSet }, { status: 200 });
    }

    const asset = await storeLogoAsset(kind, buffer, file.name);
    return NextResponse.json({ asset }, { status: 200 });
  } catch (error) {
    if (error instanceof UnsafeSvgError) {
      return NextResponse.json(
        { error: error.message, code: "BRAND_ASSET_SVG_UNSAFE" },
        { status: 415 },
      );
    }
    if (error instanceof ImageProcessingError) {
      return NextResponse.json(
        { error: error.message, code: "BRAND_ASSET_UNREADABLE" },
        { status: 422 },
      );
    }
    if (error instanceof BrandAssetStorageError) {
      return NextResponse.json(
        { error: error.message, code: "BRAND_ASSET_STORAGE_UNAVAILABLE" },
        { status: 503 },
      );
    }
    console.error("[BrandAssets] Upload failed:", error);
    return NextResponse.json(
      {
        error:
          "LOTTO could not finish this image upload. Check your connection and try the same file again. If it continues, ask a deployment administrator to review the LOTTO logs.",
        code: "BRAND_ASSET_UPLOAD_FAILED",
      },
      { status: 500 },
    );
  }
}
