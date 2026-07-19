// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicInventoryPage } from "@/components/public-inventory-page";
import { brandProfile, inventoryIntegration } from "@/config/brand";

export const metadata: Metadata = {
  title: "What's in Stock",
  description: brandProfile.metadata.inventoryDescription,
};

export default function InventoryPage() {
  if (!inventoryIntegration.enabled) notFound();
  return <PublicInventoryPage />;
}
