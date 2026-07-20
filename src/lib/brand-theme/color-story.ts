// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// The color-story model (docs/COLOR_SEMIOTICS.md): operators list their
// brand's colors in hierarchy order (1–5, counted the way a brand owner
// counts — neutrals included); this module classifies each color and assigns
// semiotic roles under the signal ceiling:
//
//   rank 1 chromatic → state + identity (primary)
//   rank 2 chromatic → accent
//   ranks 3+ chromatic → ambient (texture only — never signals)
//   dark neutral → dark surface / text anchor
//   light neutral → light surface anchor
//
// Pure and client-safe: the wizard uses it live, tests pin its behavior.

import type { BrandConfig } from "./config-schema";
import type { Oklch } from "./color";

/** Chroma below which a color reads as a tone (anchor), not a signal. */
export const NEUTRAL_CHROMA_THRESHOLD = 0.04;

/** Reserved operational hue bands (docs/COLOR_SEMIOTICS.md, constraint 2). */
export const RESERVED_HUE_BANDS = [
  { hue: 25, halfWidth: 20, meaning: "Returned/danger red" },
  { hue: 85, halfWidth: 20, meaning: "Unclaimed/warning gold" },
] as const;

/** Chroma at which a reserved-band hue starts reading as a status signal. */
export const RESERVED_BAND_SIGNAL_CHROMA = 0.09;

/** Circular hue distance in degrees, always in [0, 180]. */
export const hueDistance = (a: number, b: number): number => {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
};

export type ColorClass = "chromatic" | "dark-neutral" | "light-neutral";

export const classifyColor = (color: Oklch): ColorClass => {
  if (color.c >= NEUTRAL_CHROMA_THRESHOLD) return "chromatic";
  return color.l < 0.6 ? "dark-neutral" : "light-neutral";
};

export type StoryRole =
  | "primary"
  | "accent"
  | "ambient"
  | "surface-dark"
  | "surface-light";

/** Plain-language role labels shown next to each color row in the wizard. */
export const ROLE_LABELS: Record<StoryRole, string> = {
  primary: "Main color — buttons, selection, and Now Serving",
  accent: "Accent — icons and secondary highlights",
  ambient: "Ambient — background tints and texture (never signals)",
  "surface-dark": "Dark anchor — dark-mode surface and text color",
  "surface-light": "Light anchor — light-mode page surface",
};

export type StoryAssignment = {
  color: Oklch;
  role: StoryRole;
  label: string;
  /** Reserved-hue-band warning, when applicable. */
  warning: string | null;
};

export type ColorStoryResult = {
  assignments: StoryAssignment[];
  /** The colors object these assignments produce (partial — only the fields
   * the story covers; merge over the existing config colors). */
  colors: Partial<BrandConfig["colors"]> & { ambient?: Oklch[] };
  warnings: string[];
};

/**
 * Reserved-band check: a chromatic color at signal chroma inside an
 * operational hue band collides with universal status meaning. Signaling
 * roles get a strong warning; ambient use is chroma-capped by the derivation
 * so it only gets a note.
 */
export const reservedBandWarning = (
  color: Oklch,
  role: StoryRole,
): string | null => {
  if (color.c < RESERVED_BAND_SIGNAL_CHROMA) return null;
  const band = RESERVED_HUE_BANDS.find(
    (candidate) => hueDistance(color.h, candidate.hue) <= candidate.halfWidth,
  );
  if (!band) return null;
  if (role === "primary" || role === "accent") {
    return `This color sits in the hue range LOTTO reserves for ${band.meaning} status. Used for ${role === "primary" ? "buttons and Now Serving" : "accents"}, it could make ordinary UI read as a status warning. Consider a different hue for this role, or move it lower in your color hierarchy.`;
  }
  if (role === "ambient") {
    return `Close to the ${band.meaning} status hue — fine as a quiet background tint, which is how ambient colors are used.`;
  }
  return null;
};

/**
 * Assign roles to an ordered color hierarchy (index 0 = most important).
 * Chromatic colors take primary → accent → ambient in rank order; the
 * darkest dark neutral becomes the dark anchor and the lightest light
 * neutral the light anchor (extra neutrals fall through to ambient).
 */
