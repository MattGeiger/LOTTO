import type { Metadata } from "next";

import { PublicInventoryPage } from "@/components/public-inventory-page";

export const metadata: Metadata = {
  title: "What's in Stock",
  description: "See what's available today at the William Temple House food pantry.",
};

export default function InventoryPage() {
  return <PublicInventoryPage />;
}
