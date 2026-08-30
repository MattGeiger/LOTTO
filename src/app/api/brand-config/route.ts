// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Admin API for brand configurations (docs/CONFIGURABLE_BRANDING_PLAN.md).
// Write methods are staff-gated by the proxy (see src/proxy.ts). Every save
// runs the full post-merge validation pipeline — schema, override allowlist,
// and contrast on the final merged token set — and refuses to persist a
// configuration that fails.

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  activateConfiguration,
  deactivateAll,
  deleteConfiguration,
  getConfiguration,
  listConfigurations,
  saveConfiguration,
} from "@/lib/brand-config/store";
import { seedBrandTemplates } from "@/lib/brand-config/resolve";
import { parseBrandConfig } from "@/lib/brand-theme/config-schema";
import { deriveConfiguredBrandTheme } from "@/lib/brand-theme/configured-theme";
import {
  validateBrandTheme,
  validateOverrideKeys,
} from "@/lib/brand-theme/validate";
import { checkBrandStringReadiness } from "@/lib/translation/auditor";

export const runtime = "nodejs";

const CONFIG_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

const saveSchema = z.object({
  id: z.string().regex(CONFIG_ID_PATTERN),
  payload: z.unknown(),
  activate: z.boolean().optional(),
});

const actionSchema = z.object({
  action: z.enum(["activate", "deactivate"]),
  id: z.string().regex(CONFIG_ID_PATTERN).optional(),
});

/** Validate a payload through the full pipeline; returns issues for the UI. */
const validatePayload = (payload: unknown) => {
  const parsed = parseBrandConfig(payload);
  if (!parsed.ok) {
    return { ok: false as const, errors: parsed.errors };
  }
  const overrideIssues = validateOverrideKeys(parsed.config.overrides);
  const theme = deriveConfiguredBrandTheme(parsed.config);
  const themeIssues = validateBrandTheme(theme);
  const issues = [...overrideIssues, ...themeIssues];
  if (issues.length > 0) {
    return { ok: false as const, errors: issues.map((issue) => issue.message) };
  }
  return { ok: true as const, config: parsed.config };
};

// GET /api/brand-config → templates + saved configurations + active id.
export async function GET() {
  try {
    await seedBrandTemplates();
    const rows = await listConfigurations();
    return NextResponse.json(
      {
        configurations: rows,
        activeId: rows.find((row) => row.isActive)?.id ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[BrandConfig] GET failed:", error);
    return NextResponse.json(
      { error: "Unable to load appearance configurations. Please try again shortly." },
      { status: 500 },
    );
  }
}

// PUT /api/brand-config — save (and optionally activate) a configuration.
export async function PUT(request: Request) {
  try {
    const body = saveSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const existing = await getConfiguration(body.data.id);
    if (existing?.isTemplate) {
      return NextResponse.json(
        { error: "Templates are read-only. Duplicate the template instead." },
        { status: 409 },
      );
    }
    const validated = validatePayload(body.data.payload);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "The appearance configuration has problems.", issues: validated.errors },
        { status: 422 },
      );
    }
    await saveConfiguration(body.data.id, validated.config);
    if (body.data.activate) {
      const serviceLabel = validated.config.identity.serviceLabel?.trim();
      if (serviceLabel) {
        const readiness = await checkBrandStringReadiness(serviceLabel);
        if (!readiness.ready) {
          return NextResponse.json(
            {
              error: "The appearance was saved as a draft, but its service heading is not translated for every enabled language.",
              missingLanguages: readiness.missingLanguages,
            },
            { status: 409 },
          );
        }
      }
      await activateConfiguration(body.data.id);
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[BrandConfig] PUT failed:", error);
    return NextResponse.json(
      { error: "Unable to save the appearance configuration. Please try again shortly." },
      { status: 500 },
    );
  }
}

// POST /api/brand-config — activate a saved configuration or revert to the
// built-in brand (deactivate).
export async function POST(request: Request) {
  try {
    const body = actionSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (body.data.action === "deactivate") {
      await deactivateAll();
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    if (!body.data.id) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const row = await getConfiguration(body.data.id);
    if (!row) {
      return NextResponse.json({ error: "Configuration not found." }, { status: 404 });
    }
    if (row.isTemplate) {
      return NextResponse.json(
        { error: "Templates cannot be activated directly. Duplicate the template first." },
        { status: 409 },
      );
    }
    // Re-validate at activation time so a payload saved under an older schema
    // can never become the live brand while invalid.
    const validated = validatePayload(row.payload);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "This configuration is no longer valid.", issues: validated.errors },
        { status: 422 },
      );
    }
    const serviceLabel = validated.config.identity.serviceLabel?.trim();
    if (serviceLabel) {
      const readiness = await checkBrandStringReadiness(serviceLabel);
      if (!readiness.ready) {
        return NextResponse.json(
          {
            error: "This appearance cannot be activated until its service heading is translated for every enabled language.",
            missingLanguages: readiness.missingLanguages,
          },
          { status: 409 },
        );
      }
    }
    await activateConfiguration(body.data.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[BrandConfig] POST failed:", error);
    return NextResponse.json(
      { error: "Unable to update the active appearance. Please try again shortly." },
      { status: 500 },
    );
  }
}

// DELETE /api/brand-config?id=... — remove a saved (non-template) configuration.
export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!CONFIG_ID_PATTERN.test(id)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    await deleteConfiguration(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[BrandConfig] DELETE failed:", error);
    return NextResponse.json(
      { error: "Unable to delete the configuration. Please try again shortly." },
      { status: 500 },
    );
  }
}
