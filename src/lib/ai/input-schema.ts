// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from "zod";
import { AI_SERVICE_TYPES, UNIT_PRICES } from "./types";
import { MAX_TRANSLATION_MAX_OUTPUT_TOKENS } from "./output-budget";
import { findCatalogueEntry } from "./catalogue";

export const aiConfigInputSchema = z.object({
  name: z.string().min(1).max(100),
  serviceType: z.enum(AI_SERVICE_TYPES),
  model: z.string().trim().min(1).max(120),
  apiKey: z.string().min(1).max(512).optional(),
  inputCost: z.number().min(0).optional(),
  outputCost: z.number().min(0).optional(),
  unitPrice: z.enum(UNIT_PRICES).optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  topP: z.number().min(0).max(1).nullable().optional(),
  thinkingLevel: z.string().max(20).nullable().optional(),
  maxTokens: z.number().int().min(1).max(MAX_TRANSLATION_MAX_OUTPUT_TOKENS).nullable().optional(),
  inputTokenLimit: z.number().int().min(1).nullable().optional(),
  outputTokenLimit: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
}).refine((input) => {
  const entry = findCatalogueEntry(input.model);
  return input.isActive === false || !entry || entry.provider === input.serviceType;
}, { message: "The model belongs to a different provider.", path: ["model"] });
