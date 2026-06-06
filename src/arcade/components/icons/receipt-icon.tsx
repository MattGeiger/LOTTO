// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { ComponentPropsWithoutRef } from "react";

// Pixel-art receipt glyph (arcade nav: "Your ticket"). Geometry from
// src/arcade/lucid_icons/SVG/Flat/receipt.svg; fill set to currentColor so it
// inherits the arcade tab color.
export function ReceiptIcon(props: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <rect x="7" y="15" width="10" height="2" />
      <rect x="7" y="11" width="10" height="2" />
      <rect x="7" y="7" width="10" height="2" />
      <path d="m19,1v1h-1v1h-1v-1h-1v-1h-2v1h-1v1h-2v-1h-1v-1h-2v1h-1v1h-1v-1h-1v-1h-1v22h1v-1h1v-1h1v1h1v1h2v-1h1v-1h2v1h1v1h2v-1h1v-1h1v1h1v1h1V1h-1Zm-3,19v1h-2v-1h-1v-1h-2v1h-1v1h-2v-1h-1v-1h-1V5h1v-1h1v-1h2v1h1v1h2v-1h1v-1h2v1h1v1h1v14h-1v1h-1Z" />
    </svg>
  );
}
