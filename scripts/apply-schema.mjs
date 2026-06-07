// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Idempotent schema applier. Runs `schema.sql` (the canonical core schema,
// including the AI-translation tables) against the target Postgres database.
// Safe to re-run: every statement uses CREATE ... IF NOT EXISTS.
//
// Usage:
//   node --env-file=.env.local scripts/apply-schema.mjs           # core schema
//   node --env-file=.env.local scripts/apply-schema.mjs --arcade  # also arcade
//
// Reads DATABASE_URL (and ARCADE_DATABASE_URL with --arcade) from the
// environment. Uses `pg` (node-postgres), which speaks the standard wire
// protocol to both local Docker Postgres and Neon.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import pg from "pg";

const { Pool } = pg;
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const applyFile = async (label, connectionString, schemaPath) => {
  if (!connectionString) {
    console.error(`[skip] ${label}: connection string not set.`);
    return false;
  }
  const sql = readFileSync(join(repoRoot, schemaPath), "utf8");
  const pool = new Pool({ connectionString });
  try {
    // node-postgres runs multiple statements in a single simple query when no
    // parameters are supplied; the whole idempotent file applies at once.
    await pool.query(sql);
    console.log(`[ok]   ${label}: applied ${schemaPath}`);
    return true;
  } catch (error) {
    console.error(`[fail] ${label}: ${error?.message ?? error}`);
    return false;
  } finally {
    await pool.end();
  }
};

const main = async () => {
  const withArcade = process.argv.includes("--arcade");
  let ok = await applyFile("core", process.env.DATABASE_URL, "schema.sql");
  if (withArcade) {
    ok = (await applyFile("arcade", process.env.ARCADE_DATABASE_URL, "schema.arcade.sql")) && ok;
  }
  process.exit(ok ? 0 : 1);
};

await main();
