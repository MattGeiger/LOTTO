// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { Pool } from "@neondatabase/serverless";

let pool: Pool | null = null;

export const getPool = () => {
  if (pool) {
    return pool;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize the database pool.");
  }
  pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
  });
  return pool;
};
