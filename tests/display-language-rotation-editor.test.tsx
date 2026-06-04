import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { DisplayLanguageRotationEditor } from "@/components/display-language-rotation-editor";
import type { DisplayLanguageRotation } from "@/lib/state-types";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: vi.fn(() => false),
  });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

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

  it("converts the interval dropdown selection into seconds", async () => {
    const onChange = vi.fn();
    const value: DisplayLanguageRotation = {
      enabled: true,
      languages: ["en"],
      intervalSeconds: 120,
    };
    render(<DisplayLanguageRotationEditor value={value} onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox", { name: "Minutes per language" }));
    await userEvent.click(screen.getByRole("option", { name: "5 minutes per language" }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ intervalSeconds: 300 }),
    );
  });

  it("uses a 1 to 10 minute dropdown without a standalone interval label", async () => {
    const value: DisplayLanguageRotation = {
      enabled: true,
      languages: ["en"],
      intervalSeconds: 120,
    };
    render(<DisplayLanguageRotationEditor value={value} onChange={vi.fn()} />);

    expect(screen.queryByText("Minutes per language")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Minutes per language" }));

    for (let minutes = 1; minutes <= 10; minutes += 1) {
      expect(
        screen.getByRole("option", {
          name: `${minutes} minute${minutes === 1 ? "" : "s"} per language`,
        }),
      ).toBeInTheDocument();
    }
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
