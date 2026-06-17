// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE.

/**
 * Legacy-bundle safety guard.
 *
 * Scans the built client chunks (`.next/static/chunks/*.js`) for JavaScript
 * regex *literal* syntax that cannot be downleveled by SWC/Babel and that
 * crashes older WebKit (notably iPadOS/iOS 15.x, our declared support floor —
 * see docs/BROWSER_SUPPORT.md). A regex literal is validated at script *parse*
 * time, so a single unsupported feature throws a SyntaxError that takes down
 * the entire chunk and aborts React hydration on every page that loads it
 * ("renders but not interactive").
 *
 * This is the recurrence guard for the iPadOS 15.8 login/home outage: a
 * dependency bump can silently reintroduce such syntax (it did, via
 * `remark-gfm`'s autolink-literal), and a browserslist target alone will NOT
 * catch it because regex literals are never transpiled.
 *
 * Run after `next build`:  npm run check:legacy-bundles
 * Exit code 0 = clean, 1 = offending syntax found, 2 = no build to scan.
 *
 * Importable: `FORBIDDEN`, `scanText`, and `scanBuild` are exported for tests;
 * the CLI entrypoint only runs when this file is executed directly.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const CHUNKS_DIR = join(process.cwd(), ".next", "static", "chunks");

/**
 * Patterns that older WebKit (iOS 15.x / Safari < 16.4) cannot parse inside a
 * regex literal. Each rule is tested against raw chunk text.
 *
 * @type {{id:string, pattern:RegExp, why:string}[]}
 */
export const FORBIDDEN = [
  {
    id: "regex-lookbehind",
    // (?<= or (?<!  — lookbehind assertions, Safari 16.4+ only.
    // This deliberately does NOT match (?<name> named capture groups (a digit
    // or `=`/`!` never follows `<` in a named group), which are safe.
    pattern: /\(\?<[=!]/,
    why: "regex lookbehind (?<=…)/(?<!…) — JavaScriptCore supports it only from Safari 16.4; crashes iOS 15.x at parse time.",
  },
  {
    id: "regex-v-flag",
    // The `v` (unicodeSets) regex flag, Safari 17+, applied to a constructed
    // RegExp. The polyfilled feature-detect path (`t.unicodeSets && …`) is safe
    // and is not matched here.
    pattern: /new RegExp\([^)]*,\s*["'][a-z]*v[a-z]*["']\s*\)/,
    why: "regex `v` (unicodeSets) flag — Safari 17+ only.",
  },
];

/**
 * Scan a single string of JS for forbidden syntax.
 * @param {string} text
 * @returns {{id:string, why:string}[]} matched rules (empty if clean)
 */
export function scanText(text) {
  return FORBIDDEN.filter((rule) => rule.pattern.test(text)).map(({ id, why }) => ({ id, why }));
}

/**
 * Scan the built chunks directory.
 * @param {string} [chunksDir]
 * @returns {{ found:boolean, scanned:number, findings:{file:string, id:string, why:string}[] } | null}
 *   null when there is no build to scan.
 */
export function scanBuild(chunksDir = CHUNKS_DIR) {
  if (!existsSync(chunksDir)) return null;
  const files = readdirSync(chunksDir).filter((f) => f.endsWith(".js"));
  const findings = [];
  for (const f of files) {
    const text = readFileSync(join(chunksDir, f), "utf8");
    for (const { id, why } of scanText(text)) {
      findings.push({ file: join("chunks", f), id, why });
    }
  }
  return { found: findings.length > 0, scanned: files.length, findings };
}

function main() {
  const result = scanBuild();
  if (result === null) {
    console.error(
      `[check:legacy-bundles] No build found at ${CHUNKS_DIR}. Run \`next build\` first.`,
    );
    process.exit(2);
  }

  if (result.found) {
    console.error("\n❌ [check:legacy-bundles] Legacy-incompatible syntax found in built chunks:\n");
    for (const { file, id, why } of result.findings) {
      console.error(`  • ${file}`);
      console.error(`      ${id}: ${why}`);
    }
    console.error(
      "\nThis WILL break iPadOS/iOS 15.x and other older WebKit (renders but not interactive —",
    );
    console.error("the chunk fails to parse and React hydration aborts). Regex literals cannot be");
    console.error(
      "transpiled, so the syntax must be kept out of the bundle. See docs/BROWSER_SUPPORT.md.\n",
    );
    process.exit(1);
  }

  console.log(
    `✅ [check:legacy-bundles] Scanned ${result.scanned} chunk(s); no legacy-incompatible regex syntax found.`,
  );
  process.exit(0);
}

// Run only as a CLI, not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
