// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

"use client";

import * as React from "react";
import { Palette } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StepWrapper } from "@/components/translation/ai-config/shared/StepWrapper";
import type { Oklch } from "@/lib/brand-theme/color";
import type { BrandConfig } from "@/lib/brand-theme/config-schema";
import { adoptTailwindColorSystem } from "@/lib/brand-theme/configured-theme";
import {
  proposeColorStory,
  recommendColorStory,
  type StoryRole,
} from "@/lib/brand-theme/color-story";
import {
  nearbyPaletteEntries,
  nearestPaletteEntry,
  paletteColor,
} from "@/lib/brand-theme/palette";
import { cn } from "@/lib/utils";

import { draftTheme, draftThemeIssues, patchConfig } from "../draft";
import { extractPaletteFromImage } from "../palette-extract";
import {
  TailwindColorField,
  type NearbyPaletteOption,
} from "../tailwind-color-field";
import { ThemePreview } from "../theme-preview";
import type { AppearanceStepProps } from "../types";

type PaletteRoles = NonNullable<BrandConfig["colors"]["paletteRoles"]>;
type RoleName = keyof PaletteRoles;

const ROLES: readonly {
  key: RoleName;
  storyRole: StoryRole;
  label: string;
  description: string;
  kind: "chromatic" | "neutral";
}[] = [
  { key: "primary", storyRole: "primary", label: "Main color", description: "Buttons, selection, and Now Serving.", kind: "chromatic" },
  { key: "accent", storyRole: "accent", label: "Accent", description: "Hover surfaces, icons, and secondary highlights.", kind: "chromatic" },
  { key: "ambient", storyRole: "ambient", label: "Background tint", description: "Page atmosphere and texture only—never a signal.", kind: "chromatic" },
  { key: "surfaceDark", storyRole: "surface-dark", label: "Dark anchor", description: "Dark-mode surfaces and the light-mode text foundation.", kind: "neutral" },
  { key: "surfaceLight", storyRole: "surface-light", label: "Light anchor", description: "Light-mode page and card surfaces.", kind: "neutral" },
];

const ROLE_BY_STORY = new Map(ROLES.map((role) => [role.storyRole, role]));
const FEED_NEW_SLOT_COLOR: Oklch = { l: 0.65, c: 0.08, h: 200 };

const nearbyFor = (
  color: Oklch,
  kind: "chromatic" | "neutral",
): NearbyPaletteOption[] =>
  nearbyPaletteEntries(color, kind, 6).map(({ entry }) => ({
    name: entry.name,
    family: entry.family,
    stop: entry.stop,
  }));

const warningFor = (
  roles: PaletteRoles,
  index: number,
  source: Oklch,
): string | null => {
  const hierarchy = ROLES.slice(0, index)
    .map((role) => roles[role.key])
    .filter((name): name is string => Boolean(name))
    .map(paletteColor)
    .concat(source);
  return proposeColorStory(hierarchy).assignments[index]?.warning ?? null;
};

