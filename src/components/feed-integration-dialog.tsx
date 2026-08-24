// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

"use client";

import React from "react";
import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PairingStatus = {
  configured: boolean;
  source: "database" | "environment" | null;
  createdAt: string | null;
  lastUsedAt: string | null;
};

const readError = async (response: Response): Promise<string> => {
  try {
    const body = await response.json() as { error?: { message?: string } | string };
    if (typeof body.error === "string") return body.error;
    if (typeof body.error?.message === "string") return body.error.message;
  } catch {
    // The fallback below is deliberately credential-free.
  }
  return "LOTTO could not update the FEED connection. Try again.";
};

export const FeedIntegrationDialog = React.memo(function FeedIntegrationDialog() {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<PairingStatus | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState<"url" | "token" | null>(null);
  const [lottoUrl, setLottoUrl] = React.useState("");

  const loadStatus = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/feed/token", { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json() as { status: PairingStatus };
      setStatus(body.status);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "LOTTO could not load the FEED connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setLottoUrl(window.location.origin);
    void loadStatus();
  }, [loadStatus, open]);

  const generate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/feed/token", { method: "POST" });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json() as { token: string; status: PairingStatus };
      setToken(body.token);
      setStatus(body.status);
      toast.success("A new FEED synchronization token is active. Copy it into FEED now.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "LOTTO could not generate the token.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (value: string, kind: "url" | "token") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(current => current === kind ? null : current), 1800);
    } catch {
      toast.error("Your browser could not copy that value. Select it and copy it manually.");
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Link2 className="size-4" />
        Sync history with FEED
      </Button>
      <Dialog
        open={open}
        onOpenChange={next => {
          setOpen(next);
          if (!next) {
            setToken(null);
            setCopied(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync history with FEED</DialogTitle>
            <DialogDescription>
              Pair FEED with this LOTTO deployment. The token can only read immutable queue history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Generate a token and copy it before closing this window.</li>
              <li>In FEED, open Data Management → LOTTO Queue Data → Configure.</li>
              <li>Paste this URL and token, save, then choose Sync now.</li>
            </ol>

            <div className="space-y-2">
              <Label htmlFor="feed-pairing-url">LOTTO URL</Label>
              <div className="flex gap-2">
                <Input id="feed-pairing-url" value={lottoUrl} readOnly />
                <Button type="button" variant="outline" size="icon" onClick={() => void copy(lottoUrl, "url")} aria-label="Copy LOTTO URL">
                  {copied === "url" ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            {status?.configured && !token && (
              <Alert>
                <AlertTitle>A synchronization token is active</AlertTitle>
                <AlertDescription>
                  Generating another token immediately invalidates the one currently saved in FEED.
                  Update FEED with the new value before the next synchronization.
                </AlertDescription>
              </Alert>
            )}

            {token && (
              <div className="space-y-2">
                <Label htmlFor="feed-pairing-token">New synchronization token</Label>
                <div className="flex gap-2">
                  <Input id="feed-pairing-token" value={token} readOnly className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={() => void copy(token, "token")} aria-label="Copy synchronization token">
                    {copied === "token" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This token is shown once. LOTTO stores only a one-way hash and cannot display it again.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
            <Button type="button" onClick={() => void generate()} disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {status?.configured ? "Generate new token" : "Generate token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
