// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { scratchConfig } from "@/components/appearance/draft";
import { adoptTailwindColorSystem, deriveConfiguredBrandTheme } from "@/lib/brand-theme/configured-theme";
import { parseBrandConfig } from "@/lib/brand-theme/config-schema";
import {
  TAILWIND_NEUTRAL_FAMILIES,
  TAILWIND_PALETTE,
  TAILWIND_PALETTE_VERSION,
} from "@/lib/brand-theme/palette.generated";
import { validateBrandTheme } from "@/lib/brand-theme/validate";
import { WTH_TEMPLATE } from "@/lib/brand-theme/presets";

describe("Tailwind v4 brand palette", () => {
  it("stays aligned with the exactly pinned installed Tailwind package", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "node_modules/tailwindcss/package.json"), "utf8"),
    ) as { version: string };
    const theme = fs.readFileSync(
      path.join(process.cwd(), "node_modules/tailwindcss/theme.css"),
      "utf8",
    );
    const names = [...theme.matchAll(/--color-([a-z]+)-(\d+):\s*oklch\(/g)].map(
      (match) => `${match[1]}-${match[2]}`,
    );
    expect(TAILWIND_PALETTE_VERSION).toBe(packageJson.version);
    expect(TAILWIND_PALETTE.map((entry) => entry.name)).toEqual(names);
    expect(TAILWIND_PALETTE).toHaveLength(286);
    expect(TAILWIND_NEUTRAL_FAMILIES).toHaveLength(9);
  });

  it("reads schema-v1 payloads without silently changing their color engine", () => {
    const legacy = { ...WTH_TEMPLATE, schemaVersion: 1 };
    const parsed = parseBrandConfig(legacy);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.config.colors.system).toBe("legacy-oklch");
  });

  it("makes new drafts palette-only and migrates legacy stories deterministically", () => {
    const draft = scratchConfig();
    expect(draft.colors.system).toBe("tailwind-v4");
    expect(draft.colors.paletteRoles?.primary).toBe("slate-600");
    const first = adoptTailwindColorSystem(WTH_TEMPLATE);
    const second = adoptTailwindColorSystem(WTH_TEMPLATE);
    expect(first.colors.paletteRoles).toEqual(second.colors.paletteRoles);
  });

  it("proves all 26 primary families against all 9 neutral surface families", () => {
    const families = [...new Set(TAILWIND_PALETTE.map((entry) => entry.family))];
    const base = scratchConfig();
    let combinations = 0;
    for (const primaryFamily of families) {
      for (const neutralFamily of TAILWIND_NEUTRAL_FAMILIES) {
        combinations += 1;
        const config = {
          ...base,
          colors: {
            ...base.colors,
            paletteRoles: {
              primary: `${primaryFamily}-600`,
              accent: `${primaryFamily}-500`,
              ambient: `${primaryFamily}-100`,
              surfaceDark: `${neutralFamily}-900`,
              surfaceLight: `${neutralFamily}-50`,
            },
          },
        };
        expect(validateBrandTheme(deriveConfiguredBrandTheme(config)), `${primaryFamily}/${neutralFamily}`).toEqual([]);
      }
    }
    expect(combinations).toBe(234);
  });

  it("gives every authored color role its promised consumers", () => {
    const base = scratchConfig();
    const themed = (accent: string, ambient: string) =>
      deriveConfiguredBrandTheme({
        ...base,
        colors: {
          ...base.colors,
          paletteRoles: {
            primary: "sky-700",
            accent,
            ambient,
            surfaceDark: "slate-900",
            surfaceLight: "slate-50",
          },
        },
      });

    const amberAccent = themed("amber-300", "rose-500");
    const violetAccent = themed("violet-500", "rose-500");
    for (const scope of ["light", "dark", "hiVizLight", "hiVizDark"] as const) {
      expect(
        amberAccent[scope].accent,
        `${scope} consumes Accent`,
      ).not.toBe(violetAccent[scope].accent);
    }

    // Accent is a signal, not atmosphere: changing it cannot move the shell.
    expect(amberAccent.light["gradient-display-bg"]).toBe(
      violetAccent.light["gradient-display-bg"],
    );
    expect(amberAccent.dark["gradient-display-bg"]).toBe(
      violetAccent.dark["gradient-display-bg"],
    );

    const blueAtmosphere = themed("amber-300", "blue-600");
    expect(blueAtmosphere.light["gradient-display-bg"]).not.toBe(
      amberAccent.light["gradient-display-bg"],
    );
    expect(blueAtmosphere.dark["gradient-display-bg"]).not.toBe(
      amberAccent.dark["gradient-display-bg"],
    );
  });

  it("uses pre-alpha shadow tokens so old WebKit keeps hue and opacity", () => {
    const foundations = fs.readFileSync(
      path.join(process.cwd(), "src/app/styles/shared/foundations.css"),
      "utf8",
    );
    const highVisibility = fs.readFileSync(
      path.join(process.cwd(), "src/app/styles/shared/high-visibility.css"),
      "utf8",
    );
    expect(foundations).not.toMatch(/color-mix\(/i);
    expect(highVisibility).not.toMatch(/color-mix\(/i);
    expect(foundations).toContain("var(--base-shadow-soft-color)");
    expect(foundations).toContain("var(--base-shadow-strong-color)");
    expect(highVisibility).toContain("var(--base-shadow-soft-color)");
    expect(highVisibility).toContain("var(--base-shadow-strong-color)");

    const theme = deriveConfiguredBrandTheme(scratchConfig());
    for (const scope of ["light", "dark", "hiVizLight", "hiVizDark"] as const) {
      expect(theme[scope]["base-shadow-soft-color"]).toMatch(/\/ 0\./);
      expect(theme[scope]["base-shadow-color"]).toMatch(/\/ 0\./);
      expect(theme[scope]["base-shadow-strong-color"]).toMatch(/\/ 0\./);
    }
  });
});
