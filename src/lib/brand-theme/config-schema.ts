// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Persisted brand-configuration schema (JSONB payload of the
// brand_configurations table). Shared by the wizard client, the API routes,
// and tests so one zod contract validates everywhere. Invalid payloads must
// fail closed to the compiled profile — never take down public surfaces.

import { z } from "zod";
import { isTailwindPaletteName } from "./palette";

export const BRAND_CONFIG_SCHEMA_VERSION = 2;

/** A single OKLCH color as structured data (not CSS text). */
export const oklchColorSchema = z.object({
  l: z.number().min(0).max(1),
  c: z.number().min(0).max(0.37),
  h: z.number().min(0).max(360),
});

const trimmedLine = z
  .string()
  .trim()
  .min(1)
  .max(200)
  // Persisted copy is rendered into UI/metadata; forbid control characters.
  .refine((value) => !/[\x00-\x1f\x7f]/.test(value), {
    message: "must not contain control characters",
  });

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => /^https?:\/\//.test(value), {
    message: "must be an http(s) URL",
  });

const PUBLIC_VERCEL_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

const isTrustedAssetReference = (value: string): boolean => {
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return true;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname.endsWith(PUBLIC_VERCEL_BLOB_HOST_SUFFIX) &&
      url.hostname.length > PUBLIC_VERCEL_BLOB_HOST_SUFFIX.length &&
      url.pathname.startsWith("/brand-assets/") &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
};

/** Built-in/local asset path or durable hosted asset written by LOTTO. */
const assetPath = z
  .string()
  .trim()
  .min(2)
  .max(500)
  .refine(isTrustedAssetReference, {
    message: "must be a root-relative path or trusted public Vercel Blob URL",
  });

