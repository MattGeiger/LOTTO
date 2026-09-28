// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared with the Worker; these are transport messages, never state envelopes.
export const REALTIME_PING = "lotto:ping:v1";
export const REALTIME_PONG = "lotto:pong:v1";
export const HEARTBEAT_INTERVAL_MS = 25_000;
export const HEARTBEAT_TIMEOUT_MS = 10_000;
