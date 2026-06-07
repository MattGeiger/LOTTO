// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { Globe } from "lucide-react";

import { BotIcon } from "@/components/animate-ui/icons/bot";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { LanguagesIcon } from "@/components/animate-ui/icons/languages";
import { SearchCheckIcon } from "@/components/animate-ui/icons/search-check";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiConfigTab } from "@/components/translation/ai-config-tab";
import { LanguageSettingsTab } from "@/components/translation/language-settings-tab";
import { TranslationManagementTab } from "@/components/translation/translation-management-tab";

type TabValue = "languages" | "ai" | "management";

const TRIGGER_CLASS =
  "relative z-10 inline-flex h-10 min-w-0 w-full items-center justify-center gap-2 px-3 text-xs leading-tight text-muted-foreground sm:h-8 sm:whitespace-nowrap sm:text-sm";

export function TranslationCard() {
  const [tab, setTab] = React.useState<TabValue>("languages");

  return (
    <Card className="overflow-visible bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
          Translation
        </CardTitle>
        <CardDescription>
          Manage languages, AI translation providers, and translated content.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-visible px-4 sm:px-6">
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
          <div className="relative mb-4 overflow-visible px-1 pb-1">
            <TabsHighlight className="absolute inset-0.5 z-0 rounded-md bg-background shadow-sm">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-1 overflow-visible rounded-md border bg-muted p-1 sm:grid-cols-3">
                <TabsHighlightItem value="languages">
                  <AnimateIcon asChild animateOnView animateOnViewOnce animateOnHover animateOnTap>
                    <TabsTrigger value="languages" className={TRIGGER_CLASS}>
                      <LanguagesIcon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="sm:hidden">Languages</span>
                      <span className="hidden sm:inline">Language Settings</span>
                    </TabsTrigger>
                  </AnimateIcon>
                </TabsHighlightItem>
                <TabsHighlightItem value="ai">
                  <AnimateIcon asChild animateOnView animateOnViewOnce animateOnHover animateOnTap>
                    <TabsTrigger value="ai" className={TRIGGER_CLASS}>
                      <BotIcon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="sm:hidden">AI Config</span>
                      <span className="hidden sm:inline">AI Configuration</span>
                    </TabsTrigger>
                  </AnimateIcon>
                </TabsHighlightItem>
                <TabsHighlightItem value="management">
                  <AnimateIcon asChild animateOnView animateOnViewOnce animateOnHover animateOnTap>
                    <TabsTrigger value="management" className={TRIGGER_CLASS}>
                      <SearchCheckIcon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="sm:hidden">Translations</span>
                      <span className="hidden sm:inline">Translation Management</span>
                    </TabsTrigger>
                  </AnimateIcon>
                </TabsHighlightItem>
              </TabsList>
            </TabsHighlight>
          </div>

          <TabsContents className="overflow-visible px-1 pb-2">
            <TabsContent value="languages" className="pt-1">
              <LanguageSettingsTab />
            </TabsContent>
            <TabsContent value="ai" className="pt-1">
              <AiConfigTab />
            </TabsContent>
            <TabsContent value="management" className="pt-1">
              <TranslationManagementTab />
            </TabsContent>
          </TabsContents>
        </Tabs>
      </CardContent>
    </Card>
  );
}
