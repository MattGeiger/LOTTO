// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Pure brand-theme derivation: compact brand inputs → the complete token maps
// for light, dark, Hi-viz light, and Hi-viz dark.
//
// The derivation rules are reverse-engineered from the hand-authored St. Johns
// Food Share identity layers, which are the reference "deliberately compact
// color system" (brand primary + off-white + charcoal, everything else
// derived). Each rule is expressed relative to the inputs so any brand's
// primary/surfaces produce the same visual relationships St. Johns shipped
// with. Numeric offsets cite the St. Johns values they reproduce.
//
// This module is deliberately pure and side-effect free: no CSS, no DOM, no
// persistence. Serialization to CSS lives in `serialize.ts`; validation in
// `validate.ts`.

import {
  adjust,
  contrastRatio,
  formatOklch,
  relativeLuminance,
  withAlpha,
  withComponents,
  type Oklch,
} from "./color";
import type {
  BrandThemeTokens,
  HiVizBrandToken,
  StandardBrandToken,
  TokenMap,
} from "./tokens";

export type BrandLogoPresentation = "transparent" | "dark-surface";

/**
 * Compact brand inputs. `primary`, `surfaceLight`, and `surfaceDark` are
 * required; the rest default to values derived from those three, matching how
 * the St. Johns palette was authored from teal + off-white + charcoal.
 */
export type BrandThemeInputs = {
  /** The brand's primary emphasis color (buttons, selection, accents). */
  primary: Oklch;
  /** Light-mode page surface (off-white / white). */
  surfaceLight: Oklch;
  /** Dark-mode page surface (charcoal / near-black). */
  surfaceDark: Oklch;
  /**
   * Light-mode body text. Defaults to `surfaceDark` (St. Johns uses its
   * charcoal for both). WTH-style identities may pass their primary here.
   */
  textLight?: Oklch;
  /** Secondary emphasis hue. Defaults to a deepened shade of `primary`. */
  accent?: Oklch;
  /**
   * The operational "Now Serving" emphasis color. Defaults to a slightly
   * deepened `primary` (St. Johns: #319A72 from #33A478).
   */
  serving?: Oklch;
  /**
   * Ambient hues (color-story ranks 3+, docs/COLOR_SEMIOTICS.md layer L4):
   * contribute their HUE to surface tints and card gradients only; the
   * system fixes the loudness (whisper chroma). Never feed state or
   * emphasis roles. Empty for one- and two-color stories, which tint
   * ambience from the primary hue.
   */
  ambient?: Oklch[];
  /** How the light-mode logo sits on the page; drives --brand-logo-surface. */
  logoPresentation: BrandLogoPresentation;
};

/** Inputs with every optional member resolved. */
export type ResolvedBrandThemeInputs = Required<BrandThemeInputs>;

export const resolveBrandThemeInputs = (
  inputs: BrandThemeInputs,
): ResolvedBrandThemeInputs => ({
  primary: inputs.primary,
  surfaceLight: inputs.surfaceLight,
  surfaceDark: inputs.surfaceDark,
  // St. Johns: charcoal text is the dark surface.
  textLight: inputs.textLight ?? inputs.surfaceDark,
  // St. Johns accent oklch(0.552 0.106 162) ≈ primary −0.09 L, −0.015 C.
  accent: inputs.accent ?? adjust(inputs.primary, { l: -0.09, c: -0.015 }),
  // St. Johns serving oklch(0.6159 0.1136 163.7) ≈ primary −0.028 L, −0.008 C.
  serving: inputs.serving ?? adjust(inputs.primary, { l: -0.028, c: -0.008 }),
  ambient: inputs.ambient ?? [],
  logoPresentation: inputs.logoPresentation,
});

/**
 * Ambient tint hues for the two card-gradient families (L4). With no
 * ambient colors, ambience tints from the primary hue (mono/two-tone
 * stories); with them, ranks 3+ supply the hues — the only place they
 * appear. Loudness stays system-fixed: only the hue is taken (axiom 1:
 * saturation signifies loudness, and ambience whispers).
 */
