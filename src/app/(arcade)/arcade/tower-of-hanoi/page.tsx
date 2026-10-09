// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.
"use client";
import * as React from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Slider } from "@/arcade/ui/8bit";
import { ChevronArrowLeftIcon } from "@/arcade/components/icons/chevron-arrow-left-icon";
import { ArcadeHighScores } from "@/arcade/components/arcade-high-scores";
import { useLanguage } from "@/contexts/language-context";
import { useMemoryGridStrings } from "@/arcade/hooks/use-memory-grid-strings";
import { useHanoiStrings } from "@/arcade/hooks/use-hanoi-strings";
import { useAppHaptics } from "@/components/haptics-provider";
import { ARCADE_PLAY_RESUMED_EVENT, ARCADE_TICKET_CALLED_EVENT } from "@/arcade/lib/events";
import { cancelSelection, choosePeg, completedScore, DISK_COUNTS, minimumMoves, pauseGame, readBest, readyGame, resumeGame, saveBest, startGame, undoMove, type HanoiGame } from "@/arcade/game/tower-of-hanoi/engine";
import { BOARD_HEIGHT, BOARD_WIDTH, drawHanoiBoard } from "@/arcade/game/tower-of-hanoi/renderer";
import "@/arcade/styles/tower-of-hanoi.css";

const MODES = ["snakeModeEasy", "snakeModeNormal", "snakeModeHard"] as const;
const DIFFICULTIES = ["easy", "normal", "hard"] as const;
type TestWindow = Window & { render_game_to_text?: () => string; advanceTime?: (ms: number) => Promise<void> };

