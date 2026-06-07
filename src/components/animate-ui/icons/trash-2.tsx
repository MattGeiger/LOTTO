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

type Trash2Props = IconProps<keyof typeof animations>;

const animations = {
  default: {
    lid: {
      initial: { y: 0, rotate: 0 },
      animate: {
        y: [-1, -3, 0],
        rotate: [0, -12, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      },
    },
    body: {
      initial: { scaleY: 1 },
      animate: {
        scaleY: [1, 0.94, 1],
        transition: { duration: 0.45, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: Trash2Props) {
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
        variants={variants.lid}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: "12px 5px" }}
      >
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </motion.g>
      <motion.g
        variants={variants.body}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: "12px 18px" }}
      >
        <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </motion.g>
    </motion.svg>
  );
}

function Trash2(props: Trash2Props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Trash2,
  Trash2 as Trash2Icon,
  type Trash2Props,
  type Trash2Props as Trash2IconProps,
};
