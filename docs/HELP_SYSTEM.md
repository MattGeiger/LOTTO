# In-App Help, Release Notes & About

**Status:** Shipped

These three staff-facing features were adapted from the FEED project
(`williamtemple-feed`) and rebuilt for LOTTO's Next.js App Router. All content is
**English-only**, matching the Staff page.

## Entry points (Login and Admin)

The shared sign-in footer (`src/components/staff-links-footer.tsx`) and the
authenticated Admin footer render the staff-facing controls:

- **Version number** → `ReleaseNotesDialog` (`src/components/release-notes-dialog.tsx`).
- **About** → `AboutDialog` (`src/components/about-dialog.tsx`).
- **Help** → a link to the `/help` route.

The server routes read `docs/release-notes.md` from disk at build/request time
and pass it to the release-notes modal.

## Release Notes

- **Content:** `docs/release-notes.md` — plain-language, per-version summaries,
  newest first (`## Version X.Y.Z — Month D, YYYY` + bullets). This is separate
  from the technical `CHANGELOG.md` / `docs/RELEASES.md`; keep a short, friendly
  entry here when you cut a release.
- **Rendering:** `MarkdownGuideContent` (shared markdown renderer) inside a
  scrollable dialog.

## About

- Product/credits card in `src/components/about-dialog.tsx`, matching FEED's
  format: the Temple Consulting logo, title, tagline, "Made by / Made for / Made
  with", the current version, the license (**AGPL-3.0-or-later**, per the repo
  `LICENSE`), and a **Source Code on GitHub** button, plus a short open-source /
  profile-aware "Made for" link and branding disclaimer (code is AGPL; bundled
  agency branding is not — see `TRADEMARKS.md`). Like FEED, the `DialogContent` is made transparent
  (`border-0 bg-transparent p-0 shadow-none`) so the inner `Card` is the visible
  surface (no card-in-a-card). LOTTO's `DialogContent` has no built-in close
  button, so both this and the release-notes modal add an explicit `DialogClose`
  (X, top-right).
- **Logo theming:** two SVG variants in `public/` — `temple-logo-light.svg`
  (black) and `temple-logo-dark.svg` (white) — swapped with `dark:hidden` /
  `hidden dark:block`, so the logo tracks the theme selector (the `.dark` class
  covers both dark and dark hi-viz). The adaptive `Temple_Icon_System.svg` from
  FEED is intentionally not used because its in-SVG `prefers-color-scheme` keys
  off the OS, not LOTTO's theme toggle.

## Searchable Help

Routed pages, statically generated:

- `src/app/help/page.tsx` — index: search box + a card grid of guides.
- `src/app/help/[slug]/page.tsx` — detail: search box, table of contents
  (mobile collapsible + desktop sticky with scroll-spy), the rendered guide, and
  previous/next navigation. The desktop table of contents is aligned with the
  guide article card on initial page load, then sticks below the top chrome while
  scrolling. `generateStaticParams` prerenders one page per guide.

For authenticated staff, the Help index's upper-left **Back** control returns
to `/admin`. It must not target the retired `/staff` landing route.

### Authoring content

Guides are markdown files in `docs/user-guides/`, named `NN-slug.md` (the numeric
prefix sets order; the slug becomes the URL: `/help/slug`). Structure:

```markdown
# Guide Title              (becomes the page title)

Intro paragraph.          (becomes the card description + first text)

## Section Heading         (H2/H3 become TOC entries + search sections, with ids)

1. Step one.
2. Step two.

[Link to another guide](02-staff-controls.md)   (rewritten to /help/staff-controls)
```

Optional screenshots: put images under `public/help-screenshots/`; a
`name-dark.png` sibling is auto-swapped in dark mode.

### Search

Section-level, no external dependency. The index (one entry per H2/H3 section) is
built server-side and passed to the client `HelpSearch` component, which scores
matches (section title > guide title > content), shows up to 8 results with a
180-char snippet, highlights terms, and links to
`/help/<slug>?q=<query>#<section-id>`. On arrival, `HighlightOnArrival` marks the
query terms in the article and scrolls to the section.

## Key files

| Concern | File |
| --- | --- |
| Pure parser + search index + link rewrite (tested) | `src/lib/user-guides.ts` |
| Server-only filesystem loader | `src/lib/user-guides.server.ts` |
| Markdown renderer (react-markdown + remark-gfm) | `src/components/help/markdown-guide.tsx` |
| Search box + results | `src/components/help/help-search.tsx` |
| TOC + scroll-spy | `src/components/help/guide-toc.tsx`, `guide-toc-scroll-spy.tsx` |
| Arrival highlight | `src/components/help/highlight-on-arrival.tsx` |
| Article wrapper | `src/components/help/guide-article.tsx` |
| Routes | `src/app/help/page.tsx`, `src/app/help/[slug]/page.tsx` |
| Release notes / About modals | `src/components/release-notes-dialog.tsx`, `src/components/about-dialog.tsx` |
| Content | `docs/release-notes.md`, `docs/user-guides/NN-*.md` |

## Tests

- `tests/user-guides.test.ts` — filename parse, guide build/sort, TOC id
  de-duplication, section search entries, markdown link rewriting.
- `tests/help-search.test.tsx` — ranking, deep-link hrefs, highlighting, the
  2-character minimum, empty state, and clear.
