// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import Link from "next/link";

import { AboutDialog } from "@/components/about-dialog";
import { ReleaseNotesDialog } from "@/components/release-notes-dialog";

type StaffLinksFooterProps = {
  version: string;
  releaseNotes: string;
};

/** Version (→ release notes), About, and Help links shown beneath the login. */
export function StaffLinksFooter({ version, releaseNotes }: StaffLinksFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <ReleaseNotesDialog version={version} content={releaseNotes} />
      <AboutDialog version={version} />
      <Link href="/help" className="font-semibold text-foreground underline-offset-4 hover:underline">
        Help
      </Link>
    </div>
  );
}
