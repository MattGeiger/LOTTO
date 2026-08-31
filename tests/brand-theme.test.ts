// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

// Phase 0 acceptance for the configurable branding system
// (docs/CONFIGURABLE_BRANDING_PLAN.md): derivation determinism,
// post-merge contrast enforcement, protected-token guarantees, sparse-override
// round-trips, and layered serialization (sRGB baseline + @supports OKLCH).

import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  oklchToSrgb,
  parseOklch,
  type Oklch,
} from "@/lib/brand-theme/color";
import {
  deriveBrandTheme,
  resolveBrandThemeInputs,
  type BrandThemeInputs,
} from "@/lib/brand-theme/derive";
import {
  mergeBrandTheme,
  serializeBrandThemeCss,
} from "@/lib/brand-theme/serialize";
import {
  isProtectedTokenName,
  type BrandThemeScope,
} from "@/lib/brand-theme/tokens";
import {
  validateBrandTheme,
  validateOverrideKeys,
} from "@/lib/brand-theme/validate";
import { parseBrandConfig } from "@/lib/brand-theme/config-schema";
import { BRAND_TEMPLATES, WTH_TEMPLATE } from "@/lib/brand-theme/presets";

const referenceInputs: BrandThemeInputs = {
  primary: { l: 0.644157, c: 0.121025, h: 163.057 },
  surfaceLight: { l: 0.976139, c: 0, h: 0 },
  surfaceDark: { l: 0.297163, c: 0, h: 0 },
  accent: { l: 0.552135, c: 0.105614, h: 162.098 },
  serving: { l: 0.615866, c: 0.113552, h: 163.742 },
  logoPresentation: "transparent",
};

const wthInputs: BrandThemeInputs = {
  primary: WTH_TEMPLATE.colors.primary,
  surfaceLight: WTH_TEMPLATE.colors.surfaceLight,
  surfaceDark: WTH_TEMPLATE.colors.surfaceDark,
  textLight: WTH_TEMPLATE.colors.textLight,
  accent: WTH_TEMPLATE.colors.accent,
  serving: WTH_TEMPLATE.colors.serving,
  logoPresentation: WTH_TEMPLATE.logo.presentation,
};

const extractColors = (value: string): Oklch[] =>
  (value.match(/oklch\([^)]*\)/gi) ?? [])
    .map((literal) => parseOklch(literal))
    .filter((color): color is Oklch => color !== null);

