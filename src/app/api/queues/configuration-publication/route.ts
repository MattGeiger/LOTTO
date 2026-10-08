// SPDX-License-Identifier: AGPL-3.0-or-later
import { handleCallback } from "@vercel/queue";
import { repairPublicConfiguration } from "@/lib/realtime/configuration-publication";
import { publicationRetry } from "@/lib/realtime/publication-queue";

export const runtime = "nodejs";
export const maxDuration = 60;
const callback = handleCallback(repairPublicConfiguration, { retry: publicationRetry });
// A private, signed queue consumer. No public HTTP URL or cron.
export async function POST(request: Request) { return callback(request); }
