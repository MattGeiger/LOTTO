// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

/**
 * Provider output capability and LOTTO's operational request budget are
 * intentionally separate. Large model ceilings describe what a provider can
 * accept; they are not a sensible default for routine structured translation.
 */
export const DEFAULT_TRANSLATION_MAX_OUTPUT_TOKENS = 8_192;
export const MAX_TRANSLATION_MAX_OUTPUT_TOKENS = 16_384;
export const MIN_TRANSLATION_MAX_OUTPUT_TOKENS = 2_048;

export const recommendedTranslationOutputBudget = (
  providerOutputLimit?: number | null,
): number =>
  Math.min(
    DEFAULT_TRANSLATION_MAX_OUTPUT_TOKENS,
    providerOutputLimit ?? DEFAULT_TRANSLATION_MAX_OUTPUT_TOKENS,
  );

/**
 * Normalize persisted request budgets. Older LOTTO versions copied the model's
 * entire output ceiling into maxTokens; recognize that coupled value as the
 * legacy default and migrate it in memory to the operational recommendation.
 */
export const normalizeTranslationOutputBudget = (
  configuredMaxTokens?: number | null,
  providerOutputLimit?: number | null,
): number => {
  const providerLimit = providerOutputLimit ?? MAX_TRANSLATION_MAX_OUTPUT_TOKENS;
  if (
    configuredMaxTokens == null ||
    (configuredMaxTokens === providerOutputLimit &&
      configuredMaxTokens > MAX_TRANSLATION_MAX_OUTPUT_TOKENS)
  ) {
    return recommendedTranslationOutputBudget(providerOutputLimit);
  }

  const upperBound = Math.min(providerLimit, MAX_TRANSLATION_MAX_OUTPUT_TOKENS);
  if (upperBound <= MIN_TRANSLATION_MAX_OUTPUT_TOKENS) return upperBound;
  return Math.min(
    Math.max(MIN_TRANSLATION_MAX_OUTPUT_TOKENS, configuredMaxTokens),
    upperBound,
  );
};

/**
 * Conservative structured-output estimate. Translation can expand and some
 * target-language tokenizers approach one token per character, so reserve two
 * output tokens per source character plus per-row JSON and response overhead.
 * The configured operational budget remains the hard ceiling.
 */
export const estimateTranslationBatchOutputTokens = (
  texts: ReadonlyArray<string>,
  configuredMaxTokens: number,
): number => {
  const sourceCharacters = texts.reduce((total, text) => total + text.length, 0);
  const estimate = sourceCharacters * 2 + texts.length * 32 + 512;
  const upperBound = Math.max(1, configuredMaxTokens);
  const lowerBound = Math.min(MIN_TRANSLATION_MAX_OUTPUT_TOKENS, upperBound);
  return Math.min(upperBound, Math.max(lowerBound, Math.ceil(estimate)));
};
