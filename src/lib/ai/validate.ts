// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Lightweight API-key validation. Each provider's "list models" endpoint is a
// cheap authenticated GET that confirms the key works without spending tokens.
// (Full translation adapters/SDKs arrive with the translation engine.)

import type { AiServiceType } from "./types";

export type ValidationResult = { ok: boolean; message: string };

const okMessage = "API key is valid.";

const interpret = (status: number): ValidationResult => {
  if (status === 200) return { ok: true, message: okMessage };
  if (status === 401 || status === 403) {
    return { ok: false, message: "The API key was rejected (unauthorized)." };
  }
  if (status === 429) {
    return { ok: false, message: "Rate limited while validating — try again shortly." };
  }
  return { ok: false, message: `Validation failed (HTTP ${status}).` };
};

export const validateApiKey = async (
  serviceType: AiServiceType,
  apiKey: string,
): Promise<ValidationResult> => {
  if (!apiKey) return { ok: false, message: "No API key provided." };
  try {
    switch (serviceType) {
      case "OpenAI": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return interpret(res.status);
      }
      case "Anthropic": {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        });
        return interpret(res.status);
      }
      case "Google": {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        );
        return interpret(res.status);
      }
      default:
        return { ok: false, message: "Unknown provider." };
    }
  } catch (error) {
    return {
      ok: false,
      message: `Could not reach the provider: ${error instanceof Error ? error.message : "network error"}.`,
    };
  }
};
