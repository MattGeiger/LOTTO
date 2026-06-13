// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LANGUAGE_OPTIONS, type Language } from "@/lib/languages";
import type { DisplayLanguageRotation } from "@/lib/state-types";
import { cn } from "@/lib/utils";

type RotationLanguageOption = { code: Language; label: string };

export const ROTATION_MIN_MINUTES = 1;
export const ROTATION_MAX_MINUTES = 10;
const DEFAULT_INTERVAL_MINUTES = 2;
const ROTATION_MINUTE_OPTIONS = Array.from(
  { length: ROTATION_MAX_MINUTES - ROTATION_MIN_MINUTES + 1 },
  (_, index) => ROTATION_MIN_MINUTES + index,
);

type DisplayLanguageRotationEditorProps = {
  value: DisplayLanguageRotation | null;
  onChange: (value: DisplayLanguageRotation) => void;
  disabled?: boolean;
};

const minutesFromSeconds = (seconds: number) =>
  Math.min(ROTATION_MAX_MINUTES, Math.max(ROTATION_MIN_MINUTES, Math.round(seconds / 60)));

export function DisplayLanguageRotationEditor({
  value,
  onChange,
  disabled = false,
}: DisplayLanguageRotationEditorProps) {
  // Offer the client-visible languages (core + completed dynamic), so a newly
  // enabled language can be added to the /display rotation. Falls back to the
  // static core options until the list loads.
  const [options, setOptions] = React.useState<ReadonlyArray<RotationLanguageOption>>(LANGUAGE_OPTIONS);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/languages?client", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { languages?: { code?: string; label?: string }[] };
        if (cancelled || !Array.isArray(data.languages)) return;
        const next = data.languages.filter(
          (entry): entry is RotationLanguageOption =>
            typeof entry?.code === "string" && typeof entry?.label === "string",
        );
        if (next.length >= LANGUAGE_OPTIONS.length) setOptions(next);
      } catch {
        /* keep core options */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = value?.enabled ?? false;
  const selected = React.useMemo(() => value?.languages ?? [], [value?.languages]);
  const intervalMinutes = value ? minutesFromSeconds(value.intervalSeconds) : DEFAULT_INTERVAL_MINUTES;

  const emit = (next: Partial<DisplayLanguageRotation>) => {
    onChange({
      enabled: next.enabled ?? enabled,
      languages: next.languages ?? selected,
      intervalSeconds: next.intervalSeconds ?? intervalMinutes * 60,
    });
  };

  const toggleLanguage = (code: Language, checked: boolean) => {
    const set = new Set(selected);
    if (checked) set.add(code);
    else set.delete(code);
    // Persist in the displayed (catalog) order; the API re-canonicalizes on save.
    const languages = options.map((option) => option.code).filter((c) => set.has(c));
    emit({ languages });
  };

  const handleMinutesChange = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.min(ROTATION_MAX_MINUTES, Math.max(ROTATION_MIN_MINUTES, Math.round(parsed)));
    emit({ intervalSeconds: clamped * 60 });
  };

  const controlsDisabled = disabled || !enabled;
  const cycleMinutes = selected.length * intervalMinutes;

  return (
    <div className="space-y-4">
      {/* Enable toggle — mirrors the "Order mode" toggle pattern elsewhere in admin. */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-gradient-card-info p-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Enable rotation</p>
          <p className="text-xs text-muted-foreground">
            On cycles through your language selection.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => emit({ enabled: Boolean(checked) })}
          aria-label="Enable language rotation"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label className={controlsDisabled ? "text-muted-foreground" : undefined}>Languages</Label>
        <div
          className={cn(
            "grid grid-cols-2 gap-2",
            options.length > 10 && "max-h-64 overflow-y-auto rounded-md border p-1",
          )}
        >
          {options.map((option) => (
            <label key={option.code} className="flex items-center gap-2 p-1 text-sm font-medium">
              <Checkbox
                checked={selected.includes(option.code)}
                onCheckedChange={(checked) => toggleLanguage(option.code, Boolean(checked))}
                disabled={controlsDisabled}
              />
              {option.label}
            </label>
          ))}
        </div>
        {enabled && selected.length === 0 ? (
          <p className="text-sm text-destructive">Select at least one language to rotate.</p>
        ) : null}
      </div>

      <div className="flex items-end gap-3">
        <Select
          value={String(intervalMinutes)}
          onValueChange={handleMinutesChange}
          disabled={controlsDisabled}
        >
          <SelectTrigger aria-label="Minutes per language" className="h-9 w-56 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROTATION_MINUTE_OPTIONS.map((minutes) => (
              <SelectItem key={minutes} value={String(minutes)}>
                {minutes} minute{minutes === 1 ? "" : "s"} per language
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {enabled && selected.length > 0 ? (
          <p className="pb-2 text-xs text-muted-foreground">
            Full cycle: {cycleMinutes} min for {selected.length} language
            {selected.length === 1 ? "" : "s"}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
