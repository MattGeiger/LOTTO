// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { MetadataRoute } from "next";

// Web App Manifest — drives Android "Add to Home Screen" / installable PWA so the
// home-screen icon is the WTH emblem (layered faces + sun) on white rather than a
// generic glyph. iOS uses src/app/apple-icon.png instead (Next auto-links it).
// Colors sampled from the brand logo: navy #2762a2, white surface. See
// docs/ISSUES.md (Issue 26) and public/icons/.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "William Temple House App",
    short_name: "Temple House",
    description:
      "See your place in line, check what's in stock, and play a few retro games while you wait at William Temple House.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2762a2",
    icons: [
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
  };
}
