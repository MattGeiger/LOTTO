"use client";

import * as React from "react";
import Link from "next/link";

import { ARCADE_PLAY_RESUMED_EVENT, ARCADE_TICKET_CALLED_EVENT } from "@/arcade/lib/events";
import { BOARD_H, BOARD_W, FIXED_STEP_MS, SHIP_W } from "@/arcade/game/zombie-attack/constants";
import { initialWorld, nextWaveWorld, tick } from "@/arcade/game/zombie-attack/engine";
import { drawBoard } from "@/arcade/game/zombie-attack/renderer";
import type { DifficultyParams, ShooterInput, World } from "@/arcade/game/zombie-attack/types";
import { ChevronArrowLeftIcon } from "@/arcade/components/icons/chevron-arrow-left-icon";
import { Button, Card, CardContent, CardHeader, CardTitle, Slider } from "@/arcade/ui/8bit";
import { useAppHaptics } from "@/components/haptics-provider";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

type ZombieModePreset = {
  key: "veryEasy" | "easy" | "normal" | "hard" | "veryHard" | "nightmare";
  labelKey:
    | "snakeModeVeryEasy"
    | "snakeModeEasy"
    | "snakeModeNormal"
    | "snakeModeHard"
    | "snakeModeVeryHard"
    | "snakeModeNightmare";
  stepBaseMs: number;
  bombIntervalMs: number;
  bunkers: boolean;
  bunkerBombProof: boolean;
  vehicleHp: number;
};

const ZOMBIE_MODE_PRESETS: readonly ZombieModePreset[] = [
  { key: "veryEasy",  labelKey: "snakeModeVeryEasy",  stepBaseMs: 760, bombIntervalMs: 2200, bunkers: true,  bunkerBombProof: true,  vehicleHp: 3 },
  { key: "easy",      labelKey: "snakeModeEasy",      stepBaseMs: 640, bombIntervalMs: 1750, bunkers: true,  bunkerBombProof: false, vehicleHp: 3 },
  { key: "normal",    labelKey: "snakeModeNormal",    stepBaseMs: 540, bombIntervalMs: 1400, bunkers: true,  bunkerBombProof: false, vehicleHp: 3 },
  { key: "hard",      labelKey: "snakeModeHard",      stepBaseMs: 450, bombIntervalMs: 1050, bunkers: true,  bunkerBombProof: false, vehicleHp: 4 },
  { key: "veryHard",  labelKey: "snakeModeVeryHard",  stepBaseMs: 370, bombIntervalMs: 780,  bunkers: true,  bunkerBombProof: false, vehicleHp: 4 },
  { key: "nightmare", labelKey: "snakeModeNightmare", stepBaseMs: 290, bombIntervalMs: 560,  bunkers: false, bunkerBombProof: false, vehicleHp: 5 },
];
const DEFAULT_MODE_INDEX = 2;

const SHIP_RANGE = Math.max(1, BOARD_W - SHIP_W);

function dpFromPreset(preset: ZombieModePreset): DifficultyParams {
  return {
    stepBaseMs: preset.stepBaseMs,
    bombIntervalMs: preset.bombIntervalMs,
    bunkers: preset.bunkers,
    bunkerBombProof: preset.bunkerBombProof,
    vehicleHp: preset.vehicleHp,
  };
}

type GameStatus = "READY" | "RUNNING" | "PAUSED" | "GAME_OVER";

