// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Find-missing-translations auditor (ported in spirit from FEED's
// translation-auditor). Compares the translatable content set against existing
// translations across enabled languages and reports/queues the gaps.

import { ALWAYS_ON_LANGUAGE_NAMES } from "@/lib/languages";
import { listEnabledLanguages } from "@/lib/translation/languages-store";
import { getContentItems } from "./content";
import { translatePending, type ProcessResult } from "./engine";
import * as store from "./translations-store";
import type { TranslationKey, TranslationType } from "./types";

export type MissingDetails = {
  count: number;
  byType: Record<string, number>;
  byLanguage: Record<string, number>;
  sampleItems: string[];
  /**
   * How many source strings of each content type were scanned (before comparing
   * against existing translations). `inventory: 0` means the FEED inventory feed
   * yielded nothing to the server — the usual cause of "no inventory found".
   */
  sourceCounts: Record<string, number>;
  /** Inventory feed health (literal error + URL) so failures are diagnosable. */
  inventorySource: { ok: boolean; error: string | null; url: string };
};

// A pending row older than this is treated as stale (re-queue it).
const STALE_MS = 60_000;

export const auditMissing = async (): Promise<{ missing: TranslationKey[]; details: MissingDetails }> => {
  const base = new Set<string>(ALWAYS_ON_LANGUAGE_NAMES);
  const enabledNonEnglish = (await listEnabledLanguages())
    .map((l) => l.name)
    .filter((name) => name !== "English");
  // UI strings (hardcoded map) and inventory (FEED's own translations) are
  // already covered for the base languages, so only *newly enabled* languages
  // need DB translations for them. The announcement is LOTTO-authored and not in
  // FEED, so every enabled non-English language needs it.
  const nonCoreTargets = enabledNonEnglish.filter((name) => !base.has(name));

  const { items: content, inventory } = await getContentItems();
  const sourceCounts: Record<string, number> = {};
  for (const item of content) {
    sourceCounts[item.type] = (sourceCounts[item.type] ?? 0) + 1;
  }
  const existing = await store.list();
  const byKey = new Map(existing.map((r) => [`${r.type}::${r.language}::${r.originalText}`, r]));
  const now = Date.now();

  const missing: TranslationKey[] = [];
  const byType: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  const sampleItems: string[] = [];

  for (const item of content) {
    const targets = item.type === "announcement" ? enabledNonEnglish : nonCoreTargets;
    for (const language of targets) {
      const row = byKey.get(`${item.type}::${language}::${item.originalText}`);
      if (row) {
        if (row.status === "completed") continue;
        if (row.status === "pending" && now - row.updatedAt < STALE_MS) continue;
      }
      missing.push({ originalText: item.originalText, language, type: item.type });
      byType[item.type] = (byType[item.type] ?? 0) + 1;
      byLanguage[language] = (byLanguage[language] ?? 0) + 1;
      if (sampleItems.length < 10) {
        const snippet = item.originalText.length > 40 ? `${item.originalText.slice(0, 40)}…` : item.originalText;
        sampleItems.push(`${snippet} → ${language}`);
      }
    }
  }

  return {
    missing,
    details: {
      count: missing.length,
      byType,
      byLanguage,
      sampleItems,
      sourceCounts,
      inventorySource: { ok: inventory.ok, error: inventory.error, url: inventory.url },
    },
  };
};

export const findMissing = async (
  process: boolean,
  types?: TranslationType[],
): Promise<{ details: MissingDetails; processed?: ProcessResult }> => {
  const { missing, details } = await auditMissing();
  if (!process || missing.length === 0) return { details };

  // Optionally restrict queuing to the selected content types.
  const typeSet = types && types.length > 0 ? new Set(types) : null;
  const toQueue = typeSet ? missing.filter((key) => typeSet.has(key.type)) : missing;
  if (toQueue.length === 0) return { details };

  // Queue every selected missing item as pending, then translate inline.
  for (const key of toQueue) {
    await store.upsert(key, { status: "pending", translatedText: null, metadata: null });
  }
  const processed = await translatePending();
  return { details, processed };
};
