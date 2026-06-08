// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/components/radix/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BotIcon, type BotIconHandle } from "@/components/ui/bot";
import { GlobeIcon, type GlobeIconHandle } from "@/components/ui/globe";
import { LanguagesIcon, type LanguagesIconHandle } from "@/components/ui/languages";
import { AiConfigTab } from "@/components/translation/ai-config-tab";
import { LanguageSettingsTab } from "@/components/translation/language-settings-tab";
import { TranslationManagementTab } from "@/components/translation/translation-management-tab";

type TabValue = "languages" | "ai" | "management";
type ImperativeIconHandle = BotIconHandle | GlobeIconHandle | LanguagesIconHandle;
type ImperativeIconComponent = React.ComponentType<{
  ref?: React.Ref<ImperativeIconHandle>;
  className?: string;
  size?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}>;

const TRIGGER_CLASS =
  "h-10 min-w-0 px-3 text-xs leading-tight sm:h-8 sm:whitespace-nowrap sm:text-sm";

function FeedInteractiveIcon({
  icon: Icon,
  className,
  size = 16,
}: {
  icon: ImperativeIconComponent;
  className?: string;
  size?: number;
}) {
  const iconRef = React.useRef<ImperativeIconHandle>(null);

  React.useEffect(() => {
    iconRef.current?.startAnimation();
  }, []);

  const startAnimation = React.useCallback(() => {
    iconRef.current?.startAnimation();
  }, []);

  const stopAnimation = React.useCallback(() => {
    iconRef.current?.stopAnimation();
  }, []);

  return (
    <Icon
      ref={iconRef}
      className={className}
      size={size}
      onMouseEnter={startAnimation}
      onMouseLeave={stopAnimation}
      onClick={startAnimation}
      aria-hidden="true"
    />
  );
}

export function TranslationCard() {
  const [tab, setTab] = React.useState<TabValue>("languages");

  return (
    <Card className="overflow-visible bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FeedInteractiveIcon
            icon={GlobeIcon as ImperativeIconComponent}
            className="size-4 text-muted-foreground"
            size={16}
          />
          Translation
          <Badge variant="outline" className="ml-1 border-status-warning-border text-xs text-status-warning-text">
            Beta
          </Badge>
        </CardTitle>
        <CardDescription>
          Manage languages, AI translation providers, and translated content.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-visible px-4 sm:px-6">
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
          <div className="relative mb-4 overflow-visible px-1 pb-1">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-1 overflow-visible rounded-md border bg-muted p-1 sm:grid-cols-3">
              <TabsTrigger value="languages" className={TRIGGER_CLASS}>
                <FeedInteractiveIcon
                  icon={GlobeIcon as ImperativeIconComponent}
                  className="size-4 shrink-0"
                  size={16}
                />
                <span className="sm:hidden">Languages</span>
                <span className="hidden sm:inline">Language Settings</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className={TRIGGER_CLASS}>
                <FeedInteractiveIcon
                  icon={BotIcon as ImperativeIconComponent}
                  className="size-4 shrink-0"
                  size={16}
                />
                <span className="sm:hidden">AI Config</span>
                <span className="hidden sm:inline">AI Configuration</span>
              </TabsTrigger>
              <TabsTrigger value="management" className={TRIGGER_CLASS}>
                <FeedInteractiveIcon
                  icon={LanguagesIcon as ImperativeIconComponent}
                  className="size-4 shrink-0"
                  size={16}
                />
                <span className="sm:hidden">Translations</span>
                <span className="hidden sm:inline">Translation Management</span>
              </TabsTrigger>
            </TabsList>
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
