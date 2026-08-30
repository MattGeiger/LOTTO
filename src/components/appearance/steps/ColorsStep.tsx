// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { SunMoonIcon } from "@/components/animate-ui/icons/sun-moon";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StepWrapper } from "@/components/translation/ai-config/shared/StepWrapper";
import { adoptTailwindColorSystem } from "@/lib/brand-theme/configured-theme";
import type { BrandConfig } from "@/lib/brand-theme/config-schema";
import { proposeColorStory, recommendColorStory } from "@/lib/brand-theme/color-story";
import { nearestPaletteEntry, paletteColor } from "@/lib/brand-theme/palette";

import { draftTheme, draftThemeIssues, patchConfig } from "../draft";
import { LogoPalette } from "../logo-palette";
import { extractPaletteFromImage } from "../palette-extract";
import { TailwindColorField } from "../tailwind-color-field";
import { ThemePreview } from "../theme-preview";
import type { AppearanceStepProps } from "../types";

type PaletteRoles = NonNullable<BrandConfig["colors"]["paletteRoles"]>;
type RoleName = keyof PaletteRoles;

const ROLES: readonly {
  key: RoleName;
  label: string;
  description: string;
  kind: "chromatic" | "neutral";
}[] = [
  { key: "primary", label: "Primary", description: "Buttons, focus, and the main identity signal.", kind: "chromatic" },
  { key: "accent", label: "Accent", description: "Emphasis and supporting highlights — never the page backdrop.", kind: "chromatic" },
  { key: "ambient", label: "Ambient", description: "Quiet page atmosphere and background texture.", kind: "chromatic" },
  { key: "surfaceDark", label: "Dark anchor", description: "Dark-mode surfaces and the neutral text foundation.", kind: "neutral" },
  { key: "surfaceLight", label: "Light anchor", description: "Light-mode surfaces and neutral cards.", kind: "neutral" },
];

const isPlaceholderLogo = (src: string) => src.startsWith("/brands/custom-placeholder/");

