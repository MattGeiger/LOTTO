"use client";

import type { HTMLAttributes, MouseEvent } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";

import { LayoutDashboardIcon as AnimateLayoutDashboardIcon } from "@/components/animate-ui/icons/layout-dashboard";
import { cn } from "@/lib/utils";

export interface LayoutDashboardIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LayoutDashboardIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const LayoutDashboardIcon = forwardRef<LayoutDashboardIconHandle, LayoutDashboardIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const [animationState, setAnimationState] = useState({ active: false, runId: 0 });
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () =>
          setAnimationState(({ runId }) => ({
            active: true,
            runId: runId + 1,
          })),
        stopAnimation: () =>
          setAnimationState(({ runId }) => ({
            active: false,
            runId,
          })),
      };
    });

    const handleMouseEnter = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          setAnimationState(({ runId }) => ({
            active: true,
            runId: runId + 1,
          }));
        }
      },
      [onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          setAnimationState(({ runId }) => ({
            active: false,
            runId,
          }));
        }
      },
      [onMouseLeave],
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <AnimateLayoutDashboardIcon
          key={animationState.runId}
          size={size}
          animate={animationState.active}
          completeOnStop
        />
      </div>
    );
  },
);

LayoutDashboardIcon.displayName = "LayoutDashboardIcon";

export { LayoutDashboardIcon };
