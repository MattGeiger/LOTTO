// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { MetadataRoute } from "next";
import { brandProfile } from "@/config/brand";

// Web App Manifest — identity and install assets come from the deployment's
// selected brand profile. See docs/WHITE_LABEL_BRANDING_PLAN.md.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brandProfile.appName,
    // short_name is what iOS/Android prefer for the launcher label.
    short_name: brandProfile.shortName,
    description: brandProfile.metadata.description,
    start_url: "/",
    display: "standalone",
    background_color: brandProfile.pwa.backgroundColor,
    theme_color: brandProfile.pwa.themeColor,
    icons: brandProfile.pwa.manifestIcons,
  };
}
