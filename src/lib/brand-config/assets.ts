// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Brand asset storage for the Appearance wizard (uploaded logos and the
// generated icon set). Local/self-hosted deployments store files under
// `data/brand-assets/` and serve them through `/api/brand-assets/...`;
// Vercel deployments will map this to Blob storage in a later phase
// (docs/CONFIGURABLE_BRANDING_PLAN.md, "Asset storage").

import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

export const BRAND_ASSET_PUBLIC_PREFIX = "/api/brand-assets";

// BRAND_ASSETS_DIR lets tests isolate storage the same way BRAND_CONFIG_FILE
// isolates the configuration store.
const assetsDir = () =>
  process.env.BRAND_ASSETS_DIR ?? path.join(process.cwd(), "data", "brand-assets");

const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,100}$/;

/** Resolve a stored asset path, refusing traversal outside the assets dir. */
export const resolveAssetPath = (fileName: string): string | null => {
  if (!SAFE_NAME.test(fileName)) return null;
  const resolved = path.resolve(assetsDir(), fileName);
  if (!resolved.startsWith(path.resolve(assetsDir()) + path.sep)) return null;
  return resolved;
};

export type StoredAsset = {
  /** Root-relative URL the app serves the asset from. */
  src: string;
  width: number;
  height: number;
  type: string;
};

export type GeneratedIconSet = {
  browserIcons: { src: string; sizes: string; type: string }[];
  appleIcons: { src: string; sizes: string; type: string }[];
  manifestIcons: {
    src: string;
    sizes: string;
    type: string;
    purpose: "any" | "maskable";
  }[];
  /** Hex of the icon's average color, offered as a PWA theme-color default. */
  dominantColor: string;
};

const writeAsset = async (fileName: string, data: Buffer): Promise<void> => {
  await fs.mkdir(assetsDir(), { recursive: true });
  await fs.writeFile(path.join(assetsDir(), fileName), data);
};

// ---------------------------------------------------------------------------
// Format-aware storage. The real format is sniffed from the bytes (the
// claimed MIME type is untrusted):
//   - SVG uploads stay VECTOR — validated for self-containment and stored
//     verbatim, preserving crisp edges and hi-DPI scalability. Rasterizing a
//     vector logo would throw away exactly what makes it a good logo format.
//   - PNG/JPEG uploads are re-encoded in their own format, which strips any
//     hostile payload or metadata while keeping photos as JPEG (smaller)
//     and graphics as PNG (lossless with alpha).
// ---------------------------------------------------------------------------

type SniffedFormat = "svg" | "png" | "jpeg" | "raster";

const sniffFormat = (input: Buffer): SniffedFormat | null => {
  if (
    input.length > 8 &&
    input[0] === 0x89 &&
    input[1] === 0x50 &&
    input[2] === 0x4e &&
    input[3] === 0x47
  ) {
    return "png";
  }
  if (input.length > 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) {
    return "jpeg";
  }
  // SVG: text that contains an <svg root within the first chunk (allows BOM,
  // XML declaration, comments, and DOCTYPE before it).
  const head = input.subarray(0, 4096).toString("utf8");
  if (/<svg[\s>]/i.test(head)) return "svg";
  // Anything else sharp can decode (e.g. WebP) is handled as generic raster.
  return input.length > 12 ? "raster" : null;
};

/** Error thrown when an SVG upload violates the self-containment rules. */
export class UnsafeSvgError extends Error {}

// Known-safe namespace URLs are stripped before scanning so the required
// xmlns declarations don't trip the external-reference check (same approach
// as the St. Johns icon.svg regression test in tests/brand-config.test.ts).
const SAFE_SVG_URLS = [
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/1999/xlink",
  "http://www.w3.org/XML/1998/namespace",
];

/**
 * Validate that an SVG is self-contained and inert: no scripting, no event
 * handlers, no external or data: references, no embedded documents. Uploads
 * that fail are rejected (not mutated) with a plain-language message — a
 * half-sanitized logo is worse than asking for a clean export.
 */
