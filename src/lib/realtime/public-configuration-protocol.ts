// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from "zod";
import { brandConfigSchema } from "@/lib/brand-theme/config-schema";
import { agencyIdSchema } from "./public-state-protocol";

// Only text already exposed by public packs; no translation-job metadata.
export const publicTranslationSchema = z.object({
  originalText: z.string().max(200_000),
  translatedText: z.string().max(200_000),
  language: z.string().min(1).max(64),
  type: z.enum(["ui_string", "brand_string", "inventory", "announcement"]),
}).strict();
export const publicConfigurationDataSchema = z.object({
  brandConfiguration: brandConfigSchema.nullable(),
  enabledLanguageNames: z.array(z.string().min(1).max(64)).max(200),
  announcement: z.string().max(200_000).nullable(),
  translations: z.array(publicTranslationSchema).max(100_000),
}).strict();
export const publicConfigurationEnvelopeSchema = z.object({
  protocolVersion: z.literal(1),
  agencyId: agencyIdSchema,
  release: z.string().min(1).max(100),
  revision: z.number().int().positive().safe(),
  publishedAt: z.string().datetime(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  data: publicConfigurationDataSchema,
}).strict();
export const configurationReservationSchema = z.object({
  release: z.string().min(1).max(100),
  activate: z.boolean().optional(),
}).strict();
export const configurationProgressSchema = z.object({
  release: z.string().nullable(),
  reservedRevision: z.number().int().nonnegative().safe(),
  publishedRevision: z.number().int().nonnegative().safe(),
});
export type PublicConfigurationData = z.infer<typeof publicConfigurationDataSchema>;
export type PublicConfigurationEnvelope = z.infer<typeof publicConfigurationEnvelopeSchema>;
export type PublicTranslation = z.infer<typeof publicTranslationSchema>;
export const MAX_CONFIGURATION_BYTES = 8_000_000;

export async function hashPublicConfiguration(data: PublicConfigurationData): Promise<string> {
  const normalized = publicConfigurationDataSchema.parse(data);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(normalized)));
  return `sha256:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}
