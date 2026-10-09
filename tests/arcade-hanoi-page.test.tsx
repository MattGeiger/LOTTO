import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TowerOfHanoiPage from "@/app/(arcade)/arcade/tower-of-hanoi/page";
import { LanguageProvider } from "@/contexts/language-context";
import { ARCADE_TICKET_CALLED_EVENT } from "@/arcade/lib/events";
import { bestStorageKey } from "@/arcade/game/tower-of-hanoi/engine";

const peg = (i: number) => screen.getByRole("button", { name: new RegExp(`^${["Left peg A", "Middle peg B", "Destination peg C"][i]}:`) });
function solve(n: number, from=0, to=2, via=1) {
  if (!n) return;
  solve(n-1,from,via,to); fireEvent.click(peg(from)); fireEvent.click(peg(to)); solve(n-1,via,to,from);
}
async function play() {
  render(<LanguageProvider><TowerOfHanoiPage /></LanguageProvider>);
  await screen.findByText("NO SCORES YET");
  fireEvent.click(screen.getByRole("button", { name: "PLAY NOW" }));
}
describe("Hanoi gameplay and shared scores", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ scores: [] }))));
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("supports selection, invalid moves, Undo and keyboard focus without leaderboard reads", async () => {
    await play();
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(peg(0)); expect(peg(0)).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(peg(2)); fireEvent.click(peg(0)); fireEvent.click(peg(2));
    expect(screen.getByRole("status")).toHaveTextContent("A larger disk cannot go on a smaller one");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(peg(0)).toHaveAccessibleName("Left peg A: Disks, bottom to top: 3, 2, 1");
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    peg(0).focus(); fireEvent.keyDown(peg(0), { key: "ArrowRight" }); expect(peg(1)).toHaveFocus();
    fireEvent.click(peg(0)); fireEvent.keyDown(peg(0), { key: "Escape" });
    expect(peg(0)).toHaveAttribute("aria-pressed", "false");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("pauses on ticket call or hidden tab, clears selection and preserves moves", async () => {
    await play(); fireEvent.click(peg(0));
    act(() => window.dispatchEvent(new CustomEvent(ARCADE_TICKET_CALLED_EVENT)));
    expect(peg(0)).toBeDisabled(); expect(peg(0)).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getAllByRole("button", { name: "Resume game" })[0]!);
    expect(peg(0)).toBeEnabled();
    const visibility = vi.spyOn(document,"visibilityState","get").mockReturnValue("hidden");
    fireEvent(document,new Event("visibilitychange"));
    visibility.mockReturnValue("visible"); fireEvent(document,new Event("visibilitychange"));
    expect(peg(0)).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("awards 2,000 points, stores best moves and saves only on explicit submission", async () => {
    await play(); solve(3);
    expect(screen.getByText("SCORE: 2000")).toBeInTheDocument();
    expect(localStorage.getItem(bestStorageKey(3))).toBe("7");
    const input = await screen.findByLabelText("3 INITIALS");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/LEFT|EXPIRED/)).not.toBeInTheDocument();
    const entry = { id:"hanoi-score",game:"tower-of-hanoi",difficulty:"easy",initials:"ABC",score:2000,createdAt:new Date().toISOString() };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ accepted:true,entry,scores:[entry] })));
    fireEvent.change(input,{ target:{value:"ABC"} }); fireEvent.click(screen.getByRole("button",{name:"SAVE"}));
    expect(await screen.findByText("SCORE SAVED")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenLastCalledWith("/api/arcade/high-scores",expect.objectContaining({method:"POST",body:JSON.stringify({game:"tower-of-hanoi",difficulty:"easy",initials:"ABC",score:2000})}));
    fireEvent.click(screen.getByRole("button",{name:"Restart game"}));
    expect(screen.getByText("READY TO BUILD?")).toBeInTheDocument();
    expect(screen.queryByLabelText("3 INITIALS")).not.toBeInTheDocument();
  });
  it("changes difficulty with slider keyboard and resets the puzzle", async () => {
    await play(); fireEvent.click(peg(0)); fireEvent.click(peg(2));
    const slider=screen.getByRole("slider",{name:"SETTING"});
    fireEvent.keyDown(slider,{key:"End"}); fireEvent.keyUp(slider,{key:"End"});
    await waitFor(()=>expect(peg(0)).toHaveAccessibleName("Left peg A: Disks, bottom to top: 5, 4, 3, 2, 1"));
    expect(screen.getByText("READY TO BUILD?")).toBeInTheDocument();
  });
  // This drives 53 moves (106 peg activations) through three rendered boards.
  // Give this integration scenario its own budget under full-suite contention.
  it("continues 3 → 4 → 5 immediately, resets each run and keeps scores scoped without progression reads", async () => {
    await play();
    expect(screen.queryByRole("button", { name: /Continue:/ })).not.toBeInTheDocument();
    solve(3);
    await screen.findByLabelText("3 INITIALS");
    expect(fetch).toHaveBeenCalledTimes(2);
    const continueFour = screen.getByRole("button", { name: "Continue: 4 disks" });
    fireEvent.click(continueFour);
    fireEvent.click(continueFour); // A rapid second activation cannot skip a level.
    expect(peg(0)).toBeEnabled();
    expect(peg(0)).toHaveAccessibleName("Left peg A: Disks, bottom to top: 4, 3, 2, 1");
    expect(peg(2)).toHaveAccessibleName("Destination peg C: Disks, bottom to top: Empty");
    expect(screen.getByRole("slider", { name: "SETTING" })).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.queryByLabelText("3 INITIALS")).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
    solve(4);
    const initials = await screen.findByLabelText("3 INITIALS");
    expect(screen.getByText("SCORE: 2000")).toBeInTheDocument();
    expect(localStorage.getItem(bestStorageKey(3))).toBe("7");
    expect(localStorage.getItem(bestStorageKey(4))).toBe("15");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenLastCalledWith("/api/arcade/high-scores?game=tower-of-hanoi&difficulty=normal", expect.anything());
    const entry = { id:"continued-score",game:"tower-of-hanoi",difficulty:"normal",initials:"ABC",score:2000,createdAt:new Date().toISOString() };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ accepted:true,entry,scores:[entry] })));
    fireEvent.change(initials, { target: { value: "ABC" } });
    fireEvent.click(screen.getByRole("button", { name: "SAVE" }));
    await screen.findByText("SCORE SAVED");
    expect(fetch).toHaveBeenLastCalledWith("/api/arcade/high-scores", expect.objectContaining({ method:"POST",body:JSON.stringify({game:"tower-of-hanoi",difficulty:"normal",initials:"ABC",score:2000}) }));
    fireEvent.click(screen.getByRole("button", { name: "Continue: 5 disks" }));
    expect(peg(0)).toHaveAccessibleName("Left peg A: Disks, bottom to top: 5, 4, 3, 2, 1");
    expect(peg(0)).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("slider", { name: "SETTING" })).toHaveAttribute("aria-valuenow", "2");
    expect(fetch).toHaveBeenCalledTimes(4);
    solve(5);
    await screen.findByLabelText("3 INITIALS");
    expect(screen.getByText("SCORE: 2000")).toBeInTheDocument();
    expect(localStorage.getItem(bestStorageKey(5))).toBe("31");
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(fetch).toHaveBeenLastCalledWith("/api/arcade/high-scores?game=tower-of-hanoi&difficulty=hard", expect.anything());
    expect(screen.queryByRole("button", { name: /Continue:/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restart game" }));
    expect(screen.getByText("READY TO BUILD?")).toBeInTheDocument();
    expect(peg(0)).toHaveAccessibleName("Left peg A: Disks, bottom to top: 5, 4, 3, 2, 1");
  }, 15_000);
  it("finishes offline without a submission loop", async () => {
    vi.mocked(fetch).mockRejectedValue(Error("offline"));
    render(<LanguageProvider><TowerOfHanoiPage /></LanguageProvider>);
    await screen.findByText("SCORES UNAVAILABLE");
    fireEvent.click(screen.getByRole("button",{name:"PLAY NOW"})); solve(3);
    expect(screen.getByText("SCORE: 2000")).toBeInTheDocument();
    expect(localStorage.getItem(bestStorageKey(3))).toBe("7");
    await screen.findByText("SCORES UNAVAILABLE");
    expect(screen.queryByLabelText("3 INITIALS")).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Continue: 4 disks" }));
    expect(peg(0)).toBeEnabled();
    expect(peg(0)).toHaveAccessibleName("Left peg A: Disks, bottom to top: 4, 3, 2, 1");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
