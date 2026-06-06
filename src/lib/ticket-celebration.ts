// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

/**
 * Shared constants + cross-page dedup for the "your ticket was called"
 * celebration (overlay + confetti). The celebration is mounted on every public
 * route that can carry a personalized ticket (homepage, display, inventory), so
 * dedup must survive client-side navigation: without it, each page remount would
 * see `calledAt` already set and re-fire the confetti. We persist the celebrated
 * call key in `sessionStorage` so a given call fires exactly once per browser
 * session, no matter how many pages the client visits while it is active.
 */

export const CALLED_ALERT_DURATION_MS = 10_000;
export const CALLED_CONFETTI_INTERVAL_MS = 2_000;

const CELEBRATED_CALL_STORAGE_KEY = "ticket-called-celebrated";

/** Identifies a single call: a (ticket, calledAt) pair. */
export function buildCelebrationKey(ticketNumber: number, calledAt: number): string {
  return `${ticketNumber}:${calledAt}`;
}

export function hasCelebratedCall(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(CELEBRATED_CALL_STORAGE_KEY) === key;
  } catch {
    return false;
  }
}

export function markCelebratedCall(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CELEBRATED_CALL_STORAGE_KEY, key);
  } catch {
    // sessionStorage can be unavailable (private mode / quota); the in-memory
    // guard in the component still prevents same-mount double-fires.
  }
}
