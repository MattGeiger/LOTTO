// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const getFeedIntegrationStatus = vi.fn();
const generateFeedIntegrationToken = vi.fn();

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/admin-email-policy", () => ({
  isAdminEmailAllowed: (email: string) => email === "admin@example.org",
}));
vi.mock("@/lib/feed-integration-token/index", () => ({
  getFeedIntegrationStatus,
  generateFeedIntegrationToken,
}));

describe("FEED pairing token API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTH_BYPASS;
    delete process.env.VERCEL;
  });

  it("refuses token status and generation without administrator authority", async () => {
    auth.mockResolvedValue(null);
    const { GET, POST } = await import("@/app/api/integrations/feed/token/route");

    expect((await GET()).status).toBe(403);
    expect((await POST()).status).toBe(403);
    expect(getFeedIntegrationStatus).not.toHaveBeenCalled();
    expect(generateFeedIntegrationToken).not.toHaveBeenCalled();
  });

  it("refuses a signed-in email outside the administrator policy", async () => {
    auth.mockResolvedValue({ user: { email: "other@example.org" } });
    const { POST } = await import("@/app/api/integrations/feed/token/route");

    expect((await POST()).status).toBe(403);
    expect(generateFeedIntegrationToken).not.toHaveBeenCalled();
  });

  it("returns status and one-time plaintext only to an authorized administrator", async () => {
    auth.mockResolvedValue({ user: { email: "admin@example.org" } });
    getFeedIntegrationStatus.mockResolvedValue({ configured: false, source: null });
    generateFeedIntegrationToken.mockResolvedValue({
      token: "one-time-secret",
      status: { configured: true, source: "database" },
    });
    const { GET, POST } = await import("@/app/api/integrations/feed/token/route");

    expect(await (await GET()).json()).toMatchObject({ status: { configured: false } });
    const generated = await POST();
    expect(generated.status).toBe(201);
    expect(await generated.json()).toMatchObject({ token: "one-time-secret" });
  });
});
