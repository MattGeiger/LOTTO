// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

"use client";

import Image from "next/image";

import { useBrand } from "@/contexts/brand-context";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function BrandLogo({ className, imageClassName, priority = false }: BrandLogoProps) {
  const brand = useBrand();
  const { logo, organizationName } = brand;
  const needsDarkSurface = logo.presentation === "dark-surface";
  const sharedImageClassName = cn("h-auto w-full", imageClassName);

  return (
    <div
      data-brand-logo={brand.brandId}
      data-presentation={logo.presentation}
      className={cn(
        "flex items-center justify-center",
        needsDarkSurface &&
          "rounded-xl bg-[var(--brand-logo-surface)] px-3 py-2 shadow-[var(--base-shadow-md)] dark:bg-transparent dark:shadow-none",
        className,
      )}
    >
      {logo.lightSrc === logo.darkSrc ? (
        <Image
          src={logo.lightSrc}
          alt={organizationName}
          width={logo.width}
          height={logo.height}
          className={sharedImageClassName}
          priority={priority}
        />
      ) : (
        <>
          <Image
            src={logo.lightSrc}
            alt={organizationName}
            width={logo.width}
            height={logo.height}
            className={cn("block dark:hidden", sharedImageClassName)}
            priority={priority}
          />
          <Image
            src={logo.darkSrc}
            alt={organizationName}
            width={logo.darkWidth}
            height={logo.darkHeight}
            className={cn("hidden dark:block", sharedImageClassName)}
            priority={priority}
          />
        </>
      )}
    </div>
  );
}
