// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Tests the recurrence guard (scripts/check-legacy-safe-bundles.mjs) that keeps
// regex syntax unsupported by iOS 15.x WebKit out of the production bundle.
// Covers (1) the detection rules against known-good/known-bad fixtures and
// (2) a scan of the real build output when present.

import { describe, expect, it } from "vitest";

// @ts-expect-error — plain .mjs script, no types.
import { scanText, scanBuild, FORBIDDEN } from "../scripts/check-legacy-safe-bundles.mjs";

describe("legacy bundle guard — detection rules", () => {
  it("flags regex lookbehind (the iPadOS 15.8 root cause)", () => {
    // The exact shape of the GFM autolink-literal regex that caused the outage.
    const offending = "x=/(?<=^|\\s)([-.\\w+]+)@([-\\w]+)/gi;";
    const hits = scanText(offending);
    expect(hits.map((h) => h.id)).toContain("regex-lookbehind");
  });

  it("flags negative lookbehind", () => {
    expect(scanText("/(?<!\\d)foo/").map((h) => h.id)).toContain("regex-lookbehind");
  });

  it("does NOT flag named capture groups (those are safe on iOS 15)", () => {
    expect(scanText("/(?<year>\\d{4})-(?<month>\\d{2})/")).toEqual([]);
  });

  it("does NOT flag the polyfilled unicodeSets feature-detect path", () => {
    // This is the safe core-js construction pattern seen in real chunks.
    expect(scanText("t.unicodeSets&&(e+='v'),t.sticky&&(e+='y')")).toEqual([]);
  });

  it("flags a hard `v`-flag RegExp construction", () => {
    expect(scanText("new RegExp('[\\\\p{L}]', 'v')").map((h) => h.id)).toContain("regex-v-flag");
  });

  it("returns no findings for ordinary modern JS", () => {
    expect(scanText("const a = b?.c ?? d; arr.at(-1); /foo\\d+/g.test(x);")).toEqual([]);
  });

  it("exposes a stable rule set", () => {
    expect(FORBIDDEN.map((r: { id: string }) => r.id)).toEqual([
      "regex-lookbehind",
      "regex-v-flag",
    ]);
  });
});

describe("legacy bundle guard — real build scan", () => {
  const result = scanBuild();

  it.skipIf(result === null)(
    "the built client chunks contain no iOS-15-incompatible regex syntax",
    () => {
      expect(result?.findings ?? []).toEqual([]);
      expect((result?.scanned ?? 0) > 0).toBe(true);
    },
  );

  it("scanBuild returns null gracefully when there is no build", () => {
    expect(scanBuild("/tmp/__lotto_nonexistent_chunks__")).toBeNull();
  });
});
