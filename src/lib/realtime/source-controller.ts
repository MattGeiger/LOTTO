// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.
import { getPollingWindowStatus } from "../polling-strategy";
import { resolveSnapshotUrl, type RealtimeCanaryClientConfig } from "./client-canary-config";
import { hashPublicState, publicStateEnvelopeSchema, type PublicStateEnvelope, type PublicRaffleState } from "./public-state-protocol";
import { HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS, REALTIME_PING, REALTIME_PONG } from "./heartbeat";

export const SNAPSHOT_GRACE_MS = 120_000;
export const PERSISTENT_FAILURE_MS = 120_000;
const REQUEST_TIMEOUT_MS = 10_000;
const HOUR_MS = 3_600_000;
const SNAPSHOT_BUDGET = 240;
const SOCKET_BUDGET = 120;

export type RealtimeSourceReason = "initial" | "handshake" | "close" | "timeout" | "invalid" |
  "revision-gap" | "revision-conflict" | "offline" | "foreground" | "exhausted" | "heartbeat" | "snapshot";
export type RealtimeSourceTelemetry = {
  authority: "fallback" | "live" | "paused";
  connection: "connecting" | "connected" | "reconnecting" | "paused" | "invalid" | "exhausted";
  reason: RealtimeSourceReason;
  revision: number | null;
  messagesReceived: number;
  reconnectCount: number;
  appliedCount: number;
  snapshotRequests: number;
  lastContactAt: string | null;
  failureSince: string | null;
  persistentFailure: boolean;
  snapshotAvailable: boolean;
  closeCode: number | null;
  updatedAt: string;
};
export const initialSourceTelemetry = (): RealtimeSourceTelemetry => ({
  authority: "fallback", connection: "connecting", reason: "initial", revision: null,
  messagesReceived: 0, reconnectCount: 0, appliedCount: 0, snapshotRequests: 0,
  lastContactAt: null, failureSince: null, persistentFailure: false,
  snapshotAvailable: false, closeCode: null, updatedAt: new Date().toISOString(),
});