export function ColorsStep({
  draft,
  onChange,
  isLoading,
  animateIntro,
}: AppearanceStepProps) {
  // Entering this editing step is the deliberate schema-v1 migration boundary.
  // Nothing active changes until the operator saves and activates the draft.
  const paletteConfig = React.useMemo(
    () => adoptTailwindColorSystem(draft.config),
    [draft.config],
  );
  const roles = paletteConfig.colors.paletteRoles!;
  const [selected, setSelected] = React.useState<RoleName>("primary");
  const [sourceColors, setSourceColors] = React.useState<
    Partial<Record<RoleName, Oklch>>
  >({});
  const [recommendNotes, setRecommendNotes] = React.useState<string[]>([]);
  const [extracting, setExtracting] = React.useState(false);

  React.useEffect(() => {
    if (draft.config.colors.system !== "tailwind-v4") {
      onChange({ config: paletteConfig });
    }
  }, [draft.config.colors.system, onChange, paletteConfig]);

  const setRoles = (nextRoles: PaletteRoles) => {
    const updates: Partial<BrandConfig["colors"]> = {
      system: "tailwind-v4",
      paletteRoles: nextRoles,
      primary: paletteColor(nextRoles.primary),
      accent: nextRoles.accent ? paletteColor(nextRoles.accent) : undefined,
      ambient: nextRoles.ambient ? [paletteColor(nextRoles.ambient)] : undefined,
      surfaceDark: nextRoles.surfaceDark
        ? paletteColor(nextRoles.surfaceDark)
        : paletteConfig.colors.surfaceDark,
      surfaceLight: nextRoles.surfaceLight
        ? paletteColor(nextRoles.surfaceLight)
        : paletteConfig.colors.surfaceLight,
    };
    onChange({ config: patchConfig(paletteConfig, "colors", updates) });
  };

  const setRole = (role: RoleName, value: string, source?: Oklch) => {
    setRoles({ ...roles, [role]: value });
    setSelected(role);
    setSourceColors((current) => ({
      ...current,
      [role]: source ?? paletteColor(value),
    }));
  };

  const clearLastRole = (role: Exclude<RoleName, "primary">) => {
    const next = { ...roles };
    delete next[role];
    setRoles(next);
    setSourceColors((current) => {
      const updated = { ...current };
      delete updated[role];
      return updated;
    });
    setSelected("primary");
  };

  const extract = React.useCallback(async () => {
    setExtracting(true);
    try {
      const extracted = await extractPaletteFromImage(paletteConfig.logo.lightSrc);
      if (extracted.length === 0) {
        toast.error("LOTTO couldn't read colors from that logo. Add colors manually or upload a PNG copy.");
        return;
      }

      const recommendation = recommendColorStory(extracted);
      const story = proposeColorStory(recommendation.hierarchy);
      const next: PaletteRoles = { primary: roles.primary };
      const raw: Partial<Record<RoleName, Oklch>> = {};

      for (const assignment of story.assignments) {
        const definition = ROLE_BY_STORY.get(assignment.role);
        if (!definition) continue;
        const match = nearestPaletteEntry(assignment.color, definition.kind);
        next[definition.key] = match.name;
        raw[definition.key] = assignment.color;
      }

      setRoles(next);
      setSourceColors(raw);
      setRecommendNotes([
        ...recommendation.notes,
        "Logo colors were matched to the nearest Tailwind v4 stops, so the saved values and preview are identical.",
      ]);
      setSelected("primary");
      toast.success("Brand color story extracted from the light logo.");
    } catch {
      toast.error("LOTTO couldn't read this logo's colors. Choose Tailwind colors below instead.");
    } finally {
      setExtracting(false);
    }
    // User action: always read the currently rendered draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteConfig.logo.lightSrc]);

  const highestRoleIndex = Math.max(
    0,
    ...ROLES.map((role, index) => (roles[role.key] ? index : -1)),
  );
  const visibleRoles = ROLES.slice(0, highestRoleIndex + 1);
  const nextRole = ROLES[highestRoleIndex + 1];

  const addRole = () => {
    if (!nextRole) return;
    const fallback =
      nextRole.kind === "neutral"
        ? nextRole.key === "surfaceDark"
          ? nearestPaletteEntry(paletteConfig.colors.surfaceDark, "neutral").name
          : nearestPaletteEntry(paletteConfig.colors.surfaceLight, "neutral").name
        : nearestPaletteEntry(FEED_NEW_SLOT_COLOR, "chromatic").name;
    setRole(nextRole.key, fallback);
  };

  const theme = draftTheme(paletteConfig);
  const issues = draftThemeIssues(paletteConfig);

  return (
    <StepWrapper
      icon={Palette}
      title="Brand color story"
      description="Rank the organization’s colors. LOTTO snaps them to a proven accessible palette and shows the closest families."
      animateIntro={animateIntro}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void extract()} disabled={isLoading || extracting}>
          {extracting ? "Reading logo…" : "Extract from light logo"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addRole} disabled={isLoading || !nextRole}>
          Add color
        </Button>
      </div>

      {recommendNotes.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3">
          {recommendNotes.map((note, index) => (
            <p key={index} className="text-xs text-muted-foreground">{note}</p>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        {visibleRoles.map((definition, index) => {
          const value = roles[definition.key] ?? null;
          const source = sourceColors[definition.key] ?? (value ? paletteColor(value) : null);
          const warning = source ? warningFor(roles, index, source) : null;
          return (
            <div
              key={definition.key}
              onFocusCapture={() => setSelected(definition.key)}
              onClick={() => setSelected(definition.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2",
                selected === definition.key && "ring-2 ring-ring",
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <TailwindColorField
                  value={value}
                  nearby={source ? nearbyFor(source, definition.kind) : []}
                  label={definition.label}
                  onSelect={(entry) => setRole(definition.key, entry.name, paletteColor(entry.name))}
                  disabled={isLoading}
                />
                <span className="truncate text-xs text-muted-foreground" title={`${definition.label} — ${definition.description}`}>
                  {definition.label} — {definition.description}
                </span>
                {warning ? <span className="text-xs text-[var(--status-warning-text)]">{warning}</span> : null}
              </div>
              {index === visibleRoles.length - 1 && index > 0 && value ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Clear ${definition.label}`}
                  onClick={() => clearLastRole(definition.key as Exclude<RoleName, "primary">)}
                  disabled={isLoading}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label>Four-mode preview</Label>
        <ThemePreview theme={theme} />
      </div>

      {issues.length > 0 ? (
        <div role="alert" className="space-y-1 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3">
          <p className="text-sm font-semibold text-[var(--status-danger-text)]">Fix these before continuing</p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--status-danger-text)]">
            {issues.map((issue, index) => <li key={index}>{issue.message}</li>)}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">All readability checks pass in light, dark, and both high-visibility modes.</p>
      )}
    </StepWrapper>
  );
}
