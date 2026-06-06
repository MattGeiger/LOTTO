// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { Language } from "@/lib/languages";

export type Mode = "random" | "sequential";

export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type OperatingHours = {
  [K in DayOfWeek]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
};

export type TicketStatus = "returned" | "unclaimed";

export type DisplayLanguageRotation = {
  enabled: boolean;
  /** Selected language codes, stored in canonical LANGUAGE_OPTIONS order. */
  languages: Language[];
  /** How long each language is shown, in seconds (the Admin UI edits minutes). */
  intervalSeconds: number;
};

export type RaffleState = {
  startNumber: number;
  endNumber: number;
  mode: Mode;
  generatedOrder: number[];
  currentlyServing: number | null;
  ticketStatus: Record<number, TicketStatus>;
  calledAt: Record<number, number>;
  orderLocked: boolean;
  timestamp: number | null;
  displayUrl: string | null;
  operatingHours: OperatingHours | null;
  timezone: string;
  displayLanguageRotation: DisplayLanguageRotation | null;
};

export const defaultState: RaffleState = {
  startNumber: 0,
  endNumber: 0,
  mode: "random",
  generatedOrder: [],
  currentlyServing: null,
  ticketStatus: {},
  calledAt: {},
  orderLocked: false,
  timestamp: null,
  displayUrl: null,
  operatingHours: {
    sunday: { isOpen: false, openTime: "10:00:00", closeTime: "14:00:00" },
    monday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
    tuesday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
    wednesday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
    thursday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
    friday: { isOpen: true, openTime: "10:00:00", closeTime: "14:00:00" },
    saturday: { isOpen: false, openTime: "10:00:00", closeTime: "14:00:00" },
  },
  timezone: "America/Los_Angeles",
  displayLanguageRotation: null,
};

export const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const pad = (value: number, length = 2) => value.toString().padStart(length, "0");
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds()) +
    pad(date.getMilliseconds(), 3)
  );
};
