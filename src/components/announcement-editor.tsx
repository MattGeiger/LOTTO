// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { MarkdownEditor } from "@/components/markdown-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isAnnouncementActive } from "@/lib/announcement";
import type { Announcement } from "@/lib/state-types";

type AnnouncementEditorProps = {
  value: Announcement | null;
  onChange: (value: Announcement) => void;
  disabled?: boolean;
};

// epoch ms <-> the value a <input type="datetime-local"> expects ("YYYY-MM-DDTHH:mm"),
// in the browser's local timezone.
function toLocalInput(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function AnnouncementEditor({ value, onChange, disabled = false }: AnnouncementEditorProps) {
  const enabled = value?.enabled ?? false;
  const markdown = value?.markdown ?? "";
  const startsAt = value?.startsAt ?? null;
  const endsAt = value?.endsAt ?? null;

  const emit = (next: Partial<Announcement>) => {
    onChange({
      enabled: next.enabled ?? enabled,
      markdown: next.markdown ?? markdown,
      startsAt: next.startsAt !== undefined ? next.startsAt : startsAt,
      endsAt: next.endsAt !== undefined ? next.endsAt : endsAt,
      // Finalized at save time by the admin page.
      updatedAt: value?.updatedAt ?? 0,
    });
  };

  const controlsDisabled = disabled || !enabled;
  const windowInvalid = startsAt !== null && endsAt !== null && endsAt <= startsAt;
  const liveNow = isAnnouncementActive({ enabled, markdown, startsAt, endsAt, updatedAt: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-gradient-card-info p-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Enable announcement</p>
          <p className="text-xs text-muted-foreground">
            When on, clients see this message after choosing a language, before entering a ticket.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => emit({ enabled: Boolean(checked) })}
          aria-label="Enable announcement"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label className={controlsDisabled ? "text-muted-foreground" : undefined}>Message</Label>
        <MarkdownEditor
          value={markdown}
          onChange={(next) => emit({ markdown: next })}
          ariaLabel="Announcement message"
          placeholder="Write your announcement…"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="announcement-start" className={controlsDisabled ? "text-muted-foreground" : undefined}>
            Show from (optional)
          </Label>
          <Input
            id="announcement-start"
            type="datetime-local"
            value={toLocalInput(startsAt)}
            onChange={(event) => emit({ startsAt: fromLocalInput(event.target.value) })}
            disabled={controlsDisabled}
            className="bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="announcement-end" className={controlsDisabled ? "text-muted-foreground" : undefined}>
            Hide after (optional)
          </Label>
          <Input
            id="announcement-end"
            type="datetime-local"
            value={toLocalInput(endsAt)}
            onChange={(event) => emit({ endsAt: fromLocalInput(event.target.value) })}
            disabled={controlsDisabled}
            className="bg-background"
          />
        </div>
      </div>

      {enabled && markdown.trim().length === 0 ? (
        <p className="text-sm text-destructive">Add a message to show an announcement.</p>
      ) : windowInvalid ? (
        <p className="text-sm text-destructive">&quot;Hide after&quot; must be later than &quot;Show from&quot;.</p>
      ) : enabled ? (
        <p className="text-xs text-muted-foreground">
          {liveNow ? "Showing to clients now." : "Saved, but outside its scheduled window right now."}
          {startsAt === null && endsAt === null ? " No schedule — shows whenever enabled." : null}
        </p>
      ) : null}
    </div>
  );
}
