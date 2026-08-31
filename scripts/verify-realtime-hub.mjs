// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// Destructive only to the dedicated `william-temple-house-e2e` Durable Object.
// It never publishes to the application agency id.

import assert from "node:assert/strict";
import crypto from "node:crypto";

const baseUrl = new URL(
  process.env.REALTIME_TEST_BASE_URL ?? "http://127.0.0.1:8787",
);
const publishToken = process.env.REALTIME_TEST_PUBLISH_TOKEN;
const allowedOrigin =
  process.env.REALTIME_TEST_ORIGIN ?? "http://localhost:3000";
const agencyId = "william-temple-house-e2e";

if (!publishToken) {
  throw new Error("REALTIME_TEST_PUBLISH_TOKEN is required.");
}
if (
  baseUrl.hostname !== "127.0.0.1" &&
  baseUrl.hostname !== "localhost" &&
  process.env.REALTIME_TEST_ALLOW_REMOTE !== "beta"
) {
  throw new Error(
    "Remote verification requires REALTIME_TEST_ALLOW_REMOTE=beta to protect non-beta Workers.",
  );
}

const routeUrl = (action) =>
  new URL(`/v1/agencies/${agencyId}/${action}`, baseUrl);

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalize(nestedValue)]),
    );
  }
  return value;
};

const checksum = (value) =>
  `sha256:${crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`;

const state = {
  startNumber: 1,
  endNumber: 3,
  mode: "sequential",
  generatedOrder: [1, 2, 3],
  currentlyServing: 1,
  ticketStatus: {},
  calledAt: { 1: Date.parse("2026-08-31T20:00:00.000Z") },
  orderLocked: true,
  timestamp: Date.parse("2026-08-31T20:00:00.000Z"),
  displayUrl: "https://beta.williamtemple.app",
  operatingHours: null,
  timezone: "America/Los_Angeles",
  displayLanguageRotation: null,
  announcement: null,
};

const publish = (body, token = publishToken) =>
  fetch(routeUrl("publish"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

const existingResponse = await fetch(routeUrl("state"));
const existing = existingResponse.ok ? await existingResponse.json() : null;
const initialRevision =
  typeof existing?.revision === "number" ? existing.revision + 1 : 1;

const envelope = (revision, nextState = state) => ({
  protocolVersion: 1,
  agencyId,
  publicationId: crypto.randomUUID(),
  revision,
  committedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
  checksum: checksum(nextState),
  state: nextState,
});

let response = await fetch(new URL("/health", baseUrl));
assert.equal(response.status, 200, "health endpoint");

response = await publish(envelope(initialRevision), "wrong-token");
assert.equal(response.status, 401, "publish authentication");

const eventsUrl = routeUrl("events");
eventsUrl.protocol = eventsUrl.protocol === "https:" ? "wss:" : "ws:";
const socket = new WebSocket(eventsUrl);
const messages = [];
socket.addEventListener("message", (event) => {
  messages.push(JSON.parse(String(event.data)));
});
await new Promise((resolve, reject) => {
  const timeout = setTimeout(
    () => reject(new Error("WebSocket open timeout")),
    5_000,
  );
  socket.addEventListener(
    "open",
    () => {
      clearTimeout(timeout);
      resolve();
    },
    { once: true },
  );
  socket.addEventListener("error", reject, { once: true });
});

const first = envelope(initialRevision);
response = await publish(first);
assert.equal(response.status, 202, "first publication");

await new Promise((resolve, reject) => {
  const startedAt = Date.now();
  const timer = setInterval(() => {
    if (messages.some((message) => message.revision === initialRevision)) {
      clearInterval(timer);
      resolve();
    } else if (Date.now() - startedAt > 5_000) {
      clearInterval(timer);
      reject(new Error("WebSocket publication timeout"));
    }
  }, 20);
});

response = await fetch(routeUrl("state"), {
  headers: { origin: allowedOrigin },
});
assert.equal(response.status, 200, "snapshot read");
assert.equal(
  response.headers.get("access-control-allow-origin"),
  allowedOrigin,
  "allowed-origin CORS response",
);
assert.equal(
  (await response.json()).revision,
  initialRevision,
  "snapshot revision",
);

response = await publish(first);
assert.equal(response.status, 200, "duplicate publication");
assert.equal(
  (await response.json()).duplicate,
  true,
  "duplicate is idempotent",
);

const secondState = {
  ...state,
  currentlyServing: 2,
  timestamp: state.timestamp + 1,
};
const second = envelope(initialRevision + 1, secondState);
response = await publish(second);
assert.equal(response.status, 202, "next publication");

response = await publish(first);
assert.equal(response.status, 409, "stale revision rejection");

const conflictState = { ...secondState, currentlyServing: 3 };
const conflict = {
  ...second,
  publicationId: crypto.randomUUID(),
  checksum: checksum(conflictState),
  state: conflictState,
};
response = await publish(conflict);
assert.equal(response.status, 409, "same-revision checksum conflict");

response = await fetch(routeUrl("state"), {
  headers: { origin: "https://attacker.example" },
});
assert.equal(response.status, 403, "disallowed origin");

socket.close(1000, "verification complete");
console.log(
  JSON.stringify({
    health: "ok",
    authentication: "ok",
    snapshot: "ok",
    websocket: "ok",
    idempotency: "ok",
    monotonicity: "ok",
    cors: "ok",
    latestRevision: initialRevision + 1,
  }),
);
