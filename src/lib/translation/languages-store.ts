// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Backend selector for the enabled-language store. Mirrors the file/db storage
// choice in `state-manager.ts`: use Postgres when STATE_STORAGE=db (or a
// DATABASE_URL is set and STATE_STORAGE is unspecified), otherwise fall back to
// file storage for local development.

import * as dbStore from "./languages-store-db";
import * as fileStore from "./languages-store-file";

export type { LanguageRow } from "./languages-store-db";

const storageMode = process.env.STATE_STORAGE?.toLowerCase();
const useDatabase = storageMode === "db" || (!storageMode && Boolean(process.env.DATABASE_URL));

const backend = useDatabase ? dbStore : fileStore;

export const seedLanguagesIfEmpty = backend.seedLanguagesIfEmpty;
export const listLanguages = backend.listLanguages;
export const listEnabledLanguages = backend.listEnabledLanguages;
export const bulkSetEnabled = backend.bulkSetEnabled;
