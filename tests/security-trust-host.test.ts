// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("L4: trustHost must be conditional on Vercel environment", () => {
  const authPath = path.resolve(__dirname, "../src/lib/auth.ts");

  it("auth config does not hardcode trustHost: true", () => {
    const authSource = fs.readFileSync(authPath, "utf-8");

    // Should NOT contain unconditional `trustHost: true`
    const unconditionalPattern = /trustHost:\s*true\s*[,\n]/;
    expect(authSource).not.toMatch(unconditionalPattern);
  });

  it("auth config references VERCEL env for trustHost", () => {
    const authSource = fs.readFileSync(authPath, "utf-8");

    // Should contain a conditional trustHost using process.env.VERCEL
    expect(authSource).toContain("process.env.VERCEL");
  });
});
