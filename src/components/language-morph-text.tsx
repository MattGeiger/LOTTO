// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { TextScramble, type TextScrambleProps } from "@/components/core/text-scramble";
import { cn } from "@/lib/utils";

type TextScrambleSpanProps = Omit<TextScrambleProps<"span">, "as" | "children">;

type LanguageMorphTextProps = TextScrambleSpanProps & {
  text: string | string[];
  loop?: boolean;
  holdDelay?: number;
  motionMode?: unknown;
  wordWrap?: unknown;
  characterClassName?: string;
  characterStagger?: number;
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
};

const MORPH_COMPATIBILITY_PROP_KEYS = [
  "loop",
  "holdDelay",
  "motionMode",
  "wordWrap",
  "characterClassName",
  "characterStagger",
  "initial",
  "animate",
  "exit",
  "transition",
] as const satisfies readonly (keyof LanguageMorphTextProps)[];

const stripMorphCompatibilityProps = (
  props: Omit<LanguageMorphTextProps, "text" | "className">,
): TextScrambleSpanProps => {
  const scrambleProps = { ...props };
  for (const key of MORPH_COMPATIBILITY_PROP_KEYS) {
    delete scrambleProps[key];
  }
  return scrambleProps as TextScrambleSpanProps;
};

export function LanguageMorphText({
  text,
  className,
  ...props
}: LanguageMorphTextProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const currentText = Array.isArray(text) ? text[currentIndex] ?? "" : text;
  const scrambleProps = stripMorphCompatibilityProps(props);

  React.useEffect(() => {
    if (!Array.isArray(text)) return;
    setCurrentIndex(0);
  }, [text]);

  return (
    <TextScramble
      as="span"
      className={cn("inline-block overflow-visible align-baseline", className)}
      {...scrambleProps}
    >
      {currentText}
    </TextScramble>
  );
}
