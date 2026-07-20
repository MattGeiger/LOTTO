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

import { ST_JOHNS_TEMPLATE, WTH_TEMPLATE } from "@/lib/brand-theme/presets";

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

  it("respects NEXT_PUBLIC_LOTTO_BRAND when no configuration is active", async () => {
    vi.stubEnv("NEXT_PUBLIC_LOTTO_BRAND", "st-johns-food-share");
    vi.stubEnv("NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL", "");
    const { resolve } = await freshImports();
    const result = await resolve.getResolvedRuntimeBrand();
    expect(result.brand.source).toBe("profile");
    expect(result.brand.brandId).toBe("st-johns-food-share");
    expect(result.brand.inventory.enabled).toBe(false);
  });

  it("prefers an active configuration over the compiled profile", async () => {
    const { store, resolve } = await freshImports();
    await store.saveConfiguration("my-brand", ST_JOHNS_TEMPLATE);
    await store.activateConfiguration("my-brand");

    const result = await resolve.getResolvedRuntimeBrand();
    expect(result.brand.source).toBe("custom");
    expect(result.brand.brandId).toBe("custom");
    expect(result.brand.organizationName).toBe("St. Johns Food Share");
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
  it("presents St. Johns on a WTH deployment and vice versa", async () => {
    for (const [template, expected] of [
      [
        ST_JOHNS_TEMPLATE,
        {
          organizationName: "St. Johns Food Share",
          appName: "St. Johns Food Share Queue",
          shortName: "St Johns Food Share App",
          logoLight: "/brands/st-johns-food-share/logo.png",
          themeColor: "#33a478",
          inventoryEnabled: false,
        },
      ],
      [
        WTH_TEMPLATE,
        {
          organizationName: "William Temple House",
          appName: "William Temple House App",
          shortName: "William Temple House App",
          logoLight: "/wth-logo-horizontal.png",
          themeColor: "#2762a2",
          inventoryEnabled: true,
        },
      ],
    ] as const) {
      storeFile = tempFile();
      vi.stubEnv("BRAND_CONFIG_FILE", storeFile);
      const { store, resolve } = await freshImports();
      await store.saveConfiguration("swap", template);
      await store.activateConfiguration("swap");

      const result = await resolve.getResolvedRuntimeBrand();
      expect(result.brand.source).toBe("custom");
      expect(result.brand.organizationName).toBe(expected.organizationName);
      expect(result.brand.appName).toBe(expected.appName);
      expect(result.brand.shortName).toBe(expected.shortName);
      expect(result.brand.logo.lightSrc).toBe(expected.logoLight);
      expect(result.brand.pwa.themeColor).toBe(expected.themeColor);
      expect(result.brand.inventory.enabled).toBe(expected.inventoryEnabled);
      // The derived theme ships inline and carries the brand primary.
      expect(result.themeCss).toContain("--primary: oklch(");

      // Manifest identity follows the active configuration too.
      const { default: manifest } = await import("@/app/manifest");
      expect(await manifest()).toMatchObject({
        name: expected.appName,
        short_name: expected.shortName,
        theme_color: expected.themeColor,
      });
      await fs.rm(storeFile, { force: true });
    }
  });
});

describe("configurable service label", () => {
  it("passes a configured service heading through the resolver; profiles use the default", async () => {
    const { store, resolve } = await freshImports();
    await store.saveConfiguration("gpu-library", {
      ...ST_JOHNS_TEMPLATE,
      identity: {
        ...ST_JOHNS_TEMPLATE.identity,
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
    await store.seedTemplate("template-a", ST_JOHNS_TEMPLATE);
    await store.saveConfiguration("one", ST_JOHNS_TEMPLATE);
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
      identity: { organizationName: "St. Johns Food Share" },
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
    expect(ids).toContain("template-william-temple-house");
    expect(ids).toContain("template-st-johns-food-share");
    expect(body.activeId).toBeNull();
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
            ...ST_JOHNS_TEMPLATE,
            overrides: {
              ...ST_JOHNS_TEMPLATE.overrides,
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
        body: JSON.stringify({ id: "my-brand", payload: ST_JOHNS_TEMPLATE }),
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
          id: "template-st-johns-food-share",
          payload: ST_JOHNS_TEMPLATE,
        }),
      }),
    );
    expect(write.status).toBe(409);

    const activate = await routes.POST(
      new Request("http://localhost/api/brand-config", {
        method: "POST",
        body: JSON.stringify({ action: "activate", id: "template-st-johns-food-share" }),
      }),
    );
    expect(activate.status).toBe(409);
  });
});