const ambientHues = (inputs: ResolvedBrandThemeInputs): [number, number] => {
  const [first, second] = inputs.ambient;
  return [first?.h ?? inputs.primary.h, second?.h ?? first?.h ?? inputs.primary.h];
};

/**
 * The background role's actual color. FEED's rule is precedence, not merely
 * hue extraction: an authored ambient outranks the primary for the page wash,
 * and primary is used only when that slot is empty.
 */
const ambientColor = (inputs: ResolvedBrandThemeInputs): Oklch =>
  inputs.ambient[0] ?? inputs.primary;

// Brand-independent neutrals shared by both hand-authored identities
// (WTH ≈ St. Johns to within rounding): pending-ticket cool grays and the
// Hi-viz "ink" used for light-mode borders.
const UPCOMING_LIGHT: Oklch = { l: 0.916492, c: 0.008686, h: 247.921 };
const UPCOMING_LIGHT_BORDER: Oklch = { l: 0.797681, c: 0.014387, h: 248.008 };
const UPCOMING_DARK: Oklch = { l: 0.249082, c: 0.015961, h: 252.426 };
const UPCOMING_DARK_BORDER: Oklch = { l: 0.337345, c: 0.020733, h: 254.115 };
const HI_VIZ_INK: Oklch = { l: 0.370323, c: 0.01188, h: 285.805 };
const HI_VIZ_FOREGROUND_LIGHT: Oklch = { l: 0.217787, c: 0, h: 0 };
const HI_VIZ_UPCOMING_LIGHT: Oklch = { l: 0.919729, c: 0.004031, h: 286.32 };
const HI_VIZ_UPCOMING_DARK: Oklch = { l: 0.210331, c: 0.00586, h: 285.885 };
const WHITE: Oklch = { l: 1, c: 0, h: 0 };
const BLACK: Oklch = { l: 0, c: 0, h: 0 };

const toTop = (from: Oklch, to: Oklch) =>
  `linear-gradient(to top, ${formatOklch(from)}, ${formatOklch(to)})`;

const flatGradient = (color: Oklch) =>
  `linear-gradient(${formatOklch(color)}, ${formatOklch(color)})`;

/**
 * Emphasis-pair contrast floor (see validate.ts). Calibrated against both
 * shipped identities: St. Johns' Issue 33 fix measures ≈2.78:1 and WTH's
 * light serving ramp ≈2.74:1 at its light stop — deliberate, readable
 * choices that plain WCAG luminance math underrates for white-on-mid-color.
 */
const EMPHASIS_CONTRAST_FLOOR = 2.5;

/** Body-text minimum (WCAG 2.1 AA), mirrored from validate.ts. */
const TEXT_CONTRAST_MINIMUM = 4.5;

/**
 * Lower a foreground's lightness in small steps until it reads at ≥4.5:1 on
 * the given surface. Converges for any light surface because L=0 is maximal
 * contrast on one.
 */
const darkenUntilReadable = (foreground: Oklch, surface: Oklch): Oklch => {
  let candidate = foreground;
  while (
    candidate.l > 0 &&
    contrastRatio(candidate, surface) < TEXT_CONTRAST_MINIMUM
  ) {
    candidate = { ...candidate, l: Math.max(0, candidate.l - 0.005) };
  }
  return candidate;
};

// ---------------------------------------------------------------------------
// Auto-correction. Every pair the contrast validator checks whose two sides
// are BOTH derived (never typed by the operator) must pass by construction:
// a failing derived pair would surface a wizard error the operator has no
// visible input to fix (e.g. the Hi-viz layers, which expose no direct
// controls). Correction nudges only lightness, in small steps, away from the
// other color — hue and chroma stay in the brand family — and is a no-op for
// pairs that already pass, which the St. Johns/WTH fidelity tests pin down.
// Pairs involving operator-typed colors (background/foreground etc.) are NOT
// auto-corrected; those errors are actionable and deliberate choices should
// not be silently overridden.
// ---------------------------------------------------------------------------

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Minimum ratio a candidate must reach against every fill it sits on. */
const worstRatio = (fills: Oklch[], candidate: Oklch): number =>
  Math.min(...fills.map((fill) => contrastRatio(fill, candidate)));

