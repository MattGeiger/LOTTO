"use client";

import * as React from "react";

import { Button } from "@/arcade/ui/8bit";
import {
  type ArcadeDifficultyKey,
  type ArcadeGameSlug,
  type ArcadeHighScoreEntry,
  isValidInitials,
  normalizeInitials,
  scoreQualifies,
  trimInitialsToLength,
} from "@/arcade/lib/high-score-types";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

type ArcadeHighScoresProps = {
  game: ArcadeGameSlug;
  difficulty: ArcadeDifficultyKey;
  score: number;
  status: "READY" | "RUNNING" | "PAUSED" | "GAME_OVER";
  className?: string;
};

type HighScoresResponse = {
  scores: ArcadeHighScoreEntry[];
  unavailable?: boolean;
};

type SubmitResponse = HighScoresResponse & {
  accepted: boolean;
  entry?: ArcadeHighScoreEntry;
  error?: string;
};

export function ArcadeHighScores({
  game,
  difficulty,
  score,
  status,
  className,
}: ArcadeHighScoresProps) {
  const { t } = useLanguage();
  const visible = status === "READY" || status === "GAME_OVER";
  const [scores, setScores] = React.useState<ArcadeHighScoreEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [unavailable, setUnavailable] = React.useState(false);
  const [initials, setInitials] = React.useState("");
  const [secondsLeft, setSecondsLeft] = React.useState(30);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [rejected, setRejected] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const entrySessionKey = `${game}:${difficulty}:${score}:${status}`;

  const loadScores = React.useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ game, difficulty });
      const response = await fetch(`/api/arcade/high-scores?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("High-score request failed.");
      const body = await response.json() as HighScoresResponse;
      setScores(Array.isArray(body.scores) ? body.scores : []);
      setUnavailable(Boolean(body.unavailable));
    } catch {
      setScores([]);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [difficulty, game, visible]);

  React.useEffect(() => {
    void loadScores();
  }, [loadScores]);

  React.useEffect(() => {
    setInitials("");
    setSecondsLeft(30);
    setSaving(false);
    setSaved(false);
    setRejected(false);
    setSubmitError(null);
  }, [entrySessionKey]);

  const qualifies = status === "GAME_OVER" && !unavailable && scoreQualifies(score, scores);
  const entryOpen = qualifies && !saved && !rejected && secondsLeft > 0;

  React.useEffect(() => {
    if (!entryOpen) return;
    const id = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [entryOpen]);

  if (!visible) {
    return null;
  }

  const handleInitialsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInitials(trimInitialsToLength(event.target.value));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedInitials = normalizeInitials(initials);
    if (!isValidInitials(normalizedInitials) || secondsLeft <= 0 || saving) return;

    setSaving(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/arcade/high-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          difficulty,
          initials: normalizedInitials,
          score,
        }),
      });
      const body = await response.json().catch(() => ({})) as SubmitResponse;
      if (!response.ok) throw new Error(body.error || "Unable to save high score.");
      setScores(Array.isArray(body.scores) ? body.scores : []);
      setSaved(Boolean(body.accepted));
      setRejected(!body.accepted);
    } catch {
      setSubmitError(t("arcadeHighScoreSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("arcade-high-scores arcade-ui", className)} data-testid="arcade-high-scores">
      <div className="arcade-high-scores-heading">
        <h2>{t("arcadeHighScoresTitle")}</h2>
      </div>

      {loading ? (
        <p className="arcade-high-scores-message">{t("arcadeHighScoresLoading")}</p>
      ) : unavailable ? (
        <p className="arcade-high-scores-message">{t("arcadeHighScoresUnavailable")}</p>
      ) : scores.length === 0 ? (
        <p className="arcade-high-scores-message">{t("arcadeHighScoresEmpty")}</p>
      ) : (
        <ol className="arcade-high-scores-list" aria-label={t("arcadeHighScoresTitle")}>
          {scores.map((entry, index) => (
            <li key={entry.id} className="arcade-high-scores-row">
              <span className="arcade-high-scores-rank">{index + 1}</span>
              <span className="arcade-high-scores-initials" dir="auto">{entry.initials}</span>
              <span className="arcade-high-scores-score">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}

      {status === "GAME_OVER" && qualifies && !saved && !rejected ? (
        <form className="arcade-high-scores-entry" onSubmit={handleSubmit}>
          <p className="arcade-high-scores-entry-title">{t("arcadeHighScoreQualify")}</p>
          <label className="sr-only" htmlFor={`arcade-high-score-initials-${game}`}>
            {t("arcadeHighScoreInitialsLabel")}
          </label>
          <div className="arcade-high-scores-entry-row">
            <input
              id={`arcade-high-score-initials-${game}`}
              className="arcade-high-scores-input"
              value={initials}
              onChange={handleInitialsChange}
              disabled={secondsLeft <= 0 || saving}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              dir="auto"
              aria-label={t("arcadeHighScoreInitialsLabel")}
            />
            <Button
              type="submit"
              size="sm"
              haptic="uiConfirm"
              disabled={!isValidInitials(initials) || secondsLeft <= 0 || saving}
            >
              {saving ? t("refreshing") : t("arcadeHighScoreSubmit")}
            </Button>
          </div>
          <p className="arcade-high-scores-timer">
            {secondsLeft > 0
              ? t("arcadeHighScoreTimer").replace("{seconds}", String(secondsLeft))
              : t("arcadeHighScoreExpired")}
          </p>
          {submitError ? <p className="arcade-high-scores-error">{submitError}</p> : null}
        </form>
      ) : null}

      {status === "GAME_OVER" && saved ? (
        <p className="arcade-high-scores-message text-[var(--arcade-pellet)]">
          {t("arcadeHighScoreSaved")}
        </p>
      ) : null}

      {status === "GAME_OVER" && rejected ? (
        <p className="arcade-high-scores-message">
          {t("arcadeHighScoreRejected")}
        </p>
      ) : null}
    </div>
  );
}
