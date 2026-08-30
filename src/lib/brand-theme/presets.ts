// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Template brand configuration generated from the compiled WTH profile.
//
// These are the wizard's read-only "start from a template" sources and the
// seeded rows in brand_configurations. Generating them from
// `src/config/brand.ts` keeps templates aligned with the code-owned source of
// truth; only the compact color inputs are stated here, because the compiled
// profiles carry colors as authored CSS rather than structured inputs.
//
// The compiled WTH CSS remains the hand-tuned production default. This
// template starts the configurable workflow from the same Tailwind v4 role
// choices while continuing through LOTTO's product-specific derivation engine.

import { BRAND_PROFILES, type BrandProfile } from "@/config/brand";
import type { BrandConfig } from "./config-schema";
import { BRAND_CONFIG_SCHEMA_VERSION } from "./config-schema";
import { paletteColor } from "./palette";

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

/**
 * William Temple House: FEED's built-in Tailwind v4 story adapted to LOTTO's
 * fixed roles. Queue status colors remain protected and derive separately.
 */
export const WTH_TEMPLATE: BrandConfig = fromProfile(
  BRAND_PROFILES["william-temple-house"],
  {
    primary: paletteColor("sky-700"),
    surfaceLight: paletteColor("slate-50"),
    surfaceDark: paletteColor("slate-900"),
    textLight: paletteColor("zinc-900"),
    accent: paletteColor("teal-100"),
    serving: { l: 0.62, c: 0.21, h: 255 },
    ambient: [paletteColor("yellow-300")],
    system: "tailwind-v4",
    paletteRoles: {
      primary: "sky-700",
      accent: "teal-100",
      ambient: "yellow-300",
      surfaceDark: "slate-900",
      surfaceLight: "slate-50",
    },
  },
);

export const BRAND_TEMPLATES = {
  "william-temple-house": WTH_TEMPLATE,
} as const;
