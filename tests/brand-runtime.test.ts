// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

// Phase 1 acceptance for the configurable branding system
// (docs/CONFIGURABLE_BRANDING_PLAN.md): resolution order, fail-closed
// behavior, store semantics, API validation, and the weak-form brand-swap
// (an activated template fully displaces the compiled identity).

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WTH_TEMPLATE } from "@/lib/brand-theme/presets";

const CUSTOM_TEMPLATE = {
  ...WTH_TEMPLATE,
  identity: {
    ...WTH_TEMPLATE.identity,
    organizationName: "Example Food Pantry",
    appName: "Example Pantry Queue",
    shortName: "Example Pantry",
  },
  capabilities: {
    inventory: { enabled: false, feedUrl: null },
  },
};

const tempFile = () =>
  path.join(
    os.tmpdir(),
    `lotto-brand-runtime-${process.pid}-${Math.random().toString(36).slice(2)}.json`,
  );

let storeFile: string;

const freshImports = async () => {
  vi.resetModules();
  const store = await import("@/lib/brand-config/store");
  const resolve = await import("@/lib/brand-config/resolve");
  return { store, resolve };
};

beforeEach(() => {
  storeFile = tempFile();
  vi.stubEnv("BRAND_CONFIG_FILE", storeFile);
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("STATE_STORAGE", "");
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.resetModules();
  await fs.rm(storeFile, { force: true });
});

describe("brand resolution order", () => {
  it("falls back to the compiled WTH default with no configuration", async () => {
    const { resolve } = await freshImports();
    const result = await resolve.getResolvedRuntimeBrand();
    expect(result.brand.source).toBe("profile");
    expect(result.brand.brandId).toBe("william-temple-house");
    expect(result.brand.appName).toBe("William Temple House App");
    expect(result.themeCss).toBeNull();
    expect(result.configError).toBeNull();
  });

  it("prefers an active configuration over the compiled profile", async () => {
    const { store, resolve } = await freshImports();
    await store.saveConfiguration("my-brand", CUSTOM_TEMPLATE);
    await store.activateConfiguration("my-brand");

    const result = await resolve.getResolvedRuntimeBrand();
    expect(result.brand.source).toBe("custom");
    expect(result.brand.brandId).toBe("custom");
    expect(result.brand.organizationName).toBe("Example Food Pantry");
    expect(result.themeCss).toContain(':root[data-brand="custom"][data-brand="custom"]');
    expect(result.configError).toBeNull();
  });

  it("fails closed to the compiled profile on an invalid active payload", async () => {
    const { store, resolve } = await freshImports();
    await store.saveConfiguration("broken", { schemaVersion: 999 });
    await store.activateConfiguration("broken");

    const result = await resolve.getResolvedRuntimeBrand();
    expect(result.brand.source).toBe("profile");
    expect(result.brand.brandId).toBe("william-temple-house");
    expect(result.themeCss).toBeNull();
    expect(result.configError).toMatch(/invalid/i);
  });
});

describe("weak-form brand swap (template activation displaces compiled identity)", () => {
  it("lets a custom configuration displace the compiled identity", async () => {
    const { store, resolve } = await freshImports();
    await store.saveConfiguration("swap", CUSTOM_TEMPLATE);
    await store.activateConfiguration("swap");

    const result = await resolve.getResolvedRuntimeBrand();
    expect(result.brand.source).toBe("custom");
    expect(result.brand.organizationName).toBe("Example Food Pantry");
    expect(result.brand.appName).toBe("Example Pantry Queue");
    expect(result.brand.shortName).toBe("Example Pantry");
    expect(result.brand.logo.lightSrc).toBe("/brand/wth-logo-horizontal-light.svg");
    expect(result.brand.pwa.themeColor).toBe("#2762a2");
    expect(result.brand.inventory.enabled).toBe(false);
    expect(result.themeCss).toContain("--primary: oklch(");

    const { default: manifest } = await import("@/app/manifest");
    expect(await manifest()).toMatchObject({
      name: "Example Pantry Queue",
      short_name: "Example Pantry",
      theme_color: "#2762a2",
    });
  });
});

describe("configurable service label", () => {
  it("passes a configured service heading through the resolver; profiles use the default", async () => {
    const { store, resolve } = await freshImports();
    await store.saveConfiguration("gpu-library", {
      ...CUSTOM_TEMPLATE,
      identity: {
        ...CUSTOM_TEMPLATE.identity,
        serviceLabel: "GPU Library Queue For",
      },
    });
    await store.activateConfiguration("gpu-library");
    const custom = await resolve.getResolvedRuntimeBrand();
    expect(custom.brand.serviceLabel).toBe("GPU Library Queue For");

    await store.deactivateAll();
    const profile = await resolve.getResolvedRuntimeBrand();
    // Compiled profiles keep the translated default heading.
    expect(profile.brand.serviceLabel).toBeNull();
  });
});

