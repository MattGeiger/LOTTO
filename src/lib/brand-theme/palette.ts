// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { oklchToSrgb, type Oklch } from "./color";
import {
  TAILWIND_NEUTRAL_FAMILIES,
  TAILWIND_PALETTE,
  type TailwindPaletteEntry,
} from "./palette.generated";

export const TAILWIND_PALETTE_NAMES = TAILWIND_PALETTE.map((entry) => entry.name);
const entriesByName = new Map(TAILWIND_PALETTE.map((entry) => [entry.name, entry]));
const neutralFamilies = new Set<string>(TAILWIND_NEUTRAL_FAMILIES);

export const isTailwindPaletteName = (value: string): boolean => entriesByName.has(value);

export const paletteEntry = (name: string): TailwindPaletteEntry => {
  const entry = entriesByName.get(name);
  if (!entry) throw new Error(`Unknown Tailwind palette color: ${name}`);
  return entry;
};

export const paletteColor = (name: string): Oklch => {
  const { l, c, h } = paletteEntry(name);
  return { l, c, h };
};

const hueDistance = (left: number, right: number) => {
  const direct = Math.abs(left - right) % 360;
  return Math.min(direct, 360 - direct) / 180;
};

/** Deterministically snap extracted/legacy OKLCH to the nearest Tailwind stop. */
export const nearestPaletteEntry = (
  color: Oklch,
  kind: "any" | "chromatic" | "neutral" = "any",
): TailwindPaletteEntry => {
  const candidates = TAILWIND_PALETTE.filter((entry) => {
    if (kind === "neutral") return neutralFamilies.has(entry.family);
    if (kind === "chromatic") return !neutralFamilies.has(entry.family);
    return true;
  });
  let best = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of candidates) {
    // Lightness is perceptually dominant. Hue becomes irrelevant as chroma
    // approaches zero, so scale it by the stronger chroma of the pair.
    const chromaWeight = Math.max(color.c, entry.c, 0.015);
    const distance =
      (color.l - entry.l) ** 2 * 4 +
      (color.c - entry.c) ** 2 * 3 +
      hueDistance(color.h, entry.h) ** 2 * chromaWeight;
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return best;
};

export const paletteCss = (name: string): string => {
  const { l, c, h } = paletteEntry(name);
  return `oklch(${(l * 100).toFixed(1)}% ${c} ${h})`;
};

/** Legacy-safe swatch CSS for inline client styles (Safari/iPadOS 15). */
export const paletteSrgbCss = (name: string): string => {
  const channels = oklchToSrgb(paletteColor(name)).map((channel) =>
    Math.round(channel * 255),
  );
  return `rgb(${channels.join(" ")})`;
};