export const proposeColorStory = (hierarchy: Oklch[]): ColorStoryResult => {
  const assignments: StoryAssignment[] = [];
  const colors: ColorStoryResult["colors"] = {};
  const ambient: Oklch[] = [];
  let darkAnchor: Oklch | null = null;
  let lightAnchor: Oklch | null = null;
  let chromaticRank = 0;

  for (const color of hierarchy.slice(0, 5)) {
    const kind = classifyColor(color);
    let role: StoryRole;
    if (kind === "dark-neutral" && !darkAnchor) {
      role = "surface-dark";
      darkAnchor = color;
    } else if (kind === "light-neutral" && !lightAnchor) {
      role = "surface-light";
      lightAnchor = color;
    } else if (kind === "chromatic" && chromaticRank === 0) {
      role = "primary";
      chromaticRank += 1;
    } else if (kind === "chromatic" && chromaticRank === 1) {
      role = "accent";
      chromaticRank += 1;
    } else {
      // Chromatic ranks 3+ and surplus neutrals: texture only.
      role = "ambient";
    }
    if (role === "ambient" && ambient.length < 3) ambient.push(color);
    assignments.push({
      color,
      role,
      label: ROLE_LABELS[role],
      warning: reservedBandWarning(color, role),
    });
  }

  const primary = assignments.find((entry) => entry.role === "primary");
  if (primary) colors.primary = primary.color;
  const accent = assignments.find((entry) => entry.role === "accent");
  if (accent) colors.accent = accent.color;
  if (ambient.length > 0) colors.ambient = ambient;
  if (darkAnchor) colors.surfaceDark = darkAnchor;
  if (lightAnchor) colors.surfaceLight = lightAnchor;

  return {
    assignments,
    colors,
    warnings: assignments.flatMap((entry) => (entry.warning ? [entry.warning] : [])),
  };
};

/**
 * Reconstruct a hierarchy from saved config colors (for editing an existing
 * configuration): primary, accent if authored, then ambient. Anchors are
 * shown in the wizard's surfaces section rather than as hierarchy rows.
 */
export const storyFromColors = (
  colors: BrandConfig["colors"],
): Oklch[] => [
  colors.primary,
  ...(colors.accent ? [colors.accent] : []),
  ...(colors.ambient ?? []),
];

// ---------------------------------------------------------------------------
// Automatic recommendation (docs/COLOR_SEMIOTICS.md, "Automatic
// recommendation"). Given a palette extracted from the uploaded logo (colors
// with pixel populations), build a complete color-story hierarchy so the
// operator starts from a finished proposal and only corrects what they
// dislike. The recommendation is semiotics-aware: colors inside the reserved
// operational hue bands (Returned red, Unclaimed gold) are never auto-placed
// in signaling roles — the workaround ladder is documented on the result so
// the operator understands what happened and can override deliberately.
// ---------------------------------------------------------------------------

export type PaletteEntry = {
  color: Oklch;
  /** Relative pixel population from extraction (any positive scale). */
  population: number;
};

export type ColorStoryRecommendation = {
  /** Ordered hierarchy ready for `proposeColorStory` / the wizard rows. */
  hierarchy: Oklch[];
  /** Plain-language notes about non-obvious choices (reserved-band handling). */
  notes: string[];
};

const inReservedBand = (color: Oklch): boolean =>
  color.c >= RESERVED_BAND_SIGNAL_CHROMA &&
  RESERVED_HUE_BANDS.some(
    (band) => hueDistance(color.h, band.hue) <= band.halfWidth,
  );

const bandName = (color: Oklch): string =>
  RESERVED_HUE_BANDS.find(
    (band) => hueDistance(color.h, band.hue) <= band.halfWidth,
  )?.meaning ?? "a reserved status";

/**
 * Recommend a full color story from an extracted logo palette.
 *
 * Ranking: chromatic colors score by pixel population weighted by chroma
 * salience (a small saturated mark beats a large pale wash for identity).
 * Reserved-band colors are excluded from the signaling ranks; the workaround
 * ladder when the logo's chromatics collide with operational semiotics:
 *
 *   1. Prefer the best NON-colliding chromatic for primary/accent; colliding
 *      colors become ambience (where the derivation whispers them).
 *   2. No safe chromatic but a dark neutral exists → a tonal (monochrome)
 *      identity on the neutral, with the brand hue kept as ambience.
 *   3. Nothing but colliding chromatics → the dominant hue is demoted to a
 *      tone (chroma below signal threshold, deepened) so the identity stays
 *      in the brand's hue family without impersonating a status color.
 */
