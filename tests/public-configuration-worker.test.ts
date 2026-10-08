// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import { hashPublicConfiguration, type PublicConfigurationData } from "@/lib/realtime/public-configuration-protocol";

// Runs the actual Worker and SQLite-backed Durable Object locally. All tokens,
// origins and agency objects are synthetic; no provider account is accessed.
const server = createTestHarness({ workers: [{
  configPath: "workers/realtime-hub/wrangler.jsonc", env: "production",
  secrets: { PUBLISH_TOKEN: "local-configuration-test", CONTROL_TOKEN: "different-local-control" },
  vars: { ALLOWED_ORIGINS: "https://test.example", ENVIRONMENT: "test" },
}] });
const base = "/v1/agencies/configuration-test";
const data: PublicConfigurationData = {
  brandConfiguration: null, enabledLanguageNames: ["English"],
  announcement: null, translations: [],
};
const request = (action: string, body?: unknown, token = "local-configuration-test") => server.fetch(`${base}/${action}`, {
  method: body === undefined ? "GET" : "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const reserve = async (release: string, activate = false) => {
  const response = await request("configuration-revision", { release, activate });
  expect(response.status).toBe(200);
  return (await response.json() as { revision: number }).revision;
};
const envelope = async (revision: number, release = "test-release", publicData = data) => ({
  protocolVersion: 1, agencyId: "configuration-test", revision, release,
  publishedAt: new Date().toISOString(), checksum: await hashPublicConfiguration(publicData), data: publicData,
});

beforeAll(async () => { await server.listen(); }, 30_000);
afterAll(async () => { await server.close(); });

describe("Cloudflare public configuration storage", () => {
  it("requires authentication and explicit first-release activation", async () => {
    expect((await request("configuration-revision", { release: "test-release", activate: true }, "wrong")).status).toBe(401);
    expect((await request("configuration-status", undefined, "wrong")).status).toBe(401);
    expect((await request("configuration-revision", { release: "test-release" })).status).toBe(409);
    expect((await server.fetch(`${base}/configuration`)).status).toBe(404);
  });

  it("rejects wrong agencies, checksums and origins before storing", async () => {
    const revision = await reserve("test-release", true);
    const valid = await envelope(revision);
    expect((await request("configuration", { ...valid, agencyId: "other-agency" })).status).toBe(400);
    expect((await request("configuration", { ...valid, checksum: `sha256:${"0".repeat(64)}` })).status).toBe(400);
    expect((await server.fetch(`${base}/configuration`, { headers: { origin: "https://other.example" } })).status).toBe(403);
    expect((await request("configuration", valid)).status).toBe(202);
    const response = await server.fetch(`${base}/configuration`, { headers: { origin: "https://test.example" } });
    expect(response.headers.get("access-control-allow-origin")).toBe("https://test.example");
    expect(await response.json()).toEqual(valid);
  });

  it("supersedes overlapping publications, handles duplicates and prevents old release reactivation", async () => {
    const older = await reserve("test-release");
    const newer = await reserve("test-release");
    const next = await envelope(newer);
    expect((await request("configuration", next)).status).toBe(202);
    expect(await (await request("configuration", await envelope(older))).json()).toMatchObject({ superseded: true });
    expect(await (await request("configuration", next)).json()).toMatchObject({ duplicate: true });
    const conflicting = await envelope(newer, "test-release", { ...data, announcement: "Changed" });
    expect((await request("configuration", conflicting)).status).toBe(409);
    const activated = await reserve("next-release", true);
    expect((await request("configuration-revision", { release: "test-release" })).status).toBe(409);
    expect((await request("configuration", next)).status).toBe(409);
    expect((await request("configuration", await envelope(activated, "next-release"))).status).toBe(202);
  });

  it("round-trips a multi-chunk Unicode document and removes obsolete chunks", async () => {
    const largeData = { ...data, announcement: "🍎中文".repeat(20_000) };
    const large = await envelope(await reserve("next-release"), "next-release", largeData);
    expect((await request("configuration", large)).status).toBe(202);
    expect(await (await server.fetch(`${base}/configuration`)).json()).toEqual(large);
    const small = await envelope(await reserve("next-release"), "next-release");
    expect((await request("configuration", small)).status).toBe(202);
    expect(await (await server.fetch(`${base}/configuration`)).json()).toEqual(small);
  });
});
