// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Template brand configurations generated from the compiled profiles.
//
// These are the wizard's read-only "start from a template" sources and the
// seeded rows in brand_configurations. Generating them from
// `src/config/brand.ts` keeps templates aligned with the code-owned source of
// truth; only the compact color inputs are stated here, because the compiled
// profiles carry colors as authored CSS rather than structured inputs.
//
// St. Johns' inputs reproduce its hand-authored identity nearly exactly (the
// derivation rules were reverse-engineered from it). WTH's inputs produce an
// on-brand *derived* approximation of its richer hand-tuned theme; the
// compiled WTH CSS remains the production default and is not replaced by this
// template (docs/CONFIGURABLE_BRANDING_PLAN.md).

import { BRAND_PROFILES, type BrandProfile } from "@/config/brand";
import type { BrandConfig } from "./config-schema";
import { BRAND_CONFIG_SCHEMA_VERSION } from "./config-schema";

const fromProfile = (
  profile: BrandProfile,
  colors: BrandConfig["colors"],
): BrandConfig => ({
  schemaVersion: BRAND_CONFIG_SCHEMA_VERSION,
  identity: {
    organizationName: profile.organizationName,
    appName: profile.appName,
    shortName: profile.shortName,
    tagline: profile.tagline,
    description: profile.metadata.description,
    displayDescription: profile.metadata.displayDescription,
    inventoryDescription: profile.metadata.inventoryDescription,
    adminDescription: profile.metadata.adminDescription,
  },
  links: {
    organizationWebsite: profile.organizationWebsite,
    publicAppUrl: profile.publicAppUrl,
  },
  logo: {
    lightSrc: profile.logo.lightSrc,
    darkSrc: profile.logo.darkSrc,
    width: profile.logo.width,
    height: profile.logo.height,
    darkWidth: profile.logo.darkWidth,
    darkHeight: profile.logo.darkHeight,
    presentation: profile.logo.presentation,
  },
  pwa: {
    backgroundColor: profile.pwa.backgroundColor,
    themeColor: profile.pwa.themeColor,
    browserIcons: profile.pwa.browserIcons.map((icon) => ({ ...icon })),
    appleIcons: profile.pwa.appleIcons.map((icon) => ({ ...icon })),
    manifestIcons: profile.pwa.manifestIcons.map((icon) => ({ ...icon })),
  },
  colors,
  staff: {
    signInTitle: profile.staff.signInTitle,
    emailGuidance: profile.staff.emailGuidance,
    emailPlaceholder: profile.staff.emailPlaceholder,
  },
  capabilities: {
    inventory: {
      enabled: profile.integrations.inventory.defaultUrl !== null,
      feedUrl: profile.integrations.inventory.defaultUrl,
    },
  },
  overrides: { light: {}, dark: {}, hiVizLight: {}, hiVizDark: {} },
});

/** St. Johns Food Share: the compact-system reference (teal/off-white/charcoal). */
export const ST_JOHNS_TEMPLATE: BrandConfig = fromProfile(
  BRAND_PROFILES["st-johns-food-share"],
  {
    primary: { l: 0.644157, c: 0.121025, h: 163.057 },
    surfaceLight: { l: 0.976139, c: 0, h: 0 },
    surfaceDark: { l: 0.297163, c: 0, h: 0 },
    accent: { l: 0.552135, c: 0.105614, h: 162.098 },
    serving: { l: 0.615866, c: 0.113552, h: 163.742 },
  },
);

/**
 * William Temple House: a four-color story (docs/COLOR_SEMIOTICS.md) — blue
 * (state + identity, also the light-mode body text), gold (accent), and the
 * logo's two teals as ambient hues feeding card tints only.
 */
export const WTH_TEMPLATE: BrandConfig = fromProfile(
  BRAND_PROFILES["william-temple-house"],
  {
    primary: { l: 0.5078, c: 0.1369, h: 257.6669 },
    surfaceLight: { l: 1, c: 0, h: 0 },
    surfaceDark: { l: 0.147, c: 0.004, h: 49.25 },
    textLight: { l: 0.5078, c: 0.1369, h: 257.6669 },
    accent: { l: 0.8828, c: 0.1811, h: 94.4604 },
    serving: { l: 0.62, c: 0.21, h: 255 },
    ambient: [
      { l: 0.58, c: 0.16, h: 165 },
      { l: 0.62, c: 0.1, h: 195 },
    ],
  },
);

export const BRAND_TEMPLATES = {
  "william-temple-house": WTH_TEMPLATE,
  "st-johns-food-share": ST_JOHNS_TEMPLATE,
} as const;
