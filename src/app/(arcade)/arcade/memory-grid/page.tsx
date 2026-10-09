// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.
"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronArrowLeftIcon } from "@/arcade/components/icons/chevron-arrow-left-icon";
import { ArcadeHighScores } from "@/arcade/components/arcade-high-scores";
import { Button, Card, CardContent, CardHeader, CardTitle, Slider } from "@/arcade/ui/8bit";
import { useMemoryGridStrings } from "@/arcade/hooks/use-memory-grid-strings";
import { useLanguage } from "@/contexts/language-context";
import { useAppHaptics } from "@/components/haptics-provider";
import { ARCADE_PLAY_RESUMED_EVENT, ARCADE_TICKET_CALLED_EVENT } from "@/arcade/lib/events";
import {
  advanceGame, completedScore, COMPLETION_POINTS, FOODS, isRevealed, PAIR_COUNTS, pauseGame, readBest, readyGame,
  resumeGame, revealCard, saveBest, startGame, type MemoryGame,
} from "@/arcade/game/memory-grid/engine";
import { BOARD_WIDTH, CELL, COLUMNS, drawMemoryBoard } from "@/arcade/game/memory-grid/renderer";
import "@/arcade/styles/memory-grid.css";

const MODE_LABELS = ["snakeModeEasy", "snakeModeNormal", "snakeModeHard"] as const;
const SCORE_DIFFICULTIES = ["easy", "normal", "hard"] as const;
type TestWindow = Window & { render_game_to_text?: () => string; advanceTime?: (ms: number) => void | Promise<void> };

