# AI Configuration rc.4 validation

**Checkpoint:** September 14, 2026. Authenticated WTH production acceptance
passed on candidate `9483871`. The rc.4 release is on
`codex/ai-configuration-rc4`, based on `6134c0a`. The GitHub prerelease's
verification attachment records the final tagged commit and Vercel deployment;
the remaining commits after acceptance contain documentation and evidence only.

## Scope and provenance

The user approved the [revised plan](AI_CONFIGURATION_RC4_PORT_PLAN.md), including
LOTTO's existing six-step wizard, reference pricing, and no built-in spending
tracking. The catalog, parameter UI, lifecycle notices, failure classifier, and
provider decisions derive from FEED `v1.8.0` at
`b53e2e5c587a1df3a5bf6a20dd4f4f37f860d507`.

LOTTO adaptations retain Next.js routes, REST requests, existing file/Neon
stores, and internal translation defaults. No dependency or database schema
changed. Existing production credentials and model configurations were preserved;
one disposable inactive configuration exercised the hosted persistence path.

## Automated checks

| Check | Result |
| --- | --- |
| `npm audit --omit=dev` | 31 existing advisories: 25 moderate, 5 high, 1 critical; no dependency changes or automatic fixes. |
| Full Vitest suite | Final follow-up: 135 files passed; 963 tests passed, 1 skipped. |
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
Automated storage coverage exercises a real temporary file round trip and the
Neon adapter's mocked SQL boundary. The authenticated production acceptance
below separately verifies the hosted Neon create/edit/delete path.

The smoke script reported resource 404s and no `<main>` during initial Home
onboarding. A separate Computer-driven built-page check advanced Language →
Announcement → ticket entry → **I'm just looking**, displayed Home correctly,
and showed no captured browser errors. Hosted service acceptance is recorded
separately below, on production as explicitly requested by the user.

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
visibility does not establish either. The user subsequently approved a $5 total
budget and chose WTH production for hosted validation instead of the beta.

## Live generation

The bounded harness called LOTTO's actual single/batch REST implementation with
synthetic content and the supplied temporary keys. Only the custom-prompt store
was replaced with an empty fixture; no translation or configuration store was
written. [Sanitized request outcomes and usage](validation/ai-config-rc4/live-generation.json)
include failed responses and full reservations for timed-out calls.

- **11/12 offered models** completed five-row structured translations. Fixtures
  covered Spanish, Japanese, Arabic, Icelandic, stable IDs, placeholders,
  Markdown links/emphasis, and the unchanged William Temple House name.
- **100-row batches passed for all three providers:** Gemini 3.5 Flash Lite,
  GPT-5.6 Luna, and Claude Sonnet 5. Each made one provider request. Separate
  single-text Icelandic checks passed on the same representative models.
- **Claude Opus 5 remains unverified for successful generation with this key.**
  It returned HTTP 200 with `stop_reason: refusal`, no content, and billed input
  usage, including for a minimal food-name fixture. The catalog remains intact;
  no account-specific refusal silently removes or replaces a saved model.
- Live testing exposed two corrections: explicit Anthropic refusals now report
  a declined translation without a validation split; Sonnet's 100-row response
  took 15.8 seconds, beyond the former 15-second timeout. Generation now allows
  30 seconds per call, while initial batches, splits, and later groups share a
  40-second invocation deadline with persistence headroom inside 60-second
  routes. Metadata checks retain their 10-second timeout.

The test-only conservative charge bound is **$1.53315 across 23 calls**, including
full timeout reservations, and remains below $5. Provider portals determine actual charges. This does not add
spending tracking to LOTTO.

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

## Hosted production acceptance

### WTH production deployment and smoke

- Deployment: `dpl_ZxgFK75y9VY95hM9x56FGeB8pA6v`, Ready, serving
  `https://williamtemple.app` from candidate `9483871`.
- The CLI uploaded a clean `git archive` of tracked candidate source. Local env
  files, test keys, local data and build outputs were not included. Vercel used
  the existing WTH production environment; no environment settings changed.
- Home, login, Display, Inventory, Arcade, Help and robots returned HTTP 200.
  Login displays rc.4; robots still allows crawling. An unauthenticated AI
  configuration POST returned 401. The deployed hydration smoke passed.
- Public state and both existing AI configuration responses remained identical
  to pre-deployment snapshots after acceptance. Saved Google 2.5 Flash Lite
  (inactive) and GPT-5 Mini (active) were not changed.
- Safari's existing staff session loads rc.4 Admin and **Persistence confirmed**.
  The iOS 15.4 iPad Simulator loads the production rc.4 login and responds to
  sign-in tab selection and email input; see the
  [production-device capture](validation/ai-config-rc4/ipad-ios15-production-login.png).
  Full authenticated legacy wizard and
  touch acceptance remain unverified.
- The authenticated in-app browser completed all six steps and created an
  inactive Google 3.5 Flash Lite configuration using the supplied temporary key.
  The saved record retained `topP: 0`, the 8,192-token application budget, and
  the selected catalog limits and prices. Editing its input price to 0.31 with
  the replacement key blank preserved access and the zero-valued parameter.
- **Test key and model** passed for the selected Google model. Changing only
  the disposable record to an unavailable custom model made the same action
  fail with the expected key/model recovery guidance. That record remained
  editable. Four metadata checks made no generation requests.
- The disposable record (id 4) was deleted through the confirmation dialog and
  disappeared from the public list. Neon uses a soft delete. The original two
  records and public state exactly matched their pre-test snapshots afterward.
- The active legacy OpenAI configuration reopened with its exact saved model
  selected, lifecycle/replacement guidance, and current OpenAI choices. Its
  edit was cancelled. A new unsaved Anthropic configuration showed all four
  current choices and was also cancelled. Captured browser warnings/errors
  were empty. See the [acceptance results](validation/ai-config-rc4/production-acceptance.json)
  and [final configuration screen](validation/ai-config-rc4/production-ai-config.png).

The user explicitly replaced beta/preview testing with WTH production testing.
The CLI and Safari both confirm the target project is `wthlotto`. Its existing
deployment `dpl_BW9YQMBw2WywY5yKUEUw8EJFqFVS` is the rollback target.
St. Johns shares the Git repository, so deployment must be scoped directly to
WTH instead of triggering both projects through `main`.

The implementation checks and hosted acceptance are complete. The release
publishes `v2.0.0-rc.4` as a GitHub prerelease and deploys its clean tracked source
directly to WTH. Its verification attachment records the exact final identities
and post-deployment checks without requiring a self-referential commit hash in
this document.

The stable-v2 realtime acceptance program remains separate. Temporary test
keys must never replace production credentials during this work.
