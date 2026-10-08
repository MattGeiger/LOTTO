// SPDX-License-Identifier: AGPL-3.0-or-later
type RateBucket = { timestamps: number[] };
const rateBuckets = new Map<string, RateBucket>();

export function isRateLimited(key: string, maxRequests: number, windowMs = 60_000): boolean {
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

export function resetArcadeHighScoreRateLimitForTests(): void { rateBuckets.clear(); }
