// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Convenience model suggestions per provider. These power a datalist in the AI
// Configuration form; the model field accepts any free-text value, so this list
// only needs to cover common choices and can drift without breaking anything.

import type { AiServiceType } from "./types";

export const MODEL_SUGGESTIONS: Record<AiServiceType, ReadonlyArray<string>> = {
  Anthropic: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"],
  OpenAI: ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini"],
  Google: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-3-pro"],
};
