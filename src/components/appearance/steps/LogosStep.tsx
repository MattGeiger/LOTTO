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
type UploadResponse = {
  error?: string;
  asset?: {
    src: string;
    width: number;
    height: number;
    type: string;
    filename: string;
    warnings: string[];
    presentationHint?: { suggested: "transparent" | "dark-surface"; reason: string };
  };
  iconSet?: {
    browserIcons: { src: string; sizes: string; type: string }[];
    appleIcons: { src: string; sizes: string; type: string }[];
    manifestIcons: {
      src: string;
      sizes: string;
      type: string;
      purpose: "any" | "maskable";
    }[];
    dominantColor: string;
  };
};

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function UploadButton({
  kind,
  label,
  busy,
  uploading,
  onFile,
}: {
  kind: UploadKind;
  label: string;
  busy: boolean;
  uploading: UploadKind | null;
  onFile: (kind: UploadKind, file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        id={`upload-${kind}`}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onFile(kind, file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {uploading === kind ? "Uploading…" : label}
      </Button>
    </div>
  );
}

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
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(
        "This image is larger than 4 MB. Export or compress a smaller PNG, JPEG, WebP, or SVG, then upload it again.",
      );
      return;
    }
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
      const body = (await response.json().catch(() => ({}))) as UploadResponse;
      if (!response.ok) {
        toast.error(
          body.error ??
            "LOTTO could not finish this image upload. Check your connection and try the same file again.",
        );
        return;
      }
      if (kind === "icon" && body.iconSet) {
        onChange({
          config: patchConfig(draft.config, "pwa", {
            browserIcons: body.iconSet.browserIcons,
            appleIcons: body.iconSet.appleIcons,
            manifestIcons: body.iconSet.manifestIcons,
            themeColor: body.iconSet.dominantColor,
          }),
        });
        toast.success("Install icons generated from your mark.");
      } else if (kind === "logo-light" && body.asset) {
        onChange({
          config: patchConfig(draft.config, "logo", {
            lightSrc: body.asset.src,
            width: body.asset.width,
            height: body.asset.height,
            lightFilename: body.asset.filename,
            lightType: body.asset.type,
            ...(body.asset.presentationHint
              ? { presentation: body.asset.presentationHint.suggested }
              : {}),
          }),
        });
        toast.success("Light-mode logo uploaded.");
        for (const warning of body.asset.warnings ?? []) toast.warning(warning);
        if (body.asset.presentationHint?.suggested === "dark-surface") {
          toast.info(body.asset.presentationHint.reason);
        }
      } else if (kind === "logo-dark" && body.asset) {
        onChange({
          config: patchConfig(draft.config, "logo", {
            darkSrc: body.asset.src,
            darkWidth: body.asset.width,
            darkHeight: body.asset.height,
            darkFilename: body.asset.filename,
            darkType: body.asset.type,
          }),
        });
        toast.success("Dark-mode logo uploaded.");
        for (const warning of body.asset.warnings ?? []) toast.warning(warning);
      } else {
        toast.error(
          "LOTTO stored the image but did not return its details. Try the upload again; if it continues, ask a deployment administrator to review the LOTTO logs.",
        );
      }
    } catch {
      toast.error(
        "LOTTO could not reach the image upload service. Check your connection and try the same file again.",
      );
    } finally {
      setUploading(null);
    }
  };

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
          <UploadButton
            kind="logo-light"
            label="Upload light-mode logo"
            busy={busy}
            uploading={uploading}
            onFile={(kind, file) => void upload(kind, file)}
          />
          <UploadButton
            kind="logo-dark"
            label="Upload dark-mode logo"
            busy={busy}
            uploading={uploading}
            onFile={(kind, file) => void upload(kind, file)}
          />
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
        <UploadButton
          kind="icon"
          label="Upload square mark"
          busy={busy}
          uploading={uploading}
          onFile={(kind, file) => void upload(kind, file)}
        />
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
