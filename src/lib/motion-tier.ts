// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

export type MotionTier = "full" | "simple" | "off";

export const MOTION_TIER_STORAGE_KEY = "wt-motion-tier-v1";

const SIMPLE_AVG_FRAME_MS = 26;
const SIMPLE_P95_FRAME_MS = 48;
const OFF_AVG_FRAME_MS = 42;
const OFF_P95_FRAME_MS = 80;

const hasValue = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export type MotionTierClassificationInput = {
  prefersReducedMotion: boolean;
  avgFrameMs: number | null;
  p95FrameMs: number | null;
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
};

export const classifyMotionTier = ({
  prefersReducedMotion,
  avgFrameMs,
  p95FrameMs,
  hardwareConcurrency,
  deviceMemoryGb,
}: MotionTierClassificationInput): MotionTier => {
  if (prefersReducedMotion) return "off";

  const lowCpu = hasValue(hardwareConcurrency) && hardwareConcurrency <= 2;
  const severeCpu = hasValue(hardwareConcurrency) && hardwareConcurrency <= 1;
  const lowMemory = hasValue(deviceMemoryGb) && deviceMemoryGb <= 2;
  const severeMemory = hasValue(deviceMemoryGb) && deviceMemoryGb <= 1;

  if (
    (hasValue(avgFrameMs) && avgFrameMs >= OFF_AVG_FRAME_MS) ||
    (hasValue(p95FrameMs) && p95FrameMs >= OFF_P95_FRAME_MS)
  ) {
    return "off";
  }

  if (severeCpu && severeMemory) {
    return "off";
  }

  if (
    (hasValue(avgFrameMs) && avgFrameMs >= SIMPLE_AVG_FRAME_MS) ||
    (hasValue(p95FrameMs) && p95FrameMs >= SIMPLE_P95_FRAME_MS)
  ) {
    return "simple";
  }

  if (lowCpu || lowMemory) {
    return "simple";
  }

  return "full";
};

export const isMotionTier = (value: string | null): value is MotionTier =>
  value === "full" || value === "simple" || value === "off";
