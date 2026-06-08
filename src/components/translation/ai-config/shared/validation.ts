// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { AiServiceType } from "@/lib/ai/types";

import type { ValidationType } from "./types";

export type ApiKeyValidationResult = { error?: string; warning?: string };

export const validateApiKey = (key: string): ApiKeyValidationResult => {
  if (!key.trim()) return { error: "API key is required" };
  if (!key.startsWith("sk-") && !key.startsWith("ak-") && !key.startsWith("gsk_") && !key.startsWith("AIza")) {
    return {
      warning:
        "Unusual API key detected. AI features will not work without a valid API key. Please double-check your input.",
    };
  }
  return {};
};

export function validateApiKeyForService(
  key: string,
  serviceType?: AiServiceType,
): ApiKeyValidationResult {
  const trimmed = key.trim();
  if (!trimmed) return { error: "API key is required" };

  const patterns: Partial<Record<AiServiceType, RegExp>> = {
    OpenAI: /^sk(?:-proj)?-[A-Za-z0-9_-]{20,}$/,
    Anthropic: /^sk-ant-[A-Za-z0-9-]{20,}$/i,
    Google: /^AIza[0-9A-Za-z_-]{30,60}$/,
  };

  const pattern = serviceType ? patterns[serviceType] : undefined;
  if (serviceType && pattern && !pattern.test(trimmed)) {
    return {
      warning: `This doesn't look like a typical ${serviceType} API key. Please double-check the value. You can continue and verify later.`,
    };
  }
  return {};
}

export const validateUrl = (url: string): string | undefined => {
  if (!url.trim()) return undefined;
  try {
    new URL(url);
    return undefined;
  } catch {
    return "Please enter a valid URL";
  }
};

export const validateField = (
  field: string,
  value: string,
  type: ValidationType = "required",
): string | undefined => {
  switch (type) {
    case "required":
      return !value.trim() ? `${field} is required` : undefined;
    case "model":
      return !value.trim() ? "Model identifier is required" : undefined;
    case "apikey":
      return validateApiKey(value).error;
    case "url":
      return validateUrl(value);
    case "name": {
      const trimmed = value.trim();
      if (!trimmed) return "Configuration name is required";
      if (trimmed.length < 3) return "Name must be at least 3 characters";
      if (trimmed.length > 100) return "Name must be 100 characters or less";
      return undefined;
    }
    case "prompt": {
      const promptTrimmed = value.trim();
      if (!promptTrimmed) return "System prompt is required";
      if (promptTrimmed.length > 1800) return "System prompt must be 1,800 characters or less";
      return undefined;
    }
    default:
      return undefined;
  }
};
