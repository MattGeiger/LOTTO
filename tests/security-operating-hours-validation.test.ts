// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { describe, expect, it, vi, beforeEach } from "vitest";

import { defaultState } from "@/lib/state-types";
import { stateManager } from "@/lib/state-manager";

vi.mock("@/lib/state-manager", () => ({
  stateManager: {
    setOperatingHours: vi.fn().mockResolvedValue({}),
  },
}));

describe("M4: setOperatingHours must validate hours shape and timezone", () => {
  const validHours = defaultState.operatingHours!;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const postAction = async (hours: unknown, timezone: string) => {
    const { POST } = await import("@/app/api/state/route");
    const request = new Request("http://localhost:3000/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setOperatingHours", hours, timezone }),
    });
    return POST(request);
  };

  it("accepts valid operating hours with valid timezone", async () => {
    const response = await postAction(validHours, "America/Los_Angeles");
    expect(response.status).toBe(200);
    expect(stateManager.setOperatingHours).toHaveBeenCalledWith(validHours, "America/Los_Angeles");
  });

  it.each(["openTime", "closeTime"] as const)("rejects malformed %s before persistence", async (field) => {
    for (const value of ["25:99", "24:00", "12:60", "12:30:60", "noon", "", "9:00", "09:0", "09:00Z", " 09:00", "09:00\n", "09:00:00\n", "09:00:00.5"]) {
      // Reset the route's request budget between cases, without changing the
      // production rate limiter to accommodate a regression test.
      vi.resetModules();
      const hours = { ...validHours, monday: { ...validHours.monday, [field]: value } };
      const response = await postAction(hours, "America/Los_Angeles");
      expect(response.status, value).toBe(400);
      expect((await response.json()).error).toContain(`hours.monday.${field}`);
      expect(stateManager.setOperatingHours).not.toHaveBeenCalled();
    }
  });

  it.each([
    ["10:00", "10:00"],
    ["10:00:00", "10:00"],
    ["10:00", "10:00:00"],
    ["10:00:01", "10:00:00"],
    ["14:00", "10:00"],
    ["23:00", "01:00"],
  ])("rejects open-day ordering %s to %s before persistence", async (openTime, closeTime) => {
    const hours = { ...validHours, monday: { isOpen: true, openTime, closeTime } };
    const response = await postAction(hours, "America/Los_Angeles");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("hours.monday.closeTime: Closing time must be later");
    expect(stateManager.setOperatingHours).not.toHaveBeenCalled();
  });

  it.each([
    ["00:00", "23:59"],
    ["00:00:00", "23:59:59"],
    ["10:00", "10:00:01"],
    ["10:00:59", "10:01"],
  ])("preserves valid time formats %s to %s", async (openTime, closeTime) => {
    const hours = { ...validHours, monday: { isOpen: true, openTime, closeTime } };
    expect((await postAction(hours, "America/Los_Angeles")).status).toBe(200);
    expect(stateManager.setOperatingHours).toHaveBeenCalledWith(hours, "America/Los_Angeles");
  });

  it("retains valid closed-day hours even when they are not an open interval", async () => {
    const hours = {
      ...validHours,
      sunday: { isOpen: false, openTime: "14:00:00", closeTime: "10:00" },
      saturday: { isOpen: false, openTime: "09:00", closeTime: "09:00:00" },
    };
    expect((await postAction(hours, "America/Los_Angeles")).status).toBe(200);
    expect(stateManager.setOperatingHours).toHaveBeenCalledWith(hours, "America/Los_Angeles");
  });

  it("still rejects impossible stored times on a closed day", async () => {
    const hours = { ...validHours, sunday: { isOpen: false, openTime: "25:00", closeTime: "14:00" } };
    expect((await postAction(hours, "America/Los_Angeles")).status).toBe(400);
    expect(stateManager.setOperatingHours).not.toHaveBeenCalled();
  });

  it("identifies errors on every day", async () => {
    for (const day of Object.keys(validHours)) {
      vi.resetModules();
      const hours = { ...validHours, [day]: { isOpen: true, openTime: "17:00", closeTime: "09:00" } };
      const response = await postAction(hours, "America/Los_Angeles");
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain(`hours.${day}.closeTime`);
    }
    expect(stateManager.setOperatingHours).not.toHaveBeenCalled();
  });

  it("rejects a string value for hours", async () => {
    const response = await postAction("not an object", "America/Los_Angeles");
    expect(response.status).toBe(400);
  });

  it("rejects a number value for hours", async () => {
    const response = await postAction(42, "America/Los_Angeles");
    expect(response.status).toBe(400);
  });

  it("rejects hours with missing days", async () => {
    const incompleteHours = {
      monday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
    };
    const response = await postAction(incompleteHours, "America/Los_Angeles");
    expect(response.status).toBe(400);
  });

  it("rejects hours with invalid isOpen type", async () => {
    const badHours = {
      ...validHours,
      monday: { isOpen: "yes", openTime: "10:00:00", closeTime: "14:00:00" },
    };
    const response = await postAction(badHours, "America/Los_Angeles");
    expect(response.status).toBe(400);
  });

  it("rejects invalid timezone string", async () => {
    const response = await postAction(validHours, "garbage");
    expect(response.status).toBe(400);
  });

  it("rejects empty timezone string", async () => {
    const response = await postAction(validHours, "");
    expect(response.status).toBe(400);
  });

  it("accepts valid IANA timezones", async () => {
    for (const tz of ["America/New_York", "Europe/London", "Asia/Tokyo", "UTC"]) {
      const response = await postAction(validHours, tz);
      expect(response.status, `Expected ${tz} to be accepted`).toBe(200);
    }
  });
});
