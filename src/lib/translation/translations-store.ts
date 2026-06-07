// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Backend selector for the translations store (file for local dev, Postgres in
// production) — mirrors the storage choice in `state-manager.ts`.

import * as dbStore from "./translations-store-db";
import * as fileStore from "./translations-store-file";

const storageMode = process.env.STATE_STORAGE?.toLowerCase();
const useDatabase = storageMode === "db" || (!storageMode && Boolean(process.env.DATABASE_URL));

const backend = useDatabase ? dbStore : fileStore;

export const list = backend.list;
export const get = backend.get;
export const upsert = backend.upsert;
export const update = backend.update;
export const remove = backend.remove;
export const bulkRemove = backend.bulkRemove;