/**
 * Pick a readable foreground for one or more fills (gradient stops) from
 * ordered brand-derived candidates: the first candidate clearing the emphasis
 * floor wins, so the aesthetic preference order (near-white tint first in
 * light mode, deep shade first in dark mode) is honored whenever it is
 * readable. This ordering — not the numeric floor — is the structural
 * Issue 33 protection: the original bug (near-black green on mid-green)
 * actually *passes* WCAG at ≈4.7:1, while the shipped near-white fix measures
 * ≈2.8:1; ratio-maximizing would recreate the bug. If no candidate passes,
 * the best one is auto-lightened/darkened away from the fill until it does.
 */
/**
 * Nudge a color's lightness until `measure` reaches the emphasis floor. Tries
 * the preferred direction first; if lightness clamps out before the floor is
 * reached (e.g. darkening toward a near-black opponent can never get there),
 * restarts in the other direction, and returns whichever attempt scored
 * higher. No-op for colors that already pass.
 */
const nudgeUntilReadable = (
  color: Oklch,
  measure: (candidate: Oklch) => number,
  preferLighten: boolean,
): Oklch => {
  if (measure(color) >= EMPHASIS_CONTRAST_FLOOR) return color;
  const attempt = (lighten: boolean): Oklch => {
    let candidate = color;
    for (let i = 0; i < 200 && measure(candidate) < EMPHASIS_CONTRAST_FLOOR; i++) {
      const nextL = clamp01(candidate.l + (lighten ? 0.005 : -0.005));
      if (nextL === candidate.l) break;
      candidate = { ...candidate, l: nextL };
    }
    return candidate;
  };
  const preferred = attempt(preferLighten);
  if (measure(preferred) >= EMPHASIS_CONTRAST_FLOOR) return preferred;
  const fallback = attempt(!preferLighten);
  return measure(fallback) >= measure(preferred) ? fallback : preferred;
};

const bestForeground = (
  fillOrFills: Oklch | Oklch[],
  candidates: Oklch[],
): Oklch => {
  const fills = Array.isArray(fillOrFills) ? fillOrFills : [fillOrFills];
  const readable = candidates.find(
    (candidate) => worstRatio(fills, candidate) >= EMPHASIS_CONTRAST_FLOOR,
  );
  if (readable) return readable;
  const best = candidates.reduce((current, candidate) =>
    worstRatio(fills, candidate) > worstRatio(fills, current)
      ? candidate
      : current,
  );
  const fillLuminance = Math.max(...fills.map(relativeLuminance));
  return nudgeUntilReadable(
    best,
    (candidate) => worstRatio(fills, candidate),
    relativeLuminance(best) >= fillLuminance,
  );
};

/**
 * Adjust a derived fill's lightness away from a fixed text color until the
 * emphasis floor is met (used where the text side is a constant, e.g. the
 * Hi-viz near-black foreground). No-op for already-passing fills.
 */
const readableFill = (fill: Oklch, text: Oklch): Oklch =>
  nudgeUntilReadable(
    fill,
    (candidate) => contrastRatio(candidate, text),
    relativeLuminance(text) < relativeLuminance(fill),
  );

