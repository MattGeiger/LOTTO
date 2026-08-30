// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

"use client";

import { useSyncExternalStore } from "react";

import { toLegacyValue } from "@/lib/brand-theme/serialize";

/** Nothing to subscribe to: engine support does not change within a session. */
const subscribe = () => () => {};

const clientSupportsOklch = () =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("color", "oklch(0 0 0)");

/** The server cannot know the engine, so it assumes the floor. */
const serverSupportsOklch = () => false;

/**
 * Convert a derived colour for use in a React `style` prop.
 *
 * The injected brand stylesheet solves this with an sRGB baseline and an
 * `@supports (color: oklch(0 0 0))` layer on top. An inline style has no such
 * escape hatch — it is one declaration, and on iPadOS 15 `oklch()` with a
 * bare-number lightness is invalid, so the declaration is dropped and the
 * element renders with no colour. That is what emptied the Appearance wizard's
 * four-mode preview and its logo swatches on the support floor: the panels were
 * not mis-coloured, they had no colour to apply.
 *
 * `useSyncExternalStore` rather than an effect, because the value is read from
 * the environment rather than stored: the server snapshot is the floor, so the
 * first client paint agrees with the server and hydration stays quiet, and a
 * modern engine swaps to the wide-gamut original without a state write.
 */
export function useLegacySafeColor(): (value: string) => string {
  const supportsOklch = useSyncExternalStore(
    subscribe,
    clientSupportsOklch,
    serverSupportsOklch,
  );
  return supportsOklch ? (value: string) => value : toLegacyValue;
}
