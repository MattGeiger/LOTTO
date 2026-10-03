// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultState } from "@/lib/state-types";
import { buildPublicStateEnvelope } from "@/lib/realtime/public-state-protocol";

const { loadState, auth } = vi.hoisted(() => ({ loadState: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/state-manager", () => ({ stateManager: { loadStateWithRevision: loadState } }));
vi.mock("@/lib/auth", () => ({ auth }));

const request = (cookie?: string) => new Request("https://williamtemple.app/api/state?realtime=poll", {
  headers: cookie ? { cookie } : {},
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubEnv("LOTTO_PUBLIC_STATE_SNAPSHOT_ENABLED", "true");
  vi.stubEnv("LOTTO_DEPLOYMENT_ENVIRONMENT", "production");
  vi.stubEnv("LOTTO_REALTIME_APPLICATION_ENABLED", "false");
  vi.stubEnv("LOTTO_REALTIME_SOURCE_CANARY", "false");
  vi.stubEnv("LOTTO_REALTIME_HUB_URL", "https://snapshot.example.com");
  vi.stubEnv("LOTTO_REALTIME_EXPECTED_HUB_HOST", "snapshot.example.com");
  vi.stubEnv("LOTTO_REALTIME_AGENCY_ID", "wth");
  auth.mockResolvedValue(null);
  loadState.mockResolvedValue({ state: { ...defaultState, queueSession: { private: true } }, revision: 99 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const mockSnapshot = async (overrides = {}) => {
  const envelope = await buildPublicStateEnvelope({
    agencyId: "wth", revision: 42, state: defaultState,
    committedAt: "2026-01-01T00:00:00Z", publishedAt: "2026-01-01T00:00:00Z",
  });
  const fetch = vi.fn().mockImplementation(async () => Response.json({ ...envelope, ...overrides }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

describe("anonymous legacy state requests", () => {
  it("serves repeated polling from Cloudflare with zero authoritative reads", async () => {
    const fetch = await mockSnapshot();
    const { GET } = await import("@/app/api/state/route");
    for (let i = 0; i < 100; i++) {
      const response = await GET(request());
      expect(response.status).toBe(200);
      expect(response.headers.get("x-lotto-state-source")).toBe("cloudflare");
      expect(response.headers.get("x-lotto-state-revision")).toBe("42");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vary")).toBe("Cookie");
      expect(await response.json()).toEqual({ ...defaultState, queueSession: null });
    }
    expect(loadState).not.toHaveBeenCalled();
    expect(auth).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(100);
    expect(fetch).toHaveBeenCalledWith("https://snapshot.example.com/v1/agencies/wth/state", expect.objectContaining({
      cache: "no-store", redirect: "error", signal: expect.any(AbortSignal),
    }));
  });

  it.each([null, { error: "SessionError" }])("does not trust a forged or errored session: %j", async session => {
    await mockSnapshot();
    auth.mockResolvedValue(session);
    const { GET } = await import("@/app/api/state/route");
    const response = await GET(request("authjs.session-token=forged"));
    expect(response.headers.get("x-lotto-state-source")).toBe("cloudflare");
    expect(loadState).not.toHaveBeenCalled();
  });

  it("preserves full staff state after Auth.js validates the session", async () => {
    const fetch = await mockSnapshot();
    auth.mockResolvedValue({ user: { email: "staff@example.com" } });
    const { GET } = await import("@/app/api/state/route");
    const response = await GET(request("authjs.session-token=valid"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-lotto-state-source")).toBe("database");
    expect(response.headers.get("x-lotto-state-revision")).toBe("99");
    expect((await response.json()).queueSession).toEqual({ private: true });
    expect(loadState).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { agencyId: "another-agency" },
    { checksum: `sha256:${"0".repeat(64)}` },
    { revision: 0 },
    { protocolVersion: 2 },
  ])("rejects an untrusted snapshot without SQL fallback: %j", async overrides => {
    await mockSnapshot(overrides);
    const { GET } = await import("@/app/api/state/route");
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("120");
    expect(loadState).not.toHaveBeenCalled();
  });

  it("never restores SQL after repeated upstream failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    const { GET } = await import("@/app/api/state/route");
    for (let i = 0; i < 10; i++) expect((await GET(request())).status).toBe(503);
    expect(loadState).not.toHaveBeenCalled();
  });

  it("aborts a stuck snapshot request after three seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, { signal }: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))));
    const { GET } = await import("@/app/api/state/route");
    const response = GET(request());
    await vi.advanceTimersByTimeAsync(3_000);
    expect((await response).status).toBe(503);
    expect(loadState).not.toHaveBeenCalled();
  });

  it("fails closed on a malformed enabled deployment", async () => {
    vi.stubEnv("LOTTO_REALTIME_EXPECTED_HUB_HOST", "wrong.example.com");
    const { GET } = await import("@/app/api/state/route");
    expect((await GET(request())).status).toBe(503);
    expect(loadState).not.toHaveBeenCalled();
  });

  it("retains existing behavior in deployments with the gate disabled", async () => {
    vi.stubEnv("LOTTO_PUBLIC_STATE_SNAPSHOT_ENABLED", "false");
    const fetch = await mockSnapshot();
    const { GET } = await import("@/app/api/state/route");
    expect((await GET(request())).headers.get("x-lotto-state-source")).toBe("database");
    expect(loadState).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });
});