describe("brand theme derivation", () => {
  it("is deterministic: identical inputs produce identical themes and CSS", () => {
    const first = deriveBrandTheme(referenceInputs);
    const second = deriveBrandTheme(referenceInputs);
    expect(second).toEqual(first);
    expect(serializeBrandThemeCss(second, "custom")).toBe(
      serializeBrandThemeCss(first, "custom"),
    );
  });

  it("resolves optional inputs from the required three", () => {
    const resolved = resolveBrandThemeInputs({
      primary: { l: 0.6, c: 0.12, h: 200 },
      surfaceLight: { l: 0.98, c: 0, h: 0 },
      surfaceDark: { l: 0.25, c: 0, h: 0 },
      logoPresentation: "transparent",
    });
    expect(resolved.textLight).toEqual({ l: 0.25, c: 0, h: 0 });
    expect(resolved.accent.l).toBeCloseTo(0.51, 5);
    expect(resolved.serving.h).toBe(200);
  });

  it("derives a validation-clean theme from the scratch defaults", async () => {
    // Regression: the from-scratch slate primary (L 0.45) used to derive a
    // Hi-viz light primary fill at ≈2.28:1 against the fixed near-black
    // foreground — an error the wizard surfaced with no visible input to fix.
    const { scratchConfig } = await import("@/components/appearance/draft");
    const config = scratchConfig();
    const theme = deriveBrandTheme({
      primary: config.colors.primary,
      surfaceLight: config.colors.surfaceLight,
      surfaceDark: config.colors.surfaceDark,
      logoPresentation: config.logo.presentation,
    });
    expect(validateBrandTheme(theme)).toEqual([]);
  });

  it("self-corrects derived pairs for extreme primaries (auto-fix)", () => {
    // Derived pairs must pass by construction for any primary the operator
    // picks; only pairs built from operator-typed colors may surface errors.
    const extremes: Oklch[] = [
      { l: 0.45, c: 0.04, h: 257 }, // the failing scratch slate
      { l: 0.2, c: 0.02, h: 30 }, // near-black
      { l: 0.92, c: 0.05, h: 100 }, // near-white
      { l: 0.6, c: 0, h: 0 }, // pure mid-gray
      { l: 0.35, c: 0.15, h: 300 }, // dark saturated purple
    ];
    for (const primary of extremes) {
      const theme = deriveBrandTheme({
        primary,
        surfaceLight: { l: 0.98, c: 0, h: 0 },
        surfaceDark: { l: 0.25, c: 0, h: 0 },
        logoPresentation: "transparent",
      });
      const issues = validateBrandTheme(theme);
      expect(
        issues,
        `primary oklch(${primary.l} ${primary.c} ${primary.h}) has no issues`,
      ).toEqual([]);
    }
  });

  it("derives validation-clean themes for representative palettes", () => {
    for (const [name, inputs] of [
      ["reference", referenceInputs],
      ["wth", wthInputs],
    ] as const) {
      const theme = mergeBrandTheme(deriveBrandTheme(inputs), undefined);
      const issues = validateBrandTheme(theme);
      expect(issues, `${name} derived theme has no validation issues`).toEqual([]);
    }
  });

  it("gives configured serving cards a real gradient in standard modes", () => {
    const theme = deriveBrandTheme(wthInputs);

    expect(theme.light["ticket-serving"]).toBe(
      "linear-gradient(to top, oklch(0.62 0.21 255), oklch(0.7 0.22 255))",
    );
    for (const scope of ["light", "dark"] as const) {
      const stops = extractColors(theme[scope]["ticket-serving"]);
      expect(theme[scope]["ticket-serving"]).toMatch(/^linear-gradient\(to top,/);
      expect(stops).toHaveLength(2);
      expect(stops[0]).not.toEqual(stops[1]);
    }
    expect(theme.hiVizLight["ticket-serving"]).not.toContain("gradient(");
    expect(theme.hiVizDark["ticket-serving"]).not.toContain("gradient(");
  });
});

describe("color semiotics (docs/COLOR_SEMIOTICS.md)", () => {
  const hueDelta = (a: number, b: number) => {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
  };
  /** Chromatic oklch stops of a token value, as parsed colors. */
  const chromaticStops = (value: string) =>
    extractColors(value).filter((color) => color.c >= 0.04);

  it("keeps the serving hue constant across all four modes (continuity invariant)", () => {
    // A brand whose Now Serving hue differs from its primary hue — the exact
    // scenario that produced the original WTH blue-by-day/gold-by-night bug.
    const theme = deriveBrandTheme({
      primary: { l: 0.5, c: 0.14, h: 257 }, // blue identity
      surfaceLight: { l: 0.98, c: 0, h: 0 },
      surfaceDark: { l: 0.25, c: 0, h: 0 },
      serving: { l: 0.6, c: 0.13, h: 155 }, // green serving state
      logoPresentation: "transparent",
    });
    const servingTokens: [BrandThemeScope, string][] = [
      ["light", "ticket-serving"],
      ["light", "serving-text-gradient"],
      ["dark", "ticket-serving"],
      ["dark", "serving-text-gradient"],
      ["dark", "ticket-served"],
      ["hiVizLight", "ticket-serving"],
      ["hiVizLight", "serving-text-gradient"],
      ["hiVizDark", "ticket-serving"],
      ["hiVizDark", "serving-text-gradient"],
      ["hiVizDark", "ticket-served"],
    ];
    for (const [scope, token] of servingTokens) {
      const stops = chromaticStops(
        (theme[scope] as Record<string, string>)[token],
      );
      expect(stops.length, `${scope}:${token} has chromatic stops`).toBeGreaterThan(0);
      for (const stop of stops) {
        expect(
          hueDelta(stop.h, 155),
          `${scope}:${token} hue ${stop.h} stays in the serving family`,
        ).toBeLessThanOrEqual(8);
      }
    }
    // Identity stays in the primary family across modes too.
    for (const scope of ["light", "dark"] as const) {
      for (const stop of chromaticStops(theme[scope].primary)) {
        expect(hueDelta(stop.h, 257)).toBeLessThanOrEqual(8);
      }
    }
  });

  it("feeds ambient hues to atmosphere but never signaling tokens", () => {
    const ambient = [
      { l: 0.58, c: 0.16, h: 165 },
      { l: 0.62, c: 0.1, h: 195 },
    ];
    const theme = deriveBrandTheme({
      primary: { l: 0.5, c: 0.14, h: 257 },
      surfaceLight: { l: 1, c: 0, h: 0 },
      surfaceDark: { l: 0.15, c: 0, h: 0 },
      ambient,
      logoPresentation: "transparent",
    });
    // Ambient hue appears in both the card tints and page wash…
    expect(
      extractColors(theme.light["gradient-card-emerald"]).some(
        (stop) => hueDelta(stop.h, 165) <= 1,
      ),
    ).toBe(true);
    expect(
      extractColors(theme.light["gradient-card-blue"]).some(
        (stop) => hueDelta(stop.h, 195) <= 1,
      ),
    ).toBe(true);
    expect(
      extractColors(theme.light["gradient-display-bg"]).some(
        (stop) => hueDelta(stop.h, 165) <= 1,
      ),
    ).toBe(true);
    // …and never in signaling tokens.
    for (const token of ["primary", "accent", "ticket-serving", "ring"] as const) {
      for (const stop of chromaticStops(theme.light[token])) {
        expect(hueDelta(stop.h, 165)).toBeGreaterThan(8);
        expect(hueDelta(stop.h, 195)).toBeGreaterThan(8);
      }
    }
  });

  it("uses the primary hue as ambience when no ambient color is supplied", () => {
    const theme = deriveBrandTheme(referenceInputs);
    for (const stop of chromaticStops(theme.dark["gradient-card-accent"])) {
      expect(hueDelta(stop.h, 163.057)).toBeLessThanOrEqual(1);
    }
  });
});

describe("color story (fixed FEED-parity role slots)", () => {
  it("classifies chromatic colors and neutral anchors", async () => {
    const { classifyColor } = await import("@/lib/brand-theme/color-story");
    expect(classifyColor({ l: 0.64, c: 0.12, h: 163 })).toBe("chromatic");
    expect(classifyColor({ l: 0.3, c: 0.01, h: 0 })).toBe("dark-neutral");
    expect(classifyColor({ l: 0.97, c: 0.005, h: 0 })).toBe("light-neutral");
  });

  it("assigns roles by position instead of reclassifying the operator's choice", async () => {
    const { proposeColorStory } = await import("@/lib/brand-theme/color-story");

    // A charcoal in slot two is an accent. It does not jump to slot four just
    // because it looks like a dark anchor.
    const twoColorStory = proposeColorStory([
      { l: 0.644, c: 0.121, h: 163 },
      { l: 0.297, c: 0, h: 0 },
    ]);
    expect(twoColorStory.assignments.map((entry) => entry.role)).toEqual([
      "primary",
      "accent",
    ]);
    expect(twoColorStory.colors.accent).toEqual({ l: 0.297, c: 0, h: 0 });

    // Lift Up: deep purple, light green, dark green → primary, accent, ambient.
    const liftUp = proposeColorStory([
      { l: 0.35, c: 0.12, h: 300 },
      { l: 0.8, c: 0.15, h: 140 },
      { l: 0.4, c: 0.1, h: 150 },
    ]);
    expect(liftUp.assignments.map((entry) => entry.role)).toEqual([
      "primary",
      "accent",
      "ambient",
    ]);

    // A complete story names all five jobs explicitly.
    const wth = proposeColorStory([
      { l: 0.51, c: 0.14, h: 258 },
      { l: 0.88, c: 0.18, h: 94 },
      { l: 0.58, c: 0.16, h: 165 },
      { l: 0.24, c: 0.02, h: 250 },
      { l: 0.97, c: 0.01, h: 250 },
    ]);
    expect(wth.assignments.map((entry) => entry.role)).toEqual([
      "primary",
      "accent",
      "ambient",
      "surface-dark",
      "surface-light",
    ]);
    expect(wth.colors.ambient).toHaveLength(1);
  });

  it("warns when a signaling color enters a reserved operational hue band", async () => {
    const { proposeColorStory } = await import("@/lib/brand-theme/color-story");
    // A saturated red primary collides with Returned/danger.
    const red = proposeColorStory([{ l: 0.55, c: 0.2, h: 27 }]);
    expect(red.warnings.join(" ")).toMatch(/Returned\/danger/);
    // The same red ranked third is ambient — only a gentle note.
    const redAmbient = proposeColorStory([
      { l: 0.5, c: 0.14, h: 257 },
      { l: 0.6, c: 0.13, h: 155 },
      { l: 0.55, c: 0.2, h: 27 },
    ]);
    const ambientEntry = redAmbient.assignments[2];
    expect(ambientEntry.role).toBe("ambient");
    expect(ambientEntry.warning).toMatch(/quiet background tint/);
    // A desaturated red is a tone, not a signal: no warning.
    const muted = proposeColorStory([{ l: 0.55, c: 0.05, h: 27 }]);
    expect(muted.warnings).toEqual([]);
  });

  it("recommends a semiotics-aware story from an extracted logo palette", async () => {
    const { recommendColorStory } = await import("@/lib/brand-theme/color-story");

    // A Lift-Up-like logo: purple mark dominant, green leaves, white bg.
    const normal = recommendColorStory([
      { color: { l: 0.97, c: 0.005, h: 0 }, population: 5000 }, // white bg
      { color: { l: 0.35, c: 0.12, h: 300 }, population: 1200 }, // purple
      { color: { l: 0.7, c: 0.15, h: 140 }, population: 600 }, // green
      { color: { l: 0.3, c: 0.02, h: 0 }, population: 300 }, // dark neutral
    ]);
    expect(normal.hierarchy[0]).toEqual({ l: 0.35, c: 0.12, h: 300 });
    expect(normal.hierarchy[1]).toEqual({ l: 0.7, c: 0.15, h: 140 });
    expect(normal.notes).toEqual([]);

    // A red-dominant logo (the Marlboro case): red must NOT be auto-placed
    // in a signaling role; tonal identity from the dark neutral instead.
    const redLogo = recommendColorStory([
      { color: { l: 0.55, c: 0.2, h: 27 }, population: 4000 }, // brand red
      { color: { l: 0.25, c: 0.01, h: 0 }, population: 1500 }, // black
      { color: { l: 0.98, c: 0, h: 0 }, population: 3000 }, // white
    ]);
    const proposed = (await import("@/lib/brand-theme/color-story")).proposeColorStory(
      redLogo.hierarchy,
    );
    const primaryEntry = proposed.assignments.find((a) => a.role === "primary");
    expect(primaryEntry?.color.h).not.toBe(27); // red never signals
    expect(
      proposed.assignments.some(
        (a) => a.role === "ambient" && a.color.h === 27,
      ),
    ).toBe(true); // …but stays as ambience
    expect(redLogo.notes.join(" ")).toMatch(/reserved for Returned\/danger red/);

    // Nothing but reserved-band colors: demoted to a tone (same hue family,
    // below signal chroma) rather than impersonating a status color.
    const allRed = recommendColorStory([
      { color: { l: 0.55, c: 0.2, h: 27 }, population: 4000 },
    ]);
    expect(allRed.hierarchy[0].h).toBe(27);
    expect(allRed.hierarchy[0].c).toBeLessThan(0.09);
    expect(allRed.notes.join(" ")).toMatch(/muted, deepened tone/);

    // An all-neutral (black/white) logo still yields a tonal primary.
    const mono = recommendColorStory([
      { color: { l: 0.15, c: 0.005, h: 0 }, population: 2000 },
      { color: { l: 0.98, c: 0, h: 0 }, population: 5000 },
    ]);
    expect(mono.hierarchy.length).toBeGreaterThan(0);
    const monoProposed = (await import("@/lib/brand-theme/color-story")).proposeColorStory(
      mono.hierarchy,
    );
    expect(monoProposed.assignments[0].role).toBe("primary");
  });

  it("round-trips a saved config's colors into a hierarchy for editing", async () => {
    const { storyFromColors } = await import("@/lib/brand-theme/color-story");
    const rows = storyFromColors(WTH_TEMPLATE.colors);
    expect(rows).toHaveLength(3); // primary, accent, and one ambient color
    expect(rows[0]).toEqual(WTH_TEMPLATE.colors.primary);
    expect(rows[2]).toEqual(WTH_TEMPLATE.colors.ambient?.[0]);
  });
});

describe("brand theme validation", () => {
  it("rejects an unreadable primary-button pair through overrides", () => {
    const theme = mergeBrandTheme(deriveBrandTheme(referenceInputs), {
      // Mid-green text on the mid-green primary fill: unmistakably unreadable.
      light: { "primary-foreground": "oklch(0.63 0.12 163)" },
    });
    const issues = validateBrandTheme(theme);
    expect(
      issues.some(
        (issue) =>
          issue.scope === "light" &&
          issue.kind === "contrast" &&
          issue.token === "primary-foreground",
      ),
    ).toBe(true);
    const message = issues.find((issue) => issue.kind === "contrast")?.message;
    expect(message).toMatch(/filled primary buttons/);
    expect(message).toMatch(/needs at least 2.5:1/);
  });

  it("keeps representative emphasis choices passing (Issue 33 calibration)", () => {
    const referencePair = contrastRatio(
      { l: 0.644157, c: 0.121025, h: 163.057 },
      { l: 0.953, c: 0.051, h: 180.801 },
    );
    const wthServingPair = contrastRatio(
      { l: 0.7, c: 0.22, h: 255 },
      { l: 0.98, c: 0, h: 0 },
    );
    expect(referencePair).toBeGreaterThan(2.5);
    expect(wthServingPair).toBeGreaterThan(2.5);
  });

  it("never emits protected operational tokens from the generator", () => {
    for (const inputs of [referenceInputs, wthInputs]) {
      const theme = deriveBrandTheme(inputs);
      for (const tokens of Object.values(theme)) {
        for (const name of Object.keys(tokens)) {
          expect(isProtectedTokenName(name), `token ${name}`).toBe(false);
        }
      }
      const css = serializeBrandThemeCss(theme, "custom");
      expect(css).not.toMatch(/--status-(?:success|warning|danger|neutral)-/);
      expect(css).not.toMatch(/--gradient-status-(?:success|warning|danger)/);
      expect(css).not.toMatch(/--ticket-(?:unclaimed|returned)-text/);
      expect(css).not.toMatch(/--operational-/);
      expect(css).not.toMatch(/--destructive/);
    }
  });

  it("rejects protected and unknown override keys", () => {
    const issues = validateOverrideKeys({
      light: {
        "status-danger-bg": "oklch(1 0 0)",
        "ticket-returned-text": "oklch(1 0 0)",
        "not-a-real-token": "oklch(1 0 0)",
        primary: "oklch(0.5 0.1 200)",
      },
      hiVizLight: { "sidebar-ring": "oklch(0.5 0.1 200)" },
    });
    expect(issues).toHaveLength(3);
    expect(
      issues.filter((issue) => issue.kind === "protected-token"),
    ).toHaveLength(2);
    expect(issues.filter((issue) => issue.kind === "unknown-token")).toHaveLength(1);
  });
});

describe("sparse overrides round-trip", () => {
  it("merges, validates, and serializes a non-empty overrides map", () => {
    const overrides = {
      dark: { ring: "oklch(0.9 0.05 100)" },
      light: { "serving-label-color": "oklch(0.45 0.1 163)" },
    };
    const derived = deriveBrandTheme(referenceInputs);
    const merged = mergeBrandTheme(derived, overrides);

    expect(merged.dark.ring).toBe("oklch(0.9 0.05 100)");
    expect(merged.light["serving-label-color"]).toBe("oklch(0.45 0.1 163)");
    // Un-overridden tokens still re-derive.
    expect(merged.light.primary).toBe(derived.light.primary);

    expect(validateBrandTheme(merged)).toEqual([]);

    const css = serializeBrandThemeCss(merged, "custom");
    expect(css).toContain("--ring: oklch(0.9 0.05 100);");
    expect(css).toContain("--serving-label-color: oklch(0.45 0.1 163);");
  });

  it("ignores protected keys at merge time as defense in depth", () => {
    const merged = mergeBrandTheme(deriveBrandTheme(referenceInputs), {
      light: { "status-danger-bg": "oklch(1 0 0)" },
    });
    expect(
      (merged.light as Record<string, string>)["status-danger-bg"],
    ).toBeUndefined();
  });
});

describe("brand theme serialization", () => {
  it("emits double-specificity custom selectors for all four scopes", () => {
    const css = serializeBrandThemeCss(deriveBrandTheme(referenceInputs), "custom");
    expect(css).toContain(':root[data-brand="custom"][data-brand="custom"] {');
    expect(css).toContain(':root.dark[data-brand="custom"][data-brand="custom"] {');
    expect(css).toContain(
      ':root.hi-viz[data-brand="custom"][data-brand="custom"] {',
    );
    expect(css).toContain(
      ':root.dark.hi-viz[data-brand="custom"][data-brand="custom"] {',
    );
  });

  // The OKLCH-only authoring standard still governs the *modern* layer, but the
  // baseline must be sRGB: oklch() requires Safari 16.4 and the declared floor
  // is iPadOS 15 (docs/BROWSER_SUPPORT.md). Hand-authored brand stylesheets get
  // downleveled by the build; this CSS is generated per request and injected
  // inline, so it never passes through that pipeline. Emitting OKLCH alone made
  // every surface transparent and every border fall back to currentColor on the
  // deployed iPad mini 4.
  const splitLayers = (css: string) => {
    const guardIndex = css.indexOf("@supports (color: oklch(0 0 0))");
    expect(guardIndex, "@supports guard is present").toBeGreaterThan(0);
    return { baseline: css.slice(0, guardIndex), guarded: css.slice(guardIndex) };
  };

  it("emits a legacy-safe sRGB baseline ahead of the OKLCH layer", () => {
    for (const inputs of [referenceInputs, wthInputs]) {
      const { baseline } = splitLayers(
        serializeBrandThemeCss(deriveBrandTheme(inputs), "custom"),
      );
      for (const line of baseline.split("\n")) {
        expect(/oklch\(/i.test(line), line).toBe(false);
        expect(/oklab\(/i.test(line), line).toBe(false);
        expect(/color-mix\(/i.test(line), line).toBe(false);
      }
      expect(/rgba?\(/i.test(baseline), "baseline carries sRGB colours").toBe(true);
    }
  });

  it("keeps the OKLCH authoring standard inside the @supports layer", () => {
    for (const inputs of [referenceInputs, wthInputs]) {
      const { guarded } = splitLayers(
        serializeBrandThemeCss(deriveBrandTheme(inputs), "custom"),
      );
      for (const line of guarded.split("\n")) {
        if (!line.includes("--")) continue;
        expect(/\b(?:rgb|rgba|hsl|hsla)\(/i.test(line), line).toBe(false);
        expect(/#[0-9a-f]{3,8}\b/i.test(line), line).toBe(false);
      }
    }
  });

  it("re-declares every OKLCH token in both layers", () => {
    const css = serializeBrandThemeCss(deriveBrandTheme(referenceInputs), "custom");
    const { baseline, guarded } = splitLayers(css);
    const names = (block: string) =>
      new Set(block.match(/--[a-z0-9-]+(?=\s*:)/gi) ?? []);
    const guardedNames = names(guarded);
    expect(guardedNames.size).toBeGreaterThan(0);
    // Every token restored under @supports must exist in the baseline, or the
    // fallback would be missing entirely on an engine without oklch().
    for (const token of guardedNames) {
      expect(names(baseline).has(token), `${token} has an sRGB baseline`).toBe(true);
    }
  });

  it("converts colours inside gradients and preserves alpha", () => {
    const { baseline } = splitLayers(
      serializeBrandThemeCss(deriveBrandTheme(referenceInputs), "custom"),
    );
    const gradients = baseline
      .split("\n")
      .filter((line) => line.includes("gradient("));
    expect(gradients.length, "theme emits gradient tokens").toBeGreaterThan(0);
    for (const line of gradients) {
      expect(/oklch\(/i.test(line), line).toBe(false);
      expect(/gradient\(/i.test(line), line).toBe(true);
    }
    // Alpha survives the conversion rather than being dropped to opaque.
    expect(/rgba\([^)]*,\s*0?\.\d+\)/.test(baseline)).toBe(true);
  });

  it("keeps the sRGB fallback perceptually equivalent to its OKLCH source", () => {
    // A wrong conversion would still be "legacy-safe" while shipping the wrong
    // brand colour, so check the round-trip rather than only the syntax.
    const css = serializeBrandThemeCss(deriveBrandTheme(referenceInputs), "custom");
    const { baseline, guarded } = splitLayers(css);
    const grab = (block: string, token: string) =>
      block.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1]?.trim();
    for (const token of ["--primary", "--background", "--foreground"]) {
      const srgb = grab(baseline, token);
      const oklch = grab(guarded, token);
      expect(srgb, `${token} baseline`).toBeDefined();
      expect(oklch, `${token} modern`).toBeDefined();
      const channels = srgb!.match(/\d+/g)!.slice(0, 3).map(Number);
      const source = parseOklch(oklch!)!;
      const expected = oklchToSrgb(source).map((v) => Math.round(v * 255));
      for (let i = 0; i < 3; i += 1) {
        expect(Math.abs(channels[i] - expected[i]), `${token} channel ${i}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("brand configuration schema", () => {
  it("accepts the generated WTH template", () => {
    for (const [id, template] of Object.entries(BRAND_TEMPLATES)) {
      const result = parseBrandConfig(template);
      expect(result.ok, `template ${id} parses`).toBe(true);
    }
  });

  it("round-trips a configuration with non-empty overrides end to end", () => {
    const result = parseBrandConfig({
      ...WTH_TEMPLATE,
      overrides: {
        light: { primary: "oklch(0.5 0.1 200)" },
        dark: {},
        hiVizLight: {},
        hiVizDark: {},
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const theme = mergeBrandTheme(
      deriveBrandTheme({
        ...referenceInputs,
        primary: result.config.colors.primary,
      }),
      result.config.overrides,
    );
    expect(theme.light.primary).toBe("oklch(0.5 0.1 200)");
    expect(validateOverrideKeys(result.config.overrides)).toEqual([]);
    expect(serializeBrandThemeCss(theme, "custom")).toContain(
      "--primary: oklch(0.5 0.1 200);",
    );
  });

  it("accepts LOTTO-hosted public Blob assets and rejects arbitrary remote assets", () => {
    const blobOrigin = "https://store-id.public.blob.vercel-storage.com";
    const hosted = {
      ...WTH_TEMPLATE,
      logo: {
        ...WTH_TEMPLATE.logo,
        lightSrc: `${blobOrigin}/brand-assets/logo-light.svg`,
        darkSrc: `${blobOrigin}/brand-assets/logo-dark.svg`,
      },
      pwa: {
        ...WTH_TEMPLATE.pwa,
        browserIcons: [
          {
            src: `${blobOrigin}/brand-assets/icon-32.png`,
            sizes: "32x32",
            type: "image/png",
          },
        ],
        appleIcons: [
          {
            src: `${blobOrigin}/brand-assets/icon-256.png`,
            sizes: "256x256",
            type: "image/png",
          },
        ],
        manifestIcons: [
          {
            src: `${blobOrigin}/brand-assets/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any" as const,
          },
        ],
      },
    };

    expect(parseBrandConfig(hosted).ok).toBe(true);
    expect(
      parseBrandConfig({
        ...hosted,
        logo: { ...hosted.logo, lightSrc: "https://attacker.example/logo.svg" },
      }).ok,
    ).toBe(false);
    expect(
      parseBrandConfig({
        ...hosted,
        logo: {
          ...hosted.logo,
          lightSrc: `${blobOrigin}/unmanaged/logo.svg`,
        },
      }).ok,
    ).toBe(false);
  });

  it("rejects malformed payloads without throwing", () => {
    expect(parseBrandConfig(null).ok).toBe(false);
    expect(parseBrandConfig({}).ok).toBe(false);

    const badHexOverride = parseBrandConfig({
      ...WTH_TEMPLATE,
      overrides: {
        light: { primary: "#33a478" },
        dark: {},
        hiVizLight: {},
        hiVizDark: {},
      },
    });
    expect(badHexOverride.ok).toBe(false);
    if (!badHexOverride.ok) {
      expect(badHexOverride.errors.join("\n")).toMatch(/oklch/);
    }

    const cssInjection = parseBrandConfig({
      ...WTH_TEMPLATE,
      overrides: {
        light: { primary: "oklch(0.5 0.1 200); } :root { --status-danger-bg: oklch(1 0 0)" },
        dark: {},
        hiVizLight: {},
        hiVizDark: {},
      },
    });
    expect(cssInjection.ok).toBe(false);

    const inventoryWithoutUrl = parseBrandConfig({
      ...WTH_TEMPLATE,
      capabilities: { inventory: { enabled: true, feedUrl: null } },
    });
    expect(inventoryWithoutUrl.ok).toBe(false);
    if (!inventoryWithoutUrl.ok) {
      expect(inventoryWithoutUrl.errors.join("\n")).toMatch(/FEED URL/);
    }
  });
});