/** One owner for all source-mode network work. This module has no database URL. */
export function startRealtimeSource({ config, onState, onTelemetry }: {
  config: RealtimeCanaryClientConfig;
  onState: (state: PublicRaffleState, revision: number) => void;
  onTelemetry: (value: RealtimeSourceTelemetry) => void;
}): () => void {
  const snapshotUrl = resolveSnapshotUrl(config);
  let telemetry = initialSourceTelemetry();
  let latest: PublicStateEnvelope | null = null;
  let socket: WebSocket | null = null;
  let stopped = false;
  let offline = false; // navigator.onLine can be stale on the supported iPad.
  let live = false;
  let generation = 0;
  let failureSince: number | null = null;
  let attempt = 0;
  let snapshotErrors = 0;
  let unchanged = 0;
  let request: AbortController | null = null;
  const snapshotStarts: number[] = [];
  const socketStarts: number[] = [];
  const timers = new Map<string, number>();
  const active = () => !stopped && !offline && document.visibilityState !== "hidden";
  const clear = (name: string) => {
    const timer = timers.get(name);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.delete(name);
  };
  const later = (name: string, delay: number, run: () => void) => {
    clear(name);
    timers.set(name, window.setTimeout(() => { timers.delete(name); run(); }, Math.max(0, delay)));
  };
  const emit = (patch: Partial<RealtimeSourceTelemetry>) => {
    if (stopped) return;
    telemetry = { ...telemetry, ...patch, updatedAt: new Date().toISOString() };
    onTelemetry(telemetry);
  };
  const budgetDelay = (starts: number[], limit: number) => {
    while (starts.length && starts[0] <= Date.now() - HOUR_MS) starts.shift();
    return starts.length < limit ? 0 : Math.max(1, starts[0] + HOUR_MS - Date.now());
  };
  const cancelRequest = () => {
    request?.abort();
    request = null;
    clear("request");
  };
  const closeSocket = () => {
    const previous = socket;
    socket = null;
    clear("handshake"); clear("heartbeat"); clear("pong");
    previous?.close(1000, "Realtime transport recovery.");
  };
  const fallbackDelay = () => {
    if (snapshotErrors) return Math.min(300_000, 15_000 * 2 ** Math.min(snapshotErrors - 1, 5));
    if (!latest) return 15_000;
    const status = getPollingWindowStatus(latest.state.operatingHours, new Date(), latest.state.timezone);
    if (status.window !== "closed") return 15_000;
    const delay = Math.min(300_000, 60_000 * 2 ** Math.min(unchanged, 3));
    return status.nextPreOpenAt ? Math.min(delay, Math.max(1_000, status.nextPreOpenAt.getTime() - Date.now())) : delay;
  };
  const accept = async (input: unknown, current: () => boolean) => {
    const parsed = publicStateEnvelopeSchema.safeParse(input);
    if (!parsed.success || parsed.data.agencyId !== config.agencyId) throw new Error("invalid");
    const envelope = parsed.data;
    if (await hashPublicState(envelope.state) !== envelope.checksum) throw new Error("invalid");
    if (!current()) return false;
    if (latest && envelope.revision < latest.revision) return false;
    if (latest && envelope.revision === latest.revision && envelope.checksum !== latest.checksum) {
      throw new Error("revision-conflict");
    }
    const changed = !latest || envelope.revision > latest.revision;
    if (changed) {
      latest = envelope;
      unchanged = 0;
      onState(envelope.state, envelope.revision);
    } else {
      unchanged += 1;
    }
    emit({ revision: envelope.revision, lastContactAt: new Date().toISOString(),
      appliedCount: telemetry.appliedCount + (changed ? 1 : 0) });
    return true;
  };
  const readSnapshot = async () => {
    if (!active() || live || request) return;
    const wait = budgetDelay(snapshotStarts, SNAPSHOT_BUDGET);
    if (wait) { later("snapshot", wait, () => void readSnapshot()); return; }
    snapshotStarts.push(Date.now());
    const controller = new AbortController();
    request = controller;
    const epoch = generation;
    const current = () => active() && epoch === generation && request === controller && !controller.signal.aborted && !live;
    emit({ snapshotRequests: telemetry.snapshotRequests + 1 });
    later("request", REQUEST_TIMEOUT_MS, () => controller.abort());
    try {
      const response = await fetch(snapshotUrl, { cache: "no-store", credentials: "omit", signal: controller.signal });
      if (!response.ok) throw new Error("snapshot");
      const valid = await accept(await response.json(), current);
      if (!current()) return;
      if (!valid) throw new Error("snapshot");
      snapshotErrors = 0;
      emit({ authority: "fallback", snapshotAvailable: true, reason: "snapshot" });
    } catch {
      if (epoch !== generation || request !== controller || !active() || live) return;
      snapshotErrors += 1;
      emit({ snapshotAvailable: false });
    } finally {
      if (request === controller) {
        request = null;
        clear("request");
        if (active() && !live) {
          // Positive jitter never makes requests more frequent than the budget.
          const graceRemaining = failureSince === null ? 0 : SNAPSHOT_GRACE_MS - (Date.now() - failureSince);
          later("snapshot", Math.max(graceRemaining, fallbackDelay() * (1 + Math.random() * 0.1)), () => void readSnapshot());
        }
      }
    }
  };
  const beginFailure = (reason: RealtimeSourceReason) => {
    live = false;
    if (failureSince === null) {
      failureSince = Date.now();
      later("persistent", PERSISTENT_FAILURE_MS, () => {
        emit({ persistentFailure: true });
      });
    }
    emit({ authority: "fallback", connection: "reconnecting", reason,
      failureSince: new Date(failureSince).toISOString() });
    if (!timers.has("snapshot") && !request && active()) {
      later("snapshot", SNAPSHOT_GRACE_MS - (Date.now() - failureSince), () => void readSnapshot());
    }
  };
  const reconnect = () => {
    if (!active()) return;
    const base = telemetry.persistentFailure ? 60_000 : Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
    attempt += 1;
    emit({ reconnectCount: telemetry.reconnectCount + 1 });
    later("reconnect", Math.max(base * (1 + Math.random() * 0.2), budgetDelay(socketStarts, SOCKET_BUDGET)), connect);
  };
  const lose = (reason: RealtimeSourceReason, code: number | null = null) => {
    closeSocket();
    emit({ closeCode: code });
    beginFailure(reason);
    reconnect();
  };
  const heartbeat = (target: WebSocket) => {
    later("heartbeat", HEARTBEAT_INTERVAL_MS, () => {
      if (!active() || socket !== target || !live) return;
      try {
        target.send(REALTIME_PING);
        later("pong", HEARTBEAT_TIMEOUT_MS, () => lose("heartbeat"));
      } catch { lose("heartbeat"); }
    });
  };
  function connect() {
    if (!active() || socket) return;
    const wait = budgetDelay(socketStarts, SOCKET_BUDGET);
    if (wait) { later("reconnect", wait, connect); return; }
    socketStarts.push(Date.now());
    let target: WebSocket;
    try { target = new WebSocket(config.eventsUrl); } catch { beginFailure("close"); reconnect(); return; }
    socket = target;
    const current = () => active() && socket === target;
    emit({ connection: "connecting" });
    later("handshake", REQUEST_TIMEOUT_MS, () => { if (current()) lose("timeout"); });
    target.onopen = () => { if (current()) emit({ connection: "connected" }); };
    target.onmessage = (event) => {
      if (!current() || typeof event.data !== "string") return;
      if (event.data === REALTIME_PONG) {
        if (live && timers.has("pong")) {
          clear("pong");
          emit({ lastContactAt: new Date().toISOString() });
          heartbeat(target);
        }
        return;
      }
      void (async () => {
        try {
          const valid = await accept(JSON.parse(event.data), current);
          if (!current()) return;
          if (!valid) { lose("revision-conflict"); return; }
          live = true;
          failureSince = null;
          attempt = 0;
          snapshotErrors = 0;
          clear("handshake"); clear("reconnect"); clear("snapshot"); clear("persistent");
          cancelRequest();
          emit({ authority: "live", connection: "connected", reason: "handshake",
            failureSince: null, persistentFailure: false, snapshotAvailable: true,
            messagesReceived: telemetry.messagesReceived + 1 });
          if (!timers.has("heartbeat") && !timers.has("pong")) heartbeat(target);
        } catch (error) {
          if (current()) lose(error instanceof Error && error.message === "revision-conflict" ? "revision-conflict" : "invalid");
        }
      })();
    };
    target.onclose = (event) => { if (socket === target) lose("close", event.code); };
    target.onerror = () => { if (current()) lose("close"); };
  }
  const pause = () => {
    generation += 1;
    live = false;
    for (const name of timers.keys()) clear(name);
    cancelRequest(); closeSocket();
    failureSince = null;
    emit({ authority: "paused", connection: "paused", failureSince: null, persistentFailure: false });
  };
  const resume = (reason: RealtimeSourceReason) => {
    if (!active()) return;
    beginFailure(reason);
    clear("snapshot");
    void readSnapshot();
    connect();
  };
  const visibility = () => { if (document.visibilityState === "hidden") pause(); else resume("foreground"); };
  const wentOffline = () => { offline = true; pause(); emit({ reason: "offline", snapshotAvailable: false }); };
  const wentOnline = () => { offline = false; resume("offline"); };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("offline", wentOffline);
  window.addEventListener("online", wentOnline);
  resume("initial");
  if (!active()) emit({ authority: "paused", connection: "paused" });
  return () => {
    pause(); stopped = true;
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("offline", wentOffline);
    window.removeEventListener("online", wentOnline);
  };
}
