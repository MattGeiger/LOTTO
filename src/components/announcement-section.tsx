// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

// Keystroke-isolated wrapper around the Announcement editor.
//
// The announcement draft lives here rather than in `AdminPageClient` so that
// typing does not re-render the whole `/admin` tree. This is the same
// input-isolation pattern as `RangeGenerationControls` and
// `ResetActionControls` (see docs/V1.5_OPTIMIZATIONS.md §2C); the Announcement
// card was added after that pass and was the last high-frequency input still
// lifting every keystroke to the root. Because the card sits inside the
// Advanced accordion, editing it kept the Translation and Appearance cards
// mounted and re-rendering on every character — see docs/ISSUES.md Issue 35.
//
// The root only learns about the draft when the user presses Save.

import * as React from "react";

import { AnnouncementEditor } from "@/components/announcement-editor";
import { Button } from "@/components/ui/button";
import type { Announcement } from "@/lib/state-types";

export const ANNOUNCEMENT_DRAFT_KEY = "lotto:announcement-draft";

/**
 * How long typing must pause before the draft is written to localStorage.
 * Storage writes are synchronous; keeping them off the keystroke path matters
 * on low-power devices (iPad mini 4 class hardware).
 */
const DRAFT_PERSIST_DEBOUNCE_MS = 500;

type AnnouncementSectionProps = {
  /** The announcement as last confirmed by the server (may be null). */
  serverAnnouncement: Announcement | null;
  /** Invoked with the local draft when the user presses Save. */
  onSave: (draft: Announcement | null) => void | Promise<void>;
  disabled?: boolean;
};

const readStoredDraft = (): Announcement | null => {
  try {
    const raw = window.localStorage.getItem(ANNOUNCEMENT_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Announcement) : null;
  } catch {
    return null;
  }
};

function AnnouncementSectionImpl({
  serverAnnouncement,
  onSave,
  disabled = false,
}: AnnouncementSectionProps) {
  const [draft, setDraft] = React.useState<Announcement | null>(null);

  // Tracks whether the draft has been hydrated from localStorage, and the
  // server announcement we last reconciled against. Together these keep an
  // unsaved draft from being wiped when the tab regains focus and re-fetches
  // state, while still adopting genuine server-side changes.
  const hydratedRef = React.useRef(false);
  const syncedServerKeyRef = React.useRef<string | null>(null);
  const persistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reconcile the draft with server state without discarding unsaved edits. On
  // first load we hydrate from a persisted draft (so it survives reloads and
  // app switches); afterward we only adopt the server value when it genuinely
  // changes (e.g., saved on another device).
  React.useEffect(() => {
    const serverKey = JSON.stringify(serverAnnouncement);

    if (!hydratedRef.current) {
      hydratedRef.current = true;
      syncedServerKeyRef.current = serverKey;
      setDraft(readStoredDraft() ?? serverAnnouncement);
      return;
    }

    if (serverKey !== syncedServerKeyRef.current) {
      syncedServerKeyRef.current = serverKey;
      setDraft(serverAnnouncement);
    }
  }, [serverAnnouncement]);

  // Persist the draft while it diverges from the saved server value; clear it
  // once they match (e.g., after saving). Debounced so the synchronous storage
  // write never lands on the keystroke path.
  const persistDraft = React.useCallback(
    (next: Announcement | null) => {
      try {
        const serverKey = JSON.stringify(serverAnnouncement);
        const draftKey = JSON.stringify(next);
        if (draftKey === serverKey) {
          window.localStorage.removeItem(ANNOUNCEMENT_DRAFT_KEY);
        } else {
          window.localStorage.setItem(ANNOUNCEMENT_DRAFT_KEY, draftKey);
        }
      } catch {
        // Ignore storage failures (private mode, quota, etc.).
      }
    },
    [serverAnnouncement],
  );

  const schedulePersist = React.useCallback(
    (next: Announcement | null) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        persistDraft(next);
      }, DRAFT_PERSIST_DEBOUNCE_MS);
    },
    [persistDraft],
  );

  // Keep the latest draft reachable from the unmount/pagehide flush without
  // making the flush effect depend on every keystroke.
  const draftRef = React.useRef<Announcement | null>(null);
  draftRef.current = draft;

  // Flush a pending draft write when the page is hidden or the card unmounts
  // (collapsing the Advanced accordion), so a debounced write is never lost.
  //
  // Both listeners are needed: iOS Safari fires `visibilitychange` when staff
  // switch apps (the case docs/user-guides/10-announcements.md promises is
  // safe) but does not reliably fire `pagehide` there; `pagehide` covers tab
  // close and bfcache navigation, where `visibilitychange` may not run.
  React.useEffect(() => {
    const flush = () => {
      if (!persistTimerRef.current) return;
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
      persistDraft(draftRef.current);
    };
    const flushIfHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushIfHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushIfHidden);
      flush();
    };
  }, [persistDraft]);

  // Reconciliation above replaces the draft wholesale; mirror it into storage
  // immediately so an adopted server value doesn't leave a stale draft behind.
  React.useEffect(() => {
    if (!hydratedRef.current) return;
    schedulePersist(draft);
    // Intentionally keyed on the reconciled server value, not every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverAnnouncement]);

  const handleChange = React.useCallback(
    (next: Announcement) => {
      setDraft(next);
      schedulePersist(next);
    },
    [schedulePersist],
  );

  const handleSave = React.useCallback(() => {
    void onSave(draftRef.current);
  }, [onSave]);

  return (
    <>
      <AnnouncementEditor value={draft} onChange={handleChange} disabled={disabled} />
      <Button
        variant="default"
        size="sm"
        className="mt-auto self-start"
        onClick={handleSave}
        disabled={disabled}
      >
        Save announcement
      </Button>
    </>
  );
}

export const AnnouncementSection = React.memo(AnnouncementSectionImpl);
