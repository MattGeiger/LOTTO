// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

// Lightweight boolean context for "is the viewer a signed-in staff member."
// Deliberately free of any NextAuth import so consumers (e.g. the bottom nav)
// stay cheap to load and test in isolation; the value is supplied at runtime by
// `AuthSessionProvider`, and defaults to `false` (the public experience) when no
// provider is present.
export const StaffAuthContext = React.createContext(false);

export function useStaffAuthenticated(): boolean {
  return React.useContext(StaffAuthContext);
}
