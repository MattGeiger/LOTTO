import type { Metadata } from "next";

import { PublicDisplayPage } from "@/components/public-display-page";

export const metadata: Metadata = {
  title: "Display",
  description: "The live ticket board showing who's being served at William Temple House.",
};

export default function DisplayPage() {
  return <PublicDisplayPage />;
}
