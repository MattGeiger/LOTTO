// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  buildUserGuidesFromModules,
  getGuideSearchEntries,
  type GuideSearchEntry,
  type UserGuide,
} from "./user-guides";

// Load the help guides from `docs/user-guides/NN-*.md` at module evaluation.
// Because the help routes are statically generated (generateStaticParams), this
// filesystem read happens at build time — there is no runtime fs dependency.
// Replaces FEED's Vite `import.meta.glob(..., { query: "?raw" })` loader.
const GUIDES_DIR = join(process.cwd(), "docs/user-guides");

function loadGuideModules(): Record<string, string> {
  let filenames: string[];
  try {
    filenames = readdirSync(GUIDES_DIR);
  } catch {
    return {};
  }

  return Object.fromEntries(
    filenames
      .filter((filename) => /^\d{2}-.+\.md$/.test(filename))
      .map((filename) => {
        const fullPath = join(GUIDES_DIR, filename);
        return [fullPath, readFileSync(fullPath, "utf8")] as const;
      }),
  );
}

const GUIDE_MODULES = loadGuideModules();

export function getAllUserGuides(): UserGuide[] {
  return buildUserGuidesFromModules(GUIDE_MODULES);
}

export function getUserGuideSlugs(): string[] {
  return getAllUserGuides().map((guide) => guide.slug);
}

export function getUserGuideBySlug(slug: string): UserGuide | null {
  return getAllUserGuides().find((guide) => guide.slug === slug) ?? null;
}

export function getHelpSearchIndex(): GuideSearchEntry[] {
  return getAllUserGuides().flatMap((guide) => getGuideSearchEntries(guide));
}
