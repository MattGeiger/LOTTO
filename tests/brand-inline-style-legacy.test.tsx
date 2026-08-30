// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemePreview } from "@/components/appearance/theme-preview";
import { deriveBrandTheme } from "@/lib/brand-theme/derive";
import { paletteColor } from "@/lib/brand-theme/palette";

/**
 * The stylesheet path is legacy-safe; the inline-style path was not.
 *
 * `serializeBrandThemeCss` writes an sRGB baseline and restores OKLCH inside
 * `@supports`, so the injected theme survives iPadOS 15. A React `style` prop
 * has no `@supports` to hide behind — one invalid declaration is dropped
 * outright — and the wizard's preview and logo swatches fed raw
 * `oklch(0.129 …)` straight into one. On the support floor those panels had no
 * background at all, so the light and dark previews were indistinguishable.
 */
const tokens = deriveBrandTheme({
  primary: paletteColor("red-600"),
  surfaceLight: paletteColor("slate-50"),
  surfaceDark: paletteColor("zinc-900"),
} as never);

const withOklchSupport = (supported: boolean) => {
  vi.stubGlobal("CSS", { supports: () => supported });
};

afterEach(() => vi.unstubAllGlobals());

const backgrounds = () =>
  screen
    .getAllByText(/^(LIGHT|DARK)$/i)
    .map((node) => node.parentElement?.getAttribute("style") ?? "");

describe("the wizard preview on the support floor", () => {
  it("never emits oklch() inline when the engine cannot parse it", () => {
    withOklchSupport(false);
    render(<ThemePreview theme={tokens} />);
    const styles = backgrounds();
    expect(styles.length).toBeGreaterThan(0);
    for (const style of styles) {
      expect(style, style).not.toMatch(/oklch\(/i);
      // Dropped-declaration is the actual failure: assert a colour is present.
      expect(style, style).toMatch(/background:\s*rgba?\(/i);
    }
  });

  it("keeps light and dark visibly different there", () => {
    // The symptom, not the mechanism: both panels inherited the dialog's dark
    // surface, so the operator saw two identical previews.
    //
    // jsdom keeps a declaration Safari would drop, so asserting only that the
    // two differ passes even unfixed — it compares two strings the real engine
    // would never have applied. The check that means anything is that each
    // panel carries a colour the floor can actually parse.
    withOklchSupport(false);
    render(<ThemePreview theme={tokens} />);
    const [light, dark] = backgrounds();
    expect(light).toMatch(/background:\s*rgba?\(/i);
    expect(dark).toMatch(/background:\s*rgba?\(/i);
    expect(light).not.toEqual(dark);
  });

  it("keeps the wide-gamut original where the engine supports it", () => {
    withOklchSupport(true);
    render(<ThemePreview theme={tokens} />);
    expect(backgrounds().some((style) => /oklch\(/i.test(style))).toBe(true);
  });
});
