"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TextScrambleProps<T extends keyof React.JSX.IntrinsicElements = "p"> = {
  children: string;
  as?: T;
  duration?: number;
  speed?: number;
  characterSet?: string;
  className?: string;
  trigger?: boolean;
  onScrambleComplete?: () => void;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

const DEFAULT_CHARACTER_SET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const segmentText = (text: string) => Array.from(text);

function makeScrambledFrame(target: string[], progress: number, characterSet: string) {
  const revealCount = Math.floor(target.length * progress);
  return target
    .map((character, index) => {
      if (/\s/u.test(character) || index < revealCount) {
        return character;
      }
      const randomIndex = Math.floor(Math.random() * characterSet.length);
      return characterSet[randomIndex] ?? character;
    })
    .join("");
}

export function TextScramble<T extends keyof React.JSX.IntrinsicElements = "p">({
  children,
  as,
  duration = 0.8,
  speed = 0.04,
  characterSet = DEFAULT_CHARACTER_SET,
  className,
  trigger,
  onScrambleComplete,
  ...props
}: TextScrambleProps<T>) {
  const Component = (as ?? "p") as React.ElementType;
  const [displayText, setDisplayText] = React.useState(children);
  const hasMountedRef = React.useRef(false);
  const previousChildrenRef = React.useRef(children);

  React.useEffect(() => {
    const isControlled = typeof trigger === "boolean";
    const shouldAnimate = isControlled ? trigger : !hasMountedRef.current;
    hasMountedRef.current = true;

    if (!shouldAnimate) {
      previousChildrenRef.current = children;
      setDisplayText(children);
      return;
    }

    const target = segmentText(children);
    const startedAt = performance.now();
    const intervalMs = Math.max(16, speed * 1000);

    setDisplayText(makeScrambledFrame(target, 0, characterSet));
    const intervalId = window.setInterval(() => {
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      const progress = Math.min(1, elapsedSeconds / duration);

      if (progress >= 1) {
        window.clearInterval(intervalId);
        previousChildrenRef.current = children;
        setDisplayText(children);
        onScrambleComplete?.();
        return;
      }

      setDisplayText(makeScrambledFrame(target, progress, characterSet));
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [characterSet, children, duration, onScrambleComplete, speed, trigger]);

  React.useEffect(() => {
    if (previousChildrenRef.current === children) return;
    if (trigger) return;
    previousChildrenRef.current = children;
    setDisplayText(children);
  }, [children, trigger]);

  return (
    <Component className={cn(className)} {...props}>
      {displayText}
    </Component>
  );
}
