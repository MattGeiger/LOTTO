import { fromZonedTime, toZonedTime } from "date-fns-tz";

import type { DayOfWeek, OperatingHours } from "@/lib/state-types";
import { resolveTimeZone } from "@/lib/timezone-utils";

const HOMEPAGE_TICKET_STORAGE_KEY = "homepage-ticket-selection-v1";

type PersistedTicketSelection = {
  ticketNumber: number;
  expiresAt: number;
  savedAt: number;
  serviceDayKey?: string;
  rangeKey?: string;
};

export type HomepageTicketStorageContext = {
  operatingHours: OperatingHours | null;
  timezone?: string | null;
  startNumber?: number | null;
  endNumber?: number | null;
};

const DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function isValidTicketNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 99;
}

function isValidPersistedTicketSelection(value: unknown): value is PersistedTicketSelection {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<PersistedTicketSelection>;
  return (
    isValidTicketNumber(maybe.ticketNumber) &&
    typeof maybe.expiresAt === "number" &&
    Number.isFinite(maybe.expiresAt) &&
    typeof maybe.savedAt === "number" &&
    Number.isFinite(maybe.savedAt)
  );
}

export function getNextLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

const addDays = (base: Date, days: number) => {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildZonedDateTime = (baseZonedDate: Date, timeZone: string, time24: string) => {
  const [hoursRaw, minutesRaw, secondsRaw] = time24.split(":");
  const local = new Date(
    baseZonedDate.getFullYear(),
    baseZonedDate.getMonth(),
    baseZonedDate.getDate(),
    Number(hoursRaw ?? 0),
    Number(minutesRaw ?? 0),
    Number(secondsRaw ?? 0),
    0,
  );
  return fromZonedTime(local, timeZone);
};

export function getHomepageTicketServiceDay(
  context: HomepageTicketStorageContext | null | undefined,
  now: Date = new Date(),
): { serviceDayKey: string; expiresAt: number } | null {
  if (!context?.operatingHours) return null;

  const timeZone = resolveTimeZone(context.timezone);
  const zonedNow = toZonedTime(now, timeZone);

  let currentServiceDay: { zonedDate: Date; opensAt: Date } | null = null;
  for (let offset = 0; offset >= -7; offset -= 1) {
    const candidate = addDays(zonedNow, offset);
    const day = DAYS[candidate.getDay()];
    const config = context.operatingHours[day];
    if (!config?.isOpen) continue;

    const opensAt = buildZonedDateTime(candidate, timeZone, config.openTime);
    if (opensAt.getTime() <= now.getTime()) {
      currentServiceDay = { zonedDate: candidate, opensAt };
      break;
    }
  }

  let nextOpenAt: Date | null = null;
  for (let offset = 0; offset <= 8; offset += 1) {
    const candidate = addDays(zonedNow, offset);
    const day = DAYS[candidate.getDay()];
    const config = context.operatingHours[day];
    if (!config?.isOpen) continue;

    const opensAt = buildZonedDateTime(candidate, timeZone, config.openTime);
    if (opensAt.getTime() > now.getTime()) {
      nextOpenAt = opensAt;
      break;
    }
  }

  if (!currentServiceDay || !nextOpenAt) return null;

  return {
    serviceDayKey: `${timeZone}:${formatDateKey(currentServiceDay.zonedDate)}`,
    expiresAt: nextOpenAt.getTime(),
  };
}

const getActiveRangeKey = (context: HomepageTicketStorageContext | null | undefined): string | null => {
  if (
    typeof context?.startNumber !== "number" ||
    typeof context.endNumber !== "number" ||
    context.startNumber <= 0 ||
    context.endNumber <= 0 ||
    context.endNumber < context.startNumber
  ) {
    return null;
  }

  return `${context.startNumber}-${context.endNumber}`;
};

export function clearPersistedHomepageTicket(): void {
  if (!hasWindow()) return;
  window.localStorage.removeItem(HOMEPAGE_TICKET_STORAGE_KEY);
}

export function readPersistedHomepageTicket(
  nowMs: number = Date.now(),
  context?: HomepageTicketStorageContext | null,
): number | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidPersistedTicketSelection(parsed)) {
      clearPersistedHomepageTicket();
      return null;
    }

    if (parsed.expiresAt <= nowMs) {
      clearPersistedHomepageTicket();
      return null;
    }

    const currentServiceDay = getHomepageTicketServiceDay(context, new Date(nowMs));
    if (currentServiceDay && !parsed.serviceDayKey) {
      clearPersistedHomepageTicket();
      return null;
    }

    if (
      currentServiceDay &&
      parsed.serviceDayKey &&
      parsed.serviceDayKey !== currentServiceDay.serviceDayKey
    ) {
      clearPersistedHomepageTicket();
      return null;
    }

    if (currentServiceDay && currentServiceDay.expiresAt <= nowMs) {
      clearPersistedHomepageTicket();
      return null;
    }

    const currentRangeKey = getActiveRangeKey(context);
    if (context && !currentRangeKey) {
      clearPersistedHomepageTicket();
      return null;
    }

    if (currentRangeKey && parsed.rangeKey !== currentRangeKey) {
      clearPersistedHomepageTicket();
      return null;
    }

    return parsed.ticketNumber;
  } catch {
    clearPersistedHomepageTicket();
    return null;
  }
}

export function writePersistedHomepageTicket(
  ticketNumber: number,
  now: Date = new Date(),
  context?: HomepageTicketStorageContext | null,
): void {
  if (!hasWindow()) return;
  if (!isValidTicketNumber(ticketNumber)) return;

  const serviceDay = getHomepageTicketServiceDay(context, now);
  const rangeKey = getActiveRangeKey(context);
  const payload: PersistedTicketSelection = {
    ticketNumber,
    expiresAt: serviceDay?.expiresAt ?? getNextLocalMidnight(now),
    savedAt: now.getTime(),
    serviceDayKey: serviceDay?.serviceDayKey,
    rangeKey: rangeKey ?? undefined,
  };

  window.localStorage.setItem(HOMEPAGE_TICKET_STORAGE_KEY, JSON.stringify(payload));
}

export { HOMEPAGE_TICKET_STORAGE_KEY };
export type { PersistedTicketSelection };
