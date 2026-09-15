// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.
// Request decisions ported from FEED v1.8.0 provider TranslationService classes.
// LOTTO retains REST and internal translation defaults, without thinking UI.

import { capabilitiesFor, findCatalogueEntry, resolveReasoning } from "./catalogue";
import { normalizeTranslationOutputBudget } from "./output-budget";
import { ProviderFailureError } from "./provider-failure";
import type { AiServiceType } from "./types";

export type ProviderParameters = {
  serviceType: AiServiceType;
  model: string;
  temperature?: number | null;
  topP?: number | null;
};

export function providerParameters(p: ProviderParameters, outputTokens: number): Record<string, unknown> {
  const entry = findCatalogueEntry(p.model);
  if (entry && entry.provider !== p.serviceType) {
    throw new ProviderFailureError("misconfigured");
  }
  const capabilities = capabilitiesFor(p.serviceType, p.model);
  const maxTokens = Math.min(
    normalizeTranslationOutputBudget(outputTokens, entry?.maxOutputTokens),
    capabilities.nonStreamingOutputCeiling ?? Infinity,
  );
  // Deliberately do not accept persisted thinkingLevel: rc.3's hidden high
  // default was never active, and the simplified LOTTO UI has no such control.
  const reasoning = resolveReasoning(capabilities).value;
  const sampling: Record<string, number> = {};
  if (capabilities.sampling !== "unsupported") {
    const temperature = capabilities.fixedTemperature ?? p.temperature;
    if (temperature != null) sampling.temperature = Math.max(0, Math.min(p.serviceType === "Anthropic" ? 1 : 2, temperature));
    if (p.topP != null && !(capabilities.sampling === "temperature-or-top-p" && temperature != null)) {
      sampling[p.serviceType === "Google" ? "topP" : "top_p"] = p.topP;
    }
  }
  switch (p.serviceType) {
    case "OpenAI":
      return { [capabilities.maxTokensField]: maxTokens, ...sampling, ...(reasoning ? { reasoning_effort: reasoning } : {}) };
    case "Google":
      return {
        maxOutputTokens: maxTokens,
        ...sampling,
        ...(reasoning ? { thinkingConfig: { thinkingLevel: reasoning.toUpperCase() } } : {}),
      };
    case "Anthropic": {
      const control = capabilities.reasoning;
      return {
        max_tokens: maxTokens,
        ...sampling,
        ...(control.kind === "adaptive"
          ? control.canDisable
            ? { thinking: { type: "disabled" } }
            : { thinking: { type: "adaptive" }, output_config: { effort: reasoning } }
          : {}),
      };
    }
  }
}
