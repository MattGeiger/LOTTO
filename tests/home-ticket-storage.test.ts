import { beforeEach, describe, expect, it } from "vitest";

import {
  HOMEPAGE_TICKET_STORAGE_KEY,
  clearPersistedHomepageTicket,
  getHomepageTicketServiceDay,
  getNextLocalMidnight,
  readPersistedHomepageTicket,
  writePersistedHomepageTicket,
} from "@/lib/home-ticket-storage";
import type { OperatingHours } from "@/lib/state-types";

const weekdayPantryHours: OperatingHours = {
  sunday: { isOpen: false, openTime: "10:00:00", closeTime: "14:00:00" },
  monday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
  tuesday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
  wednesday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
  thursday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
  friday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
  saturday: { isOpen: false, openTime: "10:00:00", closeTime: "14:00:00" },
};

const pantryContext = {
  operatingHours: weekdayPantryHours,
  timezone: "America/Los_Angeles",
  startNumber: 10,
  endNumber: 40,
};

describe("home ticket storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns the next local midnight timestamp", () => {
    const now = new Date(2026, 1, 18, 14, 45, 30, 123);
    const midnightMs = getNextLocalMidnight(now);
    const midnight = new Date(midnightMs);

    expect(midnight.getFullYear()).toBe(2026);
    expect(midnight.getMonth()).toBe(1);
    expect(midnight.getDate()).toBe(19);
    expect(midnight.getHours()).toBe(0);
    expect(midnight.getMinutes()).toBe(0);
    expect(midnight.getSeconds()).toBe(0);
    expect(midnight.getMilliseconds()).toBe(0);
  });

  it("writes and reads a valid unexpired ticket", () => {
    const now = new Date(2026, 1, 18, 9, 0, 0, 0);
    writePersistedHomepageTicket(53, now);

    const read = readPersistedHomepageTicket(now.getTime() + 1_000);
    expect(read).toBe(53);
  });

  it("writes pantry-day expiry when operating-hours context is available", () => {
    const now = new Date("2026-02-18T20:00:00.000Z"); // Wednesday noon in Los Angeles
    writePersistedHomepageTicket(53, now, pantryContext);

    const raw = window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY);
    const parsed = JSON.parse(raw ?? "{}") as {
      ticketNumber: number;
      expiresAt: number;
      savedAt: number;
      serviceDayKey: string;
      rangeKey: string;
    };

    expect(parsed.ticketNumber).toBe(53);
    expect(parsed.serviceDayKey).toBe("America/Los_Angeles:2026-02-18");
    expect(parsed.rangeKey).toBe("10-40");
    expect(new Date(parsed.expiresAt).toISOString()).toBe("2026-02-19T18:00:00.000Z");
  });

  it("returns null after the next pantry day starts", () => {
    const now = new Date("2026-02-18T20:00:00.000Z");
    writePersistedHomepageTicket(53, now, pantryContext);

    const read = readPersistedHomepageTicket(
      new Date("2026-02-19T18:00:00.000Z").getTime(),
      pantryContext,
    );

    expect(read).toBeNull();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });

  it("removes old local-midnight entries when pantry-day context is available", () => {
    window.localStorage.setItem(
      HOMEPAGE_TICKET_STORAGE_KEY,
      JSON.stringify({
        ticketNumber: 12,
        expiresAt: Date.now() + 60_000,
        savedAt: Date.now(),
      }),
    );

    const read = readPersistedHomepageTicket(Date.now(), pantryContext);

    expect(read).toBeNull();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });

  it("removes entries when active range no longer matches", () => {
    const now = new Date("2026-02-18T20:00:00.000Z");
    writePersistedHomepageTicket(25, now, pantryContext);

    const read = readPersistedHomepageTicket(now.getTime() + 1_000, {
      ...pantryContext,
      startNumber: 50,
      endNumber: 80,
    });

    expect(read).toBeNull();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });

  it("removes entries when there is no active range", () => {
    const now = new Date("2026-02-18T20:00:00.000Z");
    writePersistedHomepageTicket(25, now, pantryContext);

    const read = readPersistedHomepageTicket(now.getTime() + 1_000, {
      ...pantryContext,
      startNumber: 0,
      endNumber: 0,
    });

    expect(read).toBeNull();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });

  it("computes service day from the previous open day before pantry opens", () => {
    const serviceDay = getHomepageTicketServiceDay(
      pantryContext,
      new Date("2026-02-19T17:30:00.000Z"), // Thursday 9:30 AM in Los Angeles
    );

    expect(serviceDay?.serviceDayKey).toBe("America/Los_Angeles:2026-02-18");
    expect(new Date(serviceDay?.expiresAt ?? 0).toISOString()).toBe("2026-02-19T18:00:00.000Z");
  });

  it("removes expired entries and returns null", () => {
    window.localStorage.setItem(
      HOMEPAGE_TICKET_STORAGE_KEY,
      JSON.stringify({
        ticketNumber: 12,
        expiresAt: 1_000,
        savedAt: 500,
      }),
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
      JSON.stringify({
        ticketNumber: 123,
        expiresAt: Date.now() + 10_000,
        savedAt: Date.now(),
      }),
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
