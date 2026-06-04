import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DisplayLanguageRotationEditor } from "@/components/display-language-rotation-editor";
import type { DisplayLanguageRotation } from "@/lib/state-types";

describe("DisplayLanguageRotationEditor", () => {
  it("enables rotation via the switch", async () => {
    const onChange = vi.fn();
    render(<DisplayLanguageRotationEditor value={null} onChange={onChange} />);

    await userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it("adds a language and keeps the canonical order", async () => {
    const onChange = vi.fn();
    const value: DisplayLanguageRotation = {
      enabled: true,
      languages: ["es"],
      intervalSeconds: 120,
    };
    render(<DisplayLanguageRotationEditor value={value} onChange={onChange} />);

    // English is canonical-first, so the emitted list should be ["en", "es"].
    await userEvent.click(screen.getByRole("checkbox", { name: "English" }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ languages: ["en", "es"] }),
    );
  });

  it("converts the minutes input into seconds", () => {
    const onChange = vi.fn();
    const value: DisplayLanguageRotation = {
      enabled: true,
      languages: ["en"],
      intervalSeconds: 120,
    };
    render(<DisplayLanguageRotationEditor value={value} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Minutes per language"), {
      target: { value: "5" },
    });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ intervalSeconds: 300 }),
    );
  });

  it("warns when enabled with no languages selected", () => {
    const value: DisplayLanguageRotation = {
      enabled: true,
      languages: [],
      intervalSeconds: 120,
    };
    render(<DisplayLanguageRotationEditor value={value} onChange={vi.fn()} />);

    expect(screen.getByText("Select at least one language to rotate.")).toBeInTheDocument();
  });

  it("disables language controls when rotation is off", () => {
    render(<DisplayLanguageRotationEditor value={null} onChange={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: "English" })).toBeDisabled();
  });
});