const deriveLight = (
  inputs: ResolvedBrandThemeInputs,
): TokenMap<StandardBrandToken> => {
  const { primary, surfaceLight, surfaceDark, textLight, accent, serving } =
    inputs;

  // Near-white card lifted just above the page (St. Johns: 0.976 → 1.0).
  const card = withComponents(surfaceLight, {
    l: Math.min(1, surfaceLight.l + 0.024),
    c: 0,
    h: 0,
  });
  // Light tint of the primary hue for readable text on a primary fill
  // (St. Johns' Issue 33 fix: crisp near-white oklch(0.953 0.051 …)).
  const primaryTintForeground: Oklch = { l: 0.953, c: 0.051, h: primary.h };
  // Deep shade of the primary hue (St. Johns oklch(0.271 0.041 166)).
  const primaryDeepShade: Oklch = { l: 0.270912, c: 0.040942, h: primary.h };
  const primaryForeground = bestForeground(primary, [
    primaryTintForeground,
    primaryDeepShade,
  ]);
  const accentForeground = bestForeground(accent, [WHITE, textLight]);
  const servingBorder = adjust(serving, { l: -0.089, c: -0.017 });
  const servedTintDeep: Oklch = { l: 0.913, c: 0.068, h: serving.h };
  const servedTintPale: Oklch = { l: 0.956, c: 0.034, h: serving.h };
  const [ambientHueA, ambientHueB] = ambientHues(inputs);
  const atmosphere = ambientColor(inputs);
  // The info/blue card family is neutral for mono/two-tone stories; a second
  // ambient hue (4–5-color stories, e.g. WTH's teals) tints it at whisper
  // chroma.
  const infoTint: { c: number; h: number } =
    inputs.ambient.length > 1
      ? { c: 0.01, h: ambientHueB }
      : { c: 0, h: 0 };

  return {
    background: formatOklch(surfaceLight),
    foreground: formatOklch(textLight),
    card: formatOklch(card),
    "card-foreground": formatOklch(textLight),
    popover: formatOklch(card),
    "popover-foreground": formatOklch(textLight),
    primary: formatOklch(primary),
    "primary-foreground": formatOklch(primaryForeground),
    secondary: formatOklch({ l: surfaceLight.l - 0.03, c: 0, h: 0 }),
    "secondary-foreground": formatOklch(textLight),
    muted: formatOklch({ l: surfaceLight.l - 0.027, c: 0, h: 0 }),
    // Desaturated mid-gray in the text hue, darkened as needed so the pair
    // always meets 4.5:1 on the muted surface even for a colorful textLight
    // (WTH hand-authored: oklch(0.551 0.0234 264)).
    "muted-foreground": formatOklch(
      darkenUntilReadable(
        {
          l: Math.min(0.55, textLight.l + 0.167),
          c: Math.min(textLight.c, 0.025),
          h: textLight.h,
        },
        { l: surfaceLight.l - 0.027, c: 0, h: 0 },
      ),
    ),
    accent: formatOklch(accent),
    "accent-foreground": formatOklch(accentForeground),
    border: formatOklch({ l: surfaceLight.l - 0.109, c: 0, h: 0 }),
    input: formatOklch({ l: surfaceLight.l - 0.245, c: 0, h: 0 }),
    ring: formatOklch(primary),
    "base-shadow-soft-color": formatOklch(withAlpha(surfaceDark, 0.15)),
    "base-shadow-color": formatOklch(withAlpha(surfaceDark, 0.2)),
    "base-shadow-strong-color": formatOklch(withAlpha(surfaceDark, 0.38)),
    "brand-logo-surface":
      inputs.logoPresentation === "dark-surface"
        ? formatOklch(surfaceDark)
        : "transparent",
    "card-gradient": toTop(withAlpha(surfaceDark, 0.025), withAlpha(WHITE, 0.12)),
    "ticket-serving": toTop(serving, serving),
    "ticket-serving-border": formatOklch(servingBorder),
    "ticket-serving-text": formatOklch(
      bestForeground(serving, [WHITE, primaryDeepShade]),
    ),
    "ticket-served": toTop(servedTintDeep, servedTintPale),
    "ticket-served-border": formatOklch({ l: 0.742, c: 0.161, h: serving.h - 6 }),
    "ticket-served-text": formatOklch({ l: 0.318, c: 0.046, h: serving.h }),
    "ticket-upcoming": formatOklch(UPCOMING_LIGHT),
    "ticket-upcoming-border": formatOklch(UPCOMING_LIGHT_BORDER),
    "serving-text-gradient": `linear-gradient(135deg, ${formatOklch(serving)}, ${formatOklch(serving)})`,
    "serving-label-color": formatOklch(serving),
    "gradient-display-bg": `radial-gradient(circle at 18% 10%, ${formatOklch(withAlpha({ l: 0.68, c: Math.min(atmosphere.c, 0.08), h: atmosphere.h }, 0.08))}, transparent 31%),
    linear-gradient(145deg, ${formatOklch(surfaceLight)}, ${formatOklch({ l: surfaceLight.l - 0.015, c: Math.min(atmosphere.c, 0.012), h: atmosphere.h })} 48%, ${formatOklch({ l: Math.min(1, surfaceLight.l + 0.012), c: Math.min(atmosphere.c, 0.005), h: atmosphere.h })})`,
    "gradient-card-info": toTop(
      { l: surfaceLight.l - 0.018, ...infoTint },
      WHITE,
    ),
    "gradient-card-accent": toTop(
      { l: surfaceLight.l - 0.013, c: 0.01, h: ambientHueA },
      WHITE,
    ),
    "gradient-card-blue": toTop(
      { l: surfaceLight.l - 0.018, ...infoTint },
      WHITE,
    ),
    "gradient-card-emerald": toTop(
      { l: surfaceLight.l - 0.013, c: 0.01, h: ambientHueA },
      WHITE,
    ),
    "card-title-color": formatOklch(textLight),
    "card-icon-color": formatOklch(textLight),
    "icon-blue": formatOklch(accent),
    "icon-emerald": formatOklch(primary),
  };
};

