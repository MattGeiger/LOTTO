// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import Image from "next/image";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { version } from "../../../package.json";
import { Lock } from "@/components/animate-ui/icons/lock";
import { StaffCtaButtons } from "@/components/staff-cta-buttons";
import { AboutDialog } from "@/components/about-dialog";
import { ReleaseNotesDialog } from "@/components/release-notes-dialog";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function readReleaseNotes(): string {
  try {
    return readFileSync(join(process.cwd(), "docs/release-notes.md"), "utf8");
  } catch {
    return "Release notes are not available.";
  }
}

export default function Home() {
  const releaseNotes = readReleaseNotes();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-6 rounded-3xl bg-card/80 p-10 shadow-xl backdrop-blur">
        <div className="w-full">
          <Image
            src="/wth-logo-horizontal.png"
            alt="William Temple House"
            width={900}
            height={240}
            className="h-auto w-full max-w-3xl"
            priority
          />
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              <span className="block">LOTTO: Line Order Transparency & Ticketing Organizer</span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              A fun, fair, and simple queue management system designed for chance-based or
              sequential ticketing. Set custom ticket ranges, keep clients informed, entertained,
              and engaged. Supports large displays and mobile devices. Includes multilingual
              support, visual themes, and even video games.
            </p>
          </div>
          <StaffCtaButtons />
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-gradient-card-blue">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-title">
                <Lock className="size-4 text-icon-blue" animateOnHover />
                Error-safe controls
              </CardTitle>
              <CardDescription>
                Confirm critical actions, restore previous states, and keep writes
                atomic so no data is lost.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-card-emerald">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-title">
                <QrCode className="size-4 text-icon-emerald" />
                Client-friendly display
              </CardTitle>
              <CardDescription>
                Mobile-friendly access, with QR code linking to the live board and ticket number lookup for estimated wait times
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <ReleaseNotesDialog version={version} content={releaseNotes} />
          <AboutDialog version={version} />
          <Link
            href="/help"
            className="font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Help
          </Link>
        </div>
      </div>
    </main>
  );
}
