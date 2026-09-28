import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setImmediate } from "node:timers";
import { startRealtimeSource, type RealtimeSourceTelemetry } from "@/lib/realtime/source-controller";
import { buildPublicStateEnvelope, type PublicStateEnvelope } from "@/lib/realtime/public-state-protocol";
import { REALTIME_PING, REALTIME_PONG } from "@/lib/realtime/heartbeat";
import { defaultState } from "@/lib/state-types";

const config = { agencyId: "william-temple-house", eventsUrl: "wss://hub.example/v1/agencies/william-temple-house/events" };
class Socket {
  static instances: Socket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = vi.fn();
  constructor(readonly url: string) { Socket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  message(value: unknown) { this.onmessage?.({ data: typeof value === "string" ? value : JSON.stringify(value) }); }
  close(code = 1006) { this.readyState = 3; this.onclose?.({ code }); }
}
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise<void>(resolve => setImmediate(resolve)); };
const envelope = (revision = 1, agencyId = config.agencyId) => buildPublicStateEnvelope({
  agencyId, revision, state: { ...structuredClone(defaultState), currentlyServing: revision },
});
let stop: (() => void) | undefined;
let latest: RealtimeSourceTelemetry;
let state: ReturnType<typeof vi.fn>;
let body: PublicStateEnvelope;
let fetchMock: ReturnType<typeof vi.fn>;
let visibility: DocumentVisibilityState;
const start = () => { stop = startRealtimeSource({ config, onState: state, onTelemetry: value => { latest = value; } }); };
const live = async () => { const ws = Socket.instances.at(-1)!; ws.open(); ws.message(body); await flush(); expect(latest.authority).toBe("live"); return ws; };

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-09-28T18:00:00Z"));
  vi.spyOn(Math, "random").mockReturnValue(0);
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
  body = await envelope();
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => body }));
  vi.stubGlobal("fetch", fetchMock);
  state = vi.fn();
});
afterEach(() => { stop?.(); stop = undefined; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Cloudflare-only public transport", () => {
  it("bootstraps without database evidence and accepts full revision gaps", async () => {
    start(); await flush();
    expect(state).toHaveBeenCalledWith(body.state, 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://hub.example/v1/agencies/william-temple-house/state");
    const ws = await live();
    ws.message(await envelope(8)); await flush();
    expect(latest.revision).toBe(8);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("reproduces the observed brief close with zero recovery reads", async () => {
    start(); await flush(); const ws = await live();
    ws.close();
    await vi.advanceTimersByTimeAsync(1_000);
    await live();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latest.persistentFailure).toBe(false);
    expect(latest.closeCode).toBe(1006);
  });
  it("waits 120 seconds despite repeated reconnect failures, then serves HTTP updates", async () => {
    start(); await flush(); (await live()).close();
    await vi.advanceTimersByTimeAsync(119_999); expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); await flush(); expect(fetchMock).toHaveBeenCalledTimes(2);
    body = await envelope(2);
    await vi.advanceTimersByTimeAsync(15_000); await flush(); expect(latest.revision).toBe(2);
    expect(latest.persistentFailure).toBe(true);
    expect(latest.snapshotAvailable).toBe(true);
    expect(fetchMock.mock.calls.every(call => !String(call[0]).includes("/api/state"))).toBe(true);
  });
  it("heartbeats maintain a quiet socket without snapshot reads", async () => {
    start(); await flush(); const ws = await live();
    for (let i = 0; i < 150; i++) {
      await vi.advanceTimersByTimeAsync(25_000);
      expect(ws.send).toHaveBeenLastCalledWith(REALTIME_PING);
      ws.message(REALTIME_PONG);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latest.authority).toBe("live");
    expect(latest.revision).toBe(1);
  });
  it("detects a half-open socket on heartbeat deadline", async () => {
    start(); await flush(); const ws = await live();
    await vi.advanceTimersByTimeAsync(35_000);
    expect(ws.readyState).toBe(3);
    expect(latest.reason).toBe("heartbeat");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(120_000); await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("does not mistake socket open for a valid recovery", async () => {
    start(); await flush();
    for (let i = 0; i < 12; i++) {
      Socket.instances.at(-1)?.open();
      await vi.advanceTimersByTimeAsync(10_000); await flush();
    }
    expect(latest.persistentFailure).toBe(true);
    expect(latest.authority).toBe("fallback");
  });
  it("rejects wrong agency, tampered content and same-revision conflict", async () => {
    start(); await flush(); let ws = await live();
    ws.message(await envelope(2, "other-agency")); await flush();
    expect(latest.reason).toBe("invalid"); expect(latest.revision).toBe(1);
    await vi.advanceTimersByTimeAsync(1_000); ws = await live();
    ws.message({ ...body, state: { ...body.state, currentlyServing: 99 } }); await flush();
    expect(latest.reason).toBe("invalid"); expect(latest.revision).toBe(1);
    await vi.advanceTimersByTimeAsync(1_000); ws = await live();
    const conflict = await buildPublicStateEnvelope({ agencyId: config.agencyId, revision: 1, state: { ...body.state, currentlyServing: 4 } });
    ws.message(conflict); await flush(); expect(latest.reason).toBe("revision-conflict");
    expect(state).toHaveBeenCalledTimes(1);
  });
  it("does not let a slow bootstrap response overwrite a newer socket state", async () => {
    let resolve!: (value: unknown) => void;
    fetchMock.mockImplementation(() => new Promise(r => { resolve = r; }));
    start();
    body = await envelope(5); await live();
    const old = await envelope(1);
    resolve({ ok: true, json: async () => old }); await flush();
    expect(latest.revision).toBe(5); expect(state).toHaveBeenCalledTimes(1);
  });
  it("pauses hidden work and uses Cloudflare on resume", async () => {
    start(); await flush(); await live();
    visibility = "hidden"; document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(fetchMock).toHaveBeenCalledTimes(1); expect(latest.authority).toBe("paused");
    visibility = "visible"; document.dispatchEvent(new Event("visibilitychange")); await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2); expect(Socket.instances).toHaveLength(2);
  });
  it("recovers online and ignores a stale navigator.onLine value on startup", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    start(); await flush(); expect(Socket.instances).toHaveLength(1);
    window.dispatchEvent(new Event("offline"));
    await vi.advanceTimersByTimeAsync(120_000); expect(fetchMock).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("online")); await flush(); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("retains state through complete outage, backs off, and stops on disposal", async () => {
    start(); await flush(); (await live()).close();
    fetchMock.mockRejectedValue(new Error("unreachable"));
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(latest.snapshotAvailable).toBe(false); expect(latest.persistentFailure).toBe(true);
    expect(latest.revision).toBe(1); expect(fetchMock.mock.calls.length).toBeLessThan(25);
    expect(Socket.instances.length).toBeLessThanOrEqual(120);
    stop?.(); const calls = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(3_600_000); expect(fetchMock).toHaveBeenCalledTimes(calls);
  });
  it("ignores a late response after unmount", async () => {
    let resolve!: (value: unknown) => void;
    fetchMock.mockImplementation(() => new Promise(r => { resolve = r; }));
    start(); stop?.(); stop = undefined;
    resolve({ ok: true, json: async () => body }); await flush();
    expect(state).not.toHaveBeenCalled();
  });
  it("bounds all HTTP work during rapid visibility changes", async () => {
    start(); await flush();
    for (let i = 0; i < 300; i++) {
      visibility = "hidden"; document.dispatchEvent(new Event("visibilitychange"));
      visibility = "visible"; document.dispatchEvent(new Event("visibilitychange"));
      await flush();
    }
    expect(fetchMock).toHaveBeenCalledTimes(240);
    expect(Socket.instances).toHaveLength(120);
  });
  it("recovers from a prolonged outage without further HTTP fallback", async () => {
    start(); await flush(); (await live()).close();
    await vi.advanceTimersByTimeAsync(180_000); await flush();
    body = await envelope(9);
    // Wait for the next active socket rather than relying on poll arrivals.
    for (let i = 0; Socket.instances.at(-1)?.readyState === 3 && i < 70; i++) {
      await vi.advanceTimersByTimeAsync(1_000);
    }
    const ws = await live();
    const requests = fetchMock.mock.calls.length;
    for (let i = 0; i < 12; i++) {
      await vi.advanceTimersByTimeAsync(25_000); ws.message(REALTIME_PONG);
    }
    expect(latest.revision).toBe(9);
    expect(latest.persistentFailure).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(requests);
  });
});