const deriveDark = (
  inputs: ResolvedBrandThemeInputs,
): TokenMap<StandardBrandToken> => {
  const { primary, surfaceLight, surfaceDark, accent, serving } = inputs;

  const card = adjust(surfaceDark, { l: -0.016 });
  // Deep shade of the primary hue (St. Johns oklch(0.271 0.041 166)).
  const primaryDeepShade: Oklch = { l: 0.270912, c: 0.040942, h: primary.h };
  const primaryTintForeground: Oklch = { l: 0.953, c: 0.051, h: primary.h };
  const primaryForeground = bestForeground(primary, [
    primaryDeepShade,
    primaryTintForeground,
  ]);
  // Luminous identity emphasis ("glow"): St. Johns' mint oklch(0.853 0.157
  // 167) is primary +0.209 L, +0.036 C. Used for identity roles (ring,
  // icons, labels tied to the brand).
  const glow = adjust(primary, { l: 0.209, c: 0.036 });
  // Serving-state luminous rung, derived from the SERVING hue — never the
  // primary hue — so Now Serving keeps one hue across modes (the continuity
  // invariant, docs/COLOR_SEMIOTICS.md; the founding WTH blue/gold lesson).
  const servingGlow = adjust(serving, { l: 0.237, c: 0.044 });
  const servingRampBase = withComponents(servingGlow, {
    l: servingGlow.l - 0.055,
  });
  // Called: subordinate values of the serving hue (state layer L1).
  const servedStops: Oklch[] = [
    { l: 0.298, c: 0.055, h: serving.h },
    { l: 0.401, c: 0.077, h: serving.h },
  ];
  const [ambientHueA, ambientHueB] = ambientHues(inputs);
  const atmosphere = ambientColor(inputs);

  return {
    background: formatOklch(surfaceDark),
    foreground: formatOklch(surfaceLight),
    card: formatOklch(card),
    "card-foreground": formatOklch(surfaceLight),
    popover: formatOklch(card),
    "popover-foreground": formatOklch(surfaceLight),
    primary: formatOklch(primary),
    "primary-foreground": formatOklch(primaryForeground),
    secondary: formatOklch(adjust(surfaceDark, { l: 0.044 })),
    "secondary-foreground": formatOklch(surfaceLight),
    muted: formatOklch(adjust(surfaceDark, { l: 0.028 })),
    "muted-foreground": formatOklch({
      l: Math.max(0.7, surfaceLight.l - 0.143),
      c: 0,
      h: 0,
    }),
    // FEED parity: slot two remains the accent in dark mode. The old rule
    // rebuilt this token from primary, so choosing an accent changed nothing.
    accent: formatOklch(accent),
    "accent-foreground": formatOklch(
      bestForeground(accent, [primaryDeepShade, primaryTintForeground, WHITE]),
    ),
    border: formatOklch(adjust(surfaceDark, { l: 0.145 })),
    input: formatOklch(adjust(surfaceDark, { l: 0.17 })),
    ring: formatOklch(glow),
    // St. Johns reuses the light Called border as its dark shadow tint.
    "base-shadow-soft-color": formatOklch(withAlpha({ l: 0.742, c: 0.161, h: serving.h - 6 }, 0.15)),
    "base-shadow-color": formatOklch(withAlpha({ l: 0.742, c: 0.161, h: serving.h - 6 }, 0.25)),
    "base-shadow-strong-color": formatOklch(withAlpha({ l: 0.742, c: 0.161, h: serving.h - 6 }, 0.38)),
    "brand-logo-surface": formatOklch(surfaceDark),
    "card-gradient": toTop(withAlpha(primary, 0.08), withAlpha(BLACK, 0.12)),
    "ticket-serving": toTop(servingRampBase, servingGlow),
    "ticket-serving-border": formatOklch(
      adjust(servingGlow, { l: 0.053, c: -0.01 }),
    ),
    "ticket-serving-text": formatOklch(
      bestForeground(
        [servingRampBase, servingGlow],
        [{ l: 0.306, c: 0.048, h: serving.h }, WHITE],
      ),
    ),
    "ticket-served": toTop(servedStops[0], servedStops[1]),
    "ticket-served-border": formatOklch({ l: 0.785, c: 0.16, h: serving.h }),
    "ticket-served-text": formatOklch(
      bestForeground(servedStops, [surfaceLight, WHITE]),
    ),
    "ticket-upcoming": formatOklch(UPCOMING_DARK),
    "ticket-upcoming-border": formatOklch(UPCOMING_DARK_BORDER),
    "serving-text-gradient": `linear-gradient(135deg, ${formatOklch(servingGlow)}, ${formatOklch(servingRampBase)})`,
    "serving-label-color": formatOklch(servingGlow),
    "gradient-display-bg": `radial-gradient(circle at 18% 10%, ${formatOklch(withAlpha({ l: 0.58, c: Math.min(atmosphere.c, 0.1), h: atmosphere.h }, 0.12))}, transparent 31%),
    linear-gradient(145deg, ${formatOklch(surfaceDark)}, ${formatOklch({ l: surfaceDark.l - 0.01, c: Math.min(atmosphere.c, 0.012), h: atmosphere.h })} 48%, ${formatOklch({ ...adjust(surfaceDark, { l: -0.037 }), c: Math.min(atmosphere.c, 0.006), h: atmosphere.h })})`,
    "gradient-card-info": toTop(
      { l: card.l + 0.025, c: 0.01, h: ambientHueB },
      card,
    ),
    "gradient-card-accent": toTop(
      { l: card.l + 0.035, c: 0.019, h: ambientHueA },
      card,
    ),
    "gradient-card-blue": toTop(
      { l: card.l + 0.025, c: 0.01, h: ambientHueB },
      card,
    ),
    "gradient-card-emerald": toTop(
      { l: card.l + 0.035, c: 0.019, h: ambientHueA },
      card,
    ),
    "card-title-color": formatOklch(surfaceLight),
    "card-icon-color": formatOklch(surfaceLight),
    "icon-blue": formatOklch(accent),
    "icon-emerald": formatOklch(glow),
  };
};

