// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

// Client access to the server-resolved runtime brand. The root layout
// resolves identity (saved configuration or compiled profile) and passes the
// serializable result here; client components read it with `useBrand()`.
// The default value is the compiled profile so isolated component tests and
// legacy render paths keep working without a provider.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  resolvedBrandFromConfig,
  resolvedBrandFromProfile,
  type ResolvedBrand,
} from "@/lib/brand-config/types";
import type { BrandConfig } from "@/lib/brand-theme/config-schema";
import { parseBrandConfig } from "@/lib/brand-theme/config-schema";
import { deriveConfiguredBrandTheme } from "@/lib/brand-theme/configured-theme";
import { serializeBrandThemeCss } from "@/lib/brand-theme/serialize";

const BrandContext = createContext<ResolvedBrand | null>(null);
const BrandPreviewContext = createContext<{
  previewConfig: BrandConfig | null;
  startPreview: (config: BrandConfig) => void;
  clearPreview: () => void;
} | null>(null);
const PREVIEW_STORAGE_KEY = "lotto.appearance.preview.v1";

export function BrandProvider({
  brand,
  children,
}: {
  brand: ResolvedBrand;
  children: ReactNode;
}) {
  const [previewConfig, setPreviewConfig] = useState<BrandConfig | null>(null);

  const applyPreview = useCallback((config: BrandConfig | null) => {
    const root = document.documentElement;
    document.querySelector("style[data-brand-theme='preview']")?.remove();
    if (!config) {
      root.dataset.brand = brand.brandId;
      return;
    }
    const style = document.createElement("style");
    style.dataset.brandTheme = "preview";
    style.textContent = serializeBrandThemeCss(deriveConfiguredBrandTheme(config), "custom");
    document.head.appendChild(style);
    root.dataset.brand = "custom";
  }, [brand.brandId]);

  useEffect(() => {
    const stored = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = parseBrandConfig(JSON.parse(stored));
      if (parsed.ok) {
        const timer = window.setTimeout(() => setPreviewConfig(parsed.config), 0);
        return () => window.clearTimeout(timer);
      }
      else sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    } catch {
      sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    applyPreview(previewConfig);
    return () => document.querySelector("style[data-brand-theme='preview']")?.remove();
  }, [applyPreview, previewConfig]);

  const previewApi = useMemo(() => ({
    previewConfig,
    startPreview: (config: BrandConfig) => {
      sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(config));
      setPreviewConfig(config);
    },
    clearPreview: () => {
      sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
      setPreviewConfig(null);
    },
  }), [previewConfig]);

  const resolved = previewConfig ? resolvedBrandFromConfig(previewConfig) : brand;
  return (
    <BrandPreviewContext.Provider value={previewApi}>
      <BrandContext.Provider value={resolved}>{children}</BrandContext.Provider>
    </BrandPreviewContext.Provider>
  );
}

export function useBrand(): ResolvedBrand {
  return useContext(BrandContext) ?? resolvedBrandFromProfile();
}

export function useBrandPreview() {
  const context = useContext(BrandPreviewContext);
  if (!context) throw new Error("useBrandPreview must be used within BrandProvider");
  return context;
}
