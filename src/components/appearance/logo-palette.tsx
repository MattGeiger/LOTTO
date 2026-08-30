// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

// Logo-sourced color picking for the color-story configurator: an
// auto-extracted palette (shared extraction in palette-extract.ts), a
// click-to-pick logo canvas, and — where the browser supports it — the
// native EyeDropper for picking from anywhere on screen. Logos are
// same-origin (public/ or /api/brand-assets) or CORS-enabled Vercel Blob, so
// the canvas stays untainted.

import * as React from "react";
import { Pipette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLegacySafeColor } from "@/hooks/use-legacy-safe-color";
import { formatOklch, srgbToOklch, type Oklch } from "@/lib/brand-theme/color";
import type { PaletteEntry } from "@/lib/brand-theme/color-story";

import { extractPaletteFromImage, pixelToOklch } from "./palette-extract";

type EyeDropperApi = {
  open: () => Promise<{ sRGBHex: string }>;
};

const hexToOklch = (hex: string): Oklch | null => {
  const match = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const [r, g, b] = [0, 2, 4].map(
    (offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255,
  );
  return srgbToOklch([r, g, b]);
};

export function LogoPalette({
  logoSrc,
  onPick,
  disabled = false,
}: {
  logoSrc: string;
  onPick: (color: Oklch) => void;
  disabled?: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  // The extracted colours are OKLCH; a swatch is an inline style, so on the
  // iPadOS 15 floor an unconverted one renders as an empty circle.
  const safeColor = useLegacySafeColor();
  const [palette, setPalette] = React.useState<PaletteEntry[]>([]);
  const [failed, setFailed] = React.useState(false);
  const hasNativeEyeDropper =
    typeof window !== "undefined" && "EyeDropper" in window;

  React.useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setPalette([]);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = logoSrc;
    image.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = Math.min(1, 480 / image.naturalWidth, 120 / image.naturalHeight);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    void extractPaletteFromImage(logoSrc).then((entries) => {
      if (!cancelled) setPalette(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [logoSrc]);

  const pickFromCanvas = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
    const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
    if (a < 200) return; // transparent pixel — nothing to pick
    onPick(pixelToOklch([r, g, b]));
  };

  const pickFromScreen = async () => {
    try {
      const dropper = new (
        window as unknown as { EyeDropper: new () => EyeDropperApi }
      ).EyeDropper();
      const result = await dropper.open();
      const color = hexToOklch(result.sRGBHex);
      if (color) onPick(color);
    } catch {
      // User cancelled the eyedropper — not an error.
    }
  };

  if (failed) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Pick colors from your logo</p>
        {hasNativeEyeDropper ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void pickFromScreen()}
            disabled={disabled}
          >
            <Pipette className="mr-1 size-3.5" aria-hidden />
            Pick from screen
          </Button>
        ) : null}
      </div>
      <canvas
        ref={canvasRef}
        role="button"
        aria-label="Logo — click a spot to pick its color"
        onClick={pickFromCanvas}
        className="max-h-[120px] w-auto max-w-full cursor-crosshair rounded-md bg-[repeating-conic-gradient(var(--muted)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]"
      />
      {palette.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Found in logo:</span>
          {palette.map((entry, index) => (
            <button
              key={`${formatOklch(entry.color)}-${index}`}
              type="button"
              aria-label={`Use ${formatOklch(entry.color)}`}
              title={formatOklch(entry.color)}
              onClick={() => onPick(entry.color)}
              disabled={disabled}
              className="h-7 w-7 rounded-full border border-border shadow-sm transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/50"
              style={{ background: safeColor(formatOklch(entry.color)) }}
            />
          ))}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Click the logo or a swatch to fill the selected color slot.
      </p>
    </div>
  );
}
