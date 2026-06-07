// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { Bot, Globe, ListChecks } from "lucide-react";

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
import { LanguageSettingsTab } from "@/components/translation/language-settings-tab";

type TabValue = "languages" | "ai" | "management";

const TRIGGER_CLASS =
  "relative z-10 inline-flex h-8 w-full items-center justify-center gap-2 whitespace-nowrap px-3 text-xs text-muted-foreground sm:text-sm";

function ComingSoon({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function TranslationCard() {
  const [tab, setTab] = React.useState<TabValue>("languages");

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
          Translation
        </CardTitle>
        <CardDescription>
          Manage languages, AI translation providers, and translated content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
          <div className="relative mb-4">
            <TabsHighlight className="absolute inset-0.5 z-0 rounded-md bg-background shadow-sm">
              <TabsList className="grid w-full grid-cols-3 gap-1 rounded-md border bg-muted p-1">
                <TabsHighlightItem value="languages">
                  <TabsTrigger value="languages" className={TRIGGER_CLASS}>
                    <Globe className="size-4 shrink-0" aria-hidden="true" />
                    Language Settings
                  </TabsTrigger>
                </TabsHighlightItem>
                <TabsHighlightItem value="ai">
                  <TabsTrigger value="ai" className={TRIGGER_CLASS}>
                    <Bot className="size-4 shrink-0" aria-hidden="true" />
                    AI Configuration
                  </TabsTrigger>
                </TabsHighlightItem>
                <TabsHighlightItem value="management">
                  <TabsTrigger value="management" className={TRIGGER_CLASS}>
                    <ListChecks className="size-4 shrink-0" aria-hidden="true" />
                    Translation Management
                  </TabsTrigger>
                </TabsHighlightItem>
              </TabsList>
            </TabsHighlight>
          </div>

          <TabsContents>
            <TabsContent value="languages">
              <LanguageSettingsTab />
            </TabsContent>
            <TabsContent value="ai">
              <ComingSoon>
                AI provider configuration arrives in the next update. You&apos;ll
                add encrypted API keys and choose translation models here.
              </ComingSoon>
            </TabsContent>
            <TabsContent value="management">
              <ComingSoon>
                Translation management (review, correct, retry, and find missing
                translations) arrives after AI configuration is in place.
              </ComingSoon>
            </TabsContent>
          </TabsContents>
        </Tabs>
      </CardContent>
    </Card>
  );
}
