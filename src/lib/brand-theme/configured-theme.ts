// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import type { BrandConfig } from "./config-schema";
import { deriveBrandTheme } from "./derive";
import { mergeBrandTheme } from "./serialize";
import type { BrandThemeTokens } from "./tokens";
import { nearestPaletteEntry, paletteColor } from "./palette";

const themeInputs = (config: BrandConfig) => {
  const { colors } = config;
  if (colors.system !== "tailwind-v4" || !colors.paletteRoles) {
    return {
      primary: colors.primary,
      surfaceLight: colors.surfaceLight,
      surfaceDark: colors.surfaceDark,
      textLight: colors.textLight,
      accent: colors.accent,
      serving: colors.serving,
      ambient: colors.ambient,
      logoPresentation: config.logo.presentation,
    };
  }

  const roles = colors.paletteRoles;
  return {
    primary: paletteColor(roles.primary),
    surfaceLight: roles.surfaceLight
      ? paletteColor(roles.surfaceLight)
      : colors.surfaceLight,
    surfaceDark: roles.surfaceDark
      ? paletteColor(roles.surfaceDark)
      : colors.surfaceDark,
    textLight: colors.textLight,
    accent: roles.accent ? paletteColor(roles.accent) : undefined,
    serving: colors.serving,
    ambient: roles.ambient ? [paletteColor(roles.ambient)] : undefined,
    logoPresentation: config.logo.presentation,
  };
};

/** One shared derivation path for client preview, API validation, and runtime CSS. */
export const deriveConfiguredBrandTheme = (config: BrandConfig): BrandThemeTokens =>
  mergeBrandTheme(deriveBrandTheme(themeInputs(config)), config.overrides);

/**
 * Convert a legacy free-form color story to stable Tailwind role names.
 * This is explicit: merely parsing or rendering a schema-v1 configuration
 * never changes its colors.
 */
export const adoptTailwindColorSystem = (config: BrandConfig): BrandConfig => {
  if (config.colors.system === "tailwind-v4" && config.colors.paletteRoles) return config;
  const primary = nearestPaletteEntry(config.colors.primary, "chromatic");
  const accent = config.colors.accent
    ? nearestPaletteEntry(config.colors.accent, "chromatic")
    : undefined;
  const ambient = config.colors.ambient?.[0]
    ? nearestPaletteEntry(config.colors.ambient[0], "chromatic")
    : undefined;
  const surfaceDark = nearestPaletteEntry(config.colors.surfaceDark, "neutral");
  const surfaceLight = nearestPaletteEntry(config.colors.surfaceLight, "neutral");

  return {
    ...config,
    colors: {
      ...config.colors,
      system: "tailwind-v4",
      paletteRoles: {
        primary: primary.name,
        ...(accent ? { accent: accent.name } : {}),
        ...(ambient ? { ambient: ambient.name } : {}),
        surfaceDark: surfaceDark.name,
        surfaceLight: surfaceLight.name,
      },
      primary: paletteColor(primary.name),
      accent: accent ? paletteColor(accent.name) : undefined,
      ambient: ambient ? [paletteColor(ambient.name)] : undefined,
      surfaceDark: paletteColor(surfaceDark.name),
      surfaceLight: paletteColor(surfaceLight.name),
    },
  };
};
