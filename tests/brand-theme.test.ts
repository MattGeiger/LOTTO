// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

// Phase 0 acceptance for the configurable branding system
// (docs/CONFIGURABLE_BRANDING_PLAN.md): derivation determinism and fidelity,
// post-merge contrast enforcement, protected-token guarantees, sparse-override
// round-trips, and OKLCH-only serialization.

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { contrastRatio, parseOklch, type Oklch } from "@/lib/brand-theme/color";
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
import {
  BRAND_TEMPLATES,
  ST_JOHNS_TEMPLATE,
  WTH_TEMPLATE,
} from "@/lib/brand-theme/presets";

const stJohnsInputs: BrandThemeInputs = {
  primary: ST_JOHNS_TEMPLATE.colors.primary,
  surfaceLight: ST_JOHNS_TEMPLATE.colors.surfaceLight,
  surfaceDark: ST_JOHNS_TEMPLATE.colors.surfaceDark,
  accent: ST_JOHNS_TEMPLATE.colors.accent,
  serving: ST_JOHNS_TEMPLATE.colors.serving,
  logoPresentation: ST_JOHNS_TEMPLATE.logo.presentation,
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

const readCss = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

/** Extract `--token: value` declarations from one selector block. */
const parseCssBlock = (
  css: string,
  selector: string,
): Record<string, string> => {
  const start = css.indexOf(`${selector} {`);
  expect(start, `selector ${selector} present`).toBeGreaterThanOrEqual(0);
  const end = css.indexOf("\n}", start);
  const body = css.slice(start + selector.length + 2, end);
  const declarations: Record<string, string> = {};
  for (const match of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+)(?:;|$)/gi)) {
    declarations[match[1]] = match[2].trim();
  }
  return declarations;
};

const extractColors = (value: string): Oklch[] =>
  (value.match(/oklch\([^)]*\)/gi) ?? [])
    .map((literal) => parseOklch(literal))
    .filter((color): color is Oklch => color !== null);

/**
 * Tolerance for "matches the hand-authored value": ΔL ≤ 0.02, ΔC ≤ 0.02,
 * Δh ≤ 8° (hue ignored when both chromas < 0.06 — imperceptible near
 * neutral), Δalpha ≤ 0.02.
 */
const colorsMatch = (a: Oklch, b: Oklch): boolean => {
  if (Math.abs(a.l - b.l) > 0.02) return false;
  if (Math.abs(a.c - b.c) > 0.02) return false;
  if (Math.abs((a.alpha ?? 1) - (b.alpha ?? 1)) > 0.02) return false;
  if (a.c < 0.06 && b.c < 0.06) return true;
  const hueDelta = Math.abs(a.h - b.h) % 360;
  return Math.min(hueDelta, 360 - hueDelta) <= 8;
};

/**
 * Documented derivation-rule deviations from the hand-authored St. Johns CSS
 * (docs/CONFIGURABLE_BRANDING_PLAN.md Phase 0 acceptance: every deviation is
 * reviewed and accepted as a derivation-rule decision).
 */
const ST_JOHNS_ACCEPTED_DEVIATIONS: ReadonlySet<string> = new Set([
  // Hand-picked pale-mint Called fill drifts 12.7° toward cyan; the derived
  // value stays in the serving hue family. Visually near-identical tints.
  "hiVizLight:ticket-served",
]);

