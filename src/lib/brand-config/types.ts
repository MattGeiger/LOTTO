// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Client-safe types and helpers for the resolved runtime brand.
//
// `ResolvedBrand` is the one shape every brand consumer reads, regardless of
// whether identity came from a saved configuration (database) or a compiled
// profile (src/config/brand.ts). It is fully serializable so the server
// layout can hand it to the client BrandProvider.

import {
  getBrandProfile,
  getInventoryIntegration,
  type BrandProfile,
} from "@/config/brand";
import type { BrandConfig } from "@/lib/brand-theme/config-schema";

/** data-brand attribute value used by runtime-configured brands. */
export const CUSTOM_BRAND_ID = "custom";

export type ResolvedBrand = {
  /** Where this identity came from. */
  source: "profile" | "custom";
  /** Value for the <html data-brand> attribute and CSS scoping. */
  brandId: string;
  organizationName: string;
  appName: string;
  shortName: string;
  tagline: string;
  /**
   * Board heading above the service date; null → the translated default
   * ("Food Pantry Service For"). Configurable because LOTTO is queue
   * management generally, not only food pantries.
   */
  serviceLabel: string | null;
  organizationWebsite: string;
  publicAppUrl: string;
  metadata: BrandProfile["metadata"];
  logo: BrandProfile["logo"];
  pwa: BrandProfile["pwa"];
  staff: BrandProfile["staff"];
  brandingNotice: string;
  inventory: {
    enabled: boolean;
    url: string | null;
  };
};

/** Resolve a compiled profile into the runtime shape (client-safe). */
export const resolvedBrandFromProfile = (
  profile: BrandProfile = getBrandProfile(process.env.NEXT_PUBLIC_LOTTO_BRAND),
): ResolvedBrand => {
  const inventory = getInventoryIntegration(profile);
  return {
    source: "profile",
    brandId: profile.id,
    organizationName: profile.organizationName,
    appName: profile.appName,
    shortName: profile.shortName,
    tagline: profile.tagline,
    serviceLabel: null,
    organizationWebsite: profile.organizationWebsite,
    publicAppUrl: profile.publicAppUrl,
    metadata: profile.metadata,
    logo: profile.logo,
    pwa: profile.pwa,
    staff: profile.staff,
    brandingNotice: profile.brandingNotice,
    inventory: { enabled: inventory.enabled, url: inventory.url },
  };
};

/** Resolve a saved configuration into the runtime shape (client-safe, pure). */
export const resolvedBrandFromConfig = (config: BrandConfig): ResolvedBrand => ({
  source: "custom",
  brandId: CUSTOM_BRAND_ID,
  organizationName: config.identity.organizationName,
  appName: config.identity.appName,
  shortName: config.identity.shortName,
  tagline: config.identity.tagline,
  serviceLabel: config.identity.serviceLabel ?? null,
  organizationWebsite: config.links.organizationWebsite,
  publicAppUrl: config.links.publicAppUrl,
  metadata: {
    description: config.identity.description,
    displayDescription: config.identity.displayDescription,
    inventoryDescription: config.identity.inventoryDescription,
    adminDescription: config.identity.adminDescription,
  },
  logo: {
    lightSrc: config.logo.lightSrc,
    darkSrc: config.logo.darkSrc,
    width: config.logo.width,
    height: config.logo.height,
    darkWidth: config.logo.darkWidth,
    darkHeight: config.logo.darkHeight,
    presentation: config.logo.presentation,
  },
  pwa: {
    backgroundColor: config.pwa.backgroundColor,
    themeColor: config.pwa.themeColor,
    browserIcons: config.pwa.browserIcons,
    appleIcons: config.pwa.appleIcons,
    manifestIcons: config.pwa.manifestIcons.map((icon) => ({
      ...icon,
      sizes: icon.sizes ?? "",
      type: icon.type ?? "image/png",
    })),
  },
  staff: config.staff,
  brandingNotice:
    `${config.identity.organizationName} branding remains the property of ` +
    `${config.identity.organizationName} and is not included in LOTTO's open-source license.`,
  inventory: {
    enabled: config.capabilities.inventory.enabled,
    url: config.capabilities.inventory.enabled
      ? config.capabilities.inventory.feedUrl
      : null,
  },
});

/** Stored row shape shared by the file and database stores. */
export type BrandConfigurationRow = {
  id: string;
  payload: unknown;
  isActive: boolean;
  isTemplate: boolean;
  updatedAt: string;
};