const deriveHiVizLight = (
  inputs: ResolvedBrandThemeInputs,
): TokenMap<HiVizBrandToken> => {
  const { primary, surfaceLight, surfaceDark, accent, serving } = inputs;

  const foreground = HI_VIZ_FOREGROUND_LIGHT;
  const card = withComponents(surfaceLight, {
    l: Math.min(1, surfaceLight.l + 0.012),
    c: 0,
    h: 0,
  });
  const secondary: Oklch = { l: 0.959, c: 0.015, h: primary.h };
  const mutedForeground: Oklch = { l: foreground.l + 0.157, c: 0, h: 0 };
  const servingBorder = adjust(serving, { l: -0.089, c: -0.017 });
  // Hi-viz exposes no direct color controls, so its fills self-correct
  // against the fixed near-black foreground (a dark brand primary would
  // otherwise produce an error the operator cannot act on).
  const hiVizPrimary = readableFill(serving, foreground);
  const hiVizAccent = readableFill(accent, foreground);

  return {
    background: formatOklch(surfaceLight),
    foreground: formatOklch(foreground),
    card: formatOklch(card),
    "card-foreground": formatOklch(foreground),
    popover: formatOklch(WHITE),
    "popover-foreground": formatOklch(foreground),
    primary: formatOklch(hiVizPrimary),
    "primary-foreground": formatOklch(foreground),
    secondary: formatOklch(secondary),
    "secondary-foreground": formatOklch(foreground),
    muted: formatOklch({ l: surfaceLight.l - 0.027, c: 0, h: 0 }),
    "muted-foreground": formatOklch(mutedForeground),
    accent: formatOklch(hiVizAccent),
    "accent-foreground": formatOklch(foreground),
    border: formatOklch(HI_VIZ_INK),
    input: formatOklch(HI_VIZ_INK),
    ring: formatOklch(hiVizPrimary),
    sidebar: formatOklch(surfaceLight),
    "sidebar-foreground": formatOklch(foreground),
    "sidebar-primary": formatOklch(hiVizPrimary),
    "sidebar-primary-foreground": formatOklch(foreground),
    "sidebar-accent": formatOklch(hiVizAccent),
    "sidebar-accent-foreground": formatOklch(foreground),
    "sidebar-border": formatOklch(HI_VIZ_INK),
    "sidebar-ring": formatOklch(hiVizPrimary),
    "base-shadow-soft-color": formatOklch(withAlpha(surfaceDark, 0.25)),
    "base-shadow-color": formatOklch(withAlpha(surfaceDark, 0.5)),
    "base-shadow-strong-color": formatOklch(withAlpha(surfaceDark, 0.75)),
    "brand-logo-surface":
      inputs.logoPresentation === "dark-surface"
        ? formatOklch(surfaceDark)
        : "transparent",
    "card-gradient": "none",
    "ticket-serving": formatOklch(serving),
    "ticket-serving-border": formatOklch(servingBorder),
    "ticket-serving-text": formatOklch(
      bestForeground(serving, [WHITE, foreground]),
    ),
    "ticket-served": formatOklch({ l: 0.863, c: 0.092, h: serving.h }),
    "ticket-served-border": formatOklch(serving),
    "ticket-served-text": formatOklch(
      bestForeground({ l: 0.863, c: 0.092, h: serving.h }, [
        { l: 0.270912, c: 0.040942, h: serving.h },
        foreground,
      ]),
    ),
    "ticket-upcoming": formatOklch(HI_VIZ_UPCOMING_LIGHT),
    "ticket-upcoming-border": formatOklch(HI_VIZ_INK),
    "serving-text-gradient": flatGradient(serving),
    "serving-label-color": formatOklch(mutedForeground),
    "gradient-display-bg": formatOklch(surfaceLight),
    "gradient-card-info": "var(--card)",
    "gradient-card-accent": "var(--card)",
    "gradient-card-blue": "var(--card)",
    "gradient-card-emerald": "var(--card)",
    "card-title-color": formatOklch(foreground),
    "card-icon-color": formatOklch(foreground),
    "icon-blue": formatOklch(hiVizAccent),
    "icon-emerald": formatOklch(serving),
  };
};

