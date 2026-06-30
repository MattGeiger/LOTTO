# Home-screen icon candidates (for review)

These are **proposed** PWA / "Add to Home Screen" icons for review only. They are
**not wired into the app** — no `apple-icon`, `icon.png`, or web manifest has been
added to `src/app/`. See `docs/ISSUES.md` and the conversation that produced them.

## Background

iOS "Add to Home Screen" ignores `favicon.ico` and looks for a dedicated
`apple-touch-icon`, which the site does not have. Safari falls back to the 48×48
**transparent** favicon, scales it up, and fills the transparency with black —
the "generic W on black." The fix is a proper opaque icon (these candidates).

## Source

The WTH emblem (layered faces + yellow sun) was cropped to ~603×603 from
`public/wth-logo-horizontal.png` (2314×606) — high-resolution, no upscaling or
letterboxing — then centered on an opaque white canvas with ~12% padding.

## Files

| File | Size | Purpose |
|------|------|---------|
| `apple-icon-180-white.png` | 180×180 | iOS `apple-touch-icon` candidate (opaque, white bg) |
| `icon-512-white.png` | 512×512 | Android / PWA manifest icon candidate (opaque, white bg) |
| `ios-rounded-mockup-preview.png` | 440×440 | Preview only — shows the 180px icon with iOS's automatic corner rounding on a neutral home screen. Not for production use. |

## If approved

Typical wiring (Next.js App Router): move a 180×180 to `src/app/apple-icon.png`,
a 512×512 to `src/app/icon.png`, and add a `manifest.webmanifest` referencing the
icons. Background color and an Android "maskable" safe-zone variant are still open
choices. `favicon.ico` stays for legacy desktop tabs.
