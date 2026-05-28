"use client";

import * as React from "react";

import { TextScramble } from "@/components/core/text-scramble";
import { useLanguage, type Language } from "@/contexts/language-context";

type ScrambleContextValue = {
  trigger: boolean;
  onComplete: () => void;
  duration: number;
  speed: number;
};

const ScrambleContext = React.createContext<ScrambleContextValue | null>(null);

type ScrambleOnLanguageChangeProps = {
  /** When false, `<T>` children render as plain spans (animation disabled). */
  enabled?: boolean;
  duration?: number;
  speed?: number;
  children: React.ReactNode;
};

/**
 * Provider that scrambles any descendant `<T text="…"/>` whenever the active
 * language changes. Stays static on initial mount, on regular rerenders, and
 * on no-op language updates — only an *explicit* language change fires the
 * animation. Mirrors the behavior the personalized display uses on `/new`.
 */
export function ScrambleOnLanguageChange({
  enabled = true,
  duration = 0.35,
  speed = 0.02,
  children,
}: ScrambleOnLanguageChangeProps) {
  const { language } = useLanguage();
  const previousLanguageRef = React.useRef<Language | null>(null);
  const [trigger, setTrigger] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) return;
    if (previousLanguageRef.current === null) {
      previousLanguageRef.current = language;
      return;
    }
    if (previousLanguageRef.current === language) return;
    previousLanguageRef.current = language;
    setTrigger(true);
  }, [language, enabled]);

  const onComplete = React.useCallback(() => setTrigger(false), []);

  const value = React.useMemo<ScrambleContextValue | null>(
    () => (enabled ? { trigger, onComplete, duration, speed } : null),
    [enabled, trigger, onComplete, duration, speed],
  );

  return <ScrambleContext.Provider value={value}>{children}</ScrambleContext.Provider>;
}

/**
 * Render localized text that participates in the surrounding
 * `<ScrambleOnLanguageChange>` animation. Outside such a provider (or when the
 * provider is disabled) it falls back to a plain `<span>` so it is safe to use
 * unconditionally.
 */
export function T({ text, className }: { text: string; className?: string }) {
  const ctx = React.useContext(ScrambleContext);
  if (!ctx) {
    return <span className={className}>{text}</span>;
  }
  return (
    <TextScramble
      as="span"
      className={className}
      duration={ctx.duration}
      speed={ctx.speed}
      trigger={ctx.trigger}
      onScrambleComplete={ctx.onComplete}
    >
      {text}
    </TextScramble>
  );
}
