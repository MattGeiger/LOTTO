// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { entries, invalidate, readBrand, readTranslations, readLanguages, write } = vi.hoisted(() => ({
  entries: new Map<string, Promise<unknown>>(), invalidate: vi.fn(),
  readBrand: vi.fn(), readTranslations: vi.fn(), readLanguages: vi.fn(), write: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn(),
  unstable_cache: (read: (...args: unknown[]) => Promise<unknown>, keys: string[], options: { revalidate: unknown }) => {
    expect(options.revalidate).toBe(false);
    return (...args: unknown[]) => {
      const key = JSON.stringify([keys, args]);
      if (!entries.has(key)) {
        const value = Promise.resolve().then(() => read(...args)).catch(error => { entries.delete(key); throw error; });
        entries.set(key, value);
      }
      return entries.get(key);
    };
  },
  revalidateTag: (...args: unknown[]) => { invalidate(...args); entries.clear(); },
}));
vi.mock("@/lib/brand-config/store-db", () => ({
  getActiveConfiguration: readBrand, getConfiguration: vi.fn(), listConfigurations: vi.fn(),
  seedTemplate: vi.fn(), deleteTemplate: vi.fn(), saveConfiguration: write,
  activateConfiguration: write, deactivateAll: write, deleteConfiguration: write,
}));
vi.mock("@/lib/translation/translations-store-db", () => ({
  list: readTranslations, get: vi.fn(), upsert: write, update: write,
  bulkUpdate: write, remove: write, bulkRemove: write,
}));
vi.mock("@/lib/translation/languages-store-db", () => ({
  listEnabledLanguages: readLanguages, listLanguages: vi.fn(), seedLanguagesIfEmpty: vi.fn(), bulkSetEnabled: write,
}));
const { stateRead, stateWrite } = vi.hoisted(() => ({ stateRead: vi.fn(), stateWrite: vi.fn() }));
vi.mock("@/lib/state-manager", () => ({ stateManager: {
  loadState: stateRead, setAnnouncement: stateWrite, restoreSnapshot: stateWrite,
  undo: stateWrite, redo: stateWrite,
} }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  entries.clear();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("STATE_STORAGE", "db");
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@one.example.com/db");
  vi.stubEnv("VERCEL_ENV", "production");
  readBrand.mockResolvedValue(null);
  readTranslations.mockResolvedValue([]);
  readLanguages.mockResolvedValue([]);
  stateRead.mockResolvedValue({ announcement: null });
  stateWrite.mockResolvedValue({ announcement: null });
  write.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("public configuration cache", () => {
  it("shares brand reads across requests and refreshes after activation", async () => {
    const { getResolvedRuntimeBrand } = await import("@/lib/brand-config/resolve");
    for (let i = 0; i < 20; i++) await getResolvedRuntimeBrand();
    expect(readBrand).toHaveBeenCalledTimes(1);
    const { deactivateAll } = await import("@/lib/brand-config/store");
    await deactivateAll();
    await getResolvedRuntimeBrand();
    expect(readBrand).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith(expect.stringContaining("lotto-public-configuration-v1:"), { expire: 0 });
  });

  it("shares catalog and pack reads, then refreshes after bulk translation edits", async () => {
    const { listClientLanguages, buildLanguagePack } = await import("@/lib/translation/pack");
    for (let i = 0; i < 20; i++) {
      await listClientLanguages();
      await buildLanguagePack("bs");
    }
    expect(readLanguages).toHaveBeenCalledTimes(1);
    expect(readTranslations).toHaveBeenCalledTimes(1);
    expect(stateRead).toHaveBeenCalledTimes(1);
    const { bulkUpdate } = await import("@/lib/translation/translations-store");
    await bulkUpdate([]);
    await listClientLanguages();
    await buildLanguagePack("bs");
    expect(readLanguages).toHaveBeenCalledTimes(2);
    expect(readTranslations).toHaveBeenCalledTimes(2);
    expect(stateRead).toHaveBeenCalledTimes(2);
  });

  it("does not cache a fallback produced by a failed branding read", async () => {
    readBrand.mockRejectedValueOnce(new Error("storage unavailable"));
    const { getResolvedRuntimeBrand } = await import("@/lib/brand-config/resolve");
    expect((await getResolvedRuntimeBrand()).configError).toContain("unreachable");
    expect((await getResolvedRuntimeBrand()).configError).toBeNull();
    expect(readBrand).toHaveBeenCalledTimes(2);
  });

  it("keeps a valid cache when a store write fails", async () => {
    const { getResolvedRuntimeBrand } = await import("@/lib/brand-config/resolve");
    await getResolvedRuntimeBrand();
    write.mockRejectedValueOnce(new Error("write failed"));
    const { deactivateAll } = await import("@/lib/brand-config/store");
    await expect(deactivateAll()).rejects.toThrow("write failed");
    await getResolvedRuntimeBrand();
    expect(invalidate).not.toHaveBeenCalled();
    expect(readBrand).toHaveBeenCalledTimes(1);
  });

  it("isolates caches when the datastore changes", async () => {
    const { cachePublicConfiguration } = await import("@/lib/public-read-cache");
    const read = vi.fn().mockResolvedValue("one");
    const first = cachePublicConfiguration("test", read);
    await first();
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@two.example.com/db");
    vi.resetModules();
    const next = await import("@/lib/public-read-cache");
    await next.cachePublicConfiguration("test", read)();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("bypasses shared caches for local file development", async () => {
    vi.stubEnv("STATE_STORAGE", "file");
    const { cachePublicConfiguration } = await import("@/lib/public-read-cache");
    const read = vi.fn().mockResolvedValue("local");
    const get = cachePublicConfiguration("test", read);
    await get(); await get();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("invalidates all public configuration after every supported store mutation", async () => {
    const brands = await import("@/lib/brand-config/store");
    const translations = await import("@/lib/translation/translations-store");
    const languages = await import("@/lib/translation/languages-store");
    const mutations = [
      () => brands.saveConfiguration("test", {}), () => brands.activateConfiguration("test"),
      () => brands.deactivateAll(), () => brands.deleteConfiguration("test"),
      () => translations.upsert({ originalText: "Close", language: "Spanish", type: "ui_string" }, {}),
      () => translations.update(1, {}),
      () => translations.bulkUpdate([]), () => translations.remove(1),
      () => translations.bulkRemove([1]), () => languages.bulkSetEnabled([]),
    ];
    for (const mutation of mutations) await mutation();
    expect(invalidate).toHaveBeenCalledTimes(mutations.length);
  });

  it.each([
    { action: "setAnnouncement", announcement: null },
    { action: "restoreSnapshot", id: "saved-snapshot" },
    { action: "undo" },
    { action: "redo" },
  ])("refreshes a cached announcement only after a successful state action: $action", async payload => {
    const { buildLanguagePack } = await import("@/lib/translation/pack");
    await buildLanguagePack("bs");
    const { POST } = await import("@/app/api/state/route");
    const request = () => new Request("https://example.com/api/state", {
      method: "POST", body: JSON.stringify(payload),
    });
    stateWrite.mockRejectedValueOnce(new Error("write failed"));
    expect((await POST(request())).status).toBe(500);
    await buildLanguagePack("bs");
    expect(stateRead).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    expect((await POST(request())).status).toBe(200);
    await buildLanguagePack("bs");
    expect(stateRead).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
