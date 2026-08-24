// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { createLucideIcon } from "lucide-react";

// Lucide added database-arrow-up after the version currently pinned by LOTTO.
// Keep the upstream icon definition local until the package is upgraded.
export const DatabaseArrowUp = createLucideIcon("database-arrow-up", [
  ["path", { d: "M19 22v-6", key: "1gc1qv" }],
  ["path", { d: "M21 12.536V5", key: "1lsc0i" }],
  ["path", { d: "m22 19-3-3-3 3", key: "1n7tf4" }],
  ["path", { d: "M3 12A9 3 0 0 0 14.457 14.886", key: "1twh14" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 13.318 21.968", key: "1hrrr4" }],
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
]);
