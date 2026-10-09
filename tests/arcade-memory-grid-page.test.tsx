import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MemoryGridPage from "@/app/(arcade)/arcade/memory-grid/page";
import { LanguageProvider } from "@/contexts/language-context";
import { ARCADE_PLAY_RESUMED_EVENT, ARCADE_TICKET_CALLED_EVENT } from "@/arcade/lib/events";
import { bestStorageKey } from "@/arcade/game/memory-grid/engine";
import { AboutDialog } from "@/components/about-dialog";

async function play() {
  render(<LanguageProvider><MemoryGridPage /></LanguageProvider>);
  await waitFor(() => expect(screen.getByRole("button", { name: "PLAY NOW" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "PLAY NOW" }));
}

describe("Memory Grid controls", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ scores: [] }), { status: 200 })));
    vi.spyOn(Math, "random").mockReturnValue(.999);
    vi.stubGlobal("Image", class {
      onload?: () => void;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    });
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("reveals with touch, moves keyboard focus, and never exposes hidden foods", async () => {
    await play();
    const first = screen.getByRole("button", { name: "Card 1: face down" });
    expect(screen.queryByRole("button", { name: /Apple/ })).not.toBeInTheDocument();
    fireEvent.click(first);
    expect(first).toHaveAccessibleName("Card 1: Apple");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Card 2: face down" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Card 7: face down" }));
    expect(first).toHaveAccessibleName("Card 1: Apple, matched");
    expect(screen.getByRole("status")).toHaveTextContent("PAIRS: 1/6");
    fireEvent.click(screen.getByRole("button", { name: "Restart game" }));
    expect(screen.getByText("READY TO MATCH?")).toBeInTheDocument();
    expect(first).toHaveAccessibleName("Card 1: face down");
  });

  it("pauses for a ticket call or hidden tab, and resumes only explicitly", async () => {
    await play();
    fireEvent.click(screen.getByRole("button", { name: "Card 1: face down" }));
    fireEvent.click(screen.getByRole("button", { name: "Card 2: face down" }));
    act(() => window.dispatchEvent(new CustomEvent(ARCADE_TICKET_CALLED_EVENT)));
    expect(screen.getByRole("button", { name: "Card 1: face down" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("GAME PAUSED");
    const resumed = vi.fn();
    window.addEventListener(ARCADE_PLAY_RESUMED_EVENT, resumed);
    fireEvent.click(screen.getAllByRole("button", { name: "Resume game" })[0]!);
    expect(screen.getByRole("button", { name: "Card 1: Apple" })).toBeEnabled();
    expect(resumed).toHaveBeenCalledTimes(1);
    window.removeEventListener(ARCADE_PLAY_RESUMED_EVENT, resumed);
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.getByRole("status")).toHaveTextContent("GAME PAUSED");
    visibility.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.getByRole("status")).toHaveTextContent("GAME PAUSED");
  });

  it("records a local best and final points, then submits only on explicit Save", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    await play();
    fetch.mockClear();
    for (let index = 1; index <= 6; index++) {
      fireEvent.click(screen.getByRole("button", { name: `Card ${index}: face down` }));
      fireEvent.click(screen.getByRole("button", { name: `Card ${index + 6}: face down` }));
    }
    expect(screen.getByText("ALL PAIRS FOUND!")).toBeInTheDocument();
    expect(screen.getByText("SCORE: 2000")).toBeInTheDocument();
    expect(localStorage.getItem(bestStorageKey(6))).toBe("6");
    const input = await screen.findByLabelText("3 INITIALS");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/arcade/high-scores?game=memory-grid&difficulty=easy", { cache: "no-store" });
    expect(screen.queryByText(/LEFT|EXPIRED/)).not.toBeInTheDocument();
    const entry = { id: "memory-1", game: "memory-grid", difficulty: "easy", initials: "王小明", score: 2000, createdAt: new Date().toISOString() };
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ accepted: true, entry, scores: [entry] })));
    fireEvent.change(input, { target: { value: "王小明" } });
    fireEvent.click(screen.getByRole("button", { name: "SAVE" }));
    expect(await screen.findByText("SCORE SAVED")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith("/api/arcade/high-scores", expect.objectContaining({
      method: "POST", body: JSON.stringify({ game: "memory-grid", difficulty: "easy", initials: "王小明", score: 2000 }),
    }));
  });

  it("does not reload the leaderboard during cards, pause/resume or idle time", async () => {
    await play();
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Card 1: face down" }));
    fireEvent.click(screen.getByRole("button", { name: "Card 7: face down" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause game" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Resume game" })[0]!);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/SCORE:|BONUS:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restart game" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it("keeps completion, score and local best when the leaderboard is offline", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    await play();
    for (let index = 1; index <= 6; index++) {
      fireEvent.click(screen.getByRole("button", { name: `Card ${index}: face down` }));
      fireEvent.click(screen.getByRole("button", { name: `Card ${index + 6}: face down` }));
    }
    expect(await screen.findByText("SCORES UNAVAILABLE")).toBeInTheDocument();
    expect(screen.getByText("SCORE: 2000")).toBeInTheDocument();
    expect(localStorage.getItem(bestStorageKey(6))).toBe("6");
    expect(screen.queryByLabelText("3 INITIALS")).not.toBeInTheDocument();
  });

  it("changes difficulty with the native slider keyboard workflow", async () => {
    await play();
    const slider = screen.getByRole("slider", { name: "SETTING" });
    slider.focus();
    fireEvent.keyDown(slider, { key: "End" });
    fireEvent.keyUp(slider, { key: "End" });
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Card \d+: face down/ })).toHaveLength(24));
    expect(screen.getByText("READY TO MATCH?")).toBeInTheDocument();
  });

  it("keeps Henry Software and CC0 credits in the About modal", () => {
    render(<AboutDialog version="2.0.0-rc.9" />);
    fireEvent.click(screen.getByRole("button", { name: "About" }));
    expect(screen.getByRole("link", { name: "Henry Software" })).toHaveAttribute("href", "https://henrysoftware.itch.io/pixel-food");
    expect(screen.getByRole("link", { name: "CC0 1.0 Universal" })).toHaveAttribute("href", "https://creativecommons.org/publicdomain/zero/1.0/");
  });

  it("does not start an unreadable board when artwork loading fails", async () => {
    vi.stubGlobal("Image", class {
      onerror?: () => void;
      set src(_value: string) { queueMicrotask(() => this.onerror?.()); }
    });
    render(<LanguageProvider><MemoryGridPage /></LanguageProvider>);
    expect(await screen.findByText("Artwork could not load. Reload the page to try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PLAY NOW" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Card 1: face down" })).toBeDisabled();
  });

  it("keeps the revealed mismatch announcement available after the visual cards close", async () => {
    await play();
    fireEvent.click(screen.getByRole("button", { name: "Card 1: face down" }));
    fireEvent.click(screen.getByRole("button", { name: "Card 2: face down" }));
    const result = screen.getByRole("status").textContent;
    expect(result).toContain("Apple, Bread. Different foods.");
    const tick = vi.mocked(window.requestAnimationFrame).mock.calls.at(-1)![0];
    act(() => tick(performance.now() + 1300));
    expect(screen.getByRole("button", { name: "Card 1: face down" })).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toBe(result);
    fireEvent.click(screen.getByRole("button", { name: "Card 3: face down" }));
    expect(screen.getByRole("status")).toHaveTextContent("Cheese. Choose a second card.");
  });
});
