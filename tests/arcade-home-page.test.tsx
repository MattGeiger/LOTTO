import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ArcadeHomePage from "@/app/(arcade)/arcade/page";
import { LanguageProvider } from "@/contexts/language-context";

describe("ArcadeHomePage", () => {
  it("links only to currently public Arcade games", () => {
    render(
      <LanguageProvider>
        <ArcadeHomePage />
      </LanguageProvider>,
    );

    expect(screen.getAllByRole("link", { name: "PLAY" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Games" })).toHaveAttribute("href", "/arcade");
    expect(screen.getByText("BRICK MAYHEM")).toBeInTheDocument();
    expect(screen.queryByText("Day of the Dead")).not.toBeInTheDocument();

    const gameLinks = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(gameLinks).toContain("/arcade/snake");
    expect(gameLinks).toContain("/arcade/brick-mayhem");
    expect(gameLinks).not.toContain("/arcade/zombie-attack");
  });
});
