# AI Configuration rc.4 validation

**Checkpoint:** September 14, 2026. Implementation is local on
`codex/ai-configuration-rc4`, based on `6134c0a`. Release validation is incomplete;
no rc.4 tag, GitHub release, or production promotion has occurred. Local
package/lock metadata is rc.4; production remains rc.3.

## Scope and provenance

The user approved the [revised plan](AI_CONFIGURATION_RC4_PORT_PLAN.md), including
LOTTO's existing six-step wizard, reference pricing, and no built-in spending
tracking. The catalog, parameter UI, lifecycle notices, failure classifier, and
provider decisions derive from FEED `v1.8.0` at
`b53e2e5c587a1df3a5bf6a20dd4f4f37f860d507`.

LOTTO adaptations retain Next.js routes, REST requests, existing file/Neon
stores, and internal translation defaults. No dependency, database schema,
production credential, or production model configuration was changed.

## Automated checks

| Check | Result |
| --- | --- |
| `npm audit --omit=dev` | 31 existing advisories: 25 moderate, 5 high, 1 critical; no dependency changes or automatic fixes. |
| Full Vitest suite | 135 files passed; 960 tests passed, 1 skipped. |
| `npx tsc --noEmit` | Passed. |
| `npm run lint` | Passed; existing stale Browserslist-data warning. |
| `npm run build` | Passed with local file storage and dummy local auth-service settings. |
| `npm run check:legacy-bundles` | Passed; 48 chunks scanned. |
| `npm run smoke:legacy` | Passed; modern Chromium hydration check, not an iOS engine test. |

New coverage checks every offered model on both single and batch REST paths,
all 16 former LOTTO presets, zero-valued sampling, model/provider mismatches,
hidden-high isolation, selected-model metadata lookup, sanitized failures,
no billed Save, truncated responses, terminal queue stop, and preserved row
metadata. Dialog coverage traverses all six steps with a legacy model, custom
reference prices, blank replacement key, and zero parameters.
Storage coverage exercises a real temporary file round trip and the Neon
adapter's mocked SQL boundary; it does not claim a live Neon transaction.

The smoke script reported resource 404s and no `<main>` during initial Home
onboarding. A separate Computer-driven built-page check advanced Language →
Announcement → ticket entry → **I'm just looking**, displayed Home correctly,
and showed no captured browser errors. These observations are not a substitute
for authenticated preview checks with the deployed services.

## Live free model access

All **12/12** selected-model checks passed through LOTTO's actual local
`/api/ai-config/validate` route with the supplied temporary keys. Only metadata
GETs were sent to providers; no generation occurred. Keys were supplied in
request bodies/headers, never URL parameters, source files, or this report.

| Provider | Model | Result | Local route latency |
| --- | --- | --- | --- |
| Google | `gemini-3.5-flash-lite` | Visible | 192 ms |
| Google | `gemini-3.6-flash` | Visible | 116 ms |
| Google | `gemini-3.8-flash` | Visible | 133 ms |
| Google | `gemini-3.1-pro-preview` | Visible | 119 ms |
| OpenAI | `gpt-5.6-luna` | Visible | 712 ms |
| OpenAI | `gpt-5.6-terra` | Visible | 544 ms |
| OpenAI | `gpt-5.6-sol` | Visible | 312 ms |
| OpenAI | `gpt-6-astra` | Visible | 481 ms |
| Anthropic | `claude-sonnet-5` | Visible | 383 ms |
| Anthropic | `claude-opus-5` | Visible | 264 ms |
| Anthropic | `claude-fable-5-1` | Visible | 238 ms |
| Anthropic | `claude-haiku-4-5-20251001` | Visible | 193 ms |

The [sanitized responses](validation/ai-config-rc4/model-access.json) explicitly
say that generation access and available credit were not tested. Metadata
visibility does not establish either. The separately requested one-time test
budget remains pending; billed generation checks have not started.

## Official-source recheck

The offered OpenAI IDs, base text prices, and Chat Completions support agree
with the current [model comparison](https://developers.openai.com/api/docs/models/compare)
and [Luna model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna).
Anthropic's offered lineup and base prices agree with its
[model overview](https://platform.claude.com/docs/en/models/overview).
Google's copied base rates agree with its
[pricing page](https://ai.google.dev/gemini-api/docs/pricing); Flash 3.6/3.8 rates
are introductory through December 31, 2026. The new default's limits agree
with the [Flash Lite model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).
These are reference-price checks, not account-specific billing verification.

## Computer and iOS 15 evidence

- Desktop local Admin: added an inactive configuration using a fake key;
  traversed all six steps, checked offered Google choices and lifecycle notices,
  saved, reopened, edited its reference price, and saved with the replacement
  key blank. Local storage retained the encrypted key and changed rate.
  Original local configurations were restored after verifying that every
  pre-existing record was unchanged. All other backed-up local JSON files were
  unchanged. Light, dark, and high-visibility AI lists were inspected; the
  light/dark Help pair was refreshed through Computer at the existing 1280×900
  capture viewport. The existing manifest generator rebuilt image geometry.
- iPad mini 4 Simulator, **iOS 15.4** runtime: development Admin displayed the
  green **Persistence confirmed** card, proving hydration completed.
- The same Simulator loaded the **production-built** login page. Keyboard
  navigation switched Magic Link → Verification Code, typed a dummy email,
  and switched back. No login email was submitted. See
  [the on-screen capture](validation/ai-config-rc4/ipad-ios15-built-login.png).
  The final local rc.4 build (including the wizard-height correction) repeated
  this check and the capture shows its rc.4 version label. The final bundle
  scan and automated smoke also passed again.
- Desktop responsive checks at 768×600 exposed a clipped wizard title. A
  viewport cap now keeps the dialog at y=14…586 while preserving its ordinary
  480px content height on taller screens. The legacy model remained selectable
  alongside current replacements. Model Pricing was checked at 390×844, then
  the unsaved replacement was cancelled. See the
  [landscape wizard](validation/ai-config-rc4/desktop-landscape-wizard.png) and
  [phone pricing](validation/ai-config-rc4/desktop-phone-pricing.png) captures.
  These are desktop layout checks, not old-WebKit compatibility evidence.
- Computer pointer operations into the Simulator fail with `noWindowsAvailable`;
  host-menu actions and device keyboard input work. Full touch/wizard acceptance,
  portrait/landscape, and physical iPad testing remain incomplete.

## Remaining release gates

The currently authenticated Vercel CLI lists only Matthew Geiger's personal
projects (`wthlotto`, `stjohns-food-share`, `nettie-spinner`). The documented
isolated `wth_apps/lotto-beta` scope is not accessible. Access to the staging
account/project has been requested; a production-connected preview is not an
acceptable substitute for isolated tests.

1. Agree the one-time live-test budget and run a minimal structured generation
   for each offered model, representative 100-row batches per provider, and
   Latin/CJK/RTL, placeholder, Markdown, Icelandic and coverage fixtures.
2. Complete configuration persistence/recovery acceptance against isolated
   Neon, authenticated preview Admin, device layouts/themes, and real iPadOS 15
   sign-in. No production auth bypass is permitted.
3. Review the refreshed Help pair with the final candidate and complete any
   remaining wizard/device captures.
4. Finish release documentation; build and validate the exact release
   commit on an isolated preview through `dev`.
5. Preserve rollback artifacts, publish the annotated rc.4 tag and GitHub
   prerelease, then promote and verify production only after these gates pass.

The stable-v2 realtime acceptance program remains separate. Temporary test
keys must never replace production credentials during this work.
