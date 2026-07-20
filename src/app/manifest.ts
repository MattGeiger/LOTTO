// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { MetadataRoute } from "next";
import { getResolvedBrand } from "@/lib/brand-config/resolve";

// Web App Manifest — identity and install assets come from the resolved
// runtime brand (saved configuration or compiled deployment profile). See
// docs/WHITE_LABEL_BRANDING_PLAN.md and docs/CONFIGURABLE_BRANDING_PLAN.md.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await getResolvedBrand();
  return {
    name: brand.appName,
    // short_name is what iOS/Android prefer for the launcher label.
    short_name: brand.shortName,
    description: brand.metadata.description,
    start_url: "/",
    display: "standalone",
    background_color: brand.pwa.backgroundColor,
    theme_color: brand.pwa.themeColor,
    icons: brand.pwa.manifestIcons,
  };
}
