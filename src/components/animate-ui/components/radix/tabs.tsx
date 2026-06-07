// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from "motion/react";

import {
  Tabs as TabsPrimitive,
  TabsHighlight,
  TabsHighlightItem,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { cn } from "@/lib/utils";

type TabsProps = React.ComponentProps<typeof TabsPrimitive>;

type TabsContextValue = {
  value?: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function Tabs({ className, value, defaultValue, onValueChange, ...props }: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value: activeValue }}>
      <TabsPrimitive
        className={cn("flex flex-col gap-2", className)}
        value={isControlled ? value : undefined}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        {...props}
      />
    </TabsContext.Provider>
  );
}

type TabsListProps = React.ComponentProps<typeof TabsListPrimitive>;

function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsHighlight className="absolute inset-0 z-0 rounded-md border border-border/40 bg-background shadow-sm">
      <TabsListPrimitive
        className={cn(
          "relative inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
          className,
        )}
        {...props}
      />
    </TabsHighlight>
  );
}

type TabsTriggerProps = React.ComponentProps<typeof TabsTriggerPrimitive>;

function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsHighlightItem value={props.value} className="flex-1">
      <TabsTriggerPrimitive
        className={cn(
          "relative z-10 inline-flex h-[calc(100%-1px)] w-full flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors duration-500 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
        {...props}
      />
    </TabsHighlightItem>
  );
}

type TabsContentElement = React.ReactElement<TabsContentProps>;

type TabsContentsProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children?: React.ReactNode;
  transition?: Transition;
};

const DEFAULT_CONTENT_TRANSITION: Transition = {
  duration: 0.5,
  ease: "easeInOut",
};

function TabsContents({
  className,
  children,
  transition = DEFAULT_CONTENT_TRANSITION,
  ...props
}: TabsContentsProps) {
  const context = React.useContext(TabsContext);
  const childrenArray = React.Children.toArray(children);
  const activeChild = childrenArray.find(
    (child): child is TabsContentElement =>
      React.isValidElement<TabsContentProps>(child) &&
      child.props.value === context?.value,
  );

  return (
    <motion.div
      data-slot="tabs-contents"
      layout
      className={cn("relative overflow-visible", className)}
      transition={transition}
      {...props}
    >
      <AnimatePresence mode="wait">
        {activeChild ? React.cloneElement(activeChild, { transition }) : null}
      </AnimatePresence>
    </motion.div>
  );
}

type TabsContentProps = HTMLMotionProps<"div"> & {
  value: string;
  transition?: Transition;
};

function TabsContent({
  className,
  value,
  transition = DEFAULT_CONTENT_TRANSITION,
  ...props
}: TabsContentProps) {
  return (
    <motion.div
      key={value}
      role="tabpanel"
      data-slot="tabs-content"
      data-state="active"
      layout
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      transition={transition}
      className={cn("flex-1 overflow-visible outline-none", className)}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContents,
  TabsContent,
  type TabsProps,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentsProps,
  type TabsContentProps,
};
