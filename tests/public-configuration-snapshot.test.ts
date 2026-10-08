// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { version } from "../package.json";
import { hashPublicConfiguration, type PublicConfigurationData } from "@/lib/realtime/public-configuration-protocol";
import { WTH_TEMPLATE } from "@/lib/brand-theme/presets";

const mocks = vi.hoisted(() => ({
  brand: vi.fn(), languages: vi.fn(), translations: vi.fn(), state: vi.fn(), write: vi.fn(), send: vi.fn(), auth: vi.fn(),
}));
vi.mock("next/cache", () => ({ unstable_noStore: vi.fn(), unstable_cache: (read: unknown) => read, revalidateTag: vi.fn() }));
vi.mock("@vercel/queue", () => ({ send: mocks.send }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/brand-config/store", () => ({
  getActiveConfiguration: mocks.brand, seedTemplate: vi.fn(), deleteTemplate: vi.fn(), listConfigurations: vi.fn(),
}));
vi.mock("@/lib/translation/languages-store", () => ({ listEnabledLanguages: mocks.languages }));
vi.mock("@/lib/translation/translations-store", () => ({ list: mocks.translations }));
vi.mock("@/lib/state-manager", () => ({ stateManager: { loadState: mocks.state } }));
vi.mock("@/lib/ui-strings", () => ({ UI_STRINGS_EN: { nowServing: "Now Serving", close: "Close" } }));

