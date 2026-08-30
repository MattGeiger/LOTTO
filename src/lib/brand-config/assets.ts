// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Brand asset storage for the Appearance wizard (uploaded logos and the
// generated icon set). Vercel deployments use public Blob storage so assets
// survive immutable deployments and can appear in authentication email;
// local/self-hosted deployments keep the filesystem fallback under
// `data/brand-assets/` and serve it through `/api/brand-assets/...`.

import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { DOMParser, XMLSerializer, type Attr, type Element, type Node } from "@xmldom/xmldom";
import { put } from "@vercel/blob";
import sharp, { type OutputInfo } from "sharp";

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
  /** Local root-relative URL or durable public Blob URL for the asset. */
  src: string;
  width: number;
  height: number;
  type: string;
  filename: string;
  warnings: string[];
  presentationHint?: {
    suggested: "transparent" | "dark-surface";
    reason: string;
  };
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

/** Error thrown when otherwise-valid image data cannot be persisted. */
export class BrandAssetStorageError extends Error {}

/** Error thrown when uploaded bytes are not a supported, readable image. */
export class ImageProcessingError extends Error {}

const blobConfigured = (): boolean =>
  Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
  );

const writeAsset = async (
  fileName: string,
  data: Buffer,
  contentType: string,
): Promise<string> => {
  if (blobConfigured()) {
    try {
      const blob = await put(`brand-assets/${fileName}`, data, {
        access: "public",
        addRandomSuffix: true,
        contentType,
      });
      return blob.url;
    } catch (error) {
      console.error("[BrandAssets] Vercel Blob write failed:", error);
      throw new BrandAssetStorageError(
        "LOTTO could not store this image. Ask a deployment administrator to check the connected Vercel Blob store and its available storage, then try again.",
      );
    }
  }

  if (process.env.VERCEL === "1") {
    throw new BrandAssetStorageError(
      "Logo storage is not configured for this LOTTO deployment. Ask a deployment administrator to connect a public Vercel Blob store, then try the upload again.",
    );
  }

  try {
    await fs.mkdir(assetsDir(), { recursive: true });
    await fs.writeFile(path.join(assetsDir(), fileName), data);
    return `${BRAND_ASSET_PUBLIC_PREFIX}/${fileName}`;
  } catch (error) {
    console.error("[BrandAssets] Filesystem write failed:", error);
    throw new BrandAssetStorageError(
      "LOTTO could not store this image. Ask a deployment administrator to check the brand-assets storage directory, then try again.",
    );
  }
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

const FORBIDDEN_SVG_ELEMENTS = new Set([
  "script", "foreignobject", "iframe", "embed", "object", "image", "video",
  "audio", "canvas", "base", "feimage", "handler", "discard", "animate",
  "animatemotion", "animatetransform", "set",
]);
const SVG_URI_ATTRIBUTES = new Set(["href", "xlink:href", "src", "xml:base"]);
const UNSAFE_SVG_CSS = /(?:@import|expression\s*\(|behavior\s*:|-moz-binding\s*:|javascript\s*:|vbscript\s*:|data\s*:)/i;

const unsafeSvgUri = (value: string) => {
  const compact = value.replace(/[\u0000-\u0020]+/g, "").toLowerCase();
  return compact.length > 0 && !compact.startsWith("#");
};

const unsafeCssUrl = (value: string) =>
  [...value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)].some((match) =>
    unsafeSvgUri(match[2] ?? ""),
  );

const sanitizeSvgElement = (element: Element) => {
  const attributes = Array.from(
    { length: element.attributes.length },
    (_, index) => element.attributes.item(index),
  ).filter((attribute): attribute is Attr => attribute !== null);
  for (const attribute of attributes) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value;
    if (
      name.startsWith("on") ||
      (SVG_URI_ATTRIBUTES.has(name) && unsafeSvgUri(value)) ||
      ((name === "style" || /url\(/i.test(value)) &&
        (UNSAFE_SVG_CSS.test(value) || unsafeCssUrl(value)))
    ) {
      element.removeAttributeNode(attribute);
    }
  }
  if (element.localName?.toLowerCase() === "style") {
    const css = element.textContent ?? "";
    if (UNSAFE_SVG_CSS.test(css) || unsafeCssUrl(css)) {
      element.parentNode?.removeChild(element);
    }
  }
};

const sanitizeSvgTree = (parent: Node): void => {
  let child = parent.firstChild;
  while (child) {
    const next = child.nextSibling;
    if (
      child.nodeType === child.PROCESSING_INSTRUCTION_NODE ||
      child.nodeType === child.DOCUMENT_TYPE_NODE
    ) {
      parent.removeChild(child);
    } else if (child.nodeType === child.ELEMENT_NODE) {
      const element = child as Element;
      const name = element.localName?.toLowerCase() ?? element.nodeName.toLowerCase();
      if (FORBIDDEN_SVG_ELEMENTS.has(name)) parent.removeChild(child);
      else {
        sanitizeSvgElement(element);
        if (element.parentNode) sanitizeSvgTree(element);
      }
    }
    child = next;
  }
};

/** Preserve safe SVG geometry/styles while structurally removing active content. */
export const sanitizeBrandSvg = (source: Buffer | string): Buffer => {
  const input = (Buffer.isBuffer(source) ? source.toString("utf8") : source)
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (/<!doctype/i.test(input)) {
    throw new UnsafeSvgError(
      "This SVG uses an XML document type, which isn't allowed. Export a standard self-contained SVG and try again.",
    );
  }
  const document = new DOMParser({
    locator: false,
    onError: (level, message) => {
      if (level !== "warning") throw new Error(message);
    },
  }).parseFromString(input, "image/svg+xml");
  const root = document.documentElement;
  if (!root || root.localName?.toLowerCase() !== "svg") {
    throw new UnsafeSvgError("This file is not a readable SVG image.");
  }
  sanitizeSvgElement(root);
  sanitizeSvgTree(document);
  return Buffer.from(new XMLSerializer().serializeToString(document), "utf8");
};

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
  originalFilename = "brand-logo",
): Promise<StoredAsset> => {
  const format = sniffFormat(input);
  if (format === null) {
    throw new ImageProcessingError(
      "LOTTO could not read this file as an image. Export it as a PNG, JPEG, WebP, or plain self-contained SVG, then upload the new file.",
    );
  }

  if (format === "svg") {
    const sanitized = sanitizeBrandSvg(input);
    const { width, height } = await measureSvg(sanitized);
    const fileName = `${kind}-${Date.now()}.svg`;
    const src = await writeAsset(fileName, sanitized, "image/svg+xml");
    return {
      src,
      width,
      height,
      type: "image/svg+xml",
      filename: originalFilename,
      warnings: [],
      presentationHint: await describeLogoPresentation(sanitized, true),
    };
  }

  let encoded: { data: Buffer; info: OutputInfo };
  try {
    const image = sharp(input, { limitInputPixels: 32_000_000 });
    encoded =
      format === "jpeg"
        ? await image.jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true })
        : await image.png().toBuffer({ resolveWithObject: true });
  } catch {
    throw new ImageProcessingError(
      "LOTTO could not decode this image. Re-export it as a standard PNG, JPEG, WebP, or plain self-contained SVG, then try again.",
    );
  }
  const extension = format === "jpeg" ? "jpg" : "png";
  const fileName = `${kind}-${Date.now()}.${extension}`;
  const type = format === "jpeg" ? "image/jpeg" : "image/png";
  const src = await writeAsset(fileName, encoded.data, type);
  return {
    src,
    width: encoded.info.width,
    height: encoded.info.height,
    type,
    filename: originalFilename,
    warnings:
      encoded.info.width < 576 || encoded.info.height < 160
        ? [`This logo is ${encoded.info.width} × ${encoded.info.height} px. For crisp high-density screens, use SVG or a raster image at least 576 × 160 px.`]
        : [],
    presentationHint: await describeLogoPresentation(encoded.data, false),
  };
};

