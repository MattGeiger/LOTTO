// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

// Logos & icons step. Uploads are measured server-side and previewed in the
// header slot at its real capped height (the Issue 32 lesson: a logo renders
// through a fixed-height slot, so the acceptance check is "does it look
// reasonable at this height"). One square mark generates the whole install
// icon set (the St. Johns launch shipped three icon-refresh commits; this
// replaces that workflow).

import * as React from "react";
import { toast } from "sonner";

import { SquarePenIcon } from "@/components/animate-ui/icons/square-pen";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepWrapper } from "@/components/translation/ai-config/shared/StepWrapper";
import { formatOklch } from "@/lib/brand-theme/color";

import { draftTheme, patchConfig } from "../draft";
import type { AppearanceStepProps } from "../types";

type UploadKind = "logo-light" | "logo-dark" | "icon";

export function LogosStep({
  draft,
  onChange,
  isLoading,
  animateIntro,
}: AppearanceStepProps) {
  const { logo, pwa } = draft.config;
  const [uploading, setUploading] = React.useState<UploadKind | null>(null);
  const theme = draftTheme(draft.config);
  const busy = isLoading || uploading !== null;

  const upload = async (kind: UploadKind, file: File) => {
    setUploading(kind);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      if (kind === "icon") form.set("backgroundColor", pwa.backgroundColor);
      const response = await fetch("/api/brand-config/assets", {
        method: "POST",
        body: form,
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Upload failed. Please try again.");
        return;
      }
      if (kind === "icon") {
        onChange({
          config: patchConfig(draft.config, "pwa", {
            browserIcons: body.iconSet.browserIcons,
            appleIcons: body.iconSet.appleIcons,
            manifestIcons: body.iconSet.manifestIcons,
            themeColor: body.iconSet.dominantColor,
          }),
        });
        toast.success("Install icons generated from your mark.");
      } else if (kind === "logo-light") {
        onChange({
          config: patchConfig(draft.config, "logo", {
            lightSrc: body.asset.src,
            width: body.asset.width,
            height: body.asset.height,
          }),
        });
      } else {
        onChange({
          config: patchConfig(draft.config, "logo", {
            darkSrc: body.asset.src,
            darkWidth: body.asset.width,
            darkHeight: body.asset.height,
          }),
        });
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  };

  const UploadButton = ({ kind, label }: { kind: UploadKind; label: string }) => (
    <div>
      <input
        id={`upload-${kind}`}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(kind, file);
          event.target.value = "";
        }}
      />
      <Button asChild variant="outline" size="sm" disabled={busy}>
        <label htmlFor={`upload-${kind}`} className="cursor-pointer">
          {uploading === kind ? "Uploading…" : label}
        </label>
      </Button>
    </div>
  );

  const headerSlot = (scope: "light" | "dark") => {
    const tokens = theme[scope] as Record<string, string>;
    const src = scope === "light" ? logo.lightSrc : logo.darkSrc;
    const needsPlate =
      scope === "light" && logo.presentation === "dark-surface";
    return (
      <div
        key={scope}
        className="flex flex-1 items-center justify-center rounded-lg p-3"
        style={{ background: tokens.background }}
      >
        <div
          className={needsPlate ? "rounded-xl px-3 py-2" : undefined}
          style={needsPlate ? { background: tokens["brand-logo-surface"] } : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- live preview of an
              operator-uploaded asset; next/image adds nothing in a dialog preview. */}
          <img src={src} alt={`${scope} logo preview`} className="h-12 w-auto max-w-full" />
        </div>
      </div>
    );
  };

  return (
    <StepWrapper
      icon={SquarePenIcon}
      title="Logos & icons"
      description="Upload your marks; sizes are measured automatically and previewed at the real header height."
      animateIntro={animateIntro}
    >
      <div className="space-y-2">
        <Label>Header logo preview</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          {headerSlot("light")}
          {headerSlot("dark")}
        </div>
        <div className="flex flex-wrap gap-2">
          <UploadButton kind="logo-light" label="Upload light-mode logo" />
          <UploadButton kind="logo-dark" label="Upload dark-mode logo" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="logo-presentation">Light-mode treatment</Label>
        <Select
          value={logo.presentation}
          onValueChange={(presentation) =>
            onChange({
              config: patchConfig(draft.config, "logo", {
                presentation: presentation as "transparent" | "dark-surface",
              }),
            })
          }
          disabled={busy}
        >
          <SelectTrigger id="logo-presentation" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="transparent">
              Transparent — the logo sits directly on the page
            </SelectItem>
            <SelectItem value="dark-surface">
              Dark plate — for light logos that need a dark surface behind them
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>App icon</Label>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-[22%]"
            style={{ background: formatOklch(draft.config.colors.surfaceLight) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- preview of a
                generated PNG served from the assets API. */}
            <img
              src={pwa.manifestIcons.at(-1)?.src ?? pwa.browserIcons[0]?.src}
              alt="App icon preview"
              className="h-full w-full object-contain"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{draft.config.identity.shortName}</p>
            <p className="text-xs text-muted-foreground">
              Home-screen preview with your label.
            </p>
          </div>
          <div className="ml-auto">
            <UploadButton kind="icon" label="Upload square mark" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          One square image generates every browser, Apple, and install icon
          size automatically.
        </p>
      </div>
    </StepWrapper>
  );
}
