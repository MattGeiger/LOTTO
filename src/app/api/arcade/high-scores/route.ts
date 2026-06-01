import { NextResponse } from "next/server";
import { z } from "zod";

import { getArcadeHighScoreStore, isArcadeHighScoreUnavailable } from "@/arcade/lib/high-score-store";
import {
  ARCADE_DIFFICULTY_KEYS,
  ARCADE_GAME_SLUGS,
  ARCADE_HIGH_SCORE_MAX_SCORE,
  isValidInitials,
  normalizeInitials,
} from "@/arcade/lib/high-score-types";

export const runtime = "nodejs";

const getSchema = z.object({
  game: z.enum(ARCADE_GAME_SLUGS),
  difficulty: z.enum(ARCADE_DIFFICULTY_KEYS),
});

const postSchema = getSchema.extend({
  initials: z.string().min(1).max(24),
  score: z.number().int().min(1).max(ARCADE_HIGH_SCORE_MAX_SCORE),
});

type RateBucket = { timestamps: number[] };
const rateBuckets = new Map<string, RateBucket>();

function isRateLimited(key: string, maxRequests: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp > now - windowMs);
  if (bucket.timestamps.length >= maxRequests) {
    rateBuckets.set(key, bucket);
    return true;
  }
  bucket.timestamps.push(now);
  rateBuckets.set(key, bucket);
  return false;
}

function rateLimitKey(request: Request, action: "GET" | "POST"): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "local";
  return `${action}:${ip}`;
}

export function __resetArcadeHighScoreRateLimitForTests(): void {
  rateBuckets.clear();
}

export async function GET(request: Request) {
  if (isRateLimited(rateLimitKey(request, "GET"), 120)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = getSchema.safeParse({
    game: url.searchParams.get("game"),
    difficulty: url.searchParams.get("difficulty"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid high-score scope." }, { status: 400 });
  }

  try {
    const scores = await getArcadeHighScoreStore().listTopScores(parsed.data);
    return NextResponse.json({ scores });
  } catch (error) {
    if (isArcadeHighScoreUnavailable(error)) {
      return NextResponse.json({ scores: [], unavailable: true }, { status: 200 });
    }
    console.error("[Arcade High Scores] GET failed:", error);
    return NextResponse.json({ scores: [], unavailable: true }, { status: 200 });
  }
}

export async function POST(request: Request) {
  if (isRateLimited(rateLimitKey(request, "POST"), 30)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid high-score payload." }, { status: 400 });
  }

  const initials = normalizeInitials(parsed.data.initials);
  if (!isValidInitials(initials)) {
    return NextResponse.json({ error: "Initials must be exactly 3 letters." }, { status: 400 });
  }

  try {
    const result = await getArcadeHighScoreStore().submitScore({
      ...parsed.data,
      initials,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isArcadeHighScoreUnavailable(error)) {
      return NextResponse.json(
        { error: "High scores are unavailable. Please try again later." },
        { status: 503 },
      );
    }
    console.error("[Arcade High Scores] POST failed:", error);
    return NextResponse.json(
      { error: "Unable to save high score. Please try again later." },
      { status: 500 },
    );
  }
}
