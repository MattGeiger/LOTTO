import type { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
  description: "Operator controls for the William Temple House queue and display.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLocalDevelopment = process.env.NODE_ENV === "development" && !process.env.VERCEL;
  const authBypass = process.env.AUTH_BYPASS === "true" || isLocalDevelopment;

  if (authBypass) {
    return <>{children}</>;
  }

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <>{children}</>;
}