describe("brand theme derivation", () => {
  it("is deterministic: identical inputs produce identical themes and CSS", () => {
    const first = deriveBrandTheme(stJohnsInputs);
    const second = deriveBrandTheme(stJohnsInputs);
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

  it("reproduces the hand-authored St. Johns identity within tolerance", () => {
    const derived = deriveBrandTheme(stJohnsInputs);
    const standardCss = readCss("src/app/styles/brands/st-johns-food-share.css");
    const hiVizCss = readCss(
      "src/app/styles/brands/st-johns-food-share-high-visibility.css",
    );

    const handAuthored: Record<BrandThemeScope, Record<string, string>> = {
      light: parseCssBlock(standardCss, ':root[data-brand="st-johns-food-share"]'),
      dark: parseCssBlock(
        standardCss,
        ':root.dark[data-brand="st-johns-food-share"]',
      ),
      hiVizLight: parseCssBlock(
        hiVizCss,
        ':root.hi-viz[data-brand="st-johns-food-share"]',
      ),
      hiVizDark: parseCssBlock(
        hiVizCss,
        ':root.dark.hi-viz[data-brand="st-johns-food-share"]',
      ),
    };

    const mismatches: string[] = [];
    for (const [scope, handTokens] of Object.entries(handAuthored) as [
      BrandThemeScope,
      Record<string, string>,
    ][]) {
      const derivedTokens = derived[scope] as Record<string, string>;
      for (const [token, handValue] of Object.entries(handTokens)) {
        const key = `${scope}:${token}`;
        if (ST_JOHNS_ACCEPTED_DEVIATIONS.has(key)) continue;
        const derivedValue = derivedTokens[token];
        expect(derivedValue, `derived token ${key} exists`).toBeDefined();

        const handColors = extractColors(handValue);
        const derivedColors = extractColors(derivedValue);
        if (handColors.length === 0 && derivedColors.length === 0) {
          // Keyword / var() values must match exactly.
          if (handValue.replace(/\s+/g, " ") !== derivedValue.replace(/\s+/g, " ")) {
            mismatches.push(`${key}: "${derivedValue}" vs "${handValue}"`);
          }
          continue;
        }
        if (handColors.length !== derivedColors.length) {
          mismatches.push(
            `${key}: color count ${derivedColors.length} vs ${handColors.length}`,
          );
          continue;
        }
        handColors.forEach((handColor, index) => {
          if (!colorsMatch(handColor, derivedColors[index])) {
            mismatches.push(
              `${key}[${index}]: derived ${JSON.stringify(derivedColors[index])} vs hand ${JSON.stringify(handColor)}`,
            );
          }
        });
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("keeps the accepted-deviation list honest (entries still deviate)", () => {
    const derived = deriveBrandTheme(stJohnsInputs);
    const hiVizCss = readCss(
      "src/app/styles/brands/st-johns-food-share-high-visibility.css",
    );
    const hand = parseCssBlock(
      hiVizCss,
      ':root.hi-viz[data-brand="st-johns-food-share"]',
    );
    const handColor = extractColors(hand["ticket-served"])[0];
    const derivedColor = extractColors(derived.hiVizLight["ticket-served"])[0];
    expect(colorsMatch(handColor, derivedColor)).toBe(false);
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

  it("derives validation-clean themes for both templates", () => {
    for (const [name, inputs] of [
      ["st-johns", stJohnsInputs],
      ["wth", wthInputs],
    ] as const) {
      const theme = mergeBrandTheme(deriveBrandTheme(inputs), undefined);
      const issues = validateBrandTheme(theme);
      expect(issues, `${name} derived theme has no validation issues`).toEqual([]);
    }
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

  it("feeds ambient hues to card tints only (signal ceiling)", () => {
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
    // Ambient hue appears in the card-tint families…
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
    // …and never in signaling tokens.
    for (const token of ["primary", "accent", "ticket-serving", "ring"] as const) {
      for (const stop of chromaticStops(theme.light[token])) {
        expect(hueDelta(stop.h, 165)).toBeGreaterThan(8);
        expect(hueDelta(stop.h, 195)).toBeGreaterThan(8);
      }
    }
  });

  it("keeps St. Johns (no ambient) tinting ambience from the primary hue", () => {
    const theme = deriveBrandTheme(stJohnsInputs);
    for (const stop of chromaticStops(theme.dark["gradient-card-accent"])) {
      expect(hueDelta(stop.h, 163.057)).toBeLessThanOrEqual(1);
    }
  });
});

describe("color story (classification and role assignment)", () => {
  it("classifies chromatic colors and neutral anchors", async () => {
    const { classifyColor } = await import("@/lib/brand-theme/color-story");
    expect(classifyColor({ l: 0.64, c: 0.12, h: 163 })).toBe("chromatic");
    expect(classifyColor({ l: 0.3, c: 0.01, h: 0 })).toBe("dark-neutral");
    expect(classifyColor({ l: 0.97, c: 0.005, h: 0 })).toBe("light-neutral");
  });

  it("assigns roles for the three real deployments' stories", async () => {
    const { proposeColorStory } = await import("@/lib/brand-theme/color-story");

    // St. Johns: emerald + charcoal → primary + dark anchor.
    const stJohns = proposeColorStory([
      { l: 0.644, c: 0.121, h: 163 },
      { l: 0.297, c: 0, h: 0 },
    ]);
    expect(stJohns.assignments.map((entry) => entry.role)).toEqual([
      "primary",
      "surface-dark",
    ]);
    expect(stJohns.colors.surfaceDark).toEqual({ l: 0.297, c: 0, h: 0 });

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

    // WTH: blue, gold, teal, teal → primary, accent, ambient ×2.
    const wth = proposeColorStory([
      { l: 0.51, c: 0.14, h: 258 },
      { l: 0.88, c: 0.18, h: 94 },
      { l: 0.58, c: 0.16, h: 165 },
      { l: 0.62, c: 0.1, h: 195 },
    ]);
    expect(wth.assignments.map((entry) => entry.role)).toEqual([
      "primary",
      "accent",
      "ambient",
      "ambient",
    ]);
    expect(wth.colors.ambient).toHaveLength(2);
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
    expect(rows).toHaveLength(4); // primary, accent, two ambient teals
    expect(rows[0]).toEqual(WTH_TEMPLATE.colors.primary);
    expect(rows[2]).toEqual(WTH_TEMPLATE.colors.ambient?.[0]);
  });
});

describe("brand theme validation", () => {
  it("rejects an unreadable primary-button pair through overrides", () => {
    const theme = mergeBrandTheme(deriveBrandTheme(stJohnsInputs), {
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

  it("keeps both shipped emphasis choices passing (Issue 33 calibration)", () => {
    // The shipped St. Johns light primary pair (~2.78:1) and WTH's light
    // serving ramp (~2.74:1 at the light stop) must remain valid.
    const stJohnsPair = contrastRatio(
      { l: 0.644157, c: 0.121025, h: 163.057 },
      { l: 0.953, c: 0.051, h: 180.801 },
    );
    const wthServingPair = contrastRatio(
      { l: 0.7, c: 0.22, h: 255 },
      { l: 0.98, c: 0, h: 0 },
    );
    expect(stJohnsPair).toBeGreaterThan(2.5);
    expect(wthServingPair).toBeGreaterThan(2.5);
  });

  it("never emits protected operational tokens from the generator", () => {
    for (const inputs of [stJohnsInputs, wthInputs]) {
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
    const derived = deriveBrandTheme(stJohnsInputs);
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
    const merged = mergeBrandTheme(deriveBrandTheme(stJohnsInputs), {
      light: { "status-danger-bg": "oklch(1 0 0)" },
    });
    expect(
      (merged.light as Record<string, string>)["status-danger-bg"],
    ).toBeUndefined();
  });
});

describe("brand theme serialization", () => {
  it("emits double-specificity custom selectors for all four scopes", () => {
    const css = serializeBrandThemeCss(deriveBrandTheme(stJohnsInputs), "custom");
    expect(css).toContain(':root[data-brand="custom"][data-brand="custom"] {');
    expect(css).toContain(':root.dark[data-brand="custom"][data-brand="custom"] {');
    expect(css).toContain(
      ':root.hi-viz[data-brand="custom"][data-brand="custom"] {',
    );
    expect(css).toContain(
      ':root.dark.hi-viz[data-brand="custom"][data-brand="custom"] {',
    );
  });

  it("produces OKLCH-only output (repo CSS authoring standard)", () => {
    for (const inputs of [stJohnsInputs, wthInputs]) {
      const css = serializeBrandThemeCss(deriveBrandTheme(inputs), "custom");
      for (const line of css.split("\n")) {
        expect(/\b(?:rgb|rgba|hsl|hsla)\(/i.test(line), line).toBe(false);
        expect(/#[0-9a-f]{3,8}\b/i.test(line), line).toBe(false);
        expect(/(?<![\w-])(?:black|white)(?![\w-])/i.test(line), line).toBe(false);
      }
    }
  });
});

describe("brand configuration schema", () => {
  it("accepts both generated templates", () => {
    for (const [id, template] of Object.entries(BRAND_TEMPLATES)) {
      const result = parseBrandConfig(template);
      expect(result.ok, `template ${id} parses`).toBe(true);
    }
  });

  it("round-trips a configuration with non-empty overrides end to end", () => {
    const result = parseBrandConfig({
      ...ST_JOHNS_TEMPLATE,
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
        ...stJohnsInputs,
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

  it("rejects malformed payloads without throwing", () => {
    expect(parseBrandConfig(null).ok).toBe(false);
    expect(parseBrandConfig({}).ok).toBe(false);

    const badHexOverride = parseBrandConfig({
      ...ST_JOHNS_TEMPLATE,
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
      ...ST_JOHNS_TEMPLATE,
      overrides: {
        light: { primary: "oklch(0.5 0.1 200); } :root { --status-danger-bg: oklch(1 0 0)" },
        dark: {},
        hiVizLight: {},
        hiVizDark: {},
      },
    });
    expect(cssInjection.ok).toBe(false);

    const inventoryWithoutUrl = parseBrandConfig({
      ...ST_JOHNS_TEMPLATE,
      capabilities: { inventory: { enabled: true, feedUrl: null } },
    });
    expect(inventoryWithoutUrl.ok).toBe(false);
    if (!inventoryWithoutUrl.ok) {
      expect(inventoryWithoutUrl.errors.join("\n")).toMatch(/FEED URL/);
    }
  });
});
