// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { useLanguage } from "@/contexts/language-context";

export function ArcadeShell({
  fontClasses,
  children,
}: {
  fontClasses: string;
  children: React.ReactNode;
}) {
  const { language } = useLanguage();

  return (
    <div className={`${fontClasses} arcade-scope`} data-arcade-lang={language}>
      {children}
    </div>
  );
}
