// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowLeft, X } from "lucide-react";
import { ReadOnlyDisplay } from "@/components/readonly-display";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useAppHaptics } from "@/components/haptics-provider";
import { useLanguage, type Language } from "@/contexts/language-context";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import {
  readPersistedHomepageTicket,
  writePersistedHomepageTicket,
  type HomepageTicketStorageContext,
} from "@/lib/home-ticket-storage";
import type { RaffleState } from "@/lib/state-types";
import { cn } from "@/lib/utils";
import { hasSeenAnnouncement, isAnnouncementActive, markAnnouncementSeen } from "@/lib/announcement";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownGuideContent } from "@/components/help/markdown-guide";
import { BottomTabBar } from "@/components/navigation/bottom-tab-bar";
import { TicketCalledCelebration } from "@/components/ticket-called-celebration";

const normalizeTicketNumber = (rawInput: string): number | null => {
  const normalized = rawInput.trim().toUpperCase();
  const match = normalized.match(/^(?:[A-Z])?(\d{1,2})$/);
  if (!match) return null;
  const ticketNumber = Number(match[1]);
  return ticketNumber >= 0 && ticketNumber <= 99 ? ticketNumber : null;
};

const hasActiveTicketRange = (state: RaffleState | null): boolean =>
  !!state && state.startNumber > 0 && state.endNumber >= state.startNumber;

