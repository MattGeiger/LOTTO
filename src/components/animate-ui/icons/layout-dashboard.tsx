'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type LayoutDashboardProps = IconProps<keyof typeof animations>;

const tile = (delay: number): Variants => ({
  initial: {
    opacity: 1,
    scale: 1,
  },
  animate: {
    opacity: [0.65, 1],
    scale: [0.9, 1.08, 1],
    transition: {
      duration: 0.45,
      ease: 'easeInOut',
      delay,
    },
  },
});

const animations = {
  default: {
    topLeft: tile(0),
    topRight: tile(0.08),
    bottomRight: tile(0.16),
    bottomLeft: tile(0.24),
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: LayoutDashboardProps) {
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
      <motion.rect
        width="7"
        height="9"
        x="3"
        y="3"
        rx="1"
        variants={variants.topLeft}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.rect
        width="7"
        height="5"
        x="14"
        y="3"
        rx="1"
        variants={variants.topRight}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.rect
        width="7"
        height="9"
        x="14"
        y="12"
        rx="1"
        variants={variants.bottomRight}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.rect
        width="7"
        height="5"
        x="3"
        y="16"
        rx="1"
        variants={variants.bottomLeft}
        initial="initial"
        animate={controls}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </motion.svg>
  );
}

function LayoutDashboard(props: LayoutDashboardProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  LayoutDashboard,
  LayoutDashboard as LayoutDashboardIcon,
  type LayoutDashboardProps,
  type LayoutDashboardProps as LayoutDashboardIconProps,
};