export default function ZombieAttackPage() {
  const { t, language } = useLanguage();
  const isLargeTextLocale = language === "ar" || language === "fa" || language === "zh";
  const { trigger: triggerHaptic } = useAppHaptics();
  const hapticRef = React.useRef(triggerHaptic);
  React.useEffect(() => {
    hapticRef.current = triggerHaptic;
  }, [triggerHaptic]);

  /* ── Difficulty ── */
  const [modeIndex, setModeIndex] = React.useState(DEFAULT_MODE_INDEX);
  const [modeSelectionIndex, setModeSelectionIndex] = React.useState(DEFAULT_MODE_INDEX);
  const modePreset = ZOMBIE_MODE_PRESETS[modeIndex]!;
  const selectedModePreset = ZOMBIE_MODE_PRESETS[modeSelectionIndex]!;
  const dp = React.useMemo(() => dpFromPreset(modePreset), [modePreset]);
  const dpRef = React.useRef(dp);
  React.useEffect(() => { dpRef.current = dp; }, [dp]);
  React.useEffect(() => { setModeSelectionIndex(modeIndex); }, [modeIndex]);

  /* ── React-rendered state ── */
  const [status, setStatus] = React.useState<GameStatus>("READY");
  const [score, setScore] = React.useState(0);
  const [lives, setLives] = React.useState(3);
  const [wave, setWave] = React.useState(1);
  const [sliderValue, setSliderValue] = React.useState(50);

  /* ── Live game refs ── */
  const worldRef = React.useRef<World>(initialWorld(dp));
  const statusRef = React.useRef<GameStatus>("READY");
  const shipTargetRef = React.useRef<number>((BOARD_W - SHIP_W) / 2);
  const fireRef = React.useRef(false);
  const keysDownRef = React.useRef<Set<string>>(new Set());
  const rafIdRef = React.useRef<number>(0);
  const accumulatorRef = React.useRef(0);
  const lastTimeRef = React.useRef(0);

  const boardCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const playAreaRef = React.useRef<HTMLElement>(null);
  const scoreRef = React.useRef(0);
  const livesRef = React.useRef(3);
  const waveRef = React.useRef(1);

  React.useEffect(() => { statusRef.current = status; }, [status]);

  const syncReactState = React.useCallback((w: World, force = false) => {
    if (force || w.score !== scoreRef.current) { scoreRef.current = w.score; setScore(w.score); }
    if (force || w.lives !== livesRef.current) { livesRef.current = w.lives; setLives(w.lives); }
    if (force || w.wave !== waveRef.current) { waveRef.current = w.wave; setWave(w.wave); }
  }, []);

  const notifyPlayResumed = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent(ARCADE_PLAY_RESUMED_EVENT));
  }, []);

  const focusPlayArea = React.useCallback(() => {
    const playArea = playAreaRef.current;
    if (!playArea) return;
    playArea.scrollIntoView({ behavior: "smooth", block: "start" });
    playArea.focus({ preventScroll: true });
  }, []);

  /* ── Reset / restart ── */
  const resetGame = React.useCallback(() => {
    const w = initialWorld(dpRef.current);
    worldRef.current = w;
    shipTargetRef.current = w.shipX;
    fireRef.current = false;
    accumulatorRef.current = 0;
    lastTimeRef.current = 0;
    syncReactState(w, true);
    setSliderValue(50);
    setStatus("READY");
  }, [syncReactState]);

  const restartRun = React.useCallback(() => {
    resetGame();
    setTimeout(() => {
      setStatus("RUNNING");
      notifyPlayResumed();
    }, 0);
  }, [resetGame, notifyPlayResumed]);

  /* ── Difficulty change resets the run ── */
  React.useEffect(() => {
    const w = initialWorld(dp);
    worldRef.current = w;
    shipTargetRef.current = w.shipX;
    fireRef.current = false;
    accumulatorRef.current = 0;
    lastTimeRef.current = 0;
    syncReactState(w, true);
    setSliderValue(50);
    setStatus("READY");
  }, [dp, syncReactState]);

  /* ── Drawing ── */
  const draw = React.useCallback(() => {
    const canvas = boardCanvasRef.current;
    if (!canvas) return;
    if (typeof navigator !== "undefined" && /\bjsdom\b/i.test(navigator.userAgent)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== BOARD_W || canvas.height !== BOARD_H) {
      canvas.width = BOARD_W;
      canvas.height = BOARD_H;
    }
    drawBoard(ctx, worldRef.current, canvas);
  }, []);

  React.useEffect(() => { draw(); }, [draw]);

  React.useEffect(() => {
    const handleRedraw = () => draw();
    const rootObserver = new MutationObserver(handleRedraw);
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    window.addEventListener("resize", handleRedraw);
    return () => {
      rootObserver.disconnect();
      window.removeEventListener("resize", handleRedraw);
    };
  }, [draw]);

  /* ── Game loop ── */
  React.useEffect(() => {
    if (status !== "RUNNING") {
      if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = 0; }
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
      return;
    }

    const loop = (timestamp: number) => {
      if (statusRef.current !== "RUNNING") return;
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }
      const delta = Math.min(timestamp - lastTimeRef.current, 250);
      lastTimeRef.current = timestamp;
      accumulatorRef.current += delta;

      // Keyboard ship movement → shipTarget.
      const keys = keysDownRef.current;
      const movingLeft = keys.has("ArrowLeft") || keys.has("Left");
      const movingRight = keys.has("ArrowRight") || keys.has("Right");
      if (movingLeft) shipTargetRef.current = Math.max(0, shipTargetRef.current - 2.4);
      if (movingRight) shipTargetRef.current = Math.min(SHIP_RANGE, shipTargetRef.current + 2.4);
      if (movingLeft || movingRight) {
        setSliderValue(Math.round((shipTargetRef.current / SHIP_RANGE) * 100));
      }

      while (accumulatorRef.current >= FIXED_STEP_MS) {
        const input: ShooterInput = { shipX: shipTargetRef.current, fire: fireRef.current };
        const result = tick(worldRef.current, input, dpRef.current);
        worldRef.current = result.world;
        accumulatorRef.current -= FIXED_STEP_MS;
        syncReactState(result.world);

        if (result.status === "wave-cleared") {
          worldRef.current = nextWaveWorld(result.world, dpRef.current);
          shipTargetRef.current = worldRef.current.shipX;
          accumulatorRef.current = 0;
          syncReactState(worldRef.current, true);
          break;
        }
        if (result.status === "game-over") {
          syncReactState(result.world, true);
          setStatus("GAME_OVER");
          draw();
          return;
        }
      }

      draw();
      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = 0; }
    };
  }, [status, draw, syncReactState]);

  /* ── Keyboard input ── */
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "Left", "ArrowRight", "Right"].includes(e.key)) {
        e.preventDefault();
        keysDownRef.current.add(e.key);
        if (statusRef.current === "READY") { setStatus("RUNNING"); notifyPlayResumed(); }
      } else if (e.key === " " || e.key === "ArrowUp" || e.key === "Up" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        if (statusRef.current === "READY") { setStatus("RUNNING"); notifyPlayResumed(); }
        else if (statusRef.current === "GAME_OVER") { restartRun(); }
        fireRef.current = true;
      } else if (e.key === "p" || e.key === "P") {
        if (statusRef.current === "RUNNING") setStatus("PAUSED");
        else if (statusRef.current === "PAUSED") { setStatus("RUNNING"); notifyPlayResumed(); }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current.delete(e.key);
      if (e.key === " " || e.key === "ArrowUp" || e.key === "Up" || e.key === "a" || e.key === "A") fireRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [notifyPlayResumed, restartRun]);

  /* ── Pause when a tracked ticket is called ── */
  React.useEffect(() => {
    const onTicketCalled = () => {
      fireRef.current = false;
      setStatus((cur) => (cur === "RUNNING" ? "PAUSED" : cur));
    };
    window.addEventListener(ARCADE_TICKET_CALLED_EVENT, onTicketCalled as EventListener);
    return () => window.removeEventListener(ARCADE_TICKET_CALLED_EVENT, onTicketCalled as EventListener);
  }, []);

  /* ── Slider (ship movement) ── */
  const handleSliderChange = React.useCallback(
    (value: number[]) => {
      const v = value[0] ?? 0;
      shipTargetRef.current = (v / 100) * SHIP_RANGE;
      setSliderValue(v);
      if (statusRef.current === "READY") { setStatus("RUNNING"); notifyPlayResumed(); }
    },
    [notifyPlayResumed],
  );

  /* ── Fire button (hold to auto-fire) ── */
  const startFiring = React.useCallback(() => {
    if (statusRef.current === "READY") { setStatus("RUNNING"); notifyPlayResumed(); focusPlayArea(); }
    else if (statusRef.current === "GAME_OVER") { restartRun(); return; }
    fireRef.current = true;
    hapticRef.current("uiSelect");
  }, [focusPlayArea, notifyPlayResumed, restartRun]);

  const stopFiring = React.useCallback(() => { fireRef.current = false; }, []);

  /* ── Control buttons ── */
  const handlePlayNow = React.useCallback(() => {
    if (status === "READY" || status === "PAUSED") { setStatus("RUNNING"); notifyPlayResumed(); }
    else if (status === "GAME_OVER") { restartRun(); }
    focusPlayArea();
  }, [focusPlayArea, notifyPlayResumed, restartRun, status]);

  const handleCenterControl = React.useCallback(() => {
    if (status === "RUNNING") { setStatus("PAUSED"); return; }
    if (status === "PAUSED") { setStatus("RUNNING"); notifyPlayResumed(); return; }
    if (status === "READY") { setStatus("RUNNING"); notifyPlayResumed(); focusPlayArea(); return; }
    if (status === "GAME_OVER") { restartRun(); focusPlayArea(); }
  }, [focusPlayArea, notifyPlayResumed, restartRun, status]);

  const centerControlLabel =
    status === "RUNNING" ? t("pause") : status === "PAUSED" ? t("play") : t("start");
  const centerControlAriaLabel =
    status === "RUNNING" ? "Pause game" : status === "PAUSED" ? "Resume game" : "Start game";

  return (
    <div className="arcade-pixel-grid arcade-zombie-shell mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
      <div className="mb-4 flex justify-start">
        <Button asChild size="sm" haptic="uiToggle" className="px-3">
          <Link href="/arcade" className="inline-flex items-center gap-2">
            <ChevronArrowLeftIcon className="pixelated inline-block h-3.5 w-auto shrink-0" />
            <span>{t("back")}</span>
          </Link>
        </Button>
      </div>

      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-4xl text-[var(--arcade-pellet)] sm:text-5xl">
            {t("zombieAttackTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="arcade-ui list-none space-y-2 text-lg text-[var(--arcade-text)]/90 sm:text-xl">
            <li>* {t("zombieAttackInstructionMove")}</li>
            <li>* {t("zombieAttackInstructionFire")}</li>
            <li>* {t("zombieAttackInstructionBombs")}</li>
            <li>* {t("zombieAttackInstructionVehicle")}</li>
            <li>* {t("zombieAttackInstructionDefend")}</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mx-auto mt-4 w-full max-w-3xl">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-2xl text-[var(--arcade-pellet)] sm:text-3xl">
            {t("zombieAttackDifficultySettingTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="arcade-brick-settings arcade-ui">
            <div className="arcade-brick-slider-group">
              <p
                className={cn(
                  "arcade-brick-slider-title text-[var(--arcade-pellet)]",
                  isLargeTextLocale ? "text-[22px] leading-tight sm:text-[24px]" : "text-[11px]",
                )}
              >
                {t("zombieAttackSettingLabel")}: {t(selectedModePreset.labelKey)}
              </p>
              <Slider
                className="arcade-brick-difficulty-slider"
                min={0}
                max={ZOMBIE_MODE_PRESETS.length - 1}
                step={1}
                value={[modeSelectionIndex]}
                onValueChange={(v) => setModeSelectionIndex(v[0] ?? DEFAULT_MODE_INDEX)}
                onValueCommit={(v) => setModeIndex(v[0] ?? DEFAULT_MODE_INDEX)}
                aria-label={t("zombieAttackSettingLabel")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button type="button" size="lg" haptic="uiConfirm" className="arcade-zombie-noselect min-w-44" onClick={handlePlayNow}>
          {t("playNow")}
        </Button>
        {status === "GAME_OVER" ? (
          <Button type="button" variant="outline" haptic="uiDestructive" className="arcade-zombie-noselect min-w-36" onClick={resetGame}>
            {t("reset")}
          </Button>
        ) : null}
      </div>

      {status === "GAME_OVER" ? (
        <div className="mt-3 flex justify-center">
          <p className="arcade-retro arcade-zombie-alert text-base text-[var(--arcade-neon)] sm:text-lg">
            {t("gameOver")}
          </p>
        </div>
      ) : null}

      <div className="sr-only" aria-live="polite">
        {status === "GAME_OVER" ? t("gameOverAnnouncement") : null}
      </div>

      <section
        ref={playAreaRef}
        className="arcade-zombie-stage mt-6"
        tabIndex={-1}
        aria-label="Zombie Attack play area"
      >
        <div className="arcade-zombie-readout arcade-zombie-readout-metrics arcade-ui">
          <p className={cn("text-[var(--arcade-pellet)]", isLargeTextLocale ? "text-[26px] sm:text-[28px]" : "text-[13px]")}>
            {t("score")}: {score}
          </p>
          <p className={cn("text-[var(--arcade-pellet)]", isLargeTextLocale ? "text-[26px] sm:text-[28px]" : "text-[13px]")}>
            {t("lives")}: {lives}
          </p>
          <p className={cn("text-[var(--arcade-pellet)]", isLargeTextLocale ? "text-[26px] sm:text-[28px]" : "text-[13px]")}>
            {t("zombieAttackWaveLabel")}: {wave}
          </p>
        </div>

        <div
          className="arcade-zombie-board pixelated"
          role="img"
          aria-label="Zombie Attack play area"
          onClick={status === "GAME_OVER" ? restartRun : undefined}
        >
          <canvas ref={boardCanvasRef} className="arcade-zombie-canvas pixelated" aria-hidden="true" />
          {status === "GAME_OVER" ? (
            <div className="arcade-zombie-overlay">
              <p className="arcade-retro text-5xl text-[var(--arcade-neon)] sm:text-7xl">{t("gameOver")}</p>
              <p className="arcade-ui text-3xl text-[var(--arcade-pellet)] sm:text-5xl">{t("tapToPlayAgain")}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="arcade-zombie-control-dock" aria-label="Game controls">
        <div className="arcade-zombie-pad">
          <Button
            type="button"
            variant="default"
            haptic="uiConfirm"
            className={cn(
              "arcade-zombie-center-btn arcade-zombie-noselect arcade-ui",
              isLargeTextLocale ? "text-[20px] sm:text-[22px]" : "text-[13px]",
            )}
            aria-label={centerControlAriaLabel}
            onClick={handleCenterControl}
          >
            {centerControlLabel}
          </Button>
          <div className="arcade-zombie-fire-row">
            <div className="arcade-zombie-move-track">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[sliderValue]}
                onValueChange={handleSliderChange}
                aria-label="Move gun"
              />
            </div>
            <Button
              type="button"
              variant="default"
              haptic="none"
              className="arcade-zombie-fire-btn arcade-zombie-noselect arcade-retro"
              aria-label="Fire"
              onPointerDown={(e) => { e.preventDefault(); startFiring(); }}
              onPointerUp={stopFiring}
              onPointerLeave={stopFiring}
              onPointerCancel={stopFiring}
            >
              A
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
