// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

// The color-story configurator (docs/COLOR_SEMIOTICS.md). Operators list
// their brand's colors in hierarchy order — typed, picked from the uploaded
// logo, or eyedropped from screen — and the system assigns semiotic roles
// under the signal ceiling, with plain-language labels and reserved-hue-band
// warnings. Everything else (four theme modes, value ladders, Called states)
// derives automatically with live preview and WCAG checks.

import * as React from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { SunMoonIcon } from "@/components/animate-ui/icons/sun-moon";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StepWrapper } from "@/components/translation/ai-config/shared/StepWrapper";
import { adjust, type Oklch } from "@/lib/brand-theme/color";
import type { BrandConfig } from "@/lib/brand-theme/config-schema";
import {
  proposeColorStory,
  recommendColorStory,
  storyFromColors,
} from "@/lib/brand-theme/color-story";
import { cn } from "@/lib/utils";

import { ColorField } from "../color-field";
import { draftTheme, draftThemeIssues, patchConfig } from "../draft";
import { LogoPalette } from "../logo-palette";
import { extractPaletteFromImage } from "../palette-extract";
import { ThemePreview } from "../theme-preview";
import type { AppearanceStepProps } from "../types";

/** The untouched scratch primary — the "operator hasn't chosen yet" marker. */
const isScratchSlate = (rows: Oklch[]) =>
  rows.length === 1 &&
  Math.abs(rows[0].l - 0.45) < 0.001 &&
  Math.abs(rows[0].c - 0.04) < 0.001 &&
  Math.abs(rows[0].h - 257) < 0.001;

const isPlaceholderLogo = (src: string) =>
  src.startsWith("/brands/custom-placeholder/");

const STORY_SIZE_HINTS = [
  "Monochrome — one color does everything through light and dark variations.",
  "Two-tone — a main color plus an accent (or a neutral anchor).",
  "Three colors — main, accent, and a background tint.",
  "Four colors — main, accent, and two ambient texture tints.",
  "Five colors — main, accent, and three ambient texture tints.",
];

