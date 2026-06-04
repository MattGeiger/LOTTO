import type { Metadata } from "next";

import { PublicDisplayPage } from "@/components/public-display-page";
import { LanguageProvider } from "@/contexts/language-context";

export const metadata: Metadata = {
  title: "Display",
  description: "The live ticket board showing who's being served at William Temple House.",
};

export default function DisplayPage() {
  // Scope the board to a non-persisting language provider so admin-configured
  // language rotation never writes the shared `display-language` preference or
  // bleeds into other routes (e.g. the personalized homepage at `/`).
  return (
    <LanguageProvider persist={false}>
      <PublicDisplayPage />
    </LanguageProvider>
  );
}
