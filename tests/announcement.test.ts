// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it } from "vitest";

import {
  hasSeenAnnouncement,
  isAnnouncementActive,
  markAnnouncementSeen,
} from "@/lib/announcement";
import type { Announcement } from "@/lib/state-types";

const base: Announcement = {
  enabled: true,
  markdown: "## Closed Friday",
  startsAt: null,
  endsAt: null,
  updatedAt: 1000,
};

describe("isAnnouncementActive", () => {
  it("is false for null / disabled / empty", () => {
    expect(isAnnouncementActive(null)).toBe(false);
    expect(isAnnouncementActive({ ...base, enabled: false })).toBe(false);
    expect(isAnnouncementActive({ ...base, markdown: "   " })).toBe(false);
  });

  it("is true when enabled with content and no schedule", () => {
    expect(isAnnouncementActive(base)).toBe(true);
  });

  it("respects the start/end window", () => {
    const now = 5000;
    expect(isAnnouncementActive({ ...base, startsAt: 6000 }, now)).toBe(false); // before start
    expect(isAnnouncementActive({ ...base, startsAt: 4000 }, now)).toBe(true); // after start
    expect(isAnnouncementActive({ ...base, endsAt: 4000 }, now)).toBe(false); // after end
    expect(isAnnouncementActive({ ...base, endsAt: 6000 }, now)).toBe(true); // before end
    expect(isAnnouncementActive({ ...base, startsAt: 4000, endsAt: 6000 }, now)).toBe(true);
  });
});

describe("announcement seen tracking", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("tracks seen state keyed by updatedAt", () => {
    expect(hasSeenAnnouncement(1000)).toBe(false);
    markAnnouncementSeen(1000);
    expect(hasSeenAnnouncement(1000)).toBe(true);
    // A re-saved announcement (new updatedAt) is considered unseen again.
    expect(hasSeenAnnouncement(2000)).toBe(false);
  });
});
