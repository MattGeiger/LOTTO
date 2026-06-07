// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";

import {
  getVariants,
  IconWrapper,
  useAnimateIconContext,
  type IconProps,
} from "@/components/animate-ui/icons/icon";

type SearchCheckProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    glass: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0, 1],
        opacity: [0.35, 1],
        transition: { duration: 0.45, ease: "easeInOut" },
      },
    },
    check: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0, 1],
        opacity: [0, 1],
        transition: { duration: 0.35, delay: 0.15, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: SearchCheckProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.g variants={variants.glass} initial="initial" animate={controls}>
        <path d="m21 21-4.34-4.34" />
        <circle cx="11" cy="11" r="8" />
      </motion.g>
      <motion.path
        d="m8.5 11 2 2 4-4"
        variants={variants.check}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function SearchCheck(props: SearchCheckProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  SearchCheck,
  SearchCheck as SearchCheckIcon,
  type SearchCheckProps,
  type SearchCheckProps as SearchCheckIconProps,
};
