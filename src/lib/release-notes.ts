// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Read the plain-language release notes (server-only). Used by the login pages. */
export function readReleaseNotes(): string {
  try {
    return readFileSync(join(process.cwd(), "docs/release-notes.md"), "utf8");
  } catch {
    return "Release notes are not available.";
  }
}
