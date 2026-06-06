// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { Metadata } from "next";

import { PublicInventoryPage } from "@/components/public-inventory-page";

export const metadata: Metadata = {
  title: "What's in Stock",
  description: "See what's available today at the William Temple House food pantry.",
};

export default function InventoryPage() {
  return <PublicInventoryPage />;
}
