// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { Announcement } from "@/lib/state-types";

/**
 * An announcement is shown to clients when it is enabled, has content, and the
 * current time falls within its (optional) start/end window. Pure + client-safe
 * so the homepage, admin preview, and tests can all share it.
 */
export function isAnnouncementActive(
  announcement: Announcement | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!announcement) return false;
  if (!announcement.enabled) return false;
  if (announcement.markdown.trim().length === 0) return false;
  if (announcement.startsAt !== null && now < announcement.startsAt) return false;
  if (announcement.endsAt !== null && now > announcement.endsAt) return false;
  return true;
}

// "Seen this browser session" is keyed by the announcement's updatedAt, so a
// re-saved (edited) announcement shows again even within the same session.
const ANNOUNCEMENT_SEEN_KEY = "announcement-seen";

export function hasSeenAnnouncement(updatedAt: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ANNOUNCEMENT_SEEN_KEY) === String(updatedAt);
  } catch {
    return false;
  }
}

export function markAnnouncementSeen(updatedAt: number): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ANNOUNCEMENT_SEEN_KEY, String(updatedAt));
  } catch {
    // ignore (private mode / quota)
  }
}
