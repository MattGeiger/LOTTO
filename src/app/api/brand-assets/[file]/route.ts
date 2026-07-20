// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Public read endpoint for stored brand assets (uploaded logos and generated
// icons). Rasters are re-encoded PNG/JPEG and SVGs are validated
// self-contained by `src/lib/brand-config/assets.ts`; `resolveAssetPath`
// rejects traversal. SVG responses additionally carry a no-script CSP and
// nosniff so that even a directly-navigated SVG document can never execute
// anything in this origin (defense in depth on top of upload validation).

import fs from "node:fs/promises";

import { NextResponse } from "next/server";

import { resolveAssetPath } from "@/lib/brand-config/assets";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  svg: "image/svg+xml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const resolved = resolveAssetPath(file);
  const extension = file.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!resolved || !contentType) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  try {
    const data = await fs.readFile(resolved);
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
        ...(extension === "svg"
          ? {
              "Content-Security-Policy":
                "default-src 'none'; style-src 'unsafe-inline'; sandbox",
              "Content-Disposition": "inline",
            }
          : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
