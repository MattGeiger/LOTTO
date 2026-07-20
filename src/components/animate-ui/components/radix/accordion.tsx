// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { AnimatePresence, motion, type Transition } from "motion/react";

import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { cn } from "@/lib/utils";

type AccordionProps = React.ComponentProps<typeof AccordionPrimitive.Root>;
type AccordionSingleProps = AccordionPrimitive.AccordionSingleProps;
type AccordionMultipleProps = AccordionPrimitive.AccordionMultipleProps;
type AccordionItemProps = React.ComponentProps<typeof AccordionPrimitive.Item>;
type AccordionTriggerProps = React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  showArrow?: boolean;
};
type AccordionContentProps = React.ComponentProps<typeof AccordionPrimitive.Content> & {
  keepRendered?: boolean;
  transition?: Transition;
};

const DEFAULT_CONTENT_TRANSITION: Transition = {
  duration: 0.28,
  ease: "easeInOut",
};

type AccordionContextValue = {
  value?: string | string[];
};

type AccordionItemContextValue = {
  value: string;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

function Accordion({
  className,
  value,
  defaultValue,
  onValueChange,
  type,
  ...props
}: AccordionProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (nextValue: string | string[]) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue as typeof defaultValue);
      }
      onValueChange?.(nextValue as never);
    },
    [isControlled, onValueChange],
  );

  const commonProps = {
    "data-slot": "accordion",
    className: cn("w-full", className),
  };

  if (type === "multiple") {
    const multipleProps = props as Omit<
      AccordionMultipleProps,
      "className" | "defaultValue" | "onValueChange" | "type" | "value"
    >;

    return (
      <AccordionContext.Provider value={{ value: activeValue }}>
        <AccordionPrimitive.Root
          {...multipleProps}
          {...commonProps}
          type="multiple"
          value={isControlled ? (value as string[]) : undefined}
          defaultValue={defaultValue as string[] | undefined}
          onValueChange={handleValueChange as AccordionMultipleProps["onValueChange"]}
        />
      </AccordionContext.Provider>
    );
  }

  const singleProps = props as Omit<
    AccordionSingleProps,
    "className" | "defaultValue" | "onValueChange" | "type" | "value"
  >;

  return (
    <AccordionContext.Provider value={{ value: activeValue }}>
      <AccordionPrimitive.Root
        {...singleProps}
        {...commonProps}
        type="single"
        value={isControlled ? (value as string) : undefined}
        defaultValue={defaultValue as string | undefined}
        onValueChange={handleValueChange as AccordionSingleProps["onValueChange"]}
      />
    </AccordionContext.Provider>
  );
}

function AccordionItem({ className, value, ...props }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <AccordionPrimitive.Item
        data-slot="accordion-item"
        className={cn("overflow-visible", className)}
        value={value}
        {...props}
      />
    </AccordionItemContext.Provider>
  );
}

function AccordionTrigger({
  className,
  children,
  showArrow = true,
  ...props
}: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex w-full flex-1 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left text-lg font-semibold text-foreground shadow-card transition-colors hover:bg-muted/50",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        {showArrow && (
          <ChevronDown
            className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180"
            animateOnHover
            animateOnTap
          />
        )}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  keepRendered = false,
  transition = DEFAULT_CONTENT_TRANSITION,
  ...props
}: AccordionContentProps) {
  const accordionContext = React.useContext(AccordionContext);
  const itemContext = React.useContext(AccordionItemContext);
  const activeValue = accordionContext?.value;
  const itemValue = itemContext?.value;
  const open = Array.isArray(activeValue)
    ? Boolean(itemValue && activeValue.includes(itemValue))
    : activeValue === itemValue;

  return (
    <AccordionPrimitive.Content data-slot="accordion-content" forceMount {...props}>
      <AnimatePresence initial={false}>
        {(open || keepRendered) && (
          <motion.div
            key="accordion-content"
            initial={{ height: 0, opacity: 0, filter: "blur(4px)" }}
            animate={{
              height: open ? "auto" : 0,
              opacity: open ? 1 : 0,
              filter: open ? "blur(0px)" : "blur(4px)",
            }}
            exit={{ height: 0, opacity: 0, filter: "blur(4px)" }}
            transition={transition}
            // overflow-hidden is required for the height animation but would
            // clip the shadows of cards inside the panel. Widening the clip
            // region with negative margins while padding the content back
            // into place gives shadows 16px of room on the sides/bottom
            // (pt-6 already provides it above) without changing layout, and
            // stays correct mid-animation — unlike state-driven overflow,
            // which AnimatePresence snapshots during exit. The host page must
            // have ≥16px horizontal padding (admin main uses px-6).
            className="-mx-4 -mb-4 overflow-hidden"
          >
            <div className={cn("px-4 pb-4 pt-6", className)}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </AccordionPrimitive.Content>
  );
}

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  type AccordionProps,
  type AccordionItemProps,
  type AccordionTriggerProps,
  type AccordionContentProps,
};