export const assertSelfContainedSvg = (svgText: string): void => {
  let scannable = svgText;
  for (const url of SAFE_SVG_URLS) {
    scannable = scannable.split(url).join("");
  }
  const violations: [RegExp, string][] = [
    [/<\s*script/i, "scripts"],
    [/\bon[a-z]+\s*=/i, "event handlers"],
    [/javascript\s*:/i, "javascript: URLs"],
    [/<\s*foreignObject/i, "embedded HTML (foreignObject)"],
    [/<\s*(?:iframe|embed|object|image|video|audio)\b/i, "embedded documents or images"],
    [/https?:\/\//i, "external references"],
    [/data\s*:/i, "data: URIs"],
    [/@import/i, "CSS imports"],
  ];
  for (const [pattern, what] of violations) {
    if (pattern.test(scannable)) {
      throw new UnsafeSvgError(
        `This SVG contains ${what}, which isn't allowed. Export a plain, self-contained SVG (no scripts, links, or embedded images) or upload a PNG instead.`,
      );
    }
  }
  if (!/xmlns\s*=/.test(svgText)) {
    throw new UnsafeSvgError(
      "This SVG is missing its xmlns declaration. Re-export it from your design tool as a standalone SVG.",
    );
  }
};

/** Intrinsic SVG dimensions via sharp, with a viewBox fallback. */
const measureSvg = async (input: Buffer): Promise<{ width: number; height: number }> => {
  try {
    const metadata = await sharp(input).metadata();
    if (metadata.width && metadata.height) {
      return { width: Math.round(metadata.width), height: Math.round(metadata.height) };
    }
  } catch {
    // fall through to viewBox parsing
  }
  const viewBox = input
    .toString("utf8")
    .match(/viewBox\s*=\s*["']\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (viewBox) {
    const width = Math.round(Number.parseFloat(viewBox[1]));
    const height = Math.round(Number.parseFloat(viewBox[2]));
    if (width > 0 && height > 0) return { width, height };
  }
  throw new UnsafeSvgError(
    "This SVG has no usable size (width/height or viewBox). Re-export it with an explicit viewBox.",
  );
};

/**
 * Store an uploaded logo image. Dimensions are measured server-side (never
 * typed by the operator — the St. Johns launch lesson). SVGs stay vector
 * (validated, stored verbatim); rasters are re-encoded in their own format
 * to strip any hostile payload.
 */
export const storeLogoAsset = async (
  kind: "logo-light" | "logo-dark",
  input: Buffer,
): Promise<StoredAsset> => {
  const format = sniffFormat(input);
  if (format === null) {
    throw new UnsafeSvgError("This file doesn't look like an image.");
  }

  if (format === "svg") {
    assertSelfContainedSvg(input.toString("utf8"));
    const { width, height } = await measureSvg(input);
    const fileName = `${kind}-${Date.now()}.svg`;
    await writeAsset(fileName, input);
    return {
      src: `${BRAND_ASSET_PUBLIC_PREFIX}/${fileName}`,
      width,
      height,
      type: "image/svg+xml",
    };
  }

  const image = sharp(input, { limitInputPixels: 32_000_000 });
  const encoded =
    format === "jpeg"
      ? await image.jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true })
      : await image.png().toBuffer({ resolveWithObject: true });
  const extension = format === "jpeg" ? "jpg" : "png";
  const fileName = `${kind}-${Date.now()}.${extension}`;
  await writeAsset(fileName, encoded.data);
  return {
    src: `${BRAND_ASSET_PUBLIC_PREFIX}/${fileName}`,
    width: encoded.info.width,
    height: encoded.info.height,
    type: format === "jpeg" ? "image/jpeg" : "image/png",
  };
};

const ICON_SIZES = [32, 64, 128, 256, 512] as const;
const APPLE_ICON_SIZE = 180;
/** Padding ratio around the mark inside generated install icons. */
const ICON_CONTENT_RATIO = 0.86;

/**
 * Generate the full browser/Apple/manifest icon set from one uploaded square
 * mark, replacing the multi-commit manual icon workflow from the St. Johns
 * launch. The mark is contained (with padding) on a transparent canvas for
 * browser icons and on an opaque background for Apple/maskable icons.
 */
export const generateIconSet = async (
  input: Buffer,
  backgroundColor: string,
): Promise<GeneratedIconSet> => {
  const stamp = Date.now();
  // Install icons are necessarily raster (PNG), but an SVG mark must be
  // RENDERED at the target size, not rasterized small and upscaled: raise
  // the render density so the vector rasterizes at ≥512px before resizing.
  let density: number | undefined;
  if (sniffFormat(input) === "svg") {
    assertSelfContainedSvg(input.toString("utf8"));
    const natural = await measureSvg(input);
    density = Math.min(2400, Math.ceil((72 * 512) / Math.max(1, natural.width)));
  }
  const source = sharp(input, { limitInputPixels: 32_000_000, density });
  const stats = await source.clone().stats();
  const dominant = stats.dominant;
  const dominantColor = `#${[dominant.r, dominant.g, dominant.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;

  const renderIcon = async (size: number, opaque: boolean): Promise<Buffer> => {
    const contentSize = Math.round(size * ICON_CONTENT_RATIO);
    const mark = await source
      .clone()
      .resize(contentSize, contentSize, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: opaque ? backgroundColor : { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: mark, gravity: "center" }])
      .png()
      .toBuffer();
  };

  const files: { name: string; size: number; opaque: boolean }[] = [
    ...ICON_SIZES.map((size) => ({ name: `icon-${size}-${stamp}.png`, size, opaque: false })),
    { name: `icon-apple-${stamp}.png`, size: APPLE_ICON_SIZE, opaque: true },
    { name: `icon-maskable-${stamp}.png`, size: 512, opaque: true },
  ];
  for (const file of files) {
    await writeAsset(file.name, await renderIcon(file.size, file.opaque));
  }

  const url = (name: string) => `${BRAND_ASSET_PUBLIC_PREFIX}/${name}`;
  return {
    browserIcons: [
      { src: url(`icon-32-${stamp}.png`), sizes: "32x32", type: "image/png" },
      { src: url(`icon-64-${stamp}.png`), sizes: "64x64", type: "image/png" },
    ],
    appleIcons: [
      {
        src: url(`icon-apple-${stamp}.png`),
        sizes: `${APPLE_ICON_SIZE}x${APPLE_ICON_SIZE}`,
        type: "image/png",
      },
    ],
    manifestIcons: [
      ...ICON_SIZES.map((size) => ({
        src: url(`icon-${size}-${stamp}.png`),
        sizes: `${size}x${size}` as const,
        type: "image/png",
        purpose: "any" as const,
      })),
      {
        src: url(`icon-maskable-${stamp}.png`),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable" as const,
      },
    ],
    dominantColor,
  };
};
