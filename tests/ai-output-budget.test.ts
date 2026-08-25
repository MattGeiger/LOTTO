// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRANSLATION_MAX_OUTPUT_TOKENS,
  estimateTranslationBatchOutputTokens,
  MAX_TRANSLATION_MAX_OUTPUT_TOKENS,
  normalizeTranslationOutputBudget,
  recommendedTranslationOutputBudget,
} from "@/lib/ai/output-budget";

describe("translation output budgets", () => {
  it("separates Gemini's provider ceiling from LOTTO's operating default", () => {
    expect(recommendedTranslationOutputBudget(65_536)).toBe(8_192);
    expect(DEFAULT_TRANSLATION_MAX_OUTPUT_TOKENS).toBe(8_192);
  });

  it("normalizes the legacy coupled provider maximum", () => {
    expect(normalizeTranslationOutputBudget(65_536, 65_536)).toBe(8_192);
    expect(normalizeTranslationOutputBudget(null, 65_536)).toBe(8_192);
    expect(normalizeTranslationOutputBudget(4_096, 65_536)).toBe(4_096);
    expect(normalizeTranslationOutputBudget(32_768, 65_536)).toBe(
      MAX_TRANSLATION_MAX_OUTPUT_TOKENS,
    );
  });

  it("uses an adaptive batch estimate within the configured ceiling", () => {
    expect(estimateTranslationBatchOutputTokens(["Hello"], 8_192)).toBe(2_048);
    expect(
      estimateTranslationBatchOutputTokens(
        Array.from({ length: 100 }, () => "A moderately sized client-facing label"),
        8_192,
      ),
    ).toBe(8_192);
  });
});
