// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Server-side brand resolution (docs/CONFIGURABLE_BRANDING_PLAN.md).
//
// Resolution order, first match wins:
//   1. Active brand configuration row in this deployment's own store
//   2. Compiled profile selected by NEXT_PUBLIC_LOTTO_BRAND
//   3. William Temple House compiled default
//
// Fail-closed contract: any storage error or invalid payload falls back to
// the compiled profile and surfaces `configError` for the Admin warning —
// a broken saved configuration must never take down public surfaces.

import "server-only";

import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";

import { parseBrandConfig } from "@/lib/brand-theme/config-schema";
import { deriveConfiguredBrandTheme } from "@/lib/brand-theme/configured-theme";
import { serializeBrandThemeCss } from "@/lib/brand-theme/serialize";
import { BRAND_TEMPLATES } from "@/lib/brand-theme/presets";
import type { BrandConfig } from "@/lib/brand-theme/config-schema";

import { getActiveConfiguration, seedTemplate } from "./store";
import {
  CUSTOM_BRAND_ID,
  resolvedBrandFromConfig,
  resolvedBrandFromProfile,
  type ResolvedBrand,
} from "./types";

export type ResolvedRuntimeBrand = {
  brand: ResolvedBrand;
  /**
   * Inline CSS for the custom theme; null when a compiled profile is active
   * (its CSS ships in the compiled stylesheets).
   */
  themeCss: string | null;
  /** The active configuration, when one resolved. */
  config: BrandConfig | null;
  /** Set when an active row existed but could not be used (fail-closed). */
  configError: string | null;
};

/** Derive + merge + serialize a configuration's theme CSS. */
export const buildThemeCss = (config: BrandConfig): string => {
  const theme = deriveConfiguredBrandTheme(config);
  return serializeBrandThemeCss(theme, CUSTOM_BRAND_ID);
};

let templateSeeding: Promise<void> | null = null;

/** Seed the WTH and St. Johns template rows once per process (idempotent). */
export const seedBrandTemplates = (): Promise<void> => {
  if (!templateSeeding) {
    templateSeeding = (async () => {
      for (const [id, template] of Object.entries(BRAND_TEMPLATES)) {
        await seedTemplate(`template-${id}`, template);
      }
    })().catch((error) => {
      // Allow a retry on the next request rather than caching the failure.
      templateSeeding = null;
      console.error("[Brand] Template seeding failed:", error);
    }) as Promise<void>;
  }
  return templateSeeding;
};

const resolveUncached = async (): Promise<ResolvedRuntimeBrand> => {
  // Opt out of static prerendering: brand changes must appear without a
  // rebuild, so every page render re-reads the active configuration.
  noStore();

  const fallback = (configError: string | null): ResolvedRuntimeBrand => ({
    brand: resolvedBrandFromProfile(),
    themeCss: null,
    config: null,
    configError,
  });

  let row;
  try {
    // Pure read path: template seeding happens in the Admin configuration API
    // (where templates are listed), never during page rendering.
    row = await getActiveConfiguration();
  } catch (error) {
    console.error("[Brand] Failed to read active configuration:", error);
    return fallback("Brand configuration storage is unreachable; using the built-in brand.");
  }
  if (!row) return fallback(null);

  const parsed = parseBrandConfig(row.payload);
  if (!parsed.ok) {
    console.error(
      `[Brand] Active configuration "${row.id}" is invalid; using the built-in brand:`,
      parsed.errors,
    );
    return fallback(
      `Saved appearance configuration "${row.id}" is invalid and was ignored.`,
    );
  }

  try {
    return {
      brand: resolvedBrandFromConfig(parsed.config),
      themeCss: buildThemeCss(parsed.config),
      config: parsed.config,
      configError: null,
    };
  } catch (error) {
    console.error("[Brand] Theme derivation failed; using the built-in brand:", error);
    return fallback(
      `Saved appearance configuration "${row.id}" could not be applied and was ignored.`,
    );
  }
};

/**
 * Resolve the runtime brand. Cached per request (React cache), so layout,
 * metadata, manifest, and pages share one store read.
 */
export const getResolvedRuntimeBrand = cache(resolveUncached);

/** Convenience accessor for consumers that only need the brand identity. */
export const getResolvedBrand = async (): Promise<ResolvedBrand> =>
  (await getResolvedRuntimeBrand()).brand;
