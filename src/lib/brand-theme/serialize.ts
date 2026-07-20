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

const serializeScope = (selector: string, tokens: TokenMap): string => {
  const declarations = Object.entries(tokens)
    .map(([token, value]) => `  --${token}: ${value};`)
    .join("\n");
  return `${selector} {\n${declarations}\n}`;
};

/**
 * Serialize a merged theme to CSS for the given runtime brand id
 * (conventionally "custom"). Output is OKLCH-only by construction: token
 * values originate from `formatOklch` or the schema-validated override values.
 */
export const serializeBrandThemeCss = (
  theme: BrandThemeTokens,
  brandId: string,
): string =>
  [
    `/* Runtime brand theme (generated). Do not hand-edit; regenerated from the saved brand configuration. */`,
    serializeScope(SCOPE_SELECTORS.light(brandId), theme.light),
    serializeScope(SCOPE_SELECTORS.dark(brandId), theme.dark),
    serializeScope(SCOPE_SELECTORS.hiVizLight(brandId), theme.hiVizLight),
    serializeScope(SCOPE_SELECTORS.hiVizDark(brandId), theme.hiVizDark),
  ].join("\n");
