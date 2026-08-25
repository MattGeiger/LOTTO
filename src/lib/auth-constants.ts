// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

/**
 * Shared authentication timings.
 *
 * Keep the server, sign-in UI, and email copy on these constants so LOTTO
 * never promises one expiry while enforcing another.
 */
export const MAGIC_LINK_MAX_AGE_SECONDS = 10 * 60;
export const MAGIC_LINK_EXPIRY_MINUTES = MAGIC_LINK_MAX_AGE_SECONDS / 60;

export const OTP_MAX_AGE_MS = 10 * 60 * 1000;
export const OTP_EXPIRY_MINUTES = OTP_MAX_AGE_MS / 60_000;
