const HOMEPAGE_TICKET_STORAGE_KEY = "homepage-ticket-selection-v1";

// Tickets are retained on the client for a single business block. Eight hours
// comfortably covers a service day; in the rare case a user returns after the
// window, the only cost is re-entering their number.
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

type PersistedTicketSelection = {
  ticketNumber: number;
  expiresAt: number;
  savedAt: number;
  rangeKey?: string;
};

export type HomepageTicketStorageContext = {
  startNumber?: number | null;
  endNumber?: number | null;
};

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

    // 8-hour expiry from the moment the ticket was entered.
    if (parsed.expiresAt <= nowMs) {
      clearPersistedHomepageTicket();
      return null;
    }

    // Drop a ticket that was saved against a now-superseded drawing range (e.g.
    // after an operator reset / new draw). A ticket entered before any drawing
    // started has no rangeKey and is retained so the "not in the drawing yet"
    // holding state can show until a drawing begins.
    const currentRangeKey = getActiveRangeKey(context);
    if (currentRangeKey && parsed.rangeKey && parsed.rangeKey !== currentRangeKey) {
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

  const nowMs = now.getTime();
  const rangeKey = getActiveRangeKey(context);
  const payload: PersistedTicketSelection = {
    ticketNumber,
    expiresAt: nowMs + EIGHT_HOURS_MS,
    savedAt: nowMs,
    rangeKey: rangeKey ?? undefined,
  };

  window.localStorage.setItem(HOMEPAGE_TICKET_STORAGE_KEY, JSON.stringify(payload));
}

export { HOMEPAGE_TICKET_STORAGE_KEY, EIGHT_HOURS_MS };
export type { PersistedTicketSelection };
