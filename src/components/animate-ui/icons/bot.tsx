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

type BotProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    antenna: {
      initial: { y: 0, rotate: 0 },
      animate: {
        y: [0, -1.5, 0],
        rotate: [0, 10, -8, 0],
        transition: { duration: 0.55, ease: "easeInOut" },
      },
    },
    eyes: {
      initial: { scaleY: 1 },
      animate: {
        scaleY: [1, 0.2, 1],
        transition: { duration: 0.45, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: BotProps) {
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
      <motion.g
        variants={variants.antenna}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: "12px 7px" }}
      >
        <path d="M12 8V4H8" />
      </motion.g>
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <motion.g
        variants={variants.eyes}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: "12px 14px" }}
      >
        <path d="M9 13v2" />
        <path d="M15 13v2" />
      </motion.g>
      <path d="M10 18h4" />
    </motion.svg>
  );
}

function Bot(props: BotProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Bot,
  Bot as BotIcon,
  type BotProps,
  type BotProps as BotIconProps,
};
