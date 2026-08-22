// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { createHash, randomUUID } from "node:crypto";

import type {
  ActiveQueueSession,
  DayOfWeek,
  Mode,
  QueueBatchMechanism,
  QueueOperatingWindow,
  QueueTicketTiming,
  RaffleState,
} from "./state-types";

export type QueueTicketOutcome =
  | "called"
  | "unclaimed"
  | "returned_before_call"
  | "returned_after_call"
  | "not_called";

export type QueueSessionStableFacts = {
  serviceDate: string;
  serviceDateBasis: ActiveQueueSession["serviceDateBasis"];
  timezone: string;
  sessionStartedAt: string | null;
  mode: Mode;
  timingCoverage: ActiveQueueSession["timingCoverage"];
  operatingWindow: QueueOperatingWindow | null;
  ticketRange: { start: number; end: number };
  configuredCount: number;
  issuedCount: number;
  calledCount: number;
  unclaimedCount: number;
  returnedCount: number;
  notCalledCount: number;
  unpairedCallCount: number;
  activitySignals: {
    allIssuedTicketsCalled: boolean;
    switchedRandomToSequential: boolean;
    appendedTickets: boolean;
  };
  batches: Array<{
    sequence: number;
    issuedAt: string;
    issuedCount: number;
    mechanism: QueueBatchMechanism;
    mode: Mode;
  }>;
  ticketObservations: Array<{
    sequence: number;
    batchSequence: number | null;
    issuedAt: string | null;
    firstCalledAt: string | null;
    outcome: QueueTicketOutcome;
  }>;
};

export type StoredQueueSessionSummary = {
  summaryId: string;
  sessionId: string;
  revision: number;
  supersedesSummaryId: string | null;
  contentHash: string;
  closedAt: string;
  recordedAt: string;
  facts: QueueSessionStableFacts;
};

const dayKeys: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const localDateParts = (timestamp: number, timezone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]),
  );
  const weekday = (parts.weekday ?? "Sunday").toLocaleLowerCase("en-US") as DayOfWeek;
  return {
    serviceDate: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: dayKeys.includes(weekday) ? weekday : "sunday",
  };
};

const operatingWindowAt = (
  state: RaffleState,
  timestamp: number,
): QueueOperatingWindow | null => {
  const { weekday } = localDateParts(timestamp, state.timezone);
  const schedule = state.operatingHours?.[weekday];
  return schedule ? { day: weekday, ...schedule } : null;
};

const legacyActivityTimestamp = (state: RaffleState, fallback: number) => {
  const called = Object.values(state.calledAt ?? {}).filter(
    (value): value is number => Number.isFinite(value),
  );
  if (called.length > 0) return Math.min(...called);
  return typeof state.timestamp === "number" ? state.timestamp : fallback;
};

const initializeSession = (state: RaffleState, at: number): ActiveQueueSession => {
  const isLegacy = state.generatedOrder.length > 0 || Object.keys(state.calledAt ?? {}).length > 0;
  const basisTimestamp = isLegacy ? legacyActivityTimestamp(state, at) : at;
  const { serviceDate } = localDateParts(basisTimestamp, state.timezone);
  const tickets: Record<number, QueueTicketTiming> = {};
  for (const ticket of state.generatedOrder) {
    tickets[ticket] = { batchSequence: null, issuedAt: null, firstCalledAt: null };
  }
  return {
    sessionId: randomUUID(),
    sessionStartedAt: isLegacy ? null : at,
    serviceDate,
    serviceDateBasis: isLegacy ? "legacy_activity" : "first_issue",
    timezone: state.timezone,
    operatingWindow: operatingWindowAt(state, basisTimestamp),
    timingCoverage: isLegacy ? "partial_legacy" : "complete",
    initialMode: state.mode,
    switchedRandomToSequential: false,
    appendedTickets: false,
    batches: [],
    tickets,
  };
};

export const addIssuedTickets = (
  state: RaffleState,
  ticketNumbers: number[],
  mechanism: QueueBatchMechanism,
  at: number,
): RaffleState => {
  if (ticketNumbers.length === 0) return state;
  const newTicketSet = new Set(ticketNumbers);
  const stateBeforeIssue = state.queueSession
    ? state
    : {
        ...state,
        generatedOrder: state.generatedOrder.filter((ticket) => !newTicketSet.has(ticket)),
      };
  const session = state.queueSession ?? initializeSession(stateBeforeIssue, at);
  const sequence = session.batches.length + 1;
  const tickets = { ...session.tickets };
  const newlyIssued: number[] = [];
  for (const ticket of ticketNumbers) {
    if (tickets[ticket]?.issuedAt != null) continue;
    tickets[ticket] = { batchSequence: sequence, issuedAt: at, firstCalledAt: null };
    newlyIssued.push(ticket);
  }
  if (newlyIssued.length === 0) return { ...state, queueSession: session };
  return {
    ...state,
    queueSession: {
      ...session,
      appendedTickets: session.appendedTickets || mechanism === "append",
      batches: [
        ...session.batches,
        { sequence, issuedAt: at, mechanism, mode: state.mode, ticketNumbers: newlyIssued },
      ],
      tickets,
    },
  };
};

export const recordModeTransition = (
  state: RaffleState,
  previousMode: Mode,
  nextMode: Mode,
): RaffleState => {
  if (!state.queueSession || previousMode !== "random" || nextMode !== "sequential") {
    return state;
  }
  return {
    ...state,
    queueSession: { ...state.queueSession, switchedRandomToSequential: true },
  };
};