const deriveHiVizDark = (
  inputs: ResolvedBrandThemeInputs,
): TokenMap<HiVizBrandToken> => {
  const { primary, surfaceLight, surfaceDark, accent, serving } = inputs;

  const card = adjust(surfaceDark, { l: -0.088 });
  // Hi-viz dark emphasis: St. Johns oklch(0.876 0.123 166) ≈ primary
  // +0.232 L, +0.002 C.
  const hiVizGlow = adjust(primary, { l: 0.232, c: 0.002 });
  // Serving-state luminous rung in the SERVING hue (continuity invariant —
  // see deriveDark's servingGlow note).
  const hiVizServingGlow = adjust(serving, { l: 0.26, c: 0.009 });
  const primaryDeepShade: Oklch = { l: 0.270912, c: 0.040942, h: primary.h };
  const mutedForeground: Oklch = {
    l: Math.max(0.85, surfaceLight.l - 0.076),
    c: 0,
    h: 0,
  };
  // Self-correcting derived pairs (see the auto-correction note above): a
  // very dark brand primary keeps its glow readable here.
  const glowForeground = bestForeground(hiVizGlow, [primaryDeepShade, WHITE]);
  const hiVizAccent = accent;
  const accentForeground = bestForeground(hiVizAccent, [primaryDeepShade, WHITE, BLACK]);

  return {
    background: formatOklch(surfaceDark),
    foreground: formatOklch(surfaceLight),
    card: formatOklch(card),
    "card-foreground": formatOklch(surfaceLight),
    popover: formatOklch(adjust(surfaceDark, { l: -0.054 })),
    "popover-foreground": formatOklch(surfaceLight),
    primary: formatOklch(hiVizGlow),
    "primary-foreground": formatOklch(glowForeground),
    secondary: formatOklch(adjust(surfaceDark, { l: 0.028 })),
    "secondary-foreground": formatOklch(surfaceLight),
    muted: formatOklch(adjust(surfaceDark, { l: -0.058 })),
    "muted-foreground": formatOklch(mutedForeground),
    accent: formatOklch(hiVizAccent),
    "accent-foreground": formatOklch(accentForeground),
    border: formatOklch(surfaceLight),
    input: formatOklch(surfaceLight),
    ring: formatOklch(hiVizGlow),
    sidebar: formatOklch(card),
    "sidebar-foreground": formatOklch(surfaceLight),
    "sidebar-primary": formatOklch(hiVizGlow),
    "sidebar-primary-foreground": formatOklch(glowForeground),
    "sidebar-accent": formatOklch(hiVizAccent),
    "sidebar-accent-foreground": formatOklch(accentForeground),
    "sidebar-border": formatOklch(surfaceLight),
    "sidebar-ring": formatOklch(hiVizGlow),
    "base-shadow-soft-color": formatOklch(withAlpha({ l: 0.742, c: 0.161, h: serving.h - 6 }, 0.25)),
    "base-shadow-color": formatOklch(withAlpha({ l: 0.742, c: 0.161, h: serving.h - 6 }, 0.5)),
    "base-shadow-strong-color": formatOklch(withAlpha({ l: 0.742, c: 0.161, h: serving.h - 6 }, 0.75)),
    "brand-logo-surface": formatOklch(surfaceDark),
    "card-gradient": "none",
    "ticket-serving": formatOklch(serving),
    "ticket-serving-border": formatOklch(hiVizServingGlow),
    "ticket-serving-text": formatOklch(
      bestForeground(serving, [WHITE, { l: 0.270912, c: 0.040942, h: serving.h }]),
    ),
    "ticket-served": formatOklch({ l: 0.291, c: 0.061, h: serving.h }),
    "ticket-served-border": formatOklch({ l: 0.703, c: 0.167, h: serving.h - 6 }),
    "ticket-served-text": formatOklch(
      bestForeground({ l: 0.291, c: 0.061, h: serving.h }, [surfaceLight, WHITE]),
    ),
    "ticket-upcoming": formatOklch(HI_VIZ_UPCOMING_DARK),
    "ticket-upcoming-border": formatOklch(surfaceLight),
    "serving-text-gradient": flatGradient(hiVizServingGlow),
    "serving-label-color": formatOklch(mutedForeground),
    "gradient-display-bg": formatOklch(surfaceDark),
    "gradient-card-info": "var(--card)",
    "gradient-card-accent": "var(--card)",
    "gradient-card-blue": "var(--card)",
    "gradient-card-emerald": "var(--card)",
    "card-title-color": formatOklch(surfaceLight),
    "card-icon-color": formatOklch(surfaceLight),
    "icon-blue": formatOklch(hiVizAccent),
    "icon-emerald": formatOklch(hiVizGlow),
  };
};

/**
 * Derive the complete four-scope brand theme from compact inputs.
 * Deterministic and pure: identical inputs always produce identical output.
 */
export const deriveBrandTheme = (inputs: BrandThemeInputs): BrandThemeTokens => {
  const resolved = resolveBrandThemeInputs(inputs);
  return {
    light: deriveLight(resolved),
    dark: deriveDark(resolved),
    hiVizLight: deriveHiVizLight(resolved),
    hiVizDark: deriveHiVizDark(resolved),
  };
};