const describeLogoPresentation = async (
  input: Buffer,
  isVector: boolean,
): Promise<NonNullable<StoredAsset["presentationHint"]>> => {
  const density = isVector ? 144 : undefined;
  const { data, info } = await sharp(input, { density, limitInputPixels: 32_000_000 })
    .resize(96, 96, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let drawn = 0;
  let luminance = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const alpha = data[index + 3];
    if (alpha < 32) {
      transparent += 1;
      continue;
    }
    drawn += 1;
    luminance += (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
  }
  const transparentFraction = transparent / Math.max(1, transparent + drawn);
  const artworkLightness = luminance / Math.max(1, drawn);
  const needsPlate = transparentFraction >= 0.2 && artworkLightness >= 0.62;
  return {
    suggested: needsPlate ? "dark-surface" : "transparent",
    reason: needsPlate
      ? "This logo has a transparent background with light artwork, so it may disappear on a light page. A dark plate is recommended."
      : "This logo should read directly on a light page.",
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
    input = sanitizeBrandSvg(input);
    const natural = await measureSvg(input);
    density = Math.min(2400, Math.max(0.01, (72 * 512 * 2) / Math.max(1, natural.width, natural.height)));
  }
  const metadata = await sharp(input, { density, limitInputPixels: 32_000_000 }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new ImageProcessingError("LOTTO could not determine this app mark's dimensions.");
  }
  const aspect = Math.max(metadata.width, metadata.height) / Math.min(metadata.width, metadata.height);
  if (aspect > 1.2) {
    throw new ImageProcessingError(
      `This app mark is ${metadata.width} × ${metadata.height} px. Use an approximately square image so install icons are not cropped or tiny.`,
    );
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
  const urls = new Map<string, string>();
  for (const file of files) {
    urls.set(
      file.name,
      await writeAsset(file.name, await renderIcon(file.size, file.opaque), "image/png"),
    );
  }

  const url = (name: string) => urls.get(name)!;
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