const cssColorValue = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  // Override values must obey the OKLCH-only authoring standard: oklch()
  // literals, gradients over them, var() references, or keywords.
  .refine(
    (value) =>
      !/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(?:black|white)\b/i.test(value),
    { message: "colors must use oklch() notation" },
  )
  // Defense against CSS injection through a tampered payload: no characters
  // that could terminate the declaration/block or smuggle new rules.
  .refine((value) => !/[;{}<>@\\]/.test(value) && !/url\s*\(/i.test(value), {
    message: "value contains disallowed CSS syntax",
  });

const iconSchema = z.object({
  src: assetPath,
  sizes: z.string().trim().max(20).optional(),
  type: z.string().trim().max(50).optional(),
  purpose: z.enum(["any", "maskable", "monochrome"]).optional(),
});

const legacyBrandConfigSchema = z.object({
  schemaVersion: z.literal(1),

  identity: z.object({
    organizationName: trimmedLine,
    appName: trimmedLine,
    shortName: trimmedLine.pipe(z.string().max(60)),
    tagline: trimmedLine,
    /**
     * The board heading above the service date ("Food Pantry Service For").
     * LOTTO is queue management generally — clinics, libraries, and other
     * services define their own line. Absent → the translated default.
     */
    serviceLabel: trimmedLine.pipe(z.string().max(60)).optional(),
    description: trimmedLine.pipe(z.string().max(300)),
    displayDescription: trimmedLine.pipe(z.string().max(300)),
    inventoryDescription: trimmedLine.pipe(z.string().max(300)),
    adminDescription: trimmedLine.pipe(z.string().max(300)),
  }),

  links: z.object({
    organizationWebsite: httpUrl,
    publicAppUrl: httpUrl,
  }),

  logo: z.object({
    lightSrc: assetPath,
    darkSrc: assetPath,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    darkWidth: z.number().int().positive(),
    darkHeight: z.number().int().positive(),
    presentation: z.enum(["transparent", "dark-surface"]),
    lightFilename: trimmedLine.optional(),
    darkFilename: trimmedLine.optional(),
    lightType: z.string().trim().max(50).optional(),
    darkType: z.string().trim().max(50).optional(),
  }),

  pwa: z.object({
    // Hex is the PWA-manifest wire format expected by browsers; the OKLCH-only
    // rule applies to CSS, not manifest JSON.
    backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    themeColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    browserIcons: z.array(iconSchema).min(1).max(10),
    appleIcons: z.array(iconSchema).min(1).max(10),
    manifestIcons: z.array(iconSchema).min(1).max(10),
  }),

  colors: z.object({
    primary: oklchColorSchema,
    surfaceLight: oklchColorSchema,
    surfaceDark: oklchColorSchema,
    textLight: oklchColorSchema.optional(),
    accent: oklchColorSchema.optional(),
    serving: oklchColorSchema.optional(),
    /**
     * Ambient hues (color-story ranks 3+, docs/COLOR_SEMIOTICS.md): feed
     * surface tints and gradients only — never state or emphasis roles.
     * Backward-compatible schema-v1 extension; older payloads omit it.
     */
    ambient: z.array(oklchColorSchema).max(3).optional(),
  }),

  staff: z.object({
    signInTitle: trimmedLine,
    emailGuidance: trimmedLine,
    emailPlaceholder: trimmedLine.pipe(z.string().max(100)),
  }),

  capabilities: z.object({
    inventory: z.object({
      enabled: z.boolean(),
      feedUrl: httpUrl.nullable(),
    }),
  }),

  /**
   * Sparse Advanced-tier token overrides, keyed by scope then token name.
   * Always present in the payload (initially empty) so the merge/validate
   * pipeline is exercised from day one. Keys are further checked against the
   * derivable-token allowlist by `validateOverrideKeys`.
   */
  overrides: z.object({
    light: z.record(z.string(), cssColorValue).default({}),
    dark: z.record(z.string(), cssColorValue).default({}),
    hiVizLight: z.record(z.string(), cssColorValue).default({}),
    hiVizDark: z.record(z.string(), cssColorValue).default({}),
  }),
});

const paletteNameSchema = z
  .string()
  .regex(/^[a-z]+-(?:50|100|200|300|400|500|600|700|800|900|950)$/)
  .refine(isTailwindPaletteName, { message: "must name an installed Tailwind v4 color" });

const v2ColorsSchema = legacyBrandConfigSchema.shape.colors.extend({
  system: z.enum(["legacy-oklch", "tailwind-v4"]),
  paletteRoles: z
    .object({
      primary: paletteNameSchema,
      accent: paletteNameSchema.optional(),
      ambient: paletteNameSchema.optional(),
      surfaceDark: paletteNameSchema.optional(),
      surfaceLight: paletteNameSchema.optional(),
    })
    .optional(),
}).superRefine((colors, context) => {
  if (colors.system === "tailwind-v4" && !colors.paletteRoles) {
    context.addIssue({
      code: "custom",
      path: ["paletteRoles"],
      message: "Tailwind v4 colors require fixed palette roles",
    });
  }
});

export const brandConfigSchema = legacyBrandConfigSchema.extend({
  schemaVersion: z.literal(BRAND_CONFIG_SCHEMA_VERSION),
  colors: v2ColorsSchema,
});

export type BrandConfig = z.infer<typeof brandConfigSchema>;
type LegacyBrandConfig = z.infer<typeof legacyBrandConfigSchema>;

export type BrandConfigParseResult =
  | { ok: true; config: BrandConfig }
  | { ok: false; errors: string[] };

/** Parse an untrusted payload; never throws. */
export const parseBrandConfig = (payload: unknown): BrandConfigParseResult => {
  const result = brandConfigSchema.safeParse(payload);
  if (result.success) {
    if (
      result.data.capabilities.inventory.enabled &&
      !result.data.capabilities.inventory.feedUrl
    ) {
      return {
        ok: false,
        errors: ["capabilities.inventory: enabled requires a FEED URL"],
      };
    }
    return { ok: true, config: result.data };
  }
  const legacyResult = legacyBrandConfigSchema.safeParse(payload);
  if (legacyResult.success) {
    const legacy: LegacyBrandConfig = legacyResult.data;
    return {
      ok: true,
      config: {
        ...legacy,
        schemaVersion: BRAND_CONFIG_SCHEMA_VERSION,
        colors: { ...legacy.colors, system: "legacy-oklch" },
      },
    };
  }
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    ),
  };
};
