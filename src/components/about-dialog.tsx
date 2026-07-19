// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { Github, X } from "lucide-react";

import { useAppHaptics } from "@/components/haptics-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { brandProfile } from "@/config/brand";

type AboutDialogProps = {
  version: string;
};

/**
 * "About" link that opens a product/credits modal. Replaces the static credits
 * line on the Staff page. Mirrors FEED's AboutCard format: a transparent
 * DialogContent whose visible surface is the inner Card (so the card gradient is
 * the modal, not a card-in-a-card), a close button, and a GitHub source link.
 */
export function AboutDialog({ version }: AboutDialogProps) {
  const { trigger } = useAppHaptics();
  const facts = [
    { label: "Version", value: `v${version}` },
    { label: "License", value: "AGPL-3.0-or-later" },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={() => trigger("uiToggle")}
          className="rounded-sm font-semibold text-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          About
        </button>
      </DialogTrigger>
      <DialogContent className="border-0 bg-transparent p-0 shadow-none sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>About LOTTO</DialogTitle>
          <DialogDescription>Product, credits, and version information for LOTTO.</DialogDescription>
        </DialogHeader>
        <Card className="rounded-lg">
          <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:p-10">
            {/* Temple Consulting logo — black on light themes, white on dark
                themes (the `.dark` class covers dark + dark hi-viz). */}
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/temple-logo-light.svg"
                alt="Temple Consulting, LLC."
                className="mx-auto h-20 w-20 dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/temple-logo-dark.svg"
                alt="Temple Consulting, LLC."
                className="mx-auto hidden h-20 w-20 dark:block"
              />
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">LOTTO</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Line Order Transparency &amp; Ticketing Organizer
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                A fun, fair, and simple queue management system for chance-based or sequential ticketing.
              </p>
            </div>

            <dl className="grid w-full max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left text-sm">
              <div className="contents">
                <dt className="text-right font-medium text-foreground">Made by</dt>
                <dd className="text-muted-foreground">
                  <a
                    href="https://github.com/MattGeiger"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Matt Geiger
                  </a>
                  {", "}
                  <a
                    href="https://templepdx.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Temple Consulting, LLC.
                  </a>{" "}
                  2025-2026
                </dd>
              </div>
              <div className="contents">
                <dt className="text-right font-medium text-foreground">Made for</dt>
                <dd className="text-muted-foreground">
                  <a
                    href={brandProfile.organizationWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {brandProfile.organizationName}
                  </a>
                </dd>
              </div>
              <div className="contents">
                <dt className="text-right font-medium text-foreground">Made with</dt>
                <dd className="text-muted-foreground">
                  Next.js, TypeScript, Tailwind CSS, shadcn/ui, Neon Postgres, Claude Code, and Codex
                </dd>
              </div>
              {facts.map((fact) => (
                <div key={fact.label} className="contents">
                  <dt className="text-right font-medium text-foreground">{fact.label}</dt>
                  <dd className="text-muted-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <p className="max-w-md text-xs leading-5 text-muted-foreground">
              The application code is open source under AGPL-3.0-or-later. {brandProfile.brandingNotice}
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild variant="secondary">
                <a
                  href="https://github.com/MattGeiger/LOTTO"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" aria-hidden="true" />
                  Source Code on GitHub
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
        <DialogClose
          onClick={() => trigger("uiToggle")}
          className="absolute right-4 top-4 rounded-sm text-muted-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
