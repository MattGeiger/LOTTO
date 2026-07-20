// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// The derivable brand token vocabulary.
//
// This is the complete set of CSS custom properties a brand configuration may
// produce, mirroring the coverage of the hand-authored St. Johns identity
// layers (`src/app/styles/brands/st-johns-food-share*.css`). LOTTO's protected
// operational status families (`--status-*`, `--gradient-status-*`,
// `--ticket-unclaimed-text`, `--ticket-returned-text`, `--operational-*`) are
// deliberately absent: they are not derivable, not overridable, and never
// emitted by the generator (see AGENTS.md White-label Color Guardrails).

/** Tokens present in the standard light and dark identity layers. */
export const STANDARD_BRAND_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "input",
  "ring",
  "base-shadow-color",
  "brand-logo-surface",
  "card-gradient",
  "ticket-serving",
  "ticket-serving-border",
  "ticket-serving-text",
  "ticket-served",
  "ticket-served-border",
  "ticket-served-text",
  "ticket-upcoming",
  "ticket-upcoming-border",
  "serving-text-gradient",
  "serving-label-color",
  "gradient-display-bg",
  "gradient-card-info",
  "gradient-card-accent",
  "gradient-card-blue",
  "gradient-card-emerald",
  "card-title-color",
  "card-icon-color",
  "icon-blue",
  "icon-emerald",
] as const;

/** Tokens present in the Hi-viz identity layers (adds sidebar refinements). */
export const HI_VIZ_BRAND_TOKENS = [
  ...STANDARD_BRAND_TOKENS,
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

export type StandardBrandToken = (typeof STANDARD_BRAND_TOKENS)[number];
export type HiVizBrandToken = (typeof HI_VIZ_BRAND_TOKENS)[number];

/**
 * A resolved token map for one theme scope. Values are complete CSS values:
 * a single `oklch()` literal, a gradient whose color stops are `oklch()`
 * literals, `var(--...)` references to other derivable tokens, `none`, or
 * `transparent`.
 */
export type TokenMap<TokenName extends string = string> = Record<
  TokenName,
  string
>;

/** The four theme scopes every brand theme must fully populate. */
export type BrandThemeTokens = {
  light: TokenMap<StandardBrandToken>;
  dark: TokenMap<StandardBrandToken>;
  hiVizLight: TokenMap<HiVizBrandToken>;
  hiVizDark: TokenMap<HiVizBrandToken>;
};

export type BrandThemeScope = keyof BrandThemeTokens;

export const BRAND_THEME_SCOPES = [
  "light",
  "dark",
  "hiVizLight",
  "hiVizDark",
] as const satisfies readonly BrandThemeScope[];

/** Token names allowed per scope, for override-allowlist validation. */
export const TOKENS_BY_SCOPE: Record<BrandThemeScope, readonly string[]> = {
  light: STANDARD_BRAND_TOKENS,
  dark: STANDARD_BRAND_TOKENS,
  hiVizLight: HI_VIZ_BRAND_TOKENS,
  hiVizDark: HI_VIZ_BRAND_TOKENS,
};

/**
 * Protected token-name prefixes/names that must never appear in generator
 * output or overrides. Mirrors the regression patterns in
 * `tests/brand-config.test.ts` and the AGENTS.md guardrail.
 */
export const PROTECTED_TOKEN_PATTERNS: readonly RegExp[] = [
  /^status-(?:success|warning|danger|neutral)-/,
  /^gradient-status-(?:success|warning|danger)$/,
  /^ticket-(?:unclaimed|returned)-text$/,
  /^operational-/,
  /^success(?:-foreground)?$/,
  /^destructive(?:-foreground)?$/,
];

export const isProtectedTokenName = (name: string): boolean =>
  PROTECTED_TOKEN_PATTERNS.some((pattern) => pattern.test(name));
