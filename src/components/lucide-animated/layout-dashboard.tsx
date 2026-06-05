"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface LayoutDashboardIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LayoutDashboardIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const tileVariants = (delay: number): Variants => ({
  normal: {
    opacity: 1,
    scale: 1,
  },
  animate: {
    opacity: [1, 0.65, 1],
    scale: [1, 0.9, 1.08, 1],
    transition: {
      duration: 0.45,
      ease: "easeInOut",
      delay,
    },
  },
});

const TILE_VARIANTS = [
  tileVariants(0),
  tileVariants(0.08),
  tileVariants(0.16),
  tileVariants(0.24),
] as const;

const LayoutDashboardIcon = forwardRef<LayoutDashboardIconHandle, LayoutDashboardIconProps>(
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
      [controls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave],
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
          <motion.rect
            width="7"
            height="9"
            x="3"
            y="3"
            rx="1"
            animate={controls}
            initial="normal"
            variants={TILE_VARIANTS[0]}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
          <motion.rect
            width="7"
            height="5"
            x="14"
            y="3"
            rx="1"
            animate={controls}
            initial="normal"
            variants={TILE_VARIANTS[1]}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
          <motion.rect
            width="7"
            height="9"
            x="14"
            y="12"
            rx="1"
            animate={controls}
            initial="normal"
            variants={TILE_VARIANTS[2]}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
          <motion.rect
            width="7"
            height="5"
            x="3"
            y="16"
            rx="1"
            animate={controls}
            initial="normal"
            variants={TILE_VARIANTS[3]}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        </svg>
      </div>
    );
  },
);

LayoutDashboardIcon.displayName = "LayoutDashboardIcon";

export { LayoutDashboardIcon };
