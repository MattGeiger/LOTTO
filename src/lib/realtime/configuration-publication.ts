// SPDX-License-Identifier: AGPL-3.0-or-later
import "server-only";
import { randomUUID } from "node:crypto";
import { send } from "@vercel/queue";
import { z } from "zod";
import { version } from "../../../package.json";
import { parseBrandConfig } from "@/lib/brand-theme/config-schema";
import { getActiveConfiguration } from "@/lib/brand-config/store";
import { listEnabledLanguages } from "@/lib/translation/languages-store";
import { list } from "@/lib/translation/translations-store";
import { getCatalogEntryByName } from "@/lib/languages";
import { UI_STRINGS_EN } from "@/lib/ui-strings";
import { stateManager } from "@/lib/state-manager";
import { configurationHubUrl, configurationRequest, isPublicConfigurationSnapshotEnabled } from "./public-configuration";
import { agencyIdSchema } from "./public-state-protocol";
import {
  configurationProgressSchema, hashPublicConfiguration, MAX_CONFIGURATION_BYTES,
  publicConfigurationDataSchema, publicConfigurationEnvelopeSchema,
} from "./public-configuration-protocol";

export const CONFIGURATION_TOPIC = "lotto-public-configuration-repair";
export const configurationRepairSchema = z.object({
  agencyId: agencyIdSchema, release: z.string().min(1).max(100),
  jobId: z.string().uuid(), revision: z.number().int().positive().safe().optional(),
}).strict();

const publishHeaders = () => {
  const token = process.env.LOTTO_REALTIME_PUBLISH_TOKEN?.trim();
  if (!token || token.length < 32) throw new Error("Configuration publisher is not configured.");
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
};

export async function buildAuthoritativePublicConfiguration() {
  // Four reads during deliberate staff work; never called by a public read.
  const [row, languages, completed, state] = await Promise.all([
    getActiveConfiguration(), listEnabledLanguages(), list({ status: "completed" }), stateManager.loadState(),
  ]);
  const parsedBrand = row ? parseBrandConfig(row.payload) : null;
  if (parsedBrand && !parsedBrand.ok) throw new Error("Active appearance is invalid; publication retained.");
  const brandConfiguration = parsedBrand?.ok ? parsedBrand.config : null;
  if (brandConfiguration) {
    delete brandConfiguration.logo.lightFilename;
    delete brandConfiguration.logo.darkFilename;
    delete brandConfiguration.logo.lightType;
    delete brandConfiguration.logo.darkType;
  }
  const serviceLabel = brandConfiguration?.identity.serviceLabel?.trim();
  const announcement = state.announcement?.enabled && state.announcement.markdown?.trim()
    ? state.announcement.markdown : null;
  const uiSources = new Set(Object.values(UI_STRINGS_EN));
  return publicConfigurationDataSchema.parse({
    brandConfiguration,
    enabledLanguageNames: languages.map(row => row.name),
    announcement,
    translations: completed.filter(row => row.translatedText && getCatalogEntryByName(row.language) && (
      row.type === "inventory"
      || (row.type === "ui_string" && uiSources.has(row.originalText))
      || (row.type === "brand_string" && row.originalText === serviceLabel)
      || (row.type === "announcement" && row.originalText === announcement)
    )).map(row => ({
      originalText: row.originalText, translatedText: row.translatedText,
      language: row.language, type: row.type,
    })),
  });
}

export async function publishPublicConfiguration(options: { activate?: boolean } = {}) {
  const headers = publishHeaders();
  const reserved = await configurationRequest("configuration-revision", {
    method: "POST", headers, body: JSON.stringify({ release: version, activate: options.activate ?? false }),
  });
  if (!reserved.ok) throw new Error(`Configuration reservation failed (${reserved.status}).`);
  const { revision } = z.object({ revision: z.number().int().positive().safe() }).parse(await reserved.json());
  try {
    const data = await buildAuthoritativePublicConfiguration();
    const envelope = publicConfigurationEnvelopeSchema.parse({
      protocolVersion: 1, agencyId: configurationHubUrl().pathname.split("/")[3],
      release: version, revision, publishedAt: new Date().toISOString(),
      checksum: await hashPublicConfiguration(data), data,
    });
    const body = JSON.stringify(envelope);
    if (new TextEncoder().encode(body).byteLength > MAX_CONFIGURATION_BYTES) throw new Error("Configuration publication is too large.");
    const response = await configurationRequest("configuration", { method: "POST", headers, body });
    if (!response.ok) throw new Error(`Configuration publication failed (${response.status}).`);
    const acknowledgement = z.object({
      accepted: z.literal(true), superseded: z.boolean().optional(),
      duplicate: z.boolean().optional(), revision: z.number().int().positive().safe().optional(),
    }).parse(await response.json());
    return { ...acknowledgement, revision };
  } catch (error) {
    throw Object.assign(new Error("Configuration publication remains pending.", { cause: error }), { revision });
  }
}

export async function publishConfigurationAfterCommittedWrite(): Promise<void> {
  try {
    if (!isPublicConfigurationSnapshotEnabled()) return;
    await publishPublicConfiguration();
  } catch (error) {
    // The write already committed. Preserve its success and leave bounded repair.
    console.error("[Configuration] Publication pending; retaining the last published document.", error);
    try {
      const revision = error && typeof error === "object" && "revision" in error ? error.revision : undefined;
      const job = configurationRepairSchema.parse({
        agencyId: configurationHubUrl().pathname.split("/")[3], release: version, jobId: randomUUID(), revision,
      });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          send(CONFIGURATION_TOPIC, job, {
            idempotencyKey: job.jobId, delaySeconds: 30, retentionSeconds: 3_600,
          }),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Configuration recovery enqueue timed out.")), 3_000); }),
        ]);
      } finally { if (timer) clearTimeout(timer); }
    } catch (queueError) {
      console.error("[Configuration] Recovery enqueue failed; use authenticated configuration republish.", queueError);
    }
  }
}

export async function repairPublicConfiguration(message: unknown): Promise<void> {
  const parsed = configurationRepairSchema.safeParse(message);
  if (!parsed.success || !isPublicConfigurationSnapshotEnabled()) return;
  const job = parsed.data;
  if (job.agencyId !== process.env.LOTTO_REALTIME_AGENCY_ID || job.release !== version) return;
  const progressResponse = await configurationRequest("configuration-status", { headers: publishHeaders() });
  if (!progressResponse.ok) throw new Error("Configuration progress unavailable.");
  const progress = configurationProgressSchema.parse(await progressResponse.json());
  if (progress.release !== version) return; // Old release never reactivates itself.
  if (job.revision && progress.publishedRevision >= job.revision) return;
  await publishPublicConfiguration();
}
