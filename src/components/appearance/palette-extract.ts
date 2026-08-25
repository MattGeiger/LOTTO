// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

// Client-side palette extraction from a same-origin or CORS-enabled public
// Blob logo image (median-cut over the opaque pixels). Shared by the LogoPalette picker (swatch chips)
// and the automatic color-story recommendation
// (`recommendColorStory` in src/lib/brand-theme/color-story.ts).

import { srgbToOklch, type Oklch } from "@/lib/brand-theme/color";
import type { PaletteEntry } from "@/lib/brand-theme/color-story";

type Pixel = [number, number, number];

const SAMPLE_SIZE = 96;
const PALETTE_TARGET = 6;

/** Median-cut quantization to 2^depth boxes, averaged per box. */
const medianCut = (
  pixels: Pixel[],
  depth: number,
): { color: Pixel; count: number }[] => {
  if (pixels.length === 0) return [];
  if (depth === 0) {
    const sum = pixels.reduce(
      (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b] as Pixel,
      [0, 0, 0] as Pixel,
    );
    return [
      {
        color: [
          Math.round(sum[0] / pixels.length),
          Math.round(sum[1] / pixels.length),
          Math.round(sum[2] / pixels.length),
        ],
        count: pixels.length,
      },
    ];
  }
  const ranges = [0, 1, 2].map((channel) => {
    const values = pixels.map((pixel) => pixel[channel]);
    return Math.max(...values) - Math.min(...values);
  });
  const widest = ranges.indexOf(Math.max(...ranges)) as 0 | 1 | 2;
  const sorted = [...pixels].sort((a, b) => a[widest] - b[widest]);
  const half = Math.floor(sorted.length / 2);
  return [
    ...medianCut(sorted.slice(0, half), depth - 1),
    ...medianCut(sorted.slice(half), depth - 1),
  ];
};

export const pixelToOklch = ([r, g, b]: Pixel): Oklch =>
  srgbToOklch([r / 255, g / 255, b / 255]);

/** Perceptual near-duplicate check for palette dedupe. */
const similar = (a: Oklch, b: Oklch): boolean => {
  const hueDelta = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h));
  return (
    Math.abs(a.l - b.l) < 0.1 &&
    Math.abs(a.c - b.c) < 0.05 &&
    (a.c < 0.04 || b.c < 0.04 || hueDelta < 14)
  );
};

/** Extract a deduped, population-ranked palette from a canvas context. */
export const extractPalette = (
  context: CanvasRenderingContext2D,
): PaletteEntry[] => {
  const { width, height } = context.canvas;
  const data = context.getImageData(0, 0, width, height).data;
  const pixels: Pixel[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue; // ignore transparent/soft-edge pixels
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  const boxes = medianCut(pixels, 4)
    .sort((a, b) => b.count - a.count)
    .map((box) => ({ population: box.count, color: pixelToOklch(box.color) }));
  const palette: PaletteEntry[] = [];
  for (const box of boxes) {
    const existing = palette.find((entry) => similar(entry.color, box.color));
    if (existing) {
      existing.population += box.population;
      continue;
    }
    palette.push({ color: box.color, population: box.population });
    if (palette.length >= PALETTE_TARGET) break;
  }
  return palette;
};

/**
 * Load a same-origin image and extract its palette. Resolves to an empty
 * array when the image can't be loaded or read.
 */
export const extractPaletteFromImage = (src: string): Promise<PaletteEntry[]> =>
  new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    image.onload = () => {
      try {
        const sample = document.createElement("canvas");
        const scale = Math.min(
          1,
          SAMPLE_SIZE / image.naturalWidth,
          SAMPLE_SIZE / image.naturalHeight,
        );
        sample.width = Math.max(1, Math.round(image.naturalWidth * scale));
        sample.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = sample.getContext("2d", { willReadFrequently: true });
        if (!context) {
          resolve([]);
          return;
        }
        context.drawImage(image, 0, 0, sample.width, sample.height);
        resolve(extractPalette(context));
      } catch {
        resolve([]);
      }
    };
    image.onerror = () => resolve([]);
  });
