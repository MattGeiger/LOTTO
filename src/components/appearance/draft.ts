// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Pure helpers for the Appearance wizard. The wizard edits a `BrandConfig`
// payload directly (the same zod-validated shape the API persists), so
// client-side preview/validation and the server share one contract.

import type { BrandConfig } from "@/lib/brand-theme/config-schema";
import { BRAND_CONFIG_SCHEMA_VERSION } from "@/lib/brand-theme/config-schema";
import { deriveBrandTheme } from "@/lib/brand-theme/derive";
import { mergeBrandTheme } from "@/lib/brand-theme/serialize";
import type { BrandThemeTokens } from "@/lib/brand-theme/tokens";
import {
  validateBrandTheme,
  type BrandThemeIssue,
} from "@/lib/brand-theme/validate";

export type AppearanceDraft = {
  /** Configuration id (slug); doubles as the saved row id. */
  id: string;
  config: BrandConfig;
};

/** Derive the live theme for previews and inline validation. */
export const draftTheme = (config: BrandConfig): BrandThemeTokens =>
  mergeBrandTheme(
    deriveBrandTheme({
      primary: config.colors.primary,
      surfaceLight: config.colors.surfaceLight,
      surfaceDark: config.colors.surfaceDark,
      textLight: config.colors.textLight,
      accent: config.colors.accent,
      serving: config.colors.serving,
      ambient: config.colors.ambient,
      logoPresentation: config.logo.presentation,
    }),
    config.overrides,
  );

export const draftThemeIssues = (config: BrandConfig): BrandThemeIssue[] =>
  validateBrandTheme(draftTheme(config));

/** Generated description defaults, offered whenever the org name changes. */
export const generatedDescriptions = (organizationName: string) => ({
  description: `See your place in line and play a few retro games while you wait at ${organizationName}.`,
  displayDescription: `The live ticket board showing who's being served at ${organizationName}.`,
  inventoryDescription: `See what's available today at ${organizationName}.`,
  adminDescription: `Operator controls for the ${organizationName} queue and display.`,
});

export const slugifyConfigId = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

/**
 * Neutral "start from scratch" configuration: WTH-shaped slate/neutral colors
 * with tasteful placeholder graphics, ready for the operator to replace.
 */
export const scratchConfig = (): BrandConfig => ({
  schemaVersion: BRAND_CONFIG_SCHEMA_VERSION,
  identity: {
    organizationName: "Your Organization",
    appName: "Your Organization Queue",
    shortName: "Your Org Queue",
    tagline: "Line Order Transparency & Ticketing Organizer",
    ...generatedDescriptions("Your Organization"),
  },
  links: {
    organizationWebsite: "https://example.org/",
    publicAppUrl: "https://example.org/",
  },
  logo: {
    lightSrc: "/brands/custom-placeholder/logo-light.svg",
    darkSrc: "/brands/custom-placeholder/logo-dark.svg",
    width: 600,
    height: 160,
    darkWidth: 600,
    darkHeight: 160,
    presentation: "transparent",
  },
  pwa: {
    backgroundColor: "#ffffff",
    themeColor: "#475569",
    browserIcons: [
      { src: "/brands/custom-placeholder/icon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/brands/custom-placeholder/icon-64.png", sizes: "64x64", type: "image/png" },
    ],
    appleIcons: [
      { src: "/brands/custom-placeholder/icon-256.png", sizes: "256x256", type: "image/png" },
    ],
    manifestIcons: [32, 64, 128, 256, 512].map((size) => ({
      src: `/brands/custom-placeholder/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any" as const,
    })),
  },
  colors: {
    // Neutral slate primary on white/charcoal — deliberately quiet so the
    // operator's own colors are the first personalization step.
    primary: { l: 0.45, c: 0.04, h: 257 },
    surfaceLight: { l: 1, c: 0, h: 0 },
    surfaceDark: { l: 0.2, c: 0.01, h: 257 },
  },
  staff: {
    signInTitle: "Sign in to Your Organization",
    emailGuidance: "Staff access only — use your authorized work email.",
    emailPlaceholder: "you@your-agency.org",
  },
  capabilities: {
    inventory: { enabled: false, feedUrl: null },
  },
  overrides: { light: {}, dark: {}, hiVizLight: {}, hiVizDark: {} },
});

/** Deep-merge helper for step edits (single level of nesting per call). */
export const patchConfig = <Section extends keyof BrandConfig>(
  config: BrandConfig,
  section: Section,
  updates: Partial<BrandConfig[Section]>,
): BrandConfig => ({
  ...config,
  [section]: { ...(config[section] as object), ...updates } as BrandConfig[Section],
});
