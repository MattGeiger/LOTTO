// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Post-merge brand-theme validation.
//
// Validation always runs on the FINAL merged token set (derived + sparse
// overrides), never on derivation output alone, so future Advanced-tier
// overrides can never bypass these checks (docs/CONFIGURABLE_BRANDING_PLAN.md,
// "Forward compatibility: sparse overrides").
//
// Contrast thresholds, calibrated against both shipped identities
// (see tests/brand-theme.test.ts):
// - 4.5:1 (WCAG 2.1 AA body text) for text-surface pairs. Every shipped pair
//   passes; the tightest is WTH light muted text at 4.51:1.
// - 2.5:1 floor for color-on-color emphasis pairs (filled buttons, oversized
//   ticket numerals). Plain WCAG luminance math underrates white-on-mid-color:
//   St. Johns' shipped Issue 33 *fix* measures ≈2.78:1 while the original
//   *bug* it replaced measures ≈4.7:1, and WTH's shipped light serving ramp
//   measures ≈2.74:1 at its light stop. The floor catches genuinely
//   unreadable combinations; the aesthetic-preference ordering inside the
//   derivation (`bestForeground`) is the structural Issue 33 protection, and
//   the wizard's live preview covers what neither number can.

import { contrastRatio, parseOklch, type Oklch } from "./color";
import type { BrandThemeScope, BrandThemeTokens } from "./tokens";
import { isProtectedTokenName, TOKENS_BY_SCOPE } from "./tokens";

export type ContrastRequirement = {
  /** Token holding the fill/background value. */
  fill: string;
  /** Token holding the text/foreground value. */
  text: string;
  /** Minimum WCAG 2.1 ratio. */
  minimum: number;
  /** Human-readable surface description for error messages. */
  surface: string;
};

/**
 * Contrast contract for every scope. `fill` tokens that hold gradients are
 * checked against each parsed gradient stop, so a passing ramp passes at both
 * ends.
 */
export const CONTRAST_REQUIREMENTS: readonly ContrastRequirement[] = [
  { fill: "background", text: "foreground", minimum: 4.5, surface: "page text" },
  { fill: "card", text: "card-foreground", minimum: 4.5, surface: "card text" },
  {
    fill: "popover",
    text: "popover-foreground",
    minimum: 4.5,
    surface: "popover text",
  },
  {
    fill: "muted",
    text: "muted-foreground",
    minimum: 4.5,
    surface: "muted text",
  },
  {
    fill: "secondary",
    text: "secondary-foreground",
    minimum: 4.5,
    surface: "secondary surfaces",
  },
  {
    fill: "primary",
    text: "primary-foreground",
    minimum: 2.5,
    surface: "filled primary buttons",
  },
  {
    fill: "accent",
    text: "accent-foreground",
    minimum: 2.5,
    surface: "accent fills",
  },
  {
    fill: "ticket-serving",
    text: "ticket-serving-text",
    minimum: 2.5,
    surface: "Now Serving ticket numerals",
  },
  {
    fill: "ticket-served",
    text: "ticket-served-text",
    minimum: 2.5,
    surface: "Called ticket numerals",
  },
] as const;

export type BrandThemeIssue = {
  scope: BrandThemeScope;
  token: string;
  /** Machine-readable category. */
  kind: "contrast" | "unknown-token" | "protected-token" | "unparsable";
  /** Plain-language explanation suitable for the wizard UI. */
  message: string;
};

const SCOPE_LABELS: Record<BrandThemeScope, string> = {
  light: "light mode",
  dark: "dark mode",
  hiVizLight: "Hi-viz light mode",
  hiVizDark: "Hi-viz dark mode",
};

/** Extract every oklch() literal from a value (single color or gradient). */
const extractColors = (value: string): Oklch[] => {
  const matches = value.match(/oklch\([^)]*\)/gi) ?? [];
  return matches
    .map((literal) => parseOklch(literal))
    .filter((color): color is Oklch => color !== null)
    // Translucent stops (card gradients etc.) are tints over other surfaces,
    // not text backgrounds; only opaque stops participate in contrast checks.
    .filter((color) => color.alpha === undefined || color.alpha === 1);
};

/**
 * Validate a sparse overrides object: every key must name a derivable token
 * for its scope and must never name a protected operational token.
 */
export const validateOverrideKeys = (
  overrides: Partial<Record<BrandThemeScope, Record<string, string>>>,
): BrandThemeIssue[] => {
  const issues: BrandThemeIssue[] = [];
  for (const [scope, tokens] of Object.entries(overrides) as [
    BrandThemeScope,
    Record<string, string>,
  ][]) {
    const allowed = new Set(TOKENS_BY_SCOPE[scope] ?? []);
    for (const token of Object.keys(tokens)) {
      if (isProtectedTokenName(token)) {
        issues.push({
          scope,
          token,
          kind: "protected-token",
          message: `"--${token}" is part of LOTTO's universal status colors and cannot be changed by branding.`,
        });
      } else if (!allowed.has(token)) {
        issues.push({
          scope,
          token,
          kind: "unknown-token",
          message: `"--${token}" is not a configurable brand token in ${SCOPE_LABELS[scope]}.`,
        });
      }
    }
  }
  return issues;
};

/**
 * Validate the final merged theme. Checks that the generator/overrides never
 * emit protected token names and that every contrast requirement holds in
 * every scope.
 */
export const validateBrandTheme = (theme: BrandThemeTokens): BrandThemeIssue[] => {
  const issues: BrandThemeIssue[] = [];

  for (const [scope, tokens] of Object.entries(theme) as [
    BrandThemeScope,
    Record<string, string>,
  ][]) {
    for (const token of Object.keys(tokens)) {
      if (isProtectedTokenName(token)) {
        issues.push({
          scope,
          token,
          kind: "protected-token",
          message: `Generator emitted protected token "--${token}" in ${SCOPE_LABELS[scope]}.`,
        });
      }
    }

    for (const requirement of CONTRAST_REQUIREMENTS) {
      const fillValue = tokens[requirement.fill];
      const textValue = tokens[requirement.text];
      if (!fillValue || !textValue) continue;

      const textColors = extractColors(textValue);
      const fillColors = extractColors(fillValue);
      if (textColors.length === 0 || fillColors.length === 0) {
        // var()/none/transparent indirections are not directly checkable here;
        // their referents are covered by their own requirements.
        continue;
      }

      for (const fillColor of fillColors) {
        for (const textColor of textColors) {
          const ratio = contrastRatio(fillColor, textColor);
          if (ratio < requirement.minimum) {
            issues.push({
              scope,
              token: requirement.text,
              kind: "contrast",
              message: `In ${SCOPE_LABELS[scope]}, text on ${requirement.surface} measures ${ratio.toFixed(2)}:1 but needs at least ${requirement.minimum}:1. Try a lighter or darker color for --${requirement.text} or --${requirement.fill}.`,
            });
          }
        }
      }
    }
  }

  return issues;
};
