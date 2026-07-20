// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Backend selector for the brand-configuration store. Mirrors the file/db
// storage choice in `state-manager.ts`: use Postgres when STATE_STORAGE=db (or
// a DATABASE_URL is set and STATE_STORAGE is unspecified), otherwise fall back
// to file storage for local development.

import * as dbStore from "./store-db";
import * as fileStore from "./store-file";

const storageMode = process.env.STATE_STORAGE?.toLowerCase();
const useDatabase =
  storageMode === "db" || (!storageMode && Boolean(process.env.DATABASE_URL));

const backend = useDatabase ? dbStore : fileStore;

export const listConfigurations = backend.listConfigurations;
export const getConfiguration = backend.getConfiguration;
export const getActiveConfiguration = backend.getActiveConfiguration;
export const saveConfiguration = backend.saveConfiguration;
export const seedTemplate = backend.seedTemplate;
export const activateConfiguration = backend.activateConfiguration;
export const deactivateAll = backend.deactivateAll;
export const deleteConfiguration = backend.deleteConfiguration;
