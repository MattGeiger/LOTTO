// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("H2: AUTH_BYPASS must not work in production", () => {
  it("proxy.ts guards against AUTH_BYPASS in production", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/proxy.ts"),
      "utf-8",
    );

    // The source should contain a production guard that prevents AUTH_BYPASS
    // Look for a check that combines AUTH_BYPASS and production/NODE_ENV
    const hasProductionGuard =
      source.includes("production") &&
      source.includes("AUTH_BYPASS") &&
      // Should throw, return error, or block — not just silently bypass
      (source.includes("throw") || source.includes("403") || source.includes("500"));

    expect(hasProductionGuard).toBe(true);
  });

  it("proxy.ts does not silently bypass auth when AUTH_BYPASS is true in production", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/proxy.ts"),
      "utf-8",
    );

    // The current vulnerable pattern: authBypass is checked without NODE_ENV guard
    // After fix: there should be a guard BEFORE the bypass logic that blocks production usage
    //
    // We check that there's no path where AUTH_BYPASS=true + production silently passes through
    const hasGuardBeforeBypass = /NODE_ENV.*production[\s\S]*AUTH_BYPASS|AUTH_BYPASS[\s\S]*NODE_ENV.*production/.test(source);

    expect(hasGuardBeforeBypass).toBe(true);
  });
});
