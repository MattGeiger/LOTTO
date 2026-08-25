// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import type { BrandConfig } from "@/lib/brand-theme/config-schema";
import { oklchToSrgb, type Oklch } from "@/lib/brand-theme/color";
import { BRAND_TEMPLATES } from "@/lib/brand-theme/presets";
import type { ResolvedBrand } from "@/lib/brand-config/types";

export type AuthEmailBrand = {
  organizationName: string;
  appName: string;
  tagline: string;
  publicAppUrl: string;
  logoUrl: string;
  logoPresentation: ResolvedBrand["logo"]["presentation"];
  logoSurface: string;
  senderName: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  tint: string;
  ink: string;
};
const toHex = (color: Oklch): string =>
  `#${oklchToSrgb(color)
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const relativeLuminance = (hex: string): number => {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

const contrastRatio = (left: string, right: string): number => {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const tint = (color: Oklch): Oklch => ({
  l: color.l + (1 - color.l) * 0.88,
  c: color.c * 0.12,
  h: color.h,
});

const profileColors = (brand: ResolvedBrand): BrandConfig["colors"] => {
  if (brand.brandId in BRAND_TEMPLATES) {
    return BRAND_TEMPLATES[brand.brandId as keyof typeof BRAND_TEMPLATES].colors;
  }
  return BRAND_TEMPLATES["william-temple-house"].colors;
};

/**
 * Convert the app's runtime identity into the deliberately small, email-safe
 * contract. Email clients cannot read CSS variables and do not reliably
 * support OKLCH, so colors are resolved to hex before rendering.
 */
export const createAuthEmailBrand = (
  brand: ResolvedBrand,
  activeConfig: BrandConfig | null = null,
): AuthEmailBrand => {
  const colors = activeConfig?.colors ?? profileColors(brand);
  const primary = toHex(colors.primary);
  const white = "#FFFFFF";
  const dark = "#17212B";
  const senderName = brand.appName.replace(/[<>"\r\n]/g, "").trim() || brand.organizationName;

  return {
    organizationName: brand.organizationName,
    appName: brand.appName,
    tagline: brand.tagline,
    publicAppUrl: brand.publicAppUrl,
    logoUrl: new URL(brand.logo.lightSrc, brand.publicAppUrl).toString(),
    logoPresentation: brand.logo.presentation,
    logoSurface: toHex(colors.surfaceDark),
    senderName,
    primary,
    primaryForeground:
      contrastRatio(primary, white) >= contrastRatio(primary, dark) ? white : dark,
    accent: toHex(colors.accent ?? colors.primary),
    tint: toHex(tint(colors.primary)),
    ink: toHex(colors.surfaceDark),
  };
};
