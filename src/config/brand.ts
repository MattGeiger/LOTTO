// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

export const DEFAULT_BRAND_PROFILE_ID = "william-temple-house" as const;

export type BrandProfileId = typeof DEFAULT_BRAND_PROFILE_ID;

export type BrandLogoPresentation = "transparent" | "dark-surface";

export type BrandManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose?: "any" | "maskable" | "monochrome";
};

export type BrandMetadataIcon = {
  src: string;
  sizes?: string;
  type?: string;
};

export type BrandProfile = {
  id: BrandProfileId;
  organizationName: string;
  appName: string;
  shortName: string;
  tagline: string;
  organizationWebsite: string;
  publicAppUrl: string;
  metadata: {
    description: string;
    displayDescription: string;
    inventoryDescription: string;
    adminDescription: string;
  };
  logo: {
    lightSrc: string;
    darkSrc: string;
    width: number;
    height: number;
    darkWidth: number;
    darkHeight: number;
    presentation: BrandLogoPresentation;
  };
  pwa: {
    backgroundColor: string;
    themeColor: string;
    browserIcons: BrandMetadataIcon[];
    appleIcons: BrandMetadataIcon[];
    manifestIcons: BrandManifestIcon[];
  };
  staff: {
    signInTitle: string;
    emailGuidance: string;
    emailPlaceholder: string;
  };
  brandingNotice: string;
  integrations: {
    inventory: {
      defaultUrl: string | null;
    };
  };
};

const WTH_FEED_PUBLIC_INVENTORY_URL =
  "https://feed.williamtemple.app/api/public/inventory.json";

export const BRAND_PROFILES: Record<BrandProfileId, BrandProfile> = {
  "william-temple-house": {
    id: "william-temple-house",
    organizationName: "William Temple House",
    appName: "William Temple House App",
    shortName: "William Temple House App",
    tagline: "Line Order Transparency & Ticketing Organizer",
    organizationWebsite: "https://williamtemple.org/",
    publicAppUrl: "https://williamtemple.app",
    metadata: {
      description:
        "See your place in line, check what's in stock, and play a few retro games while you wait at William Temple House.",
      displayDescription:
        "The live ticket board showing who's being served at William Temple House.",
      inventoryDescription:
        "See what's available today at the William Temple House food pantry.",
      adminDescription:
        "Operator controls for the William Temple House queue and display.",
    },
    logo: {
      lightSrc: "/brand/wth-logo-horizontal-light.svg",
      darkSrc: "/brand/wth-logo-horizontal-dark.svg",
      width: 800,
      height: 300,
      darkWidth: 800,
      darkHeight: 300,
      presentation: "transparent",
    },
    pwa: {
      backgroundColor: "#ffffff",
      themeColor: "#2762a2",
      browserIcons: [
        {
          src: "/brand/wth-app-mark.svg",
          sizes: "any",
          type: "image/svg+xml",
        },
        {
          src: "/brands/william-temple-house/favicon.ico",
          type: "image/x-icon",
        },
      ],
      appleIcons: [
        {
          src: "/brands/william-temple-house/apple-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
      manifestIcons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    staff: {
      signInTitle: "Sign in to William Temple House",
      emailGuidance: "Staff access only — use your @williamtemple.org email.",
      emailPlaceholder: "you@williamtemple.org",
    },
    brandingNotice:
      "William Temple House branding is not open source and may not be reused without separate permission.",
    integrations: {
      inventory: {
        defaultUrl: WTH_FEED_PUBLIC_INVENTORY_URL,
      },
    },
  },
};

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export function validateBrandProfile(profile: BrandProfile): string[] {
  const errors: string[] = [];
  if (!profile.organizationName.trim()) errors.push("organizationName is required");
  if (!profile.appName.trim()) errors.push("appName is required");
  if (!isHttpUrl(profile.organizationWebsite)) errors.push("organizationWebsite must be an HTTP URL");
  if (!isHttpUrl(profile.publicAppUrl)) errors.push("publicAppUrl must be an HTTP URL");
  if (!profile.logo.lightSrc.startsWith("/")) errors.push("logo.lightSrc must be root-relative");
  if (!profile.logo.darkSrc.startsWith("/")) errors.push("logo.darkSrc must be root-relative");
  if (profile.logo.width <= 0 || profile.logo.height <= 0) {
    errors.push("logo dimensions must be positive");
  }
  if (profile.logo.darkWidth <= 0 || profile.logo.darkHeight <= 0) {
    errors.push("dark logo dimensions must be positive");
  }
  const inventoryUrl = profile.integrations.inventory.defaultUrl;
  if (inventoryUrl !== null && !isHttpUrl(inventoryUrl)) {
    errors.push("integrations.inventory.defaultUrl must be null or an HTTP URL");
  }
  return errors;
}

export function getBrandProfile(): BrandProfile {
  const profile = BRAND_PROFILES[DEFAULT_BRAND_PROFILE_ID];
  const errors = validateBrandProfile(profile);
  if (errors.length > 0) {
    throw new Error(`Invalid brand profile "${profile.id}": ${errors.join("; ")}.`);
  }
  return profile;
}

export type InventoryIntegration = {
  enabled: boolean;
  url: string | null;
};

export function getInventoryIntegration(
  profile: BrandProfile = getBrandProfile(),
  configuredUrl: string | undefined = process.env.NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL,
): InventoryIntegration {
  const url = configuredUrl?.trim() || profile.integrations.inventory.defaultUrl;
  if (!url) return { enabled: false, url: null };
  if (!isHttpUrl(url)) {
    throw new Error(
      "NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL must be an absolute HTTP or HTTPS URL.",
    );
  }
  return { enabled: true, url };
}

export const brandProfile = getBrandProfile();
export const inventoryIntegration = getInventoryIntegration(brandProfile);
