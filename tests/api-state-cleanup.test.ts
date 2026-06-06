// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/state-manager", () => ({
  stateManager: {
    cleanupOldSnapshots: vi.fn().mockResolvedValue(5),
  },
}));

const makeCleanupRequest = (body?: Record<string, unknown>) =>
  new Request("http://localhost:3000/api/state/cleanup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

describe("API /api/state/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("cleans up with default retention (30 days)", async () => {
    const { POST } = await import("@/app/api/state/cleanup/route");
    const response = await POST(makeCleanupRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.deletedCount).toBe(5);
    expect(body.retentionDays).toBe(30);
  });

  it("accepts custom retentionDays", async () => {
    const { stateManager } = await import("@/lib/state-manager");
    const manager = stateManager as typeof stateManager & {
      cleanupOldSnapshots: ReturnType<typeof vi.fn>;
    };
    const { POST } = await import("@/app/api/state/cleanup/route");
    const response = await POST(
      makeCleanupRequest({ retentionDays: 7 }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.retentionDays).toBe(7);
    expect(manager.cleanupOldSnapshots).toHaveBeenCalledWith(7);
  });

  it("rejects retentionDays below 1", async () => {
    const { POST } = await import("@/app/api/state/cleanup/route");
    const response = await POST(
      makeCleanupRequest({ retentionDays: 0 }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("retention");
  });

  it("rejects retentionDays above 365", async () => {
    const { POST } = await import("@/app/api/state/cleanup/route");
    const response = await POST(
      makeCleanupRequest({ retentionDays: 400 }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when cleanupOldSnapshots is not available (file mode)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/state-manager", () => ({
      stateManager: {
        loadState: vi.fn(),
        // No cleanupOldSnapshots property
      },
    }));

    const { POST } = await import("@/app/api/state/cleanup/route");
    const response = await POST(makeCleanupRequest());
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain("not available");
  });

  it("returns 500 when cleanup throws an error", async () => {
    vi.resetModules();
    vi.doMock("@/lib/state-manager", () => ({
      stateManager: {
        cleanupOldSnapshots: vi.fn().mockRejectedValue(new Error("DB timeout")),
      },
    }));

    const { POST } = await import("@/app/api/state/cleanup/route");
    const response = await POST(makeCleanupRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Cleanup failed");
  });
});
