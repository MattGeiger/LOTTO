// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const configPath = path.resolve(__dirname, "../next.config.ts");
const configSource = readFileSync(configPath, "utf-8");

describe("L5: production source maps must be explicitly disabled", () => {
  it("next.config explicitly sets productionBrowserSourceMaps to false", () => {
    expect(configSource).toContain("productionBrowserSourceMaps: false");
  });
});
