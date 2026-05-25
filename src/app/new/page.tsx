"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReadOnlyDisplay } from "@/components/readonly-display";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useAppHaptics } from "@/components/haptics-provider";
import { useLanguage, type Language } from "@/contexts/language-context";
import {
  clearPersistedHomepageTicket,
  readPersistedHomepageTicket,
  writePersistedHomepageTicket,
  type HomepageTicketStorageContext,
} from "@/lib/home-ticket-storage";
import type { RaffleState } from "@/lib/state-types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const languageOptions: Array<{ code: Language; label: string }> = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "ru", label: "Русский" },
  { code: "uk", label: "Українська" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "fa", label: "فارسی" },
  { code: "ar", label: "العربية" },
];

const normalizeTicketNumber = (rawInput: string): number | null => {
  const normalized = rawInput.trim().toUpperCase();
  const match = normalized.match(/^(?:[A-Z])?(\d{1,2})$/);
  if (!match) return null;
  const ticketNumber = Number(match[1]);
  return ticketNumber >= 0 && ticketNumber <= 99 ? ticketNumber : null;
};

const hasActiveTicketRange = (state: RaffleState | null): boolean =>
  !!state && state.startNumber > 0 && state.endNumber >= state.startNumber;

export default function NewPersonalizedHomePage() {
  const { setLanguage, t } = useLanguage();
  const { trigger } = useAppHaptics();
  const [onboardingStep, setOnboardingStep] = React.useState<"language" | "ticket">("language");
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = React.useState(true);
  const [ticketInput, setTicketInput] = React.useState("");
  const [ticketInputError, setTicketInputError] = React.useState("");
  const [selectedTicketNumber, setSelectedTicketNumber] = React.useState<number | null>(null);
  const [latestState, setLatestState] = React.useState<RaffleState | null>(null);
  const ticketRangeReady = hasActiveTicketRange(latestState);

  const ticketStorageContext = React.useMemo<HomepageTicketStorageContext | null>(
    () =>
      latestState
        ? {
            operatingHours: latestState.operatingHours,
            timezone: latestState.timezone,
            startNumber: latestState.startNumber,
            endNumber: latestState.endNumber,
          }
        : null,
    [latestState],
  );

  React.useEffect(() => {
    const persistedTicket = readPersistedHomepageTicket();
    if (persistedTicket === null) return;
    setSelectedTicketNumber(persistedTicket);
    setTicketInput(String(persistedTicket).padStart(2, "0"));
    setIsOnboardingModalOpen(false);
  }, []);

  React.useEffect(() => {
    if (!ticketStorageContext || selectedTicketNumber === null) return;
    const persistedTicket = readPersistedHomepageTicket(Date.now(), ticketStorageContext);
    if (persistedTicket !== null) return;

    clearPersistedHomepageTicket();
    setSelectedTicketNumber(null);
    setTicketInput("");
    setTicketInputError("");
    setOnboardingStep("ticket");
    setIsOnboardingModalOpen(true);
  }, [selectedTicketNumber, ticketStorageContext]);

  const handleLanguageSelect = React.useCallback(
    (language: Language) => {
      setLanguage(language);
      setOnboardingStep("ticket");
    },
    [setLanguage],
  );

  const handleTicketSubmit = React.useCallback(() => {
    if (!ticketRangeReady) {
      setTicketInputError("Ticket lookup will be available when today's tickets are ready.");
      trigger("uiError");
      return;
    }

    const ticketNumber = normalizeTicketNumber(ticketInput);
    if (ticketNumber === null) {
      setTicketInputError("Use a ticket like C17 or 17.");
      trigger("uiError");
      return;
    }
    setSelectedTicketNumber(ticketNumber);
    writePersistedHomepageTicket(ticketNumber, new Date(), ticketStorageContext);
    setTicketInputError("");
    setIsOnboardingModalOpen(false);
    trigger("uiConfirm");
  }, [ticketInput, ticketRangeReady, ticketStorageContext, trigger]);

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

  const handleRequestTicketChange = React.useCallback(() => {
    setTicketInputError("");
    setTicketInput(selectedTicketNumber === null ? "" : String(selectedTicketNumber).padStart(2, "0"));
    setOnboardingStep("ticket");
    setIsOnboardingModalOpen(true);
  }, [selectedTicketNumber]);

  return (
    <div className="relative">
      <div className="absolute left-6 right-6 top-4 z-50 flex items-center justify-between gap-5 py-2 sm:left-8 sm:right-8 lg:left-10 lg:right-10">
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
          <Button asChild variant="secondary" size="sm" className="hidden rounded-full sm:inline-flex">
            <Link href="/inventory">See what&apos;s in stock</Link>
          </Button>
          <ThemeSwitcher enableHaptics />
        </div>
      </div>
      <div className="fixed bottom-4 left-4 right-4 z-50 sm:hidden">
        <Button asChild variant="secondary" className="h-11 w-full rounded-full shadow-lg">
          <Link href="/inventory">See what&apos;s in stock</Link>
        </Button>
      </div>
      <ReadOnlyDisplay
        displayVariant="personalized"
        personalizedTicketNumber={selectedTicketNumber}
        onRequestTicketChange={handleRequestTicketChange}
        onStateChange={setLatestState}
        languageTextAnimation="scramble"
        showQrCode={false}
        showHeaderLogo={false}
      />
      <Dialog open={isOnboardingModalOpen}>
        <DialogContent
          className="max-w-md"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          {onboardingStep === "language" ? (
            <>
              <DialogHeader className="mb-5">
                <DialogTitle className="text-center text-2xl">
                  <span>Choose your language</span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                {languageOptions.map((option) => (
                  <Button
                    key={option.code}
                    type="button"
                    variant="outline"
                    haptic="uiSelect"
                    className="h-12 text-base"
                    onClick={() => handleLanguageSelect(option.code)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
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
                  className="h-11 text-center text-base uppercase"
                />
                {!ticketRangeReady && !ticketInputError ? (
                  <p className="text-sm text-muted-foreground">
                    Ticket lookup will be available when today&apos;s tickets are ready.
                  </p>
                ) : null}
                {ticketInputError ? <p className="text-sm text-destructive">{ticketInputError}</p> : null}
                <Button type="button" haptic="none" className="h-11 w-full text-base" onClick={handleTicketSubmit}>
                  <span>{t("searchButtonLabel")}</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
