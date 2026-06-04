"use client";

import React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LANGUAGE_OPTIONS, type Language } from "@/lib/languages";
import type { DisplayLanguageRotation } from "@/lib/state-types";

export const ROTATION_MIN_MINUTES = 1;
export const ROTATION_MAX_MINUTES = 30;
const DEFAULT_INTERVAL_MINUTES = 2;

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
  const enabled = value?.enabled ?? false;
  const selected = React.useMemo(() => value?.languages ?? [], [value?.languages]);
  const intervalMinutes = value ? minutesFromSeconds(value.intervalSeconds) : DEFAULT_INTERVAL_MINUTES;

  const emit = (next: Partial<DisplayLanguageRotation>) => {
    onChange({
      enabled: next.enabled ?? enabled,
      languages: next.languages ?? selected,
      intervalSeconds: next.intervalSeconds ?? value?.intervalSeconds ?? DEFAULT_INTERVAL_MINUTES * 60,
    });
  };

  const toggleLanguage = (code: Language, checked: boolean) => {
    const set = new Set(selected);
    if (checked) set.add(code);
    else set.delete(code);
    // Persist in canonical LANGUAGE_OPTIONS order so the rotation is predictable.
    const languages = LANGUAGE_OPTIONS.map((option) => option.code).filter((c) => set.has(c));
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
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <Label htmlFor="rotation-enabled">Rotate display languages</Label>
          <p className="text-xs text-muted-foreground">
            Cycle the public board through the selected languages so non-English speakers can
            read it without needing to tap anything.
          </p>
        </div>
        <Switch
          id="rotation-enabled"
          checked={enabled}
          onCheckedChange={(checked) => emit({ enabled: Boolean(checked) })}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label className={controlsDisabled ? "text-muted-foreground" : undefined}>Languages</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANGUAGE_OPTIONS.map((option) => (
            <label
              key={option.code}
              className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-sm"
            >
              <Checkbox
                checked={selected.includes(option.code)}
                onCheckedChange={(checked) => toggleLanguage(option.code, Boolean(checked))}
                disabled={controlsDisabled}
                aria-label={option.label}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label
            htmlFor="rotation-minutes"
            className={controlsDisabled ? "text-muted-foreground" : undefined}
          >
            Minutes per language
          </Label>
          <Input
            id="rotation-minutes"
            type="number"
            min={ROTATION_MIN_MINUTES}
            max={ROTATION_MAX_MINUTES}
            value={intervalMinutes}
            onChange={(event) => handleMinutesChange(event.target.value)}
            disabled={controlsDisabled}
            className="h-9 w-24 bg-background"
          />
        </div>
        {enabled && selected.length > 0 ? (
          <p className="pb-2 text-xs text-muted-foreground">
            Full cycle: {cycleMinutes} min for {selected.length} language
            {selected.length === 1 ? "" : "s"}.
          </p>
        ) : null}
      </div>

      {enabled && selected.length === 0 ? (
        <p className="text-sm text-destructive">Select at least one language to rotate.</p>
      ) : null}
    </div>
  );
}
