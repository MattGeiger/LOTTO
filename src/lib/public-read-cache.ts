// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import "server-only";

import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { revalidateTag, unstable_cache } from "next/cache";
import { version } from "../../package.json";

// Vercel's Data Cache survives function instances. A process-local Map or a
// short TTL would still wake Neon on a half-hour request from an old browser.
// Include the datastore identity without putting credentials into cache keys.
const scope = createHash("sha256")
  .update(JSON.stringify([
    process.env.DATABASE_URL ?? "file",
    process.env.VERCEL_ENV ?? "local",
    process.env.LOTTO_REALTIME_AGENCY_ID ?? "",
  ]))
  .digest("hex");
const configurationTag = `lotto-public-configuration-v1:${scope}`;
const publicationScope = new AsyncLocalStorage<{ changed: boolean }>();

const publishCommittedConfiguration = async () => {
  const { publishConfigurationAfterCommittedWrite } = await import("@/lib/realtime/configuration-publication");
  await publishConfigurationAfterCommittedWrite();
};

// A staff translation job may commit many rows. Publish once after the logical
// operation, including partial commits if a later step fails. Nested operations
// share the scope; concurrent requests retain independent publication state.
export async function withPublicConfigurationPublicationBatch<T>(operation: () => Promise<T>): Promise<T> {
  if (publicationScope.getStore()) return operation();
  const batch = { changed: false };
  try { return await publicationScope.run(batch, operation); }
  finally { if (batch.changed) await publishCommittedConfiguration(); }
}

const enabled = () =>
  process.env.NODE_ENV === "production"
  && process.env.STATE_STORAGE?.toLowerCase() !== "file"
  && Boolean(process.env.DATABASE_URL);

export const cachePublicConfiguration = <Args extends unknown[], Result>(
  key: string,
  read: (...args: Args) => Promise<Result>,
): ((...args: Args) => Promise<Result>) => {
  // Packs also depend on compiled UI strings/catalogs. A new release must not
  // reuse a previous release's derived configuration; tags still span releases.
  const cached = unstable_cache(read, ["lotto-public-configuration-v1", scope, version, key], {
    tags: [configurationTag],
    revalidate: false,
  });
  return (...args) => enabled() ? cached(...args) : read(...args);
};

export const invalidatePublicConfiguration = (): void => {
  if (enabled()) {
    // Route-handler writes need the next read to see the committed value.
    // The single-argument revalidateTag signature is deprecated in Next 16.
    revalidateTag(configurationTag, { expire: 0 });
  }
};

export const invalidatePublicConfigurationAfter = <Args extends unknown[], Result>(
  write: (...args: Args) => Promise<Result>,
): ((...args: Args) => Promise<Result>) => async (...args) => {
  const result = await write(...args);
  invalidatePublicConfiguration();
  const batch = publicationScope.getStore();
  if (batch) batch.changed = true;
  else await publishCommittedConfiguration();
  return result;
};
