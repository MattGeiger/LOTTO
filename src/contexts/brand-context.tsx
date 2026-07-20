// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

// Client access to the server-resolved runtime brand. The root layout
// resolves identity (saved configuration or compiled profile) and passes the
// serializable result here; client components read it with `useBrand()`.
// The default value is the compiled profile so isolated component tests and
// legacy render paths keep working without a provider.

import { createContext, useContext, type ReactNode } from "react";

import {
  resolvedBrandFromProfile,
  type ResolvedBrand,
} from "@/lib/brand-config/types";

const BrandContext = createContext<ResolvedBrand | null>(null);

export function BrandProvider({
  brand,
  children,
}: {
  brand: ResolvedBrand;
  children: ReactNode;
}) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand(): ResolvedBrand {
  return useContext(BrandContext) ?? resolvedBrandFromProfile();
}
