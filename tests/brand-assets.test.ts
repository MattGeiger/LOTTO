// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

// Format-aware brand-asset storage: SVG logos stay vector (validated
// self-contained, stored verbatim), rasters are re-encoded in their own
// format, and hostile SVGs are rejected with actionable messages.

import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";

import {
  assertSelfContainedSvg,
  generateIconSet,
  resolveAssetPath,
  storeLogoAsset,
  UnsafeSvgError,
} from "@/lib/brand-config/assets";

const assetsDir = () => process.env.BRAND_ASSETS_DIR!;

const CLEAN_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160">
  <rect x="8" y="8" width="144" height="144" rx="28" fill="#475569"/>
  <text x="176" y="72" font-size="44">Your Organization</text>
</svg>`;

afterAll(async () => {
  await fs.rm(assetsDir(), { recursive: true, force: true });
});

describe("brand asset storage formats", () => {
  it("keeps SVG uploads as vectors, verbatim, with measured dimensions", async () => {
    const asset = await storeLogoAsset("logo-light", Buffer.from(CLEAN_SVG));
    expect(asset.type).toBe("image/svg+xml");
    expect(asset.src).toMatch(/\.svg$/);
    expect([asset.width, asset.height]).toEqual([600, 160]);
    const stored = await fs.readFile(
      path.join(assetsDir(), asset.src.split("/").pop()!),
      "utf8",
    );
    // Verbatim: the vector source is untouched (no rasterization).
    expect(stored).toBe(CLEAN_SVG);
  });

  it("measures SVG dimensions from the viewBox when width/height are absent", async () => {
    const noSize = CLEAN_SVG.replace('viewBox="0 0 600 160"', 'viewBox="0 0 320 80"');
    const asset = await storeLogoAsset("logo-light", Buffer.from(noSize));
    expect([asset.width, asset.height]).toEqual([320, 80]);
  });

  it("re-encodes PNG uploads as PNG and JPEG uploads as JPEG", async () => {
    const png = await sharp({
      create: { width: 64, height: 32, channels: 4, background: "#33a478" },
    })
      .png()
      .toBuffer();
    const pngAsset = await storeLogoAsset("logo-light", png);
    expect(pngAsset.type).toBe("image/png");
    expect(pngAsset.src).toMatch(/\.png$/);
    expect([pngAsset.width, pngAsset.height]).toEqual([64, 32]);

    const jpeg = await sharp({
      create: { width: 48, height: 24, channels: 3, background: "#2762a2" },
    })
      .jpeg()
      .toBuffer();
    const jpegAsset = await storeLogoAsset("logo-dark", jpeg);
    expect(jpegAsset.type).toBe("image/jpeg");
    expect(jpegAsset.src).toMatch(/\.jpg$/);
    expect([jpegAsset.width, jpegAsset.height]).toEqual([48, 24]);
  });

  it("sniffs the real format instead of trusting the claimed type", async () => {
    // A PNG byte stream is stored as PNG no matter what the uploader claims;
    // the claimed MIME type never reaches storeLogoAsset at all.
    const png = await sharp({
      create: { width: 8, height: 8, channels: 4, background: "#000000" },
    })
      .png()
      .toBuffer();
    const asset = await storeLogoAsset("logo-light", png);
    expect(asset.type).toBe("image/png");
  });

  it("rejects SVGs that are not self-contained, with actionable messages", () => {
    const hostile: [string, RegExp][] = [
      [`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`, /scripts/],
      [`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>`, /event handlers/],
      [`<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect/></a></svg>`, /javascript:/],
      [`<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body/></foreignObject></svg>`, /foreignObject/],
      [`<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.png"/></svg>`, /embedded documents or images/],
      [`<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.example/defs.svg#a"/></svg>`, /external references/],
      [`<svg xmlns="http://www.w3.org/2000/svg"><style>@import "x";</style></svg>`, /CSS imports/],
    ];
    for (const [svg, message] of hostile) {
      expect(() => assertSelfContainedSvg(svg), svg).toThrow(UnsafeSvgError);
      expect(() => assertSelfContainedSvg(svg)).toThrow(message);
    }
    // The clean logo passes.
    expect(() => assertSelfContainedSvg(CLEAN_SVG)).not.toThrow();
  });

  it("generates the full crisp icon set from an SVG mark", async () => {
    const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#33a478"/></svg>`;
    const iconSet = await generateIconSet(Buffer.from(mark), "#ffffff");
    expect(iconSet.manifestIcons).toHaveLength(6);
    // The 512px icon really is 512px — rendered from the vector at density,
    // not upscaled from a 100px raster.
    const icon512 = iconSet.manifestIcons.find((icon) => icon.sizes === "512x512")!;
    const stored = await fs.readFile(
      path.join(assetsDir(), icon512.src.split("/").pop()!),
    );
    const metadata = await sharp(stored).metadata();
    expect([metadata.width, metadata.height]).toEqual([512, 512]);
  });

  it("still refuses path traversal and unknown names", () => {
    expect(resolveAssetPath("../secrets.txt")).toBeNull();
    expect(resolveAssetPath("..%2Fsecrets")).toBeNull();
    expect(resolveAssetPath("logo-light-123.svg")).not.toBeNull();
  });
});
