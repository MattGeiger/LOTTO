// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { isRTL, RTL_LANGUAGES } from "@/lib/rtl-utils";

describe("RTL utilities", () => {
  describe("RTL_LANGUAGES", () => {
    it("contains exactly Arabic, Persian, and Urdu", () => {
      expect(RTL_LANGUAGES).toEqual(["ar", "fa", "ur"]);
    });

    it("isRTL returns true for Urdu", () => {
      expect(isRTL("ur")).toBe(true);
    });
  });

  describe("isRTL", () => {
    it("returns true for Arabic", () => {
      expect(isRTL("ar")).toBe(true);
    });

    it("returns true for Persian", () => {
      expect(isRTL("fa")).toBe(true);
    });

    it("returns false for English", () => {
      expect(isRTL("en")).toBe(false);
    });

    it("returns false for Chinese", () => {
      expect(isRTL("zh")).toBe(false);
    });

    it("returns false for Spanish", () => {
      expect(isRTL("es")).toBe(false);
    });

    it("returns false for Russian", () => {
      expect(isRTL("ru")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isRTL("")).toBe(false);
    });

    it("is case-sensitive (mixed case returns false)", () => {
      expect(isRTL("Ar")).toBe(false);
      expect(isRTL("AR")).toBe(false);
      expect(isRTL("Fa")).toBe(false);
    });
  });
});
