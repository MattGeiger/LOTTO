// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { describe, expect, it } from "vitest";

import {
  isValidInitials,
  normalizeInitials,
  scoreQualifies,
  type ArcadeHighScoreEntry,
} from "@/arcade/lib/high-score-types";

const entry = (score: number, index: number): ArcadeHighScoreEntry => ({
  id: `score-${index}`,
  game: "snake",
  difficulty: "normal",
  initials: "AAA",
  score,
  createdAt: new Date(index).toISOString(),
});

describe("arcade high-score validation", () => {
  it("accepts exactly three letter graphemes across supported scripts", () => {
    expect(isValidInitials("MNG")).toBe(true);
    expect(isValidInitials("ÑÁÉ")).toBe(true);
    expect(isValidInitials("ĐẠT")).toBe(true);
    expect(isValidInitials("МИР")).toBe(true);
    expect(isValidInitials("ДІМ")).toBe(true);
    expect(isValidInitials("王小明")).toBe(true);
    expect(isValidInitials("علي")).toBe(true);
    expect(isValidInitials("رضا")).toBe(true);
  });

  it("normalizes case and rejects non-letter or wrong-length initials", () => {
    expect(normalizeInitials(" mng ")).toBe("MNG");
    expect(isValidInitials("MN")).toBe(false);
    expect(isValidInitials("MNGO")).toBe(false);
    expect(isValidInitials("A1B")).toBe(false);
    expect(isValidInitials("A-B")).toBe(false);
  });

  it("qualifies positive scores against a per-scope top ten cutoff", () => {
    const topNine = Array.from({ length: 9 }, (_, index) => entry(100 - index, index));
    expect(scoreQualifies(1, topNine)).toBe(true);

    const topTen = Array.from({ length: 10 }, (_, index) => entry(100 - index, index));
    expect(scoreQualifies(91, topTen)).toBe(false);
    expect(scoreQualifies(92, topTen)).toBe(true);
    expect(scoreQualifies(0, topTen)).toBe(false);
  });
});