export default function TowerOfHanoiPage() {
  const { t, language } = useLanguage();
  const h = useHanoiStrings();
  const m = useMemoryGridStrings();
  const { trigger } = useAppHaptics();
  const [game, setGame] = React.useState<HanoiGame>(() => readyGame(3));
  const gameRef = React.useRef(game);
  const [mode, setMode] = React.useState(0);
  const [preview, setPreview] = React.useState(0);
  const [best, setBest] = React.useState<number | null>(null);
  const [run, setRun] = React.useState(0);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const stage = React.useRef<HTMLElement>(null);
  const pegs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const commit = React.useCallback((transition: (current: HanoiGame) => HanoiGame) => {
    const next = transition(gameRef.current);
    if (next !== gameRef.current) { gameRef.current = next; setGame(next); }
  }, []);
  React.useEffect(() => { setBest(readBest(game.diskCount)); }, [game.diskCount]);
  React.useEffect(() => { if (game.status === "WON") setBest(saveBest(game)); }, [game]);
  React.useEffect(() => {
    const pause = () => commit(pauseGame);
    const visibility = () => { if (document.visibilityState === "hidden") pause(); };
    window.addEventListener(ARCADE_TICKET_CALLED_EVENT, pause);
    document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener(ARCADE_TICKET_CALLED_EVENT, pause); document.removeEventListener("visibilitychange", visibility); };
  }, [commit]);
  React.useEffect(() => {
    const repaint = () => { if (canvas.current && !navigator.userAgent.includes("jsdom")) drawHanoiBoard(canvas.current, gameRef.current); };
    repaint();
    const observer = new MutationObserver(repaint);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-brand"] });
    return () => observer.disconnect();
  }, [game]);
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const target = window as TestWindow;
    const previousText = target.render_game_to_text;
    const previousAdvance = target.advanceTime;
    target.render_game_to_text = () => JSON.stringify({ coordinates: "origin top-left; peg A/B/C centers x=60/180/300, y=120; 360x240 board; stacks bottom to top", status: gameRef.current.status, pegs: gameRef.current.pegs, selected: gameRef.current.selected, moves: gameRef.current.moves, disks: gameRef.current.diskCount, score: completedScore(gameRef.current) });
    target.advanceTime = async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); };
    return () => { target.render_game_to_text = previousText; target.advanceTime = previousAdvance; };
  }, []);

  const pegNames = [h("hanoiLeft"), h("hanoiMiddle"), h("hanoiRight")];
  const active = game.status === "RUNNING";
  const score = completedScore(game);
  const focusBoard = () => {
    stage.current?.scrollIntoView({ behavior: "auto", block: "start" });
    requestAnimationFrame(() => pegs.current[0]?.focus({ preventScroll: true }));
  };
  const start = () => {
    if (gameRef.current.status === "PAUSED") commit(resumeGame);
    else { setRun((value) => value + 1); commit(() => startGame(DISK_COUNTS[mode]!)); }
    window.dispatchEvent(new CustomEvent(ARCADE_PLAY_RESUMED_EVENT));
    focusBoard();
  };
  const reset = () => { setRun((value) => value + 1); commit(() => readyGame(DISK_COUNTS[mode]!)); };
  const continueGame = () => {
    const current = gameRef.current;
    const nextMode = DISK_COUNTS.indexOf(current.diskCount) + 1;
    const nextCount = DISK_COUNTS[nextMode];
    if (current.status !== "WON" || nextCount === undefined) return;
    setMode(nextMode);
    setPreview(nextMode);
    setRun((value) => value + 1);
    commit(() => startGame(nextCount));
    window.dispatchEvent(new CustomEvent(ARCADE_PLAY_RESUMED_EVENT));
    focusBoard();
  };
  const choose = (index: number) => {
    const before = gameRef.current;
    commit((current) => choosePeg(current, index));
    if (gameRef.current.moves > before.moves) trigger("uiConfirm");
    else if (gameRef.current.selected !== before.selected) trigger("uiSelect");
  };
  const keys = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); pegs.current[(index + (event.key === "ArrowLeft" ? 2 : 1)) % 3]?.focus();
    } else if (event.key === "Escape") { event.preventDefault(); commit(cancelSelection); }
  };
  const transfer = game.notice.transfer;
  const message = game.status === "WON" ? `${h("hanoiWon")} ${t("score")}: ${score}. ${h("hanoiMoves")}: ${game.moves}.`
    : game.status === "PAUSED" ? m("memoryPaused")
    : game.notice.kind === "selected" ? h("hanoiSelected").replace("{disk}", String(game.pegs[game.selected!].at(-1)))
    : game.notice.kind === "moved" || game.notice.kind === "undone" ? h(game.notice.kind === "moved" ? "hanoiMoved" : "hanoiUndone").replace("{disk}", String(transfer!.disk)).replace("{from}", pegNames[transfer!.from]!).replace("{to}", pegNames[transfer!.to]!)
    : h(game.notice.kind === "invalid" ? "hanoiInvalid" : game.notice.kind === "empty" ? "hanoiEmpty" : game.notice.kind === "cancelled" ? "hanoiCancelled" : "hanoiChoose");

  return <div className="arcade-pixel-grid arcade-hanoi-shell mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 sm:pt-10" data-hanoi-language={language} lang={language}>
    <div className="mb-4"><Button asChild size="sm" haptic="uiToggle"><Link href="/arcade" className="inline-flex items-center gap-2"><ChevronArrowLeftIcon className="pixelated h-3.5 w-auto" />{t("back")}</Link></Button></div>
    <Card className="mx-auto max-w-3xl"><CardHeader><CardTitle className="arcade-hanoi-title text-3xl text-[var(--arcade-dot)] sm:text-5xl">{h("hanoiTitle")}</CardTitle></CardHeader>
      <CardContent><ul className="arcade-ui arcade-hanoi-copy space-y-2 text-lg"><li>* {h("hanoiRuleMove")}</li><li>* {h("hanoiRuleSize")}</li><li>* {h("hanoiRuleKeys")}</li></ul><p className="arcade-ui arcade-hanoi-copy mt-4">{h("hanoiScoring")}</p></CardContent></Card>
    <Card className="mx-auto mt-4 max-w-3xl"><CardHeader className="pb-2"><CardTitle className="text-2xl text-[var(--arcade-dot)]">{t("brickMayhemDifficultySettingTitle")}</CardTitle></CardHeader><CardContent>
      <div className="arcade-ui arcade-hanoi-settings"><p>{t("brickMayhemSettingLabel")}: {t(MODES[preview]!)} · {DISK_COUNTS[preview]} {h("hanoiDisks")}</p>
        <Slider min={0} max={2} step={1} value={[preview]} onValueChange={([value]) => setPreview(value ?? 0)} onValueCommit={([value]) => { const next = value ?? 0; setMode(next); setPreview(next); setRun((current) => current + 1); commit(() => readyGame(DISK_COUNTS[next]!)); }} aria-label={t("brickMayhemSettingLabel")} /></div>
    </CardContent></Card>
    <div className="mt-5 flex justify-center"><Button id="hanoi-start" size="lg" haptic="uiConfirm" onClick={() => active ? focusBoard() : start()}>{t("playNow")}</Button></div>
    <section ref={stage} className="arcade-hanoi-stage mt-6" aria-label={h("hanoiTitle")}>
      <div className="arcade-hanoi-readout arcade-ui"><p>{h("hanoiMoves")}<strong>{game.moves}</strong></p><p>{h("hanoiDisks")}<strong>{game.diskCount}</strong></p><p>{h("hanoiBest")}<strong>{best ?? "—"}</strong></p></div>
      <div className="arcade-hanoi-board">
        <canvas ref={canvas} width={BOARD_WIDTH} height={BOARD_HEIGHT} className="pixelated" aria-hidden="true" />
        <div className="arcade-hanoi-pegs" role="group" aria-label={h("hanoiTitle")}>
          {game.pegs.map((stack, index) => <button type="button" key={index} id={`hanoi-peg-${index}`} ref={(button) => { pegs.current[index] = button; }}
            className="arcade-hanoi-peg" aria-label={`${pegNames[index]}: ${h("hanoiStack")}: ${stack.length ? stack.join(", ") : h("hanoiEmptyStack")}`} aria-pressed={game.selected === index} disabled={!active} onClick={() => choose(index)} onKeyDown={(event) => keys(event, index)} />)}
        </div>
        {!active && <div className="arcade-cabinet-screen"><div className="arcade-cabinet-screen-inner arcade-hanoi-overlay">
          <p className="arcade-retro arcade-hanoi-title">{game.status === "WON" ? h("hanoiWon") : game.status === "PAUSED" ? m("memoryPaused") : h("hanoiReady")}</p>
          {game.status === "WON" && <p className="arcade-ui arcade-cabinet-score">{t("score")}: {score}</p>}
          <Button font="normal" haptic="uiConfirm" onClick={start} className="arcade-ui arcade-hanoi-copy">{m(game.status === "PAUSED" ? "memoryResume" : "memoryStart")}</Button>
        </div></div>}
      </div>
      <p className="arcade-ui arcade-hanoi-message" role="status" aria-live="polite" aria-atomic="true" dir="auto">{message}</p>
      {game.status === "WON" && <div className="arcade-ui arcade-hanoi-result"><p>{m("memoryCompletionPoints")}: 1000</p><p>{h("hanoiBonus")}: {score - 1000}</p><p>{h("hanoiMinimum")}: {minimumMoves(game.diskCount)}</p></div>}
    </section>
    <div className="arcade-hanoi-leaderboard"><ArcadeHighScores key={`hanoi:${mode}:${run}`} game="tower-of-hanoi" difficulty={DIFFICULTIES[mode]!} status={game.status === "WON" ? "GAME_OVER" : game.status} score={score} entryTimeLimitSeconds={null} /></div>
    {game.status === "WON" && DISK_COUNTS[mode + 1] !== undefined && <div className="mx-auto mb-4 flex max-w-[540px] justify-center">
      <Button id="hanoi-continue" font="normal" haptic="uiConfirm" className="arcade-ui arcade-hanoi-copy min-h-12 min-w-0 max-w-[calc(100%-0.5rem)] h-auto whitespace-normal text-center" onClick={continueGame}>
        {h("hanoiContinue").replace("{disks}", String(DISK_COUNTS[mode + 1]))}
      </Button>
    </div>}
    <section className="arcade-hanoi-control-dock">
      <p className="arcade-ui arcade-hanoi-copy">{h("hanoiUndoHelp")}</p>
      <Button font="normal" className="arcade-ui arcade-hanoi-copy" haptic="uiConfirm" onClick={() => active ? commit(pauseGame) : start()}>{m(active ? "memoryPause" : game.status === "PAUSED" ? "memoryResume" : "memoryStart")}</Button>
      <Button font="normal" className="arcade-ui arcade-hanoi-copy" variant="outline" haptic="uiToggle" disabled={!active || !game.history.length} onClick={() => commit(undoMove)}>{h("hanoiUndo")}</Button>
      <Button font="normal" className="arcade-ui arcade-hanoi-copy" variant="outline" haptic="uiDestructive" onClick={reset}>{m("memoryRestart")}</Button>
    </section>
    <p className="arcade-ui arcade-hanoi-copy arcade-hanoi-footer">{h("hanoiShared")}</p>
  </div>;
}
