// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Backend selector for the AI configuration store. Mirrors the file/db choice in
// `state-manager.ts`: Postgres when STATE_STORAGE=db (or DATABASE_URL is set and
// STATE_STORAGE is unspecified), otherwise file storage for local development.

import * as dbStore from "./ai-config-store-db";
import * as fileStore from "./ai-config-store-file";

const storageMode = process.env.STATE_STORAGE?.toLowerCase();
const useDatabase = storageMode === "db" || (!storageMode && Boolean(process.env.DATABASE_URL));

const backend = useDatabase ? dbStore : fileStore;

export const list = backend.list;
export const get = backend.get;
export const insert = backend.insert;
export const update = backend.update;
export const remove = backend.remove;