let published: PublicConfigurationData;
let revision: number;
let publishedRevision: number;
let failPublication: boolean;
let failRead: boolean;
let envelopeOverride: Record<string, unknown>;

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("STATE_STORAGE", "db");
  vi.stubEnv("DATABASE_URL", "postgresql://test");
  vi.stubEnv("LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED", "true");
  vi.stubEnv("LOTTO_DEPLOYMENT_ENVIRONMENT", "production");
  vi.stubEnv("LOTTO_REALTIME_HUB_URL", "https://wth-test.workers.dev");
  vi.stubEnv("LOTTO_REALTIME_EXPECTED_HUB_HOST", "wth-test.workers.dev");
  vi.stubEnv("LOTTO_REALTIME_AGENCY_ID", "william-temple-house");
  vi.stubEnv("LOTTO_REALTIME_PUBLISH_TOKEN", "p".repeat(40));
  published = {
    brandConfiguration: null, enabledLanguageNames: ["English", "Bosnian"], announcement: "Open today",
    translations: [
      { originalText: "Now Serving", translatedText: "Sada", language: "Bosnian", type: "ui_string" },
      { originalText: "Close", translatedText: "Zatvori", language: "Bosnian", type: "ui_string" },
      { originalText: "Open today", translatedText: "Otvoreno", language: "Bosnian", type: "announcement" },
    ],
  };
  revision = 1; publishedRevision = 1; failPublication = false; failRead = false; envelopeOverride = {};
  for (const read of [mocks.brand, mocks.languages, mocks.translations, mocks.state]) {
    read.mockRejectedValue(new Error("Unexpected public database access"));
  }
  mocks.write.mockResolvedValue("committed"); mocks.send.mockResolvedValue({}); mocks.auth.mockResolvedValue({ user: { email: "staff@example.com" } });
  vi.stubGlobal("fetch", vi.fn(async (input: URL, init?: RequestInit) => {
    const path = input.pathname;
    if (path.endsWith("configuration-revision")) return Response.json({ revision: ++revision });
    if (path.endsWith("configuration-status")) return Response.json({ release: version, reservedRevision: revision, publishedRevision });
    if (init?.method === "POST") {
      if (failPublication) return Response.json({}, { status: 503 });
      const envelope = JSON.parse(init.body as string);
      published = envelope.data; publishedRevision = envelope.revision;
      return Response.json({ accepted: true }, { status: 202 });
    }
    if (failRead) return Response.json({}, { status: 404 });
    return Response.json({
      protocolVersion: 1, agencyId: "william-temple-house", release: version, revision: publishedRevision,
      publishedAt: new Date().toISOString(), checksum: await hashPublicConfiguration(published), data: published,
      ...envelopeOverride,
    });
  }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const expectNoDatabaseReads = () => {
  for (const read of [mocks.brand, mocks.languages, mocks.translations, mocks.state]) expect(read).not.toHaveBeenCalled();
};
const enableAuthoritativeReads = () => {
  mocks.brand.mockResolvedValue(null);
  mocks.languages.mockResolvedValue([{ name: "English" }, { name: "Bosnian" }]);
  mocks.translations.mockResolvedValue(published.translations.map(row => ({ ...row, status: "completed", metadata: { secret: true } })));
  mocks.state.mockResolvedValue({ announcement: { enabled: true, markdown: published.announcement } });
};

describe("published public configuration", () => {
  it("serves repeated cold branding, catalog and legacy pack routes with zero database reads", async () => {
    for (let round = 0; round < 3; round++) {
      vi.resetModules(); // Each group has an empty Next/module cache.
      const { getResolvedRuntimeBrand } = await import("@/lib/brand-config/resolve");
      const languages = await import("@/app/api/languages/route");
      const packs = await import("@/app/api/translations/pack/route");
      for (let index = 0; index < 5; index++) {
        expect((await getResolvedRuntimeBrand()).configError).toBeNull();
        const response = await languages.GET(new Request("https://example.com/api/languages?client"));
        expect((await response.json()).languages.at(-1).code).toBe("bs");
        const packResponse = await packs.GET(new Request("https://example.com/api/translations/pack?code=bs"));
        expect(packResponse.headers.get("x-lotto-configuration-source")).toBe("cloudflare");
        expect((await packResponse.json()).pack).toMatchObject({ uiStrings: { nowServing: "Sada" }, announcement: "Otvoreno" });
      }
    }
    expectNoDatabaseReads();
  });

  it.each(["missing", "wrong agency", "wrong release", "wrong checksum", "invalid flag"])("refuses SQL fallback for %s", async mode => {
    if (mode === "missing") failRead = true;
    if (mode === "wrong agency") envelopeOverride.agencyId = "another-agency";
    if (mode === "wrong release") envelopeOverride.release = "old-release";
    if (mode === "wrong checksum") envelopeOverride.checksum = `sha256:${"0".repeat(64)}`;
    if (mode === "invalid flag") vi.stubEnv("LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED", "invalid");
    const { getResolvedRuntimeBrand } = await import("@/lib/brand-config/resolve");
    expect((await getResolvedRuntimeBrand()).configError).toBeTruthy();
    const { GET } = await import("@/app/api/translations/pack/route");
    expect((await GET(new Request("https://example.com/api/translations/pack?code=bs"))).status).toBe(503);
    expectNoDatabaseReads();
  });

  it("does not fetch any datastore for an unknown language", async () => {
    const { buildLanguagePack } = await import("@/lib/translation/pack");
    expect(await buildLanguagePack("unknown")).toBeNull();
    expect(fetch).not.toHaveBeenCalled(); expectNoDatabaseReads();
  });

  it("derives legacy-safe custom branding from the published document without SQL", async () => {
    published.brandConfiguration = structuredClone(WTH_TEMPLATE);
    published.brandConfiguration.identity.serviceLabel = "Published heading";
    const { getResolvedRuntimeBrand } = await import("@/lib/brand-config/resolve");
    const resolved = await getResolvedRuntimeBrand();
    expect(resolved.config?.identity.serviceLabel).toBe("Published heading");
    expect(resolved.themeCss).toContain("@supports (color: oklch(0 0 0))");
    expect(resolved.configError).toBeNull();
    expectNoDatabaseReads();
  });

  it("keeps staff translation discovery authoritative while public publication is delayed", async () => {
    const current = structuredClone(WTH_TEMPLATE);
    current.identity.serviceLabel = "Committed staff heading";
    mocks.brand.mockResolvedValue({ id: "active", payload: current });
    failRead = true;
    const { getBrandStringSources } = await import("@/lib/translation/content");
    expect(await getBrandStringSources()).toEqual(["Committed staff heading"]);
    expect(mocks.brand).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves committed success when the deployment flag is invalid", async () => {
    vi.stubEnv("LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED", "invalid");
    const { invalidatePublicConfigurationAfter } = await import("@/lib/public-read-cache");
    expect(await invalidatePublicConfigurationAfter(mocks.write)()).toBe("committed");
    expectNoDatabaseReads();
  });

  it("publishes committed changes and subsequent public reads see them without SQL", async () => {
    enableAuthoritativeReads();
    mocks.translations.mockResolvedValue([{ originalText: "Now Serving", translatedText: "Updated", language: "Bosnian", type: "ui_string", status: "completed" }]);
    const { invalidatePublicConfigurationAfter } = await import("@/lib/public-read-cache");
    expect(await invalidatePublicConfigurationAfter(mocks.write)()).toBe("committed");
    for (const read of [mocks.brand, mocks.languages, mocks.translations, mocks.state]) expect(read).toHaveBeenCalledTimes(1);
    expect(mocks.send).not.toHaveBeenCalled();
    for (const read of [mocks.brand, mocks.languages, mocks.translations, mocks.state]) read.mockClear();
    const { buildLanguagePack } = await import("@/lib/translation/pack");
    expect((await buildLanguagePack("bs"))?.uiStrings.nowServing).toBe("Updated");
    expectNoDatabaseReads();
  });

  it("publishes readiness and enablement after staff changes with no public SQL", async () => {
    published.brandConfiguration = structuredClone(WTH_TEMPLATE);
    published.brandConfiguration.identity.serviceLabel = "Current heading";
    const { listClientLanguages } = await import("@/lib/translation/pack");
    expect((await listClientLanguages()).some(row => row.code === "bs")).toBe(false);
    enableAuthoritativeReads();
    mocks.brand.mockResolvedValue({ payload: published.brandConfiguration });
    mocks.translations.mockResolvedValue([
      ...published.translations,
      { type: "brand_string", language: "Bosnian", originalText: "Current heading", translatedText: "Naslov" },
    ]);
    const { invalidatePublicConfigurationAfter } = await import("@/lib/public-read-cache");
    await invalidatePublicConfigurationAfter(mocks.write)();
    for (const read of [mocks.brand, mocks.languages, mocks.translations, mocks.state]) read.mockClear();
    expect((await listClientLanguages()).some(row => row.code === "bs")).toBe(true);
    expectNoDatabaseReads();
    mocks.languages.mockResolvedValue([{ name: "English" }]);
    await invalidatePublicConfigurationAfter(mocks.write)();
    for (const read of [mocks.brand, mocks.languages, mocks.translations, mocks.state]) read.mockClear();
    expect((await listClientLanguages()).some(row => row.code === "bs")).toBe(false);
    expectNoDatabaseReads();
  });

  it("coalesces many nested staff writes into one publication, even after partial failure", async () => {
    enableAuthoritativeReads();
    const { invalidatePublicConfigurationAfter, withPublicConfigurationPublicationBatch } = await import("@/lib/public-read-cache");
    const write = invalidatePublicConfigurationAfter(mocks.write);
    await withPublicConfigurationPublicationBatch(async () => {
      for (let index = 0; index < 20; index++) await write();
      await withPublicConfigurationPublicationBatch(async () => { await write(); });
      expectNoDatabaseReads(); // Publication waits for the entire operation.
    });
    for (const read of [mocks.brand, mocks.languages, mocks.translations, mocks.state]) {
      expect(read).toHaveBeenCalledTimes(1); read.mockClear();
    }
    await expect(withPublicConfigurationPublicationBatch(async () => {
      await write(); throw new Error("later operation failed");
    })).rejects.toThrow("later operation failed");
    for (const read of [mocks.brand, mocks.languages, mocks.translations, mocks.state]) expect(read).toHaveBeenCalledTimes(1);
  });

  it("preserves committed success on publication failure and repairs without another staff change", async () => {
    enableAuthoritativeReads(); failPublication = true;
    const { invalidatePublicConfigurationAfter } = await import("@/lib/public-read-cache");
    expect(await invalidatePublicConfigurationAfter(mocks.write)()).toBe("committed");
    expect(mocks.send).toHaveBeenCalledTimes(1);
    const job = mocks.send.mock.calls[0][1];
    failPublication = false;
    const { repairPublicConfiguration } = await import("@/lib/realtime/configuration-publication");
    await repairPublicConfiguration(job);
    for (const read of [mocks.brand, mocks.languages, mocks.translations, mocks.state]) read.mockClear();
    await repairPublicConfiguration(job); // Already delivered: no new SQL.
    await repairPublicConfiguration({ ...job, agencyId: "another-agency" });
    await repairPublicConfiguration({ ...job, release: "old-release" });
    expectNoDatabaseReads();
  });

  it("does not publish when the underlying write fails", async () => {
    mocks.write.mockRejectedValue(new Error("write failed"));
    const { invalidatePublicConfigurationAfter } = await import("@/lib/public-read-cache");
    await expect(invalidatePublicConfigurationAfter(mocks.write)()).rejects.toThrow("write failed");
    expect(fetch).not.toHaveBeenCalled(); expectNoDatabaseReads();
  });

  it("publishes only current public text, excluding historical announcements and job metadata", async () => {
    enableAuthoritativeReads();
    mocks.translations.mockResolvedValue([
      ...published.translations.map(row => ({ ...row, metadata: { private: true } })),
      { originalText: "Old announcement", translatedText: "Old", language: "Bosnian", type: "announcement" },
      { originalText: "Retired heading", translatedText: "Old", language: "Bosnian", type: "brand_string" },
    ]);
    const { buildAuthoritativePublicConfiguration } = await import("@/lib/realtime/configuration-publication");
    const data = await buildAuthoritativePublicConfiguration();
    expect(data.translations).toHaveLength(3);
    expect(JSON.stringify(data)).not.toContain("metadata");
    expect(JSON.stringify(data)).not.toContain("Old announcement");
  });

  it("requires staff authentication for explicit bootstrap before any datastore access", async () => {
    mocks.auth.mockResolvedValue({ error: "invalid session" });
    const { POST } = await import("@/app/api/state/configuration/route");
    expect((await POST(new Request("https://example.com/api/state/configuration", { method: "POST", body: "{}" }))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled(); expectNoDatabaseReads();
  });
});