export const recommendColorStory = (
  palette: PaletteEntry[],
): ColorStoryRecommendation => {
  const notes: string[] = [];
  const entries = palette.filter((entry) => entry.population > 0);

  const chromatics = entries
    .filter((entry) => classifyColor(entry.color) === "chromatic")
    .sort(
      (a, b) =>
        b.population * (0.5 + b.color.c) - a.population * (0.5 + a.color.c),
    );
  const safe = chromatics.filter((entry) => !inReservedBand(entry.color));
  const colliding = chromatics.filter((entry) => inReservedBand(entry.color));

  const darkNeutrals = entries
    .filter((entry) => classifyColor(entry.color) === "dark-neutral")
    .sort((a, b) => a.color.l - b.color.l);
  const lightNeutrals = entries
    .filter((entry) => classifyColor(entry.color) === "light-neutral")
    .sort((a, b) => b.color.l - a.color.l);

  const hierarchy: Oklch[] = [];
  const ambient: Oklch[] = [];

  if (safe.length > 0) {
    hierarchy.push(safe[0].color);
    if (safe.length > 1) hierarchy.push(safe[1].color);
    for (const entry of safe.slice(2)) ambient.push(entry.color);
    if (colliding.length > 0) {
      notes.push(
        `Your logo's ${bandName(colliding[0].color)} tone was kept as a quiet background tint: that hue range is reserved for ticket status, so using it for buttons or Now Serving could make ordinary UI read as a warning.`,
      );
    }
  } else if (colliding.length > 0 && darkNeutrals.length > 0) {
    // Tonal identity: significance from VALUE on one ladder (the monochrome
    // tier's own strategy). Two rungs — a deep primary tone and a lighter
    // accent tone — occupy both signaling ranks so the reserved-band color
    // classifies as ambience, never as a signal.
    const anchor = darkNeutrals[0].color;
    const tonalPrimary = {
      l: Math.min(0.5, Math.max(0.3, anchor.l)),
      c: Math.max(anchor.c, NEUTRAL_CHROMA_THRESHOLD + 0.005),
      h: anchor.h,
    };
    hierarchy.push(tonalPrimary, {
      l: Math.min(0.72, tonalPrimary.l + 0.25),
      c: tonalPrimary.c,
      h: anchor.h,
    });
    notes.push(
      `Your logo's main color sits in the hue range reserved for ${bandName(colliding[0].color)} status, so the recommendation builds a tonal identity from your logo's dark neutral and keeps the brand color as background texture. Override it manually if you'd rather use the brand color anyway.`,
    );
  } else if (colliding.length > 0) {
    // Demote the dominant hue to tones: same family, below signal chroma,
    // two value rungs so the full-strength original stays ambient.
    const dominant = colliding[0].color;
    const tonalPrimary = {
      l: Math.min(0.5, Math.max(0.32, dominant.l - 0.1)),
      c: RESERVED_BAND_SIGNAL_CHROMA - 0.035,
      h: dominant.h,
    };
    hierarchy.push(tonalPrimary, {
      l: Math.min(0.75, tonalPrimary.l + 0.25),
      c: RESERVED_BAND_SIGNAL_CHROMA - 0.04,
      h: dominant.h,
    });
    notes.push(
      `Your logo's colors all sit in hue ranges reserved for ticket status, so the recommendation uses muted, deepened tones of your main color — same family, quiet enough not to impersonate a status signal. Override it manually if you'd rather use the full-strength color.`,
    );
  }

  if (hierarchy.length === 0 && darkNeutrals.length > 0) {
    // All-neutral logo (e.g. black-and-white mark): a natural tonal story.
    const anchor = darkNeutrals[0].color;
    hierarchy.push({
      l: Math.min(0.5, Math.max(0.3, anchor.l)),
      c: Math.max(anchor.c, NEUTRAL_CHROMA_THRESHOLD + 0.005),
      h: anchor.h,
    });
  }

  for (const entry of colliding) {
    if (ambient.length < 3) ambient.push(entry.color);
  }

  hierarchy.push(...ambient.slice(0, Math.max(0, 5 - hierarchy.length - 2)));
  if (darkNeutrals.length > 0 && hierarchy.length < 5) {
    hierarchy.push(darkNeutrals[0].color);
  }
  if (lightNeutrals.length > 0 && hierarchy.length < 5) {
    hierarchy.push(lightNeutrals[0].color);
  }

  return { hierarchy: hierarchy.slice(0, 5), notes };
};