export function ColorsStep({ draft, onChange, isLoading, animateIntro }: AppearanceStepProps) {
  // Entering this editing step is the deliberate migration boundary. The live
  // configuration remains untouched until Save.
  const paletteConfig = React.useMemo(() => adoptTailwindColorSystem(draft.config), [draft.config]);
  const roles = paletteConfig.colors.paletteRoles!;
  const [activeRole, setActiveRole] = React.useState<RoleName>("primary");
  const [recommendNotes, setRecommendNotes] = React.useState<string[]>([]);
  const [recommending, setRecommending] = React.useState(false);

  React.useEffect(() => {
    if (draft.config.colors.system !== "tailwind-v4") onChange({ config: paletteConfig });
  }, [draft.config.colors.system, onChange, paletteConfig]);

  const setRoles = (nextRoles: PaletteRoles) => {
    const updates: Partial<BrandConfig["colors"]> = {
      system: "tailwind-v4",
      paletteRoles: nextRoles,
      primary: paletteColor(nextRoles.primary),
      accent: nextRoles.accent ? paletteColor(nextRoles.accent) : undefined,
      ambient: nextRoles.ambient ? [paletteColor(nextRoles.ambient)] : undefined,
      surfaceDark: nextRoles.surfaceDark ? paletteColor(nextRoles.surfaceDark) : paletteConfig.colors.surfaceDark,
      surfaceLight: nextRoles.surfaceLight ? paletteColor(nextRoles.surfaceLight) : paletteConfig.colors.surfaceLight,
    };
    onChange({ config: patchConfig(paletteConfig, "colors", updates) });
  };

  const setRole = (role: RoleName, value: string) => setRoles({ ...roles, [role]: value });
  const clearRole = (role: Exclude<RoleName, "primary">) => {
    const next = { ...roles };
    delete next[role];
    setRoles(next);
  };

  const recommend = React.useCallback(async () => {
    setRecommending(true);
    try {
      const extracted = await extractPaletteFromImage(paletteConfig.logo.lightSrc);
      const recommendation = recommendColorStory(extracted);
      const proposed = proposeColorStory(recommendation.hierarchy).colors;
      if (!proposed.primary) {
        toast.error("Couldn't read enough colors from the logo — choose them below instead.");
        return;
      }
      const next: PaletteRoles = {
        primary: nearestPaletteEntry(proposed.primary, "chromatic").name,
        surfaceDark: nearestPaletteEntry(proposed.surfaceDark ?? paletteConfig.colors.surfaceDark, "neutral").name,
        surfaceLight: nearestPaletteEntry(proposed.surfaceLight ?? paletteConfig.colors.surfaceLight, "neutral").name,
      };
      if (proposed.accent) next.accent = nearestPaletteEntry(proposed.accent, "chromatic").name;
      if (proposed.ambient?.[0]) next.ambient = nearestPaletteEntry(proposed.ambient[0], "chromatic").name;
      setRoles(next);
      setRecommendNotes([
        ...recommendation.notes,
        "Logo colors were matched to the nearest Tailwind v4 stops, so the saved values and preview are identical.",
      ]);
      toast.success("Tailwind color roles matched from your logo.");
    } catch {
      toast.error("Couldn't read this logo's colors. Choose Tailwind colors below instead.");
    } finally {
      setRecommending(false);
    }
    // User action: always use the currently rendered draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteConfig.logo.lightSrc]);

  const pickFromLogo = (color: Parameters<typeof nearestPaletteEntry>[0]) => {
    const definition = ROLES.find((role) => role.key === activeRole)!;
    setRole(activeRole, nearestPaletteEntry(color, definition.kind).name);
  };

  const theme = draftTheme(paletteConfig);
  const issues = draftThemeIssues(paletteConfig);

  return (
    <StepWrapper
      icon={SunMoonIcon}
      title="Your color story"
      description="Give each color one stable job. Every choice is an exact Tailwind v4 palette stop."
      animateIntro={animateIntro}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Choose a family, then its weight. Roles never shift when an optional color is cleared.</p>
        {!isPlaceholderLogo(paletteConfig.logo.lightSrc) ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void recommend()} disabled={isLoading || recommending}>
            <Sparkles className="mr-1 size-3.5" aria-hidden />
            {recommending ? "Reading logo…" : "Recommend from logo"}
          </Button>
        ) : null}
      </div>

      {recommendNotes.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3">
          {recommendNotes.map((note, index) => <p key={index} className="text-xs text-muted-foreground">{note}</p>)}
        </div>
      ) : null}

      <div className="space-y-2">
        {ROLES.map((definition, index) => {
          const value = roles[definition.key];
          const laterRoleIsSet = ROLES.slice(index + 1).some((later) => roles[later.key]);
          return (
            <div
              key={definition.key}
              onFocusCapture={() => setActiveRole(definition.key)}
              onClick={() => setActiveRole(definition.key)}
              className={`space-y-1 rounded-lg border p-3 ${activeRole === definition.key ? "border-primary ring-1 ring-primary" : "border-border"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label>{definition.label}</Label>
                  <p className="text-xs text-muted-foreground">{definition.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  {value ? (
                    <TailwindColorField value={value} label={definition.label} onSelect={(entry) => setRole(definition.key, entry.name)} disabled={isLoading} />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const previous = ROLES[index - 1]?.key;
                        setRole(definition.key, previous && roles[previous] ? roles[previous]! : roles.primary);
                      }}
                      disabled={isLoading}
                    >
                      Add color
                    </Button>
                  )}
                  {definition.key !== "primary" && value ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Clear ${definition.label}`}
                      title={laterRoleIsSet ? "Clear later roles first" : `Clear ${definition.label}`}
                      onClick={() => clearRole(definition.key as Exclude<RoleName, "primary">)}
                      disabled={isLoading || laterRoleIsSet}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <LogoPalette logoSrc={paletteConfig.logo.lightSrc} onPick={pickFromLogo} disabled={isLoading} />
      <p className="text-xs text-muted-foreground">
        Logo picks go into <strong>{ROLES.find((role) => role.key === activeRole)?.label}</strong> and snap to its nearest allowed palette stop.
      </p>

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
