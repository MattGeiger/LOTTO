// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// OKLCH color math for the configurable brand theme system.
//
// The forward sRGB→OKLCH conversion mirrors
// `scripts/convert-css-colors-to-oklch.mjs` (the repo's OKLCH authoring
// standard converter) so both produce identical values. This module adds the
// inverse conversion (needed for WCAG contrast, which is defined over sRGB)
// and small L/C/H manipulation helpers used by the derivation rules.

export type Oklch = {
  /** Perceptual lightness, 0–1. */
  l: number;
  /** Chroma, 0+ (practically ≤ ~0.37 in sRGB gamut). */
  c: number;
  /** Hue angle in degrees, [0, 360). Meaningless when c is 0. */
  h: number;
  /** Alpha, 0–1. Omitted means opaque. */
  alpha?: number;
};

const trimNumber = (value: number, precision = 6): string => {
  const rounded = Number(value.toFixed(precision));
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

/** Serialize to the repo's canonical `oklch(L C H[ / A])` notation. */
export const formatOklch = ({ l, c, h, alpha }: Oklch): string => {
  const alphaSuffix =
    alpha !== undefined && alpha < 1 ? ` / ${trimNumber(alpha)}` : "";
  return `oklch(${trimNumber(l)} ${trimNumber(c)} ${trimNumber(h, 3)}${alphaSuffix})`;
};

const OKLCH_PATTERN =
  /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i;

/** Parse a single `oklch(...)` literal. Returns null for anything else. */
export const parseOklch = (value: string): Oklch | null => {
  const match = value.trim().match(OKLCH_PATTERN);
  if (!match) return null;
  const [, l, c, h, alphaText] = match;
  const alpha = alphaText
    ? alphaText.endsWith("%")
      ? Number.parseFloat(alphaText) / 100
      : Number.parseFloat(alphaText)
    : undefined;
  return {
    l: Number.parseFloat(l),
    c: Number.parseFloat(c),
    h: Number.parseFloat(h),
    ...(alpha !== undefined && alpha < 1 ? { alpha } : {}),
  };
};

const srgbChannelToLinear = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const linearToSrgbChannel = (value: number): number =>
  value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;

/** sRGB (0–1 channels) → OKLCH. Same math as the conversion script. */
export const srgbToOklch = ([red, green, blue]: [number, number, number]): Oklch => {
  const r = srgbChannelToLinear(red);
  const g = srgbChannelToLinear(green);
  const b = srgbChannelToLinear(blue);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const labB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.hypot(a, labB);
  const hue = chroma < 0.0000005 ? 0 : (Math.atan2(labB, a) * 180) / Math.PI;
  return { l: lightness, c: chroma, h: hue < 0 ? hue + 360 : hue };
};

/**
 * OKLCH → sRGB (0–1 channels), clipped to gamut. Inverse of the matrices in
 * `srgbToOklch`; out-of-gamut channels are clamped, which is adequate for
 * contrast evaluation of near-gamut UI colors.
 */
export const oklchToSrgb = ({ l, c, h }: Oklch): [number, number, number] => {
  const hueRadians = (h * Math.PI) / 180;
  const labA = c * Math.cos(hueRadians);
  const labB = c * Math.sin(hueRadians);

  const l_ = l + 0.3963377774 * labA + 0.2158037573 * labB;
  const m_ = l - 0.1055613458 * labA - 0.0638541728 * labB;
  const s_ = l - 0.0894841775 * labA - 1.291485548 * labB;

  const lLinear = l_ ** 3;
  const mLinear = m_ ** 3;
  const sLinear = s_ ** 3;

  const r = 4.0767416621 * lLinear - 3.3077115913 * mLinear + 0.2309699292 * sLinear;
  const g = -1.2684380046 * lLinear + 2.6097574011 * mLinear - 0.3413193965 * sLinear;
  const b = -0.0041960863 * lLinear - 0.7034186147 * mLinear + 1.707614701 * sLinear;

  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
  return [
    clamp01(linearToSrgbChannel(r)),
    clamp01(linearToSrgbChannel(g)),
    clamp01(linearToSrgbChannel(b)),
  ];
};

/** WCAG 2.1 relative luminance of an OKLCH color (via sRGB). */
export const relativeLuminance = (color: Oklch): number => {
  const [r, g, b] = oklchToSrgb(color);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
};

/** WCAG 2.1 contrast ratio between two opaque colors, ≥ 1. */
export const contrastRatio = (a: Oklch, b: Oklch): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Non-mutating L/C/H adjustment with gamut-safe clamping of L and C. */
export const adjust = (
  color: Oklch,
  delta: { l?: number; c?: number; h?: number },
): Oklch => ({
  l: clamp(color.l + (delta.l ?? 0), 0, 1),
  c: clamp(color.c + (delta.c ?? 0), 0, 0.37),
  h: (((color.h + (delta.h ?? 0)) % 360) + 360) % 360,
});

/** Replace components outright (absolute set, not delta). */
export const withComponents = (
  color: Oklch,
  components: { l?: number; c?: number; h?: number; alpha?: number },
): Oklch => ({
  l: components.l ?? color.l,
  c: components.c ?? color.c,
  h: components.h ?? color.h,
  ...(components.alpha !== undefined ? { alpha: components.alpha } : {}),
});

/** Attach an alpha channel. */
export const withAlpha = (color: Oklch, alpha: number): Oklch => ({
  ...color,
  alpha,
});
