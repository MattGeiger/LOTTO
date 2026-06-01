import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Your Ticket",
  description: "Find your ticket number and follow your place in line at William Temple House.",
};

export default function NewLayout({ children }: { children: ReactNode }) {
  return children;
}