describe("brand configuration store (file backend)", () => {
  it("keeps a single active configuration and read-only templates", async () => {
    const { store } = await freshImports();
    await store.seedTemplate("template-a", CUSTOM_TEMPLATE);
    await store.saveConfiguration("one", CUSTOM_TEMPLATE);
    await store.saveConfiguration("two", WTH_TEMPLATE);

    await store.activateConfiguration("one");
    await store.activateConfiguration("two");
    let rows = await store.listConfigurations();
    expect(rows.filter((row) => row.isActive).map((row) => row.id)).toEqual(["two"]);

    // Templates cannot be activated, overwritten, or deleted.
    await store.activateConfiguration("template-a");
    rows = await store.listConfigurations();
    expect(rows.find((row) => row.id === "template-a")?.isActive).toBe(false);
    await store.saveConfiguration("template-a", WTH_TEMPLATE);
    rows = await store.listConfigurations();
    expect(rows.find((row) => row.id === "template-a")?.payload).toMatchObject({
      identity: { organizationName: "Example Food Pantry" },
    });
    await store.deleteConfiguration("template-a");
    expect(await store.getConfiguration("template-a")).not.toBeNull();

    // Deleting a saved configuration works.
    await store.deleteConfiguration("one");
    expect(await store.getConfiguration("one")).toBeNull();
  });
});

describe("brand configuration API", () => {
  it("seeds templates on GET and returns the active id", async () => {
    await freshImports();
    const routes = await import("@/app/api/brand-config/route");
    const response = await routes.GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    const ids = body.configurations.map((row: { id: string }) => row.id);
    expect(ids).toEqual(["template-william-temple-house"]);
    expect(body.activeId).toBeNull();
  });

  it("prunes retired templates without deleting saved appearances", async () => {
    const { store } = await freshImports();
    await store.seedTemplate("template-retired-profile", CUSTOM_TEMPLATE);
    await store.saveConfiguration("saved-custom", CUSTOM_TEMPLATE);

    const routes = await import("@/app/api/brand-config/route");
    const body = await (await routes.GET()).json();
    expect(body.configurations.map((row: { id: string }) => row.id)).toEqual([
      "template-william-temple-house",
      "saved-custom",
    ]);
  });

  it("refuses to save an invalid or contrast-failing configuration", async () => {
    await freshImports();
    const routes = await import("@/app/api/brand-config/route");

    const invalid = await routes.PUT(
      new Request("http://localhost/api/brand-config", {
        method: "PUT",
        body: JSON.stringify({ id: "bad", payload: { schemaVersion: 999 } }),
      }),
    );
    expect(invalid.status).toBe(422);

    const badContrast = await routes.PUT(
      new Request("http://localhost/api/brand-config", {
        method: "PUT",
        body: JSON.stringify({
          id: "low-contrast",
          payload: {
            ...CUSTOM_TEMPLATE,
            overrides: {
              ...CUSTOM_TEMPLATE.overrides,
              light: { "primary-foreground": "oklch(0.63 0.12 163)" },
            },
          },
        }),
      }),
    );
    expect(badContrast.status).toBe(422);
    const body = await badContrast.json();
    expect(body.issues.join("\n")).toMatch(/filled primary buttons/);
  });

  it("saves, activates, and deactivates a valid configuration", async () => {
    await freshImports();
    const routes = await import("@/app/api/brand-config/route");

    const saved = await routes.PUT(
      new Request("http://localhost/api/brand-config", {
        method: "PUT",
        body: JSON.stringify({ id: "my-brand", payload: CUSTOM_TEMPLATE }),
      }),
    );
    expect(saved.status).toBe(200);

    const activated = await routes.POST(
      new Request("http://localhost/api/brand-config", {
        method: "POST",
        body: JSON.stringify({ action: "activate", id: "my-brand" }),
      }),
    );
    expect(activated.status).toBe(200);

    let list = await (await routes.GET()).json();
    expect(list.activeId).toBe("my-brand");

    const deactivated = await routes.POST(
      new Request("http://localhost/api/brand-config", {
        method: "POST",
        body: JSON.stringify({ action: "deactivate" }),
      }),
    );
    expect(deactivated.status).toBe(200);
    list = await (await routes.GET()).json();
    expect(list.activeId).toBeNull();
  });

  it("rejects template writes and template activation", async () => {
    await freshImports();
    const routes = await import("@/app/api/brand-config/route");
    await routes.GET(); // seed templates

    const write = await routes.PUT(
      new Request("http://localhost/api/brand-config", {
        method: "PUT",
        body: JSON.stringify({
          id: "template-william-temple-house",
          payload: CUSTOM_TEMPLATE,
        }),
      }),
    );
    expect(write.status).toBe(409);

    const activate = await routes.POST(
      new Request("http://localhost/api/brand-config", {
        method: "POST",
        body: JSON.stringify({ action: "activate", id: "template-william-temple-house" }),
      }),
    );
    expect(activate.status).toBe(409);
  });
});
