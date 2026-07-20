// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

// One brand color input: a native picker swatch plus a text field that
// accepts `oklch(L C H)` (the repo's authoring standard) or hex, kept in
// sync through the shared conversion math in `src/lib/brand-theme/color`.

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatOklch,
  oklchToSrgb,
  parseOklch,
  srgbToOklch,
  type Oklch,
} from "@/lib/brand-theme/color";

const toHex = (color: Oklch): string =>
  `#${oklchToSrgb(color)
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const fromHex = (value: string): Oklch | null => {
  const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const [r, g, b] = [0, 2, 4].map(
    (offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255,
  );
  return srgbToOklch([r, g, b]);
};

export function ColorField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  hint?: string;
  value: Oklch;
  onChange: (color: Oklch) => void;
  disabled?: boolean;
}) {
  const [text, setText] = React.useState(() => formatOklch(value));
  const [textInvalid, setTextInvalid] = React.useState(false);

  // Reflect external changes (picker, template load) into the text field.
  const externalText = formatOklch(value);
  const lastExternal = React.useRef(externalText);
  React.useEffect(() => {
    if (lastExternal.current !== externalText) {
      lastExternal.current = externalText;
      setText(externalText);
      setTextInvalid(false);
    }
  }, [externalText]);

  const commitText = (raw: string) => {
    const parsed = parseOklch(raw) ?? fromHex(raw);
    if (parsed) {
      setTextInvalid(false);
      onChange({ l: parsed.l, c: parsed.c, h: parsed.h });
      setText(formatOklch(parsed));
    } else {
      setTextInvalid(true);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
          value={toHex(value)}
          onChange={(event) => {
            const parsed = fromHex(event.target.value);
            if (parsed) onChange(parsed);
          }}
          disabled={disabled}
        />
        <Input
          id={id}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => commitText(text)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitText(text);
          }}
          aria-invalid={textInvalid}
          spellCheck={false}
          disabled={disabled}
          className="font-mono text-xs"
        />
      </div>
      {textInvalid ? (
        <p className="text-xs text-destructive">
          Enter a color as oklch(L C H) or a 6-digit hex value.
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
