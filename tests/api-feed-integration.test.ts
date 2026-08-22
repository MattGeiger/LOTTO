// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const summaries = [
  {
    summaryId: "summary-1",
    sessionId: "session-1",
    revision: 1,
    supersedesSummaryId: null,
    contentHash: `sha256:${"a".repeat(64)}`,
    closedAt: "2026-08-20T21:00:00.000Z",
    recordedAt: "2026-08-20T21:00:00.100Z",
    facts: {
      serviceDate: "2026-08-20",
      serviceDateBasis: "first_issue",
      timezone: "America/Los_Angeles",
      sessionStartedAt: "2026-08-20T18:00:00.000Z",
      mode: "sequential",
      timingCoverage: "complete",
      operatingWindow: {
        day: "thursday", isOpen: true, openTime: "11:00", closeTime: "14:00",
      },
      ticketRange: { start: 640, end: 640 },
      configuredCount: 1,
      issuedCount: 1,
      calledCount: 1,
      unclaimedCount: 0,
      returnedCount: 0,
      notCalledCount: 0,
      unpairedCallCount: 0,
      activitySignals: {
        allIssuedTicketsCalled: true,
        switchedRandomToSequential: true,
        appendedTickets: true,
      },
      batches: [{
        sequence: 1,
        issuedAt: "2026-08-20T18:00:00.000Z",
        issuedCount: 1,
        mechanism: "append",
        mode: "random",
      }],
      ticketObservations: [{
        sequence: 1,
        batchSequence: 1,
        issuedAt: "2026-08-20T18:00:00.000Z",
        firstCalledAt: "2026-08-20T18:30:00.000Z",
        outcome: "called",
      }],
    },
  },
  {
    summaryId: "summary-2",
    sessionId: "session-1",
    revision: 2,
    supersedesSummaryId: "summary-1",
    contentHash: `sha256:${"b".repeat(64)}`,
    closedAt: "2026-08-21T21:00:00.000Z",
    recordedAt: "2026-08-21T21:00:00.100Z",
    facts: {
      serviceDate: "2026-08-20",
      serviceDateBasis: "first_issue",
      timezone: "America/Los_Angeles",
      sessionStartedAt: "2026-08-20T18:00:00.000Z",
      mode: "sequential",
      timingCoverage: "complete",
      operatingWindow: null,
      ticketRange: { start: 640, end: 640 },
      configuredCount: 1,
      issuedCount: 1,
      calledCount: 1,
      unclaimedCount: 0,
      returnedCount: 0,
      notCalledCount: 0,
      unpairedCallCount: 0,
      activitySignals: {
        allIssuedTicketsCalled: true,
        switchedRandomToSequential: true,
        appendedTickets: true,
      },
      batches: [],
      ticketObservations: [],
    },
  },
];

vi.mock("@/lib/state-manager", () => ({
  stateManager: {
    listQueueSummaries: vi.fn().mockResolvedValue(summaries),
  },
}));

const request = (query = "", token = "integration-secret") => new Request(
  `http://localhost/api/integrations/feed/v1/daily-summaries${query}`,
  { headers: token ? { Authorization: `Bearer ${token}` } : {} },
);

describe("GET /api/integrations/feed/v1/daily-summaries", () => {
  beforeEach(() => {
    process.env.LOTTO_FEED_INTEGRATION_TOKEN = "integration-secret";
  });

  afterEach(() => {
    delete process.env.LOTTO_FEED_INTEGRATION_TOKEN;
  });

  it("fails closed when configuration or authentication is missing", async () => {
    const { GET } = await import("@/app/api/integrations/feed/v1/daily-summaries/route");
    delete process.env.LOTTO_FEED_INTEGRATION_TOKEN;
    expect((await GET(request())).status).toBe(503);
    process.env.LOTTO_FEED_INTEGRATION_TOKEN = "integration-secret";
    expect((await GET(request("", ""))).status).toBe(401);
    expect((await GET(request("", "wrong"))).status).toBe(401);
  });

  it("paginates in append order and returns a cursor on the final non-empty page", async () => {
    const { GET } = await import("@/app/api/integrations/feed/v1/daily-summaries/route");
    const first = await GET(request("?limit=1"));
    expect(first.headers.get("Cache-Control")).toBe("no-store");
    const firstBody = await first.json();
    expect(firstBody).toMatchObject({
      contractVersion: 1,
      hasMore: true,
      summaries: [{ summaryId: "summary-1", isCurrent: false }],
    });
    expect(firstBody.nextCursor).toEqual(expect.any(String));

    const second = await GET(request(`?limit=1&cursor=${encodeURIComponent(firstBody.nextCursor)}`));
    const secondBody = await second.json();
    expect(secondBody).toMatchObject({
      hasMore: false,
      summaries: [{ summaryId: "summary-2", isCurrent: true }],
    });
    expect(secondBody.nextCursor).toEqual(expect.any(String));

    const empty = await GET(request(`?cursor=${encodeURIComponent(secondBody.nextCursor)}`));
    expect(await empty.json()).toMatchObject({ summaries: [], nextCursor: null, hasMore: false });
  });

  it("rejects invalid filters and never exposes physical ticket numbers", async () => {
    const { GET } = await import("@/app/api/integrations/feed/v1/daily-summaries/route");
    expect((await GET(request("?from=2026-08-21&to=2026-08-20"))).status).toBe(400);
    expect((await GET(request("?cursor=not-a-cursor"))).status).toBe(400);

    const response = await GET(request());
    const text = await response.text();
    expect(text).not.toContain('"ticketNumber"');
    expect(text).not.toContain('"ticketNumbers"');
  });
});
