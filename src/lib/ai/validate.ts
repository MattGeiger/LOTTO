// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Model-specific, free access lookup adapted from FEED v1.8.0 checkAccess.
// Visibility is not a generation entitlement or credit check.
import { findCatalogueEntry } from "./catalogue";
import { providerFetch, ProviderFailureError } from "./provider-failure";
import type { AiServiceType } from "./types";

export type ValidationResult = { ok: boolean; message: string };

export const validateApiKey = async (
  serviceType: AiServiceType,
  apiKey: string,
  model?: string,
): Promise<ValidationResult> => {
  if (!apiKey) return { ok: false, message: "No API key provided." };
  if (!model?.trim()) return { ok: false, message: "Select a model before testing access." };
  const selected = model.trim();
  const entry = findCatalogueEntry(selected);
  if (entry && entry.provider !== serviceType) {
    return { ok: false, message: "The selected model belongs to a different provider." };
  }
  const id = encodeURIComponent(selected);
  try {
    let response: Response;
    switch (serviceType) {
      case "OpenAI":
        response = await providerFetch(`https://api.openai.com/v1/models/${id}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }, 10_000);
        break;
      case "Anthropic":
        response = await providerFetch(`https://api.anthropic.com/v1/models/${id}`, {
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        }, 10_000);
        break;
      case "Google":
        response = await providerFetch(`https://generativelanguage.googleapis.com/v1beta/models/${id}`, {
          headers: { "x-goog-api-key": apiKey },
        }, 10_000);
        break;
      default:
        return { ok: false, message: "Unknown provider." };
    }
    const metadata = await response.json() as { id?: string; name?: string; supportedGenerationMethods?: string[] };
    const returned = serviceType === "Google" ? metadata.name?.replace(/^models\//, "") : metadata.id;
    // Provider aliases can return a resolved snapshot, so absence is unknown,
    // while a valid metadata record is evidence of this endpoint's lookup.
    if (!returned) return { ok: false, message: "The provider did not confirm model visibility. Generation access is unverified." };
    if (serviceType === "Google" && !metadata.supportedGenerationMethods?.includes("generateContent")) {
      return { ok: false, message: "This Google model does not advertise text generation support." };
    }
    return { ok: true, message: `Credentials accepted and ${selected} is visible. Generation access and available credit were not tested. No translation tokens were used.` };
  } catch (error) {
    return { ok: false, message: error instanceof ProviderFailureError
      ? error.message
      : "Could not confirm model access. Check the provider settings and try again." };
  }
};
