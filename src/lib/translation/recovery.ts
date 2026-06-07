// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Recover stuck translations (ported in spirit from FEED's translation-recovery):
// rows that have sat in `pending` past the threshold get one automatic retry,
// flagged in metadata so they aren't retried endlessly.

import { translateRowsByIds, type ProcessResult } from "./engine";
import * as store from "./translations-store";

const STUCK_MS = 60_000;

export const recoverStuck = async (): Promise<{ recovered: number } & ProcessResult> => {
  const pending = await store.list({ status: "pending" });
  const now = Date.now();
  const stuck = pending.filter(
    (row) => now - row.updatedAt > STUCK_MS && !(row.metadata?.autoRetried === true),
  );
  for (const row of stuck) {
    await store.update(row.id, {
      metadata: { ...(row.metadata ?? {}), autoRetried: true, recoveredAt: now },
    });
  }
  const ids = stuck.map((row) => row.id);
  const processed = ids.length > 0 ? await translateRowsByIds(ids) : { translated: 0, failed: 0 };
  return { recovered: stuck.length, ...processed };
};