export function PersonalizedHomePage() {
  const { setLanguage, hasSessionLanguageOverride, isLanguageHydrated, t } = useLanguage();
  const { trigger } = useAppHaptics();
  const [onboardingStep, setOnboardingStep] = React.useState<"language" | "announcement" | "ticket">(
    "language",
  );
  // Start closed and decide once language hydration completes (see the
  // onboarding effect below). This avoids briefly flashing the language step
  // before we know whether the client already has a session language choice.
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = React.useState(false);
  const [ticketInput, setTicketInput] = React.useState("");
  const [ticketInputError, setTicketInputError] = React.useState("");
  const [selectedTicketNumber, setSelectedTicketNumber] = React.useState<number | null>(null);
  const [latestState, setLatestState] = React.useState<RaffleState | null>(null);
  const ticketRangeReady = hasActiveTicketRange(latestState);
  const announcement = latestState?.announcement ?? null;
  const announcementActive = isAnnouncementActive(announcement);

  const ticketStorageContext = React.useMemo<HomepageTicketStorageContext | null>(
    () =>
      latestState
        ? { startNumber: latestState.startNumber, endNumber: latestState.endNumber }
        : null,
    [latestState],
  );

  // Single source of truth for the initial onboarding decision. Gated on
  // language hydration so the session language override is known before we pick
  // a step:
  //   ticket saved        -> modal stays closed
  //   language chosen      -> open at the ticket step (skip the redundant gate)
  //   no language choice   -> open at the language step
  React.useEffect(() => {
    if (!isLanguageHydrated) return;
    const persistedTicket = readPersistedHomepageTicket();
    if (persistedTicket !== null) {
      setSelectedTicketNumber(persistedTicket);
      setTicketInput(String(persistedTicket).padStart(2, "0"));
      setIsOnboardingModalOpen(false);
      return;
    }
    setOnboardingStep(hasSessionLanguageOverride ? "ticket" : "language");
    setIsOnboardingModalOpen(true);
    // Run once hydration completes; the override value is read at that point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLanguageHydrated]);

  // If the saved ticket goes stale (8h expiry, or the operator reset to a new
  // drawing range), drop it from the personalized view — but do NOT force the
  // onboarding modal back open. The user can re-enter via "Use a different
  // ticket". This avoids the reopen loop the old gating could cause.
  React.useEffect(() => {
    if (selectedTicketNumber === null) return;
    const persistedTicket = readPersistedHomepageTicket(Date.now(), ticketStorageContext);
    if (persistedTicket !== null) return;

    setSelectedTicketNumber(null);
    setTicketInput("");
  }, [selectedTicketNumber, ticketStorageContext]);

  // Insert the announcement as a step before the ticket step: once the modal is
  // heading to "ticket" and an active announcement hasn't been seen this session,
  // show it first. Re-evaluates when state (and thus the announcement) loads.
  React.useEffect(() => {
    if (!isOnboardingModalOpen) return;
    if (onboardingStep !== "ticket") return;
    if (!announcement || !announcementActive) return;
    if (hasSeenAnnouncement(announcement.updatedAt)) return;
    setOnboardingStep("announcement");
  }, [isOnboardingModalOpen, onboardingStep, announcement, announcementActive]);

  const handleLanguageSelect = React.useCallback(
    (language: Language) => {
      setLanguage(language);
      setOnboardingStep("ticket");
    },
    [setLanguage],
  );

  const handleTicketSubmit = React.useCallback(() => {
    const ticketNumber = normalizeTicketNumber(ticketInput);
    if (ticketNumber === null) {
      setTicketInputError(t("ticketFormatHint"));
      trigger("uiError");
      return;
    }
    // A valid-format number is always accepted and saved, even before the
    // operator has started the drawing — the personalized view then shows the
    // "not in the drawing yet — check back soon" holding state.
    setSelectedTicketNumber(ticketNumber);
    writePersistedHomepageTicket(ticketNumber, new Date(), ticketStorageContext);
    setTicketInputError("");
    setIsOnboardingModalOpen(false);
    trigger("uiConfirm");
  }, [ticketInput, ticketStorageContext, t, trigger]);

  const handleTicketKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleTicketSubmit();
    },
    [handleTicketSubmit],
  );

  const handleBackToLanguage = React.useCallback(() => {
    setTicketInputError("");
    setOnboardingStep("language");
  }, []);

  const handleAnnouncementContinue = React.useCallback(() => {
    if (announcement) markAnnouncementSeen(announcement.updatedAt);
    setOnboardingStep("ticket");
  }, [announcement]);

  const handleRequestTicketChange = React.useCallback(() => {
    setTicketInputError("");
    setTicketInput(selectedTicketNumber === null ? "" : String(selectedTicketNumber).padStart(2, "0"));
    setOnboardingStep("ticket");
    setIsOnboardingModalOpen(true);
  }, [selectedTicketNumber]);

  const handleDismissOnboarding = React.useCallback(() => {
    // Leaving the announcement (skip → "just looking") counts as seen.
    if (onboardingStep === "announcement" && announcement) {
      markAnnouncementSeen(announcement.updatedAt);
    }
    setTicketInputError("");
    setIsOnboardingModalOpen(false);
  }, [onboardingStep, announcement]);

  return (
    <div className="relative">
      <header
        aria-label="Homepage controls"
        dir="ltr"
        className="absolute left-6 right-6 top-4 z-30 flex items-center justify-between gap-5 py-2 sm:left-8 sm:right-8 lg:left-10 lg:right-10"
      >
        <LanguageSwitcher enableHaptics />
        <div className="flex-1 flex justify-center px-2">
          <div className="w-full max-w-[220px]">
            <Image
              src="/wth-logo-horizontal.png"
              alt="William Temple House"
              width={2314}
              height={606}
              className="block h-auto w-full dark:hidden"
            />
            <Image
              src="/wth-logo-horizontal-reverse.png"
              alt="William Temple House"
              width={2333}
              height={641}
              className="hidden h-auto w-full dark:block"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher enableHaptics />
        </div>
      </header>
      <ReadOnlyDisplay
        displayVariant="personalized"
        personalizedTicketNumber={selectedTicketNumber}
        onRequestTicketChange={handleRequestTicketChange}
        onStateChange={setLatestState}
        languageTextAnimation="scramble"
        showQrCode={false}
        showHeaderLogo={false}
      />
      <Dialog
        open={isOnboardingModalOpen}
        // Step 1 (language) is a focused gate — only an explicit selection moves
        // forward. Step 2 (ticket) can be dismissed (X / Escape / tap-outside),
        // which routes through the same "just looking" handler.
        onOpenChange={(open) => {
          // Language is a focused gate; announcement and ticket can be dismissed.
          if (!open && onboardingStep !== "language") handleDismissOnboarding();
        }}
      >
        <DialogContent
          className={cn(
            "max-w-md bg-popover/[65%] backdrop-blur-[6px] backdrop-brightness-150 backdrop-saturate-[0.85] shadow-[inset_0_3px_0_0_rgb(255_255_255/0.5),0_24px_60px_-15px_rgb(0_0_0/0.3)] dark:bg-popover/[75%] dark:backdrop-brightness-90 dark:shadow-[inset_0_3px_0_0_rgb(255_255_255/0.12),0_24px_60px_-15px_rgb(0_150_255/0.4)]",
            onboardingStep === "announcement" && "flex max-h-[85vh] flex-col",
          )}
          onEscapeKeyDown={(event) => {
            if (onboardingStep === "language") event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (onboardingStep === "language") event.preventDefault();
          }}
        >
          {onboardingStep === "language" ? (
            <>
              <DialogHeader className="mb-5">
                <DialogTitle className="text-center text-2xl">
                  <span>{t("chooseLanguage")}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                {LANGUAGE_OPTIONS.map((option) => (
                  <Button
                    key={option.code}
                    type="button"
                    variant="outline"
                    haptic="uiSelect"
                    className="h-12 text-base bg-background dark:bg-background"
                    onClick={() => handleLanguageSelect(option.code)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </>
          ) : onboardingStep === "announcement" ? (
            <>
              <DialogHeader className="mb-3 shrink-0">
                <DialogTitle className="sr-only">Announcement</DialogTitle>
              </DialogHeader>
              <ScrollArea className="-mr-3 min-h-0 flex-1 pr-3">
                <div className="space-y-4 text-foreground">
                  {announcement ? <MarkdownGuideContent content={announcement.markdown} /> : null}
                </div>
              </ScrollArea>
              <Button
                type="button"
                haptic="uiConfirm"
                className="mt-4 h-11 w-full shrink-0 text-base"
                onClick={handleAnnouncementContinue}
              >
                <span>{t("announcementContinue")}</span>
              </Button>
            </>
          ) : (
            <>
              <DialogHeader className="relative mb-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  haptic="uiToggle"
                  className="absolute left-0 top-0 h-8 w-8 rounded-full"
                  onClick={handleBackToLanguage}
                  aria-label={t("back")}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <DialogTitle className="px-10 text-center text-2xl">
                  <span>{t("searchTicketLabel")}</span>
                </DialogTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  haptic="uiToggle"
                  className="absolute right-0 top-0 h-8 w-8 rounded-full"
                  onClick={handleDismissOnboarding}
                  aria-label={t("close")}
                >
                  <X className="size-4" />
                </Button>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  id="modal-ticket-number"
                  value={ticketInput}
                  onChange={(event) => {
                    setTicketInput(event.target.value.toUpperCase());
                    if (ticketInputError) setTicketInputError("");
                  }}
                  onKeyDown={handleTicketKeyDown}
                  maxLength={3}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t("searchTicketPlaceholder")}
                  aria-label={t("searchTicketLabel")}
                  aria-invalid={ticketInputError ? true : undefined}
                  className="h-11 text-center text-base uppercase bg-background dark:bg-background"
                />
                {!ticketRangeReady && !ticketInputError ? (
                  <p className="text-sm text-muted-foreground">{t("drawingNotStartedHint")}</p>
                ) : null}
                {ticketInputError ? <p className="text-sm text-destructive">{ticketInputError}</p> : null}
                <Button type="button" haptic="none" className="h-11 w-full text-base" onClick={handleTicketSubmit}>
                  <span>{t("searchButtonLabel")}</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  haptic="uiToggle"
                  className="h-11 w-full text-base"
                  onClick={handleDismissOnboarding}
                >
                  <span>{t("justBrowsing")}</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <BottomTabBar />
      <TicketCalledCelebration state={latestState} ticketNumber={selectedTicketNumber} />
    </div>
  );
}
