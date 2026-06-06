// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { SessionProvider, useSession } from "next-auth/react";

import { StaffAuthContext } from "@/components/staff-auth-context";

function StaffAuthBridge({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  return <StaffAuthContext.Provider value={status === "authenticated"}>{children}</StaffAuthContext.Provider>;
}

/**
 * Wraps the app in NextAuth's `SessionProvider` and bridges authenticated status
 * into `StaffAuthContext` (see `staff-auth-context.tsx`). The session is fetched
 * client-side, so server components stay statically renderable (no `auth()` in
 * the root layout). NextAuth is imported only here — not in the nav — so page
 * unit tests that render in isolation stay lightweight.
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <StaffAuthBridge>{children}</StaffAuthBridge>
    </SessionProvider>
  );
}