export const recordFirstCall = (
  state: RaffleState,
  ticketNumber: number,
  at: number,
): RaffleState => {
  const session = state.queueSession ?? initializeSession(state, at);
  const current = session.tickets[ticketNumber] ?? {
    batchSequence: null,
    issuedAt: null,
    firstCalledAt: null,
  };
  if (current.firstCalledAt != null) return { ...state, queueSession: session };
  return {
    ...state,
    queueSession: {
      ...session,
      timingCoverage: current.issuedAt == null ? "partial_legacy" : session.timingCoverage,
      tickets: {
        ...session.tickets,
        [ticketNumber]: { ...current, firstCalledAt: at },
      },
    },
  };
};

export const hasMeaningfulQueueState = (state: RaffleState) =>
  state.startNumber !== 0
  || state.endNumber !== 0
  || state.generatedOrder.length > 0
  || Object.keys(state.calledAt ?? {}).length > 0
  || Object.keys(state.ticketStatus ?? {}).length > 0
  || state.queueSession != null;

export const buildQueueSessionFacts = (
  state: RaffleState,
  closedAt: number,
): { sessionId: string; facts: QueueSessionStableFacts } | null => {
  if (!hasMeaningfulQueueState(state)) return null;
  const session = state.queueSession ?? initializeSession(state, closedAt);
  const orderedTickets = [...new Set([
    ...state.generatedOrder,
    ...Object.keys(session.tickets).map(Number).sort((left, right) => left - right),
  ])];
  const observations = orderedTickets.map((ticketNumber, index) => {
    const timing = session.tickets[ticketNumber] ?? {
      batchSequence: null,
      issuedAt: null,
      firstCalledAt: null,
    };
    const status = state.ticketStatus?.[ticketNumber];
    let outcome: QueueTicketOutcome = "not_called";
    if (status === "returned") {
      outcome = timing.firstCalledAt == null ? "returned_before_call" : "returned_after_call";
    } else if (status === "unclaimed") {
      outcome = "unclaimed";
    } else if (timing.firstCalledAt != null) {
      outcome = "called";
    }
    return {
      sequence: index + 1,
      batchSequence: timing.batchSequence,
      issuedAt: timing.issuedAt == null ? null : new Date(timing.issuedAt).toISOString(),
      firstCalledAt:
        timing.firstCalledAt == null ? null : new Date(timing.firstCalledAt).toISOString(),
      outcome,
    };
  });
  const issued = observations.filter((observation) => observation.issuedAt !== null);
  const called = issued.filter((observation) => observation.firstCalledAt !== null);
  const unpairedCallCount = orderedTickets.filter((ticketNumber) => {
    const timing = session.tickets[ticketNumber];
    return timing?.issuedAt == null
      && (timing?.firstCalledAt != null || state.calledAt?.[ticketNumber] != null);
  }).length;
  const configuredCount = state.startNumber > 0 && state.endNumber >= state.startNumber
    ? state.endNumber - state.startNumber + 1
    : 0;
  const facts: QueueSessionStableFacts = {
    serviceDate: session.serviceDate,
    serviceDateBasis: session.serviceDateBasis,
    timezone: session.timezone,
    sessionStartedAt:
      session.sessionStartedAt == null ? null : new Date(session.sessionStartedAt).toISOString(),
    mode: state.mode,
    timingCoverage: session.timingCoverage,
    operatingWindow: session.operatingWindow,
    ticketRange: { start: state.startNumber, end: state.endNumber },
    configuredCount,
    issuedCount: issued.length,
    calledCount: called.length,
    unclaimedCount: observations.filter((item) => item.outcome === "unclaimed").length,
    returnedCount: observations.filter((item) => item.outcome.startsWith("returned_")).length,
    notCalledCount: observations.filter((item) => item.outcome === "not_called").length,
    unpairedCallCount,
    activitySignals: {
      allIssuedTicketsCalled: issued.length > 0 && called.length === issued.length,
      switchedRandomToSequential: session.switchedRandomToSequential,
      appendedTickets: session.appendedTickets,
    },
    batches: session.batches.map((batch) => ({
      sequence: batch.sequence,
      issuedAt: new Date(batch.issuedAt).toISOString(),
      issuedCount: batch.ticketNumbers.length,
      mechanism: batch.mechanism,
      mode: batch.mode,
    })),
    ticketObservations: observations,
  };
  return { sessionId: session.sessionId, facts };
};

export const queueSessionContentHash = (facts: QueueSessionStableFacts) =>
  `sha256:${createHash("sha256").update(JSON.stringify(facts)).digest("hex")}`;

export const createStoredQueueSessionSummary = (
  state: RaffleState,
  closedAt: number,
  prior: StoredQueueSessionSummary[],
): StoredQueueSessionSummary | null => {
  const built = buildQueueSessionFacts(state, closedAt);
  if (!built) return null;
  const contentHash = queueSessionContentHash(built.facts);
  if (prior.some((summary) => summary.contentHash === contentHash)) return null;
  const latest = [...prior].sort((left, right) => right.revision - left.revision)[0] ?? null;
  const recordedAt = new Date().toISOString();
  return {
    summaryId: randomUUID(),
    sessionId: built.sessionId,
    revision: (latest?.revision ?? 0) + 1,
    supersedesSummaryId: latest?.summaryId ?? null,
    contentHash,
    closedAt: new Date(closedAt).toISOString(),
    recordedAt,
    facts: built.facts,
  };
};
