"use client";

import * as React from "react";

import { TextScramble, type TextScrambleProps } from "@/components/core/text-scramble";
import { cn } from "@/lib/utils";

type LanguageMorphTextProps = Omit<TextScrambleProps<"span">, "as" | "children"> & {
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

export function LanguageMorphText({
  text,
  className,
  loop: _loop,
  holdDelay: _holdDelay,
  motionMode: _motionMode,
  wordWrap: _wordWrap,
  characterClassName: _characterClassName,
  characterStagger: _characterStagger,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  ...props
}: LanguageMorphTextProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const currentText = Array.isArray(text) ? text[currentIndex] ?? "" : text;

  React.useEffect(() => {
    if (!Array.isArray(text)) return;
    setCurrentIndex(0);
  }, [text]);

  return (
    <TextScramble
      as="span"
      className={cn("inline-block overflow-visible align-baseline", className)}
      {...props}
    >
      {currentText}
    </TextScramble>
  );
}
