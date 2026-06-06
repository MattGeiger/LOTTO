// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface TicketIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface TicketIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// Lucide `ticket` geometry, verbatim. The outline is drawn twice and clipped
// into a left and right half at the perforation seam (x=13); animating the two
// halves apart on the X axis makes the ticket appear to rip in two, then spring
// back. Pure translation keeps the effect transform-origin-independent.
const TICKET_OUTLINE =
  "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z";

// Static, deterministic clip ids. The clip geometry is identical for every
// ticket instance, so a shared id is collision-safe (duplicates resolve to an
// equivalent clip) and stays stable across SSR/client render — unlike
// useId-derived ids, which can diverge and trip a hydration mismatch.
const CLIP_ID_LEFT = "wt-ticket-clip-l";
const CLIP_ID_RIGHT = "wt-ticket-clip-r";

const LEFT_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: {
    x: [0, -2.5, 0],
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const RIGHT_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: {
    x: [0, 2.5, 0],
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const TicketIcon = forwardRef<TicketIconHandle, TicketIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id={CLIP_ID_LEFT}>
              <rect x="0" y="0" width="13" height="24" />
            </clipPath>
            <clipPath id={CLIP_ID_RIGHT}>
              <rect x="13" y="0" width="11" height="24" />
            </clipPath>
          </defs>
          <motion.g
            animate={controls}
            initial="normal"
            variants={LEFT_VARIANTS}
            clipPath={`url(#${CLIP_ID_LEFT})`}
          >
            <path d={TICKET_OUTLINE} />
            <path d="M13 5v2" />
            <path d="M13 11v2" />
            <path d="M13 17v2" />
          </motion.g>
          <motion.g
            animate={controls}
            initial="normal"
            variants={RIGHT_VARIANTS}
            clipPath={`url(#${CLIP_ID_RIGHT})`}
          >
            <path d={TICKET_OUTLINE} />
          </motion.g>
        </svg>
      </div>
    );
  }
);

TicketIcon.displayName = "TicketIcon";

export { TicketIcon };