export default function MemoryGridPage() {
  const { t, language } = useLanguage();
  const m = useMemoryGridStrings();
  const { trigger } = useAppHaptics();
  const [game, setGame] = React.useState<MemoryGame>(() => readyGame(6));
  const gameRef = React.useRef(game);
  const [mode, setMode] = React.useState(0);
  const [modePreview, setModePreview] = React.useState(0);
  const [best, setBest] = React.useState<number | null>(null);
  const [lastTurn, setLastTurn] = React.useState<{ foods: readonly number[]; matched: boolean } | null>(null);
  const [artStatus, setArtStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const images = React.useRef(new Map<string, HTMLImageElement>());
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const stage = React.useRef<HTMLElement>(null);
  const buttons = React.useRef<Array<HTMLButtonElement | null>>([]);
  const hapticRef = React.useRef(trigger);
  React.useEffect(() => { hapticRef.current = trigger; }, [trigger]);

  const commit = React.useCallback((transition: (current: MemoryGame) => MemoryGame) => {
    const next = transition(gameRef.current);
    if (next !== gameRef.current) {
      gameRef.current = next;
      setGame(next);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    const pending = FOODS.map((food) => new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => { if (active) images.current.set(food.file, image); resolve(); };
      image.onerror = () => reject(new Error("Food artwork unavailable"));
      image.src = `/arcade/memory-grid/food/${food.file}.png`;
    }));
    void Promise.all(pending).then(() => { if (active) setArtStatus("ready"); }, () => { if (active) setArtStatus("error"); });
    return () => { active = false; };
  }, []);

  React.useEffect(() => { setBest(readBest(game.pairCount)); }, [game.pairCount]);
  React.useEffect(() => {
    if (game.status === "WON") setBest(saveBest(game.pairCount, game.turns));
  }, [game.status, game.pairCount, game.turns]);

  const pendingMismatch = game.remainingMs > 0;
  React.useEffect(() => {
    if (game.status !== "RUNNING" || !pendingMismatch) return;
    let previous = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      commit((current) => advanceGame(current, now - previous));
      previous = now;
      if (gameRef.current.status === "RUNNING" && gameRef.current.remainingMs > 0) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [commit, game.status, pendingMismatch]);

  React.useEffect(() => {
    const pause = () => commit(pauseGame);
    const visibility = () => { if (document.visibilityState === "hidden") pause(); };
    window.addEventListener(ARCADE_TICKET_CALLED_EVENT, pause);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener(ARCADE_TICKET_CALLED_EVENT, pause);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [commit]);

  // Test hooks are development-only and never reveal concealed food identities.
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const target = window as TestWindow;
    const previousText = target.render_game_to_text;
    const previousAdvance = target.advanceTime;
    target.render_game_to_text = () => {
      const current = gameRef.current;
      return JSON.stringify({
        coordinates: "origin top-left; four columns; each cell 80x80 logical pixels",
        status: current.status, turns: current.turns, pairs: current.matches, totalPairs: current.pairCount,
        score: completedScore(current),
        mismatchRemainingMs: current.remainingMs,
        cards: current.cards.map((card, index) => ({
          index, x: index % COLUMNS * CELL, y: Math.floor(index / COLUMNS) * CELL,
          matched: card.matched, food: isRevealed(current, index) ? FOODS[card.food]?.file : null,
        })),
      });
    };
    target.advanceTime = async (ms) => {
      commit((current) => advanceGame(current, ms));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    };
    return () => {
      target.render_game_to_text = previousText;
      target.advanceTime = previousAdvance;
    };
  }, [commit]);

  React.useEffect(() => {
    if (canvas.current && !navigator.userAgent.includes("jsdom")) drawMemoryBoard(canvas.current, game, images.current);
  }, [game, artStatus]);
  React.useEffect(() => {
    const repaint = () => {
      if (canvas.current && !navigator.userAgent.includes("jsdom")) drawMemoryBoard(canvas.current, gameRef.current, images.current);
    };
    const observer = new MutationObserver(repaint);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-brand"] });
    return () => observer.disconnect();
  }, []);

  const focusBoard = () => {
    stage.current?.scrollIntoView({ behavior: "auto", block: "start" });
    requestAnimationFrame(() => buttons.current.find((button) => button && !button.disabled)?.focus({ preventScroll: true }));
  };
  const notifyResume = () => window.dispatchEvent(new CustomEvent(ARCADE_PLAY_RESUMED_EVENT));
  const start = () => {
    if (artStatus !== "ready") return;
    if (gameRef.current.status !== "PAUSED") setLastTurn(null);
    commit((current) => current.status === "PAUSED" ? resumeGame(current) : startGame(PAIR_COUNTS[mode]!));
    notifyResume();
    focusBoard();
  };
  const reset = () => {
    setLastTurn(null);
    commit(() => readyGame(PAIR_COUNTS[mode]!));
  };
  const choose = (index: number) => {
    const before = gameRef.current;
    const next = revealCard(before, index);
    if (next === before) return;
    setLastTurn(next.turns > before.turns ? {
      foods: [before.cards[before.selected[0]!]!.food, before.cards[index]!.food],
      matched: next.matches > before.matches,
    } : null);
    hapticRef.current("uiSelect");
    commit(() => next);
  };
  const keyMove = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLUMNS, ArrowDown: COLUMNS };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const count = game.cards.length;
    buttons.current[(index + offset + count) % count]?.focus();
  };
  const cardLabel = (index: number) => {
    const card = game.cards[index]!;
    const food = isRevealed(game, index) ? m(FOODS[card.food]!.key) : m("memoryHidden");
    return `${m("memoryCard")} ${index + 1}: ${food}${card.matched && game.status !== "PAUSED" ? `, ${m("memoryMatched")}` : ""}`;
  };
  const score = completedScore(game);
  const announcement = game.status === "WON" ? `${m("memoryWon")} ${m("memoryTurns")}: ${game.turns}. ${m("memoryScore")}: ${score}`
    : game.status === "PAUSED" ? m("memoryPaused")
    : game.selected.length === 1 ? `${m(FOODS[game.cards[game.selected[0]!]!.food]!.key)}. ${m("memoryChooseSecond")}`
    : lastTurn ? `${lastTurn.foods.map((food) => m(FOODS[food]!.key)).join(", ")}. ${m(lastTurn.matched ? "memoryMatch" : "memoryMismatch")} ${lastTurn.matched ? `${m("memoryPairs")}: ${game.matches}/${game.pairCount}.` : ""}`
    : game.matches > 0 ? `${m("memoryPairs")}: ${game.matches}/${game.pairCount}. ${m("memoryChoose")}` : m("memoryChoose");
  const active = game.status === "RUNNING";

  return (
    <div className="arcade-pixel-grid arcade-memory-shell mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 sm:pt-10" data-memory-language={language} lang={language}>
      <div className="mb-4 flex justify-start">
        <Button asChild size="sm" haptic="uiToggle"><Link href="/arcade" className="inline-flex items-center gap-2">
          <ChevronArrowLeftIcon className="pixelated h-3.5 w-auto" /><span>{t("back")}</span>
        </Link></Button>
      </div>
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader><CardTitle className="text-4xl text-[var(--arcade-dot)] sm:text-5xl">{m("memoryGridTitle")}</CardTitle></CardHeader>
        <CardContent><ul className="arcade-ui arcade-memory-copy space-y-2 text-lg sm:text-xl">
          <li>* {m("memoryInstructionReveal")}</li><li>* {m("memoryInstructionTurns")}</li><li>* {m("memoryInstructionKeys")}</li>
        </ul></CardContent>
        <CardContent className="pt-0"><p className="arcade-ui arcade-memory-copy text-base">{m("memoryScoringHelp")}</p></CardContent>
      </Card>
      <Card className="mx-auto mt-4 w-full max-w-3xl">
        <CardHeader className="pb-2"><CardTitle className="text-2xl text-[var(--arcade-dot)] sm:text-3xl">{t("brickMayhemDifficultySettingTitle")}</CardTitle></CardHeader>
        <CardContent className="pt-2"><div className="arcade-memory-settings arcade-ui">
          <p>{t("brickMayhemSettingLabel")}: {t(MODE_LABELS[modePreview]!)} · {PAIR_COUNTS[modePreview]} {m("memoryPairs")}</p>
          <Slider min={0} max={2} step={1} value={[modePreview]} onValueChange={([value]) => setModePreview(value ?? 0)}
            onValueCommit={([value]) => { const next = value ?? 0; setMode(next); setModePreview(next); setLastTurn(null); commit(() => readyGame(PAIR_COUNTS[next]!)); }}
            aria-label={t("brickMayhemSettingLabel")} />
        </div></CardContent>
      </Card>
      <div className="mt-5 flex justify-center">
        <Button id="memory-start" size="lg" haptic="uiConfirm" disabled={artStatus !== "ready"} onClick={() => { if (active) focusBoard(); else start(); }}>{t("playNow")}</Button>
      </div>
      {artStatus !== "ready" && <p role="status" className="arcade-ui arcade-memory-copy mt-3 text-center">{m(artStatus === "error" ? "memoryArtError" : "memoryLoading")}</p>}
      <section ref={stage} className="arcade-memory-stage mt-6" aria-label={m("memoryGridTitle")}>
        <div className="arcade-memory-readout arcade-ui">
          <p>{m("memoryTurns")}<strong>{game.turns}</strong></p>
          <p>{m("memoryPairs")}<strong>{game.matches}/{game.pairCount}</strong></p>
          <p>{m("memoryBest")}<strong>{best ?? "—"}</strong></p>
        </div>
        <div className="arcade-memory-board" style={{ aspectRatio: `${BOARD_WIDTH} / ${CELL * game.cards.length / COLUMNS}` }}>
          <canvas ref={canvas} width={BOARD_WIDTH} height={CELL * game.cards.length / COLUMNS} className="pixelated" aria-hidden="true" />
          <div className="arcade-memory-cards" role="group" aria-label={m("memoryGridTitle")}>
            {game.cards.map((card, index) => <button key={index} type="button"
              ref={(button) => { buttons.current[index] = button; }}
              className="arcade-memory-card" aria-label={cardLabel(index)} disabled={!active}
              aria-disabled={card.matched || pendingMismatch || game.selected.includes(index)}
              onClick={() => choose(index)} onKeyDown={(event) => keyMove(event, index)} />)}
          </div>
          {game.status !== "RUNNING" && <div className="arcade-cabinet-screen">
            <div className="arcade-cabinet-screen-inner arcade-memory-overlay">
              <p className="arcade-retro arcade-cabinet-title">{m(game.status === "WON" ? "memoryWon" : game.status === "PAUSED" ? "memoryPaused" : "memoryReady")}</p>
              {game.status === "WON" ? <div className="arcade-ui arcade-memory-result">
                <p className="arcade-cabinet-score">{m("memoryScore")}: {score}</p>
                <p>{m("memoryTurns")}: {game.turns}</p>
              </div> :
                <div className="arcade-memory-sample" aria-hidden="true">{FOODS.slice(0, 3).map((food) =>
                  // Original pixel sprites deliberately bypass image optimization.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={food.file} src={`/arcade/memory-grid/food/${food.file}.png`} alt="" width={16} height={16} className="pixelated" />)}</div>}
              <Button haptic="uiConfirm" disabled={artStatus !== "ready"} onClick={start} font="normal" className="arcade-ui arcade-memory-copy">
                {m(game.status === "PAUSED" ? "memoryResume" : "memoryStart")}
              </Button>
            </div>
          </div>}
        </div>
        {game.status === "WON" && <div className="arcade-ui arcade-memory-result mt-4 text-center">
          <p>{m("memoryCompletionPoints")}: {COMPLETION_POINTS}</p>
          <p>{m("memoryEfficiencyBonus")}: {score - COMPLETION_POINTS}</p>
        </div>}
        <p className="arcade-ui arcade-memory-message" aria-hidden="true">{active ? (pendingMismatch ? m("memoryMismatch") : game.selected.length === 1 ? m("memoryChooseSecond") : m("memoryChoose")) : "\u00a0"}</p>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      </section>
      <div className="arcade-memory-leaderboard mt-5">
        <ArcadeHighScores key={`memory-grid:${mode}`} game="memory-grid" difficulty={SCORE_DIFFICULTIES[mode]!}
          score={score} status={game.status === "WON" ? "GAME_OVER" : game.status}
          entryTimeLimitSeconds={null} />
      </div>
      <section className="arcade-memory-control-dock">
        <Button size="lg" font="normal" haptic="uiConfirm" disabled={artStatus !== "ready"} className="arcade-ui arcade-memory-copy"
          onClick={() => active ? commit(pauseGame) : start()}>{m(active ? "memoryPause" : game.status === "PAUSED" ? "memoryResume" : "memoryStart")}</Button>
        <Button size="lg" font="normal" variant="outline" haptic="uiDestructive" className="arcade-ui arcade-memory-copy" onClick={reset}>{m("memoryRestart")}</Button>
      </section>
      <footer className="arcade-ui arcade-memory-credit mt-5 text-center">
        <p>{m("memorySharedScores")}</p>
        <p>{m("memoryCredit")}: <a href="https://henrysoftware.itch.io/pixel-food" target="_blank" rel="noopener noreferrer">Henry Software</a> · <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0 1.0</a></p>
      </footer>
    </div>
  );
}
