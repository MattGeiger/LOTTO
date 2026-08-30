// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Merge and CSS serialization for brand themes.
//
// Serialization is a separate, final step over the token-map intermediate
// representation: overrides merge as data before any CSS text exists
// (docs/CONFIGURABLE_BRANDING_PLAN.md, "Forward compatibility: sparse
// overrides").

import type {
  BrandThemeScope,
  BrandThemeTokens,
  TokenMap,
} from "./tokens";
import { TOKENS_BY_SCOPE, isProtectedTokenName } from "./tokens";
import { oklchToSrgb, parseOklch } from "./color";

export type SparseOverrides = Partial<
  Record<BrandThemeScope, Record<string, string>>
>;

/**
 * Merge sparse overrides over a derived theme. Only keys that name derivable
 * tokens for their scope are applied; protected or unknown keys are ignored
 * here (they are *reported* by `validateOverrideKeys`, and saving is expected
 * to be blocked on those issues — this filter is defense in depth).
 */
export const mergeBrandTheme = (
  derived: BrandThemeTokens,
  overrides: SparseOverrides | undefined,
): BrandThemeTokens => {
  if (!overrides) return derived;
  const merged = {
    light: { ...derived.light },
    dark: { ...derived.dark },
    hiVizLight: { ...derived.hiVizLight },
    hiVizDark: { ...derived.hiVizDark },
  };
  for (const [scope, tokens] of Object.entries(overrides) as [
    BrandThemeScope,
    Record<string, string>,
  ][]) {
    if (!(scope in merged)) continue;
    const allowed = new Set(TOKENS_BY_SCOPE[scope]);
    for (const [token, value] of Object.entries(tokens)) {
      if (!allowed.has(token) || isProtectedTokenName(token)) continue;
      (merged[scope] as TokenMap)[token] = value;
    }
  }
  return merged;
};

/**
 * The custom-brand selector set. The doubled attribute selector raises
 * specificity one step above the compiled brand layers (e.g. St. Johns'
 * `:root.hi-viz[data-brand=…]`), guaranteeing the runtime theme wins
 * regardless of where Next.js places the inline <style> relative to compiled
 * stylesheet links. The cascade contract in docs/CSS_THEME_ARCHITECTURE.md
 * documents this layer as injected after all compiled brand layers.
 */
const SCOPE_SELECTORS: Record<BrandThemeScope, (brandId: string) => string> = {
  light: (id) => `:root[data-brand="${id}"][data-brand="${id}"]`,
  dark: (id) => `:root.dark[data-brand="${id}"][data-brand="${id}"]`,
  hiVizLight: (id) => `:root.hi-viz[data-brand="${id}"][data-brand="${id}"]`,
  hiVizDark: (id) =>
    `:root.dark.hi-viz[data-brand="${id}"][data-brand="${id}"]`,
};

/**
 * Every `oklch(...)` literal inside a token value. Token values are either a
 * bare colour or a gradient/shadow containing colours; the colour function
 * itself never nests parentheses, so this is sufficient.
 */
const OKLCH_LITERAL = /oklch\([^()]*\)/gi;

const hasOklch = (value: string): boolean => /oklch\(/i.test(value);

/** Convert one `oklch(...)` literal to its clamped sRGB equivalent. */
const toSrgbLiteral = (literal: string): string => {
  const parsed = parseOklch(literal);
  if (!parsed) return literal;
  const [red, green, blue] = oklchToSrgb(parsed);
  const channel = (value: number) => Math.round(value * 255);
  const { alpha } = parsed;
  const rgb = `${channel(red)}, ${channel(green)}, ${channel(blue)}`;
  return alpha !== undefined && alpha < 1
    ? `rgba(${rgb}, ${Number(alpha.toFixed(4))})`
    : `rgb(${rgb})`;
};

/**
 * Rewrite every colour in a token value to sRGB, preserving surrounding syntax.
 *
 * Exported because the stylesheet is not the only way a derived colour reaches
 * the page. A React `style` prop carries the token value straight to the
 * element, where there is no `@supports` to hide behind: iPadOS 15 parses
 * `oklch(0.129 0.042 264)` as invalid — that engine requires a percentage
 * lightness — and drops the declaration, leaving the element with no colour at
 * all. Any inline style fed from `deriveBrandTheme` or `formatOklch` must pass
 * through here first.
 */
export const toLegacyValue = (value: string): string =>
  value.replace(OKLCH_LITERAL, toSrgbLiteral);

const serializeScope = (
  selector: string,
  tokens: TokenMap,
  transform: (value: string) => string = (value) => value,
  filter: (value: string) => boolean = () => true,
): string | null => {
  const declarations = Object.entries(tokens)
    .filter(([, value]) => filter(value))
    .map(([token, value]) => `  --${token}: ${transform(value)};`)
    .join("\n");
  if (!declarations) return null;
  return `${selector} {\n${declarations}\n}`;
};

const SCOPE_ORDER: readonly BrandThemeScope[] = [
  "light",
  "dark",
  "hiVizLight",
  "hiVizDark",
];

/**
 * Serialize a merged theme to CSS for the given runtime brand id
 * (conventionally "custom").
 *
 * Emitted twice, deliberately. Hand-authored brand stylesheets are downleveled
 * by the build (Lightning CSS rewrites `oklch()` to sRGB for the browserslist
 * floor in docs/BROWSER_SUPPORT.md), but this CSS is generated per request and
 * injected inline, so it never passes through that pipeline. `oklch()` needs
 * Safari 16.4 and the declared floor is iPadOS 15, where every OKLCH value is
 * invalid — surfaces render transparent, borders fall back to `currentColor`,
 * and modals become unreadable.
 *
 * So the sRGB form is written first as the universally parseable baseline, and
 * the OKLCH form follows inside `@supports`, restoring wide-gamut colour on
 * engines that understand it. The two-declaration trick (`--x: rgb(...);
 * --x: oklch(...)`) does **not** work here: custom properties are not validated
 * at parse time, so both declarations are accepted and the later always wins,
 * with the invalidity only surfacing at `var()` substitution. `@supports` is
 * the only correct guard.
 */
export const serializeBrandThemeCss = (
  theme: BrandThemeTokens,
  brandId: string,
): string => {
  const legacy = SCOPE_ORDER.map((scope) =>
    serializeScope(SCOPE_SELECTORS[scope](brandId), theme[scope], toLegacyValue),
  ).filter((block): block is string => block !== null);

  const modern = SCOPE_ORDER.map((scope) =>
    serializeScope(
      SCOPE_SELECTORS[scope](brandId),
      theme[scope],
      (value) => value,
      hasOklch,
    ),
  ).filter((block): block is string => block !== null);

  const blocks = [
    `/* Runtime brand theme (generated). Do not hand-edit; regenerated from the saved brand configuration. */`,
    ...legacy,
  ];

  if (modern.length > 0) {
    blocks.push(
      `@supports (color: oklch(0 0 0)) {`,
      ...modern.map((block) =>
        block
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n"),
      ),
      `}`,
    );
  }

  return blocks.join("\n");
};
