"use client";

import * as React from "react";

import { useAppHaptics } from "@/components/haptics-provider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AboutDialogProps = {
  version: string;
};

const aboutFacts: { label: string; value: string }[] = [];

/**
 * "About" link that opens a product/credits modal. Replaces the static credits
 * line on the Staff page. Adapted from FEED's AboutCard with LOTTO branding;
 * per project decision the license row and GitHub source button are omitted
 * (LOTTO has no published license and the repo may be private).
 */
export function AboutDialog({ version }: AboutDialogProps) {
  const { trigger } = useAppHaptics();
  const facts = [...aboutFacts, { label: "Version", value: `v${version}` }];

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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>About LOTTO</DialogTitle>
          <DialogDescription>Product, credits, and version information for LOTTO.</DialogDescription>
        </DialogHeader>
        <Card className="rounded-lg border-0 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center gap-6 p-2 text-center sm:p-4">
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
                    href="https://williamtemple.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    William Temple House
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
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
