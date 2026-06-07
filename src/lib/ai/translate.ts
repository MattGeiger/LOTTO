// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Single-text translation via each provider's REST API (no SDK dependency).
// Ported in spirit from FEED's provider services, simplified for LOTTO's
// short UI strings + announcement text.

import type { AiServiceType } from "./types";

export type TranslateParams = {
  serviceType: AiServiceType;
  apiKey: string;
  model: string;
  maxTokens?: number | null;
  temperature?: number | null;
};

export type TranslateResult = {
  text: string;
  promptTokens: number | null;
  completionTokens: number | null;
};

const buildSystemPrompt = (targetLanguage: string): string =>
  [
    `You are a professional translator. Translate the user's text into ${targetLanguage}.`,
    "Preserve Markdown formatting, line breaks, and any placeholders or punctuation.",
    "Do not translate brand names. Return ONLY the translation — no quotes, labels, or commentary.",
  ].join(" ");

const isGpt5Family = (model: string): boolean => /(^|[^a-z])gpt-5/i.test(model);

const translateOpenAI = async (
  p: TranslateParams,
  text: string,
  targetLanguage: string,
): Promise<TranslateResult> => {
  const body: Record<string, unknown> = {
    model: p.model,
    messages: [
      { role: "system", content: buildSystemPrompt(targetLanguage) },
      { role: "user", content: text },
    ],
  };
  // GPT-5 models require max_completion_tokens and reject custom temperature.
  if (isGpt5Family(p.model)) {
    body.max_completion_tokens = p.maxTokens ?? 2048;
  } else {
    body.max_tokens = p.maxTokens ?? 2048;
    if (p.temperature != null) body.temperature = p.temperature;
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${p.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI translation failed (HTTP ${res.status}).`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const out = data.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error("OpenAI returned an empty translation.");
  return {
    text: out,
    promptTokens: data.usage?.prompt_tokens ?? null,
    completionTokens: data.usage?.completion_tokens ?? null,
  };
};

const translateAnthropic = async (
  p: TranslateParams,
  text: string,
  targetLanguage: string,
): Promise<TranslateResult> => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": p.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: p.model,
      max_tokens: p.maxTokens ?? 2048,
      system: buildSystemPrompt(targetLanguage),
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic translation failed (HTTP ${res.status}).`);
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const out = data.content?.find((c) => c.type === "text")?.text?.trim();
  if (!out) throw new Error("Anthropic returned an empty translation.");
  return {
    text: out,
    promptTokens: data.usage?.input_tokens ?? null,
    completionTokens: data.usage?.output_tokens ?? null,
  };
};

const translateGoogle = async (
  p: TranslateParams,
  text: string,
  targetLanguage: string,
): Promise<TranslateResult> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    p.model,
  )}:generateContent?key=${encodeURIComponent(p.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(targetLanguage) }] },
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: { maxOutputTokens: p.maxTokens ?? 2048 },
    }),
  });
  if (!res.ok) throw new Error(`Google translation failed (HTTP ${res.status}).`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const out = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!out) throw new Error("Google returned an empty translation.");
  return {
    text: out,
    promptTokens: data.usageMetadata?.promptTokenCount ?? null,
    completionTokens: data.usageMetadata?.candidatesTokenCount ?? null,
  };
};

export const translateText = async (
  params: TranslateParams,
  text: string,
  targetLanguage: string,
): Promise<TranslateResult> => {
  switch (params.serviceType) {
    case "OpenAI":
      return translateOpenAI(params, text, targetLanguage);
    case "Anthropic":
      return translateAnthropic(params, text, targetLanguage);
    case "Google":
      return translateGoogle(params, text, targetLanguage);
    default:
      throw new Error(`Unsupported provider: ${params.serviceType as string}`);
  }
};
