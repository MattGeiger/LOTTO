// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { describe, expect, it } from 'vitest';

import {
  addIssuedTickets,
  buildQueueSessionFacts,
  createStoredQueueSessionSummary,
  recordFirstCall,
  recordModeTransition,
} from '@/lib/queue-session';
import { defaultState } from '@/lib/state-types';

describe('LOTTO queue-session evidence', () => {
  it('captures the four strong authenticity signals without exporting ticket numbers', () => {
    const issuedAt = Date.parse('2026-08-20T18:00:00.000Z');
    let state = addIssuedTickets({
      ...defaultState, startNumber: 640, endNumber: 642, mode: 'random',
      generatedOrder: [641, 640], orderLocked: true,
    }, [641, 640], 'batch', issuedAt);
    state = recordModeTransition({ ...state, mode: 'sequential' }, 'random', 'sequential');
    state = addIssuedTickets({ ...state, endNumber: 643, generatedOrder: [641, 640, 643] }, [643], 'append', issuedAt + 600_000);
    state = recordFirstCall(state, 641, issuedAt + 1_200_000);
    state = recordFirstCall(state, 640, issuedAt + 1_500_000);
    state = recordFirstCall(state, 643, issuedAt + 1_800_000);

    const built = buildQueueSessionFacts(state, issuedAt + 2_000_000);
    expect(built?.facts.activitySignals).toEqual({
      allIssuedTicketsCalled: true,
      switchedRandomToSequential: true,
      appendedTickets: true,
    });
    expect(built?.facts.ticketObservations).toHaveLength(3);
    expect(JSON.stringify(built)).not.toContain('ticketNumber');
    expect(JSON.stringify(built)).not.toContain('641');
  });

  it('keeps first-call time write-once and makes an unchanged re-close idempotent', () => {
    const issuedAt = Date.parse('2026-08-20T18:00:00.000Z');
    let state = addIssuedTickets({ ...defaultState, startNumber: 1, endNumber: 2, generatedOrder: [1, 2] }, [1, 2], 'full', issuedAt);
    state = recordFirstCall(state, 1, issuedAt + 1_000);
    state = recordFirstCall(state, 1, issuedAt + 9_000);
    const first = createStoredQueueSessionSummary(state, issuedAt + 10_000, []);
    expect(first?.facts.ticketObservations[0].firstCalledAt).toBe(new Date(issuedAt + 1_000).toISOString());
    expect(createStoredQueueSessionSummary(state, issuedAt + 20_000, first ? [first] : [])).toBeNull();
  });
});
