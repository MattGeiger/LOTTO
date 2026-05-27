import { beforeEach, describe, expect, it } from "vitest";

import {
  EIGHT_HOURS_MS,
  HOMEPAGE_TICKET_STORAGE_KEY,
  clearPersistedHomepageTicket,
  readPersistedHomepageTicket,
  writePersistedHomepageTicket,
} from "@/lib/home-ticket-storage";

const rangeContext = { startNumber: 10, endNumber: 40 };

describe("home ticket storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("writes and reads a valid unexpired ticket", () => {
    const now = new Date(2026, 1, 18, 9, 0, 0, 0);
    writePersistedHomepageTicket(53, now);

    const read = readPersistedHomepageTicket(now.getTime() + 1_000);
    expect(read).toBe(53);
  });

  it("expires a ticket 8 hours after it was saved", () => {
    const now = new Date(2026, 1, 18, 9, 0, 0, 0);
    writePersistedHomepageTicket(53, now);

    const parsed = JSON.parse(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY) ?? "{}") as {
      ticketNumber: number;
      expiresAt: number;
    };
    expect(parsed.ticketNumber).toBe(53);
    expect(parsed.expiresAt).toBe(now.getTime() + EIGHT_HOURS_MS);

    // Just before expiry → still readable; at/after expiry → cleared.
    expect(readPersistedHomepageTicket(now.getTime() + EIGHT_HOURS_MS - 1)).toBe(53);
    expect(readPersistedHomepageTicket(now.getTime() + EIGHT_HOURS_MS)).toBeNull();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });

  it("stores the active drawing range when one is provided", () => {
    const now = new Date(2026, 1, 18, 9, 0, 0, 0);
    writePersistedHomepageTicket(25, now, rangeContext);

    const parsed = JSON.parse(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY) ?? "{}") as {
      rangeKey?: string;
    };
    expect(parsed.rangeKey).toBe("10-40");
  });

  it("clears a ticket saved against a now-superseded drawing range", () => {
    const now = new Date(2026, 1, 18, 9, 0, 0, 0);
    writePersistedHomepageTicket(25, now, rangeContext);

    const read = readPersistedHomepageTicket(now.getTime() + 1_000, { startNumber: 50, endNumber: 80 });

    expect(read).toBeNull();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });

  it("retains a ticket when there is no active drawing range (holding state)", () => {
    const now = new Date(2026, 1, 18, 9, 0, 0, 0);
    writePersistedHomepageTicket(25, now, rangeContext);

    // Operator has not (re)started a drawing: no active range in context.
    const read = readPersistedHomepageTicket(now.getTime() + 1_000, { startNumber: 0, endNumber: 0 });

    expect(read).toBe(25);
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).not.toBeNull();
  });

  it("retains a ticket entered before any drawing once a range appears", () => {
    const now = new Date(2026, 1, 18, 9, 0, 0, 0);
    // Saved with no range (pre-drawing) → no rangeKey stored, so it is not
    // treated as stale when a drawing range later appears.
    writePersistedHomepageTicket(17, now);

    const read = readPersistedHomepageTicket(now.getTime() + 1_000, rangeContext);
    expect(read).toBe(17);
  });

  it("removes expired entries and returns null", () => {
    window.localStorage.setItem(
      HOMEPAGE_TICKET_STORAGE_KEY,
      JSON.stringify({ ticketNumber: 12, expiresAt: 1_000, savedAt: 500 }),
    );

    const read = readPersistedHomepageTicket(2_000);
    expect(read).toBeNull();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });

  it("removes malformed json and returns null", () => {
    window.localStorage.setItem(HOMEPAGE_TICKET_STORAGE_KEY, "{not valid json");

    const read = readPersistedHomepageTicket();
    expect(read).toBeNull();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });

  it("removes invalid schema and returns null", () => {
    window.localStorage.setItem(
      HOMEPAGE_TICKET_STORAGE_KEY,
      JSON.stringify({ ticketNumber: 123, expiresAt: Date.now() + 10_000, savedAt: Date.now() }),
    );

    const read = readPersistedHomepageTicket();
    expect(read).toBeNull();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });

  it("clears persisted ticket with helper", () => {
    writePersistedHomepageTicket(7, new Date(2026, 1, 18, 12, 0, 0, 0));
    clearPersistedHomepageTicket();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });
});
