// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.
"use client";
import * as React from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/arcade/ui/8bit";
import { useHanoiStrings } from "@/arcade/hooks/use-hanoi-strings";
import { useLanguage } from "@/contexts/language-context";
import "@/arcade/styles/content-warning.css";

/** Page-visit consent: children (including assets and leaderboard effects) mount only after Continue. */
export function CartoonViolenceGate({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = React.useState(false);
  const h = useHanoiStrings();
  const { t } = useLanguage();
  if (accepted) return children;
  return <div className="arcade-pixel-grid mx-auto min-h-[calc(100vh-4.5rem)] max-w-6xl px-4 pb-28 pt-8 sm:px-6">
    <Card className="mx-auto max-w-2xl"><CardHeader>
      <CardTitle className="text-center text-2xl text-[var(--arcade-dot)] sm:text-4xl">{t("zombieAttackTitle")}</CardTitle>
    </CardHeader><CardContent className="space-y-6">
      <div className="arcade-content-warning space-y-4" role="note" aria-labelledby="cartoon-warning-title">
        <h1 id="cartoon-warning-title" className="arcade-retro text-center text-xl"><span aria-hidden="true">! </span>{h("cartoonWarningTitle")}</h1>
        <p className="arcade-ui text-center text-xl leading-relaxed">{h("cartoonWarningBody")}</p>
      </div>
      <div className="flex flex-col gap-4"><Button font="normal" className="arcade-ui h-auto min-h-12 whitespace-normal py-3" haptic="uiConfirm" onClick={() => setAccepted(true)}>{h("cartoonWarningContinue")}</Button>
        <Button asChild font="normal" variant="outline" className="arcade-ui h-auto min-h-12 whitespace-normal py-3" haptic="uiToggle"><Link href="/arcade">{h("cartoonWarningBack")}</Link></Button></div>
    </CardContent></Card>
  </div>;
}
