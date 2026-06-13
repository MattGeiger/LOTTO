// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Client-side driver for staged translation. Kicks off Find-missing (which
// queues the gaps and translates the first chunk), then loops the chunked
// process endpoint until nothing is pending — reporting progress so the admin
// (and the client "getting ready" screen) can show a live count instead of a
// silent wait. Chunking keeps each request within serverless time limits.

export type TranslationProgress = { total: number; done: number; remaining: number; failed: number };

const postJson = async (url: string, body?: unknown) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) ?? "Translation request failed.");
  return data;
};

export async function runStagedTranslation(
  onProgress?: (progress: TranslationProgress) => void,
  types?: string[],
  inventoryNames?: string[],
): Promise<TranslationProgress> {
  // Queue every gap (optionally limited to selected content types) and translate
  // the first chunk. `inventoryNames` (when present) are the English inventory
  // strings the admin browser read from FEED's public feed and bridges to the
  // server, which may not be able to reach the feed itself.
  const start = await postJson("/api/translations/find-missing", {
    process: true,
    ...(types && types.length > 0 ? { types } : {}),
    ...(inventoryNames ? { inventoryNames } : {}),
  });
  const details = start.details as { count?: number } | undefined;
  const processed = start.processed as { remaining?: number; failed?: number } | undefined;
  const total = details?.count ?? 0;
  let remaining = processed?.remaining ?? 0;
  let failed = processed?.failed ?? 0;
  const emit = () => onProgress?.({ total, done: Math.max(0, total - remaining), remaining, failed });
  emit();

  // Loop the bounded process endpoint until the queue drains. The guard caps the
  // loop well above any realistic chunk count.
  let guard = 0;
  while (remaining > 0 && guard < 1000) {
    guard += 1;
    const step = await postJson("/api/translations/process");
    remaining = (step.remaining as number) ?? 0;
    failed += (step.failed as number) ?? 0;
    emit();
  }
  return { total, done: Math.max(0, total - remaining), remaining, failed };
}
