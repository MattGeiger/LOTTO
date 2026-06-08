// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import * as dbStore from "./system-prompt-store-db";
import * as fileStore from "./system-prompt-store-file";

const storageMode = process.env.STATE_STORAGE?.toLowerCase();
const useDatabase = storageMode === "db" || (!storageMode && Boolean(process.env.DATABASE_URL));

const backend = useDatabase ? dbStore : fileStore;

export const list = backend.list;
export const get = backend.get;
export const insert = backend.insert;
export const update = backend.update;
export const remove = backend.remove;
export const getActiveTranslationPrompt = backend.getActiveTranslationPrompt;
