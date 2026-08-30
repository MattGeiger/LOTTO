// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

// Live derived-theme preview for the Appearance wizard: representative
// surfaces (Now Serving, ticket cells, the filled primary button) rendered
// from the client-side derived token maps, plus the protected operational
// colors — shown deliberately so operators see they do not change.

import * as React from "react";

import { useLegacySafeColor } from "@/hooks/use-legacy-safe-color";
import type { BrandThemeTokens } from "@/lib/brand-theme/tokens";

type Scope = keyof BrandThemeTokens;

const swatchStyle = (
  tokens: Record<string, string>,
  fillToken: string,
  textToken: string,
  borderToken?: string,
): React.CSSProperties => ({
  background: tokens[fillToken],
  color: tokens[textToken],
  border: borderToken ? `2px solid ${tokens[borderToken]}` : undefined,
});

function ScopePreview({
  tokens: derived,
  label,
}: {
  tokens: Record<string, string>;
  label: string;
}) {
  // Converted once, here, rather than at each `style` prop below. Every value
  // in this map ends up inline on an element, where an `oklch()` the engine
  // cannot parse is dropped rather than approximated — so one missed call site
  // is an invisible panel, not a slightly-off colour. Doing it at the boundary
  // means a new swatch added below is safe without anyone remembering.
  const safe = useLegacySafeColor();
  const tokens = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(derived).map(([token, value]) => [token, safe(value)]),
      ) as Record<string, string>,
    [derived, safe],
  );

  return (
    <div
      className="flex-1 space-y-2 rounded-xl p-3"
      style={{ background: tokens.background, color: tokens.foreground }}
    >
      <p className="text-[10px] font-semibold tracking-widest uppercase opacity-70">
        {label}
      </p>
      <div
        className="rounded-lg px-3 py-2 text-center text-lg font-black"
        style={swatchStyle(tokens, "ticket-serving", "ticket-serving-text", "ticket-serving-border")}
      >
        42
        <span className="block text-[9px] font-semibold tracking-widest uppercase opacity-80">
          Now Serving
        </span>
      </div>
      <div className="flex gap-2">
        <div
          className="flex-1 rounded-md px-2 py-1 text-center text-sm font-bold"
          style={swatchStyle(tokens, "ticket-served", "ticket-served-text", "ticket-served-border")}
        >
          17
        </div>
        <div
          className="flex-1 rounded-md px-2 py-1 text-center text-sm font-bold"
          style={{
            background: tokens["ticket-upcoming"],
            color: tokens["muted-foreground"],
            border: `2px solid ${tokens["ticket-upcoming-border"]}`,
          }}
        >
          58
        </div>
      </div>
      <button
        type="button"
        tabIndex={-1}
        className="w-full cursor-default rounded-md px-3 py-1.5 text-sm font-semibold"
        style={swatchStyle(tokens, "primary", "primary-foreground")}
      >
        Enter a new ticket number
      </button>
      <div
        className="rounded-lg p-2 text-xs"
        style={{
          background: tokens.card,
          color: tokens["card-foreground"],
          border: `1px solid ${tokens.border}`,
        }}
      >
        Card text on your surfaces.
      </div>
    </div>
  );
}

export function ThemePreview({ theme }: { theme: BrandThemeTokens }) {
  const scopes: { scope: Scope; label: string }[] = [
    { scope: "light", label: "Light" },
    { scope: "dark", label: "Dark" },
    { scope: "hiVizLight", label: "High visibility · light" },
    { scope: "hiVizDark", label: "High visibility · dark" },
  ];
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        {scopes.map(({ scope, label }) => (
          <ScopePreview
            key={scope}
            tokens={theme[scope] as Record<string, string>}
            label={label}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-bold"
          style={{
            background: "var(--operational-danger-action-bg)",
            color: "var(--operational-danger-action-fg)",
          }}
        >
          Returned
        </span>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-bold"
          style={{
            background: "var(--operational-warning-action-bg)",
            color: "var(--operational-warning-action-fg)",
          }}
        >
          Unclaimed
        </span>
        <p className="text-[11px] text-muted-foreground">
          Status colors are universal across every agency and never change with
          branding.
        </p>
      </div>
    </div>
  );
}
