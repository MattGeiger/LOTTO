// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

export class UserInputError extends Error {
  readonly status = 400;
  readonly expose = true;

  constructor(message: string) {
    super(message);
    this.name = "UserInputError";
  }
}

export const isUserInputError = (error: unknown): error is UserInputError => {
  if (error instanceof UserInputError) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as Partial<UserInputError>;
  return candidate.status === 400 && typeof candidate.message === "string";
};
