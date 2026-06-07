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

type SquarePenProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    square: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0.35, 1],
        opacity: [0.55, 1],
        transition: { duration: 0.35, ease: "easeInOut" },
      },
    },
    pen: {
      initial: { x: 0, y: 0, rotate: 0 },
      animate: {
        x: [0, -1, 0],
        y: [0, 1, 0],
        rotate: [0, -8, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: SquarePenProps) {
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
      <motion.path
        d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        variants={variants.square}
        initial="initial"
        animate={controls}
      />
      <motion.g
        variants={variants.pen}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: "17px 7px" }}
      >
        <path d="M18.375 2.625a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414L12 15l-4 1 1-4Z" />
        <path d="m15 5 4 4" />
      </motion.g>
    </motion.svg>
  );
}

function SquarePen(props: SquarePenProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  SquarePen,
  SquarePen as SquarePenIcon,
  type SquarePenProps,
  type SquarePenProps as SquarePenIconProps,
};
