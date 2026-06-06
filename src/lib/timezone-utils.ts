// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { getTimezoneOffset } from "date-fns-tz";

export const resolveTimeZone = (timeZone?: string | null): string => {
  const trimmed = typeof timeZone === "string" ? timeZone.trim() : "";
  if (trimmed) return trimmed;
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const getBrowserTimezoneOffsetMinutes = (at: Date = new Date()): number =>
  -at.getTimezoneOffset();

export const getTimezoneOffsetMinutes = (timeZone: string, at: Date = new Date()): number =>
  Math.round(getTimezoneOffset(timeZone, at) / 60_000);

export const shouldWarnTimezoneMismatch = (
  timeZone: string,
  at: Date = new Date(),
  thresholdMinutes = 55,
): boolean => {
  try {
    const resolved = resolveTimeZone(timeZone);
    const browserOffset = getBrowserTimezoneOffsetMinutes(at);
    const selectedOffset = getTimezoneOffsetMinutes(resolved, at);
    return Math.abs(browserOffset - selectedOffset) > thresholdMinutes;
  } catch {
    return false;
  }
};
