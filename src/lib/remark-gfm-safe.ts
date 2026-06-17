// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

/**
 * Legacy-safe GFM remark plugin.
 *
 * This is a drop-in replacement for `remark-gfm` that registers GFM **tables,
 * strikethrough, and task lists** but deliberately OMITS the GFM
 * `autolink-literal` extension.
 *
 * Why: `micromark-extension-gfm-autolink-literal` ships a regex *literal* that
 * uses lookbehind (`(?<=…)`). JavaScriptCore only gained regex lookbehind in
 * Safari 16.4, so on iPadOS/iOS 15.x (and other older WebKit builds) that regex
 * literal throws a `SyntaxError` at script *parse* time — taking down the entire
 * chunk before any code runs, which aborts React hydration on every page that
 * loads it (login, the visitor home page, Help, Release Notes). Critically, a
 * regex *literal* cannot be downleveled by SWC/Babel, so a browserslist target
 * alone does not fix it — the syntax must simply not be in the bundle.
 *
 * Bare-URL/email autolinking is intentionally dropped (a product decision):
 * authors use explicit `[text](url)` / `<url>` links, which still work. See
 * docs/BROWSER_SUPPORT.md and docs/ISSUES.md.
 *
 * Mirrors the registration pattern of `remark-gfm`'s own plugin.
 */

import type { Root } from "mdast";
import type { Plugin } from "unified";

import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmTable } from "micromark-extension-gfm-table";
import { gfmTaskListItem } from "micromark-extension-gfm-task-list-item";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmTaskListItemFromMarkdown } from "mdast-util-gfm-task-list-item";

/**
 * Register the legacy-safe subset of GFM (no autolink-literal). react-markdown
 * only parses markdown → mdast, so we register the micromark syntax extensions
 * and the `fromMarkdown` (parse) extensions; the `toMarkdown` (serialize)
 * extensions are not needed.
 */
// The `micromarkExtensions` / `fromMarkdownExtensions` slots on the processor's
// data are contributed by `remark-parse` / `mdast-util-from-markdown` via module
// augmentation. We type them locally so this plugin doesn't depend on those
// ambient declarations being in scope.
type ExtensionData = {
  micromarkExtensions?: unknown[];
  fromMarkdownExtensions?: unknown[];
};

const remarkGfmSafe: Plugin<[], Root> = function () {
  const data = this.data() as ExtensionData;

  const micromarkExtensions = data.micromarkExtensions ?? (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = []);

  micromarkExtensions.push(gfmStrikethrough(), gfmTable(), gfmTaskListItem());
  fromMarkdownExtensions.push(
    gfmStrikethroughFromMarkdown(),
    gfmTableFromMarkdown(),
    gfmTaskListItemFromMarkdown(),
  );
};

export default remarkGfmSafe;
