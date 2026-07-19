// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

export const DEFAULT_BRAND_PROFILE_ID = "william-temple-house" as const;

export type BrandProfileId =
  | typeof DEFAULT_BRAND_PROFILE_ID
  | "st-johns-food-share";

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
      lightSrc: "/wth-logo-horizontal.png",
      darkSrc: "/wth-logo-horizontal-reverse.png",
      width: 2314,
      height: 606,
      darkWidth: 2333,
      darkHeight: 641,
      presentation: "transparent",
    },
    pwa: {
      backgroundColor: "#ffffff",
      themeColor: "#2762a2",
      browserIcons: [
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
  "st-johns-food-share": {
    id: "st-johns-food-share",
    organizationName: "St. Johns Food Share",
    appName: "St. Johns Food Share Queue",
    shortName: "Food Share Queue",
    tagline: "Bridging the food gap since 1988",
    organizationWebsite: "https://stjohnsfoodshare.org/",
    publicAppUrl: "https://stjohnsfoodshare.app",
    metadata: {
      description:
        "See your place in line and play a few retro games while you wait at St. Johns Food Share.",
      displayDescription:
        "The live ticket board showing who's being served at St. Johns Food Share.",
      inventoryDescription:
        "See what's available today at St. Johns Food Share.",
      adminDescription:
        "Operator controls for the St. Johns Food Share queue and display.",
    },
    logo: {
      lightSrc: "/brands/st-johns-food-share/logo.png",
      darkSrc: "/brands/st-johns-food-share/logo_darkmode_outline.png",
      width: 800,
      height: 349,
      darkWidth: 3142,
      darkHeight: 1340,
      presentation: "dark-surface",
    },
    pwa: {
      backgroundColor: "#2d2d2d",
      themeColor: "#33a478",
      browserIcons: [
        {
          src: "/brands/st-johns-food-share/Icon_32.png",
          sizes: "32x32",
          type: "image/png",
        },
        {
          src: "/brands/st-johns-food-share/Icon_64.png",
          sizes: "64x64",
          type: "image/png",
        },
      ],
      appleIcons: [
        {
          src: "/brands/st-johns-food-share/Icon_256.png",
          sizes: "256x256",
          type: "image/png",
        },
      ],
      manifestIcons: [
        {
          src: "/brands/st-johns-food-share/Icon_32.png",
          sizes: "32x32",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/brands/st-johns-food-share/Icon_64.png",
          sizes: "64x64",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/brands/st-johns-food-share/Icon_128.png",
          sizes: "128x128",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/brands/st-johns-food-share/Icon_256.png",
          sizes: "256x256",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/brands/st-johns-food-share/Icon_512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
      ],
    },
    staff: {
      signInTitle: "Sign in to St. Johns Food Share",
      emailGuidance: "Staff access only — use your authorized work email.",
      emailPlaceholder: "you@your-agency.org",
    },
    brandingNotice:
      "St. Johns Food Share branding remains the property of St. Johns Food Share and is not included in LOTTO's open-source license.",
    integrations: {
      inventory: {
        defaultUrl: null,
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

export function getBrandProfile(profileId?: string | null): BrandProfile {
  const resolvedId = profileId?.trim() || DEFAULT_BRAND_PROFILE_ID;
  if (!(resolvedId in BRAND_PROFILES)) {
    throw new Error(
      `Unknown NEXT_PUBLIC_LOTTO_BRAND "${resolvedId}". Expected one of: ${Object.keys(BRAND_PROFILES).join(", ")}.`,
    );
  }
  const profile = BRAND_PROFILES[resolvedId as BrandProfileId];
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
  profile: BrandProfile = getBrandProfile(process.env.NEXT_PUBLIC_LOTTO_BRAND),
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

export const brandProfile = getBrandProfile(process.env.NEXT_PUBLIC_LOTTO_BRAND);
export const inventoryIntegration = getInventoryIntegration(brandProfile);
