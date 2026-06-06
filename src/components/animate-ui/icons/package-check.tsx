// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type PackageCheckProps = IconProps<keyof typeof animations>;

// Each stroke is its own variant key so consumers can trigger the built-in
// `path` primitive (pathLength draw-on, with the stroke-dasharray fix applied
// automatically by IconWrapper). The `default` animation draws the box first
// and the check last, for callers that prefer the staggered variant.
const drawAt = (delay: number, duration = 0.6): Variants => ({
  initial: { pathLength: 1, opacity: 1 },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: { duration, ease: 'easeInOut', delay },
  },
});

const animations = {
  default: {
    box: drawAt(0),
    seam: drawAt(0.1),
    top: drawAt(0.05),
    stem: drawAt(0.15),
    check: drawAt(0.35, 0.4),
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: PackageCheckProps) {
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
        d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"
        variants={variants.box}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="m7.5 4.27 9 5.15"
        variants={variants.seam}
        initial="initial"
        animate={controls}
      />
      <motion.polyline
        points="3.29 7 12 12 20.71 7"
        variants={variants.top}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={12}
        x2={12}
        y1={22}
        y2={12}
        variants={variants.stem}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="m16 16 2 2 4-4"
        variants={variants.check}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function PackageCheck(props: PackageCheckProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  PackageCheck,
  PackageCheck as PackageCheckIcon,
  type PackageCheckProps,
  type PackageCheckProps as PackageCheckIconProps,
};