export function ColorsStep({
  draft,
  onChange,
  isLoading,
  animateIntro,
}: AppearanceStepProps) {
  const { colors } = draft.config;
  // The ordered hierarchy is the editing model; config.colors stays the
  // persisted source of truth (rows reconstruct from it when editing).
  const [rows, setRows] = React.useState<Oklch[]>(() =>
    storyFromColors(colors),
  );
  const [activeRow, setActiveRow] = React.useState(0);
  const [recommendNotes, setRecommendNotes] = React.useState<string[]>([]);
  const [recommending, setRecommending] = React.useState(false);

  const story = React.useMemo(() => proposeColorStory(rows), [rows]);

  const applyRows = (nextRows: Oklch[]) => {
    setRows(nextRows);
    const nextStory = proposeColorStory(nextRows);
    // Story-covered fields follow the hierarchy (absent roles are cleared so
    // derivation defaults return); anchors only change when a neutral row
    // supplies them; typed advanced fields (textLight, serving) are kept.
    onChange({
      config: patchConfig(draft.config, "colors", {
        primary: nextStory.colors.primary ?? colors.primary,
        accent: nextStory.colors.accent,
        ambient: nextStory.colors.ambient,
        surfaceLight: nextStory.colors.surfaceLight ?? colors.surfaceLight,
        surfaceDark: nextStory.colors.surfaceDark ?? colors.surfaceDark,
      }),
    });
  };

  const setRow = (index: number, color: Oklch) => {
    applyRows(rows.map((row, i) => (i === index ? color : row)));
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    applyRows(rows.filter((_, i) => i !== index));
    setActiveRow((current) => Math.max(0, Math.min(current, rows.length - 2)));
  };

  const addRow = () => {
    if (rows.length >= 5) return;
    // A visibly chromatic starter in a rotated hue so the new slot is
    // obvious until replaced (a neutral seed would silently classify as an
    // anchor).
    const last = rows[rows.length - 1] ?? colors.primary;
    applyRows([
      ...rows,
      {
        l: last.l > 0.5 ? last.l - 0.2 : last.l + 0.2,
        c: Math.max(last.c, 0.12),
        h: (last.h + 40) % 360,
      },
    ]);
    setActiveRow(rows.length);
  };

  const pickInto = (color: Oklch) => {
    if (activeRow < rows.length) setRow(activeRow, color);
  };

  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;

  const recommend = React.useCallback(
    async ({ announce }: { announce: boolean }) => {
      setRecommending(true);
      try {
        const palette = await extractPaletteFromImage(draft.config.logo.lightSrc);
        const recommendation = recommendColorStory(palette);
        if (recommendation.hierarchy.length === 0) {
          if (announce) {
            toast.error("Couldn't read enough colors from the logo — pick them below instead.");
          }
          return;
        }
        applyRows(recommendation.hierarchy);
        setRecommendNotes(recommendation.notes);
        setActiveRow(0);
        if (announce) toast.success("Color story built from your logo.");
      } finally {
        setRecommending(false);
      }
    },
    // applyRows/draft change every render; the callback is only invoked from
    // user actions and the one-shot effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.config.logo.lightSrc],
  );

  // Automation-first (docs/COLOR_SEMIOTICS.md, "Automatic recommendation"):
  // when the operator arrives with an untouched scratch palette and a real
  // uploaded logo, build the whole color story for them up front — they only
  // correct what they dislike.
  const autoRecommended = React.useRef(false);
  React.useEffect(() => {
    if (autoRecommended.current) return;
    if (!isScratchSlate(rowsRef.current)) return;
    if (isPlaceholderLogo(draft.config.logo.lightSrc)) return;
    autoRecommended.current = true;
    void recommend({ announce: true });
  }, [draft.config.logo.lightSrc, recommend]);

  const setColors = (updates: Partial<BrandConfig["colors"]>) =>
    onChange({ config: patchConfig(draft.config, "colors", updates) });

  const theme = draftTheme(draft.config);
  const issues = draftThemeIssues(draft.config);
  const hasPrimary = story.assignments.some((entry) => entry.role === "primary");

  return (
    <StepWrapper
      icon={SunMoonIcon}
      title="Your color story"
      description="List your brand's colors from most to least important — light, dark, and high-visibility themes are built from them automatically."
      animateIntro={animateIntro}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {STORY_SIZE_HINTS[rows.length - 1]}
        </p>
        {!isPlaceholderLogo(draft.config.logo.lightSrc) ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void recommend({ announce: true })}
            disabled={isLoading || recommending}
          >
            <Sparkles className="mr-1 size-3.5" aria-hidden />
            {recommending ? "Reading logo…" : "Recommend from logo"}
          </Button>
        ) : null}
      </div>
      {recommendNotes.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3">
          {recommendNotes.map((note, index) => (
            <p key={index} className="text-xs text-muted-foreground">
              {note}
            </p>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        {rows.map((row, index) => {
          const assignment = story.assignments[index];
          return (
            <div
              key={index}
              onFocusCapture={() => setActiveRow(index)}
              onClick={() => setActiveRow(index)}
              className={cn(
                "space-y-1 rounded-lg border p-2.5 transition-colors",
                index === activeRow
                  ? "border-primary ring-1 ring-primary"
                  : "border-border",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <ColorField
                    id={`story-color-${index}`}
                    label=""
                    value={row}
                    onChange={(color) => setRow(index, color)}
                    disabled={isLoading}
                  />
                </div>
                {rows.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove color ${index + 1}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeRow(index);
                    }}
                    disabled={isLoading}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
              <p className="pl-8 text-xs text-muted-foreground">
                {assignment?.label}
              </p>
              {assignment?.warning ? (
                <p className="pl-8 text-xs text-[var(--status-warning-text)]">
                  {assignment.warning}
                </p>
              ) : null}
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={isLoading || rows.length >= 5}
          >
            <Plus className="mr-1 size-3.5" aria-hidden />
            Add a color
          </Button>
          <p className="text-xs text-muted-foreground">
            {rows.length} of 5 · slot {activeRow + 1} selected
          </p>
        </div>
        {!hasPrimary ? (
          <p className="text-xs text-[var(--status-warning-text)]">
            Add at least one non-neutral color — it becomes your buttons and
            Now Serving.
          </p>
        ) : null}
      </div>

      <LogoPalette
        logoSrc={draft.config.logo.lightSrc}
        onPick={pickInto}
        disabled={isLoading}
      />

      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Fine-tune surfaces &amp; special colors
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField
              id="color-surface-light"
              label="Light surface"
              hint="Light-mode page. A light neutral in your color list sets this automatically."
              value={colors.surfaceLight}
              onChange={(surfaceLight) => setColors({ surfaceLight })}
              disabled={isLoading}
            />
            <ColorField
              id="color-surface-dark"
              label="Dark surface"
              hint="Dark-mode page and default text."
              value={colors.surfaceDark}
              onChange={(surfaceDark) => setColors({ surfaceDark })}
              disabled={isLoading}
            />
          </div>
          {(
            [
              {
                key: "textLight" as const,
                label: "Custom light-mode text color",
                hint: "Defaults to your dark surface. Some brands (like WTH) use their main color.",
                defaultFrom: () => colors.surfaceDark,
              },
              {
                key: "serving" as const,
                label: "Custom Now Serving color",
                hint: "Defaults to a slightly deeper main color. Its hue stays consistent across light and dark modes.",
                defaultFrom: () => adjust(colors.primary, { l: -0.028, c: -0.008 }),
              },
            ]
          ).map(({ key, label, hint, defaultFrom }) => (
            <div key={key} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label htmlFor={`toggle-${key}`}>{label}</Label>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <Switch
                  id={`toggle-${key}`}
                  checked={colors[key] !== undefined}
                  onCheckedChange={(checked) =>
                    setColors({ [key]: checked ? defaultFrom() : undefined })
                  }
                  disabled={isLoading}
                />
              </div>
              {colors[key] !== undefined ? (
                <ColorField
                  id={`color-${key}`}
                  label=""
                  value={colors[key]!}
                  onChange={(value) => setColors({ [key]: value })}
                  disabled={isLoading}
                />
              ) : null}
            </div>
          ))}
        </div>
      </details>

      <div className="space-y-2">
        <Label>Live preview</Label>
        <ThemePreview theme={theme} />
      </div>

      {issues.length > 0 ? (
        <div
          role="alert"
          className="space-y-1 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3"
        >
          <p className="text-sm font-semibold text-[var(--status-danger-text)]">
            Fix these before continuing
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--status-danger-text)]">
            {issues.map((issue, index) => (
              <li key={index}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          All readability checks pass in every theme.
        </p>
      )}
    </StepWrapper>
  );
}
