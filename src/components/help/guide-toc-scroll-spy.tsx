"use client";

import * as React from "react";

type GuideTocScrollSpyProps = {
  headingIds: string[];
};

/**
 * Highlights the active table-of-contents link as the reader scrolls. Marks the
 * deepest heading whose top has passed the 128px offset. Ported verbatim from
 * FEED's GuideTocScrollSpy. Pairs with `data-guide-toc-link` anchors in
 * `guide-toc.tsx`.
 */
export function GuideTocScrollSpy({ headingIds }: GuideTocScrollSpyProps) {
  React.useEffect(() => {
    if (headingIds.length === 0) return;

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-guide-toc-link]"));

    const setActive = (activeId: string) => {
      for (const link of links) {
        const isActive = link.dataset.headingId === activeId;
        link.dataset.active = isActive ? "true" : "false";
        if (isActive) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    };

    const updateActiveHeading = () => {
      let activeId = headingIds[0];

      for (const headingId of headingIds) {
        const heading = document.getElementById(headingId);
        if (!heading) continue;
        if (heading.getBoundingClientRect().top <= 128) {
          activeId = headingId;
        } else {
          break;
        }
      }

      setActive(activeId);
    };

    let frame: number | null = null;
    const scheduleUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateActiveHeading();
      });
    };

    updateActiveHeading();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [headingIds]);

  return null;
}
