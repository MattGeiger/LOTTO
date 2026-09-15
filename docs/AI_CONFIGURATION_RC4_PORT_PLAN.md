# AI Configuration: FEED catalogue port for LOTTO v2.0.0-rc.4

**Status:** Approved September 14, 2026; implemented locally, release validation in progress.
**Reviewed/revised:** September 14, 2026.
**Candidate version:** `2.0.0-rc.4`; not released. Production remains rc.3.
**Approach:** WITHIN LOTTO's simplified FEED-derived UI, REST adapters, and
file/Neon stores. The user's confirmed design intent governs which FEED
features belong in LOTTO.

## 1. Scope and design intent

Refresh LOTTO's model catalogue from FEED 1.8.0 and port the supporting model
compatibility logic into the existing experience. Keep LOTTO's six-step setup,
configuration list, actions, and familiar FEED-derived components and icons.
Copy relevant source modules and component changes; adapt their boundaries to
LOTTO instead of rebuilding the feature or importing the entire FEED suite.

**LOTTO intentionally has no built-in AI usage or spending tracking.** Its
limited localization and inventory-display use does not warrant FEED's
accounting system. Staff check actual usage and charges in their provider's API
portal. Catalogue input/output token prices remain useful reference information.
This is a standing product distinction, not deferred work or a parity gap.

The earlier plan overreached by treating absent FEED controls and dormant
schema fields as requirements. This revision removes that expansion:

- No usage ledger, billed-failure accounting, spending history, dashboards,
  daily/monthly budgets, reservations, or cost enforcement.
- No Cost Limits, Provider Allowances, or Thinking Level wizard steps.
- No new bulk activation, type filters, alert centre, or monitoring workflows
  solely to reproduce FEED's more extensive interface.
- No billed verification on ordinary Save or activation, and no new mandatory
  provider preflight on every translation batch.

Existing translation-row token/cost metadata remains untouched in purpose and
scope, as required by the batching guardrails. It is not an account ledger and
must not be presented as total provider spending. Dormant `usage_records` and
limit columns do not establish a feature requirement; leave them unused. This
port neither activates them nor removes historical fields or metadata.

The user approved this reduced scope and supplied temporary provider keys on
September 14. Implementation is authorized. Release and production promotion
remain conditional on the validation gates below. See
[rc.4 validation](AI_CONFIGURATION_RC4_VALIDATION.md) for measured results.

## 2. Reviewed sources

| Repository | Inspected baseline |
| --- | --- |
| LOTTO | `main`, `6134c0aa0ea73649e0ff379e86ec0ef2f0139cd5`; package rc.3 plus subsequent fixes. |
| FEED | `main`, `8dda88c55076ea9543bc06dc8cc30e66c9e25716`; latest changelog release 1.8.0. |
| Pinned copy source | FEED `v1.8.0`, `b53e2e5c587a1df3a5bf6a20dd4f4f37f860d507`; no package-source diff from inspected HEAD. |

Reviewed FEED's changelog from **1.7.5 through 1.8.0**, including the three
1.8.0 beta releases. Applicable improvements are the refreshed model inventory,
lifecycle and availability metadata, pricing, capability-driven provider
requests, model-specific access checks, and clearer provider errors. FEED also
added accounting, limits, billed verification, and broader controls suited to
its own workload; those do not become LOTTO requirements.

Primary sources in `../williamtemple-feed`:

- `CHANGELOG.md` and `docs/ai-config/model-catalogue-refresh-2026-09.md`
- `docs/ai-config/phase5-validation-2026-09-14.md`
- `packages/backend/src/services/ai/catalogue.ts`
- `packages/backend/src/services/ai/provider-access.ts` and `provider-failure.ts`
- `packages/backend/src/services/ai/providers/*TranslationService.ts`
- `packages/frontend/src/components/ai-configuration/`

FEED's source and validation report are evidence for the port, not proof that
LOTTO's REST implementation or every account can use these models. No provider
generation was performed during planning. Verify model availability, reference
prices, and REST compatibility again during implementation and release testing.

The required `npm audit --omit=dev` reports **31 vulnerabilities: 25 moderate,
5 high, 1 critical**. No automatic fix was run. The port needs no provider SDK
or framework upgrade. Any separately accepted dependency fix must follow
AGENTS' client-bundle and real-device validation rules; keep `next-auth` pinned.

## 3. Preserve, refresh, or deliberately omit

| Area | LOTTO intent and proposed treatment |
| --- | --- |
| Model choices | Replace the 16 older presets with the released FEED catalogue, adapted to LOTTO. Keep the existing preset selector and Custom entry pattern. |
| Six-step wizard | Preserve structure, order, scroll/footer behavior, animations, and existing controls. Do not replace it with FEED's nine-step wizard. |
| Pricing | Refresh input/output rates and units from the catalogue. Preserve editable reference rates and saved overrides. Recommend clearer “Model Pricing” copy in the existing step. |
| Token limits | Preserve model capability information and LOTTO's separate adaptive request budget: 8,192 default, 16,384 application maximum. |
| Parameters | Make existing supported controls effective; hide or disable unsupported ones with a concise explanation. Keep model-specific reasoning decisions internal. |
| Validation | Retain the explicit Test action. Extend its free credential check to inspect the selected model where supported; report precisely what was checked. |
| Save/edit | Keep normal local validation and persistence. Preserve encrypted keys on blank edits. Saving does not automatically generate a billed response. |
| Older models | Keep saved models identifiable and editable with concise lifecycle/replacement guidance. Exclude withdrawn presets from new choices without changing active configurations automatically. |
| Configuration list | Retain the existing table and actions. Add only model status information needed to explain a saved unavailable/withdrawn model. |
| Provider errors | Reuse FEED error classification where it improves existing Test/translation messages. Keep LOTTO's recovery workflow and Sonner feedback. |
| Spending/allowances | Intentionally absent. Use provider portals; do not activate dormant schema or import FEED accounting services. |
| Other Translation surfaces | Preserve Language Settings, System Prompts, Translation Management, and current content categories. Catalogue integration does not authorize their redesign. |

## 4. Concrete source-to-destination port

FEED paths below are repository-relative; destinations are relative to LOTTO.
Preserve source license headers and record the copied tag. Prefer small
source-derived changes inside LOTTO's current boundaries.

| Copy or reuse from FEED | LOTTO adaptation |
| --- | --- |
| `packages/backend/src/services/ai/catalogue.ts` | Port data, types, lifecycle lookup, pricing, and pure capability helpers to `src/lib/ai/catalogue.ts`. Adapt language imports and omit Azure-specific endpoint concerns. |
| Catalogue consumer mappings | Adapt `src/lib/ai/model-specs.ts` as a thin compatibility layer, removing duplicated data. Share the non-secret catalogue module between server logic and existing UI consumers. A new endpoint, fetch hook, or polling mechanism is not required merely to serve static metadata. |
| Relevant `ServiceStep`, `CostStep`, `TokenLimitsStep`, and `ParametersStep` changes under FEED's `components/ai-configuration/steps/` | Apply to matching modules under `src/components/translation/ai-config/steps/`. Keep LOTTO's six steps, selector behavior, and output-budget field. |
| `model-notices.ts` and relevant notice rendering | Reuse concise lifecycle/replacement notices in the existing Service step and list. Do not copy the whole list or add FEED-only actions. |
| Provider capability/request logic under `packages/backend/src/services/ai/providers/` | Adapt pure decisions into `src/lib/ai/translate.ts` and shared request helpers for single and batch translation. Retain REST transport. |
| Pure model-access and error helpers | Adapt to `src/lib/ai/validate.ts`, `/api/ai-config/validate`, and REST error handling. Keep existing routes and Test entry points. |
| Relevant catalogue, request-shape, model-access, and component tests | Port cases into LOTTO's root `tests/`, mocking its fetch/store boundaries. Exclude FEED accounting/limits tests. |

Do not import FEED's provider SDK classes, Express/Prisma infrastructure,
token/limits services, full Add/Edit suite, or extra wizard steps. A framework,
database, or shared-package migration is not part of this refresh.

### Proposed catalogue snapshot

The inspected FEED release contains **27 resolvable entries, 12 offered**:

| Provider | Offered model IDs in that release |
| --- | --- |
| OpenAI | `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`, `gpt-6-astra` |
| Anthropic | `claude-sonnet-5`, `claude-opus-5`, `claude-fable-5-1`, `claude-haiku-4-5-20251001` |
| Google | `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.8-flash`, `gemini-3.1-pro-preview` |

Recommend matching FEED's **Google / Gemini 3.5 Flash Lite** default for newly
added configurations, subject to validation. Preserve existing active models.
Resolve both FEED's historical records and every preset previously offered by
LOTTO; retain a compatibility entry if the source catalogue lacks one. Keep
unknown Custom IDs editable with conservative capability handling.

LOTTO has 60 language names, including Icelandic absent from FEED's 59-name
list. Preserve LOTTO's catalogue and aliases. Do not turn inherited FEED
Tagalog/Somali exclusions or missing coverage evidence into new blocking rules
without verification. No language-management expansion is proposed.

## 5. User experience and runtime details

### Same six steps

1. Service Configuration
2. API Credentials
3. Model Pricing — proposed copy clarification of the current “Cost Tracking” step
4. Token Limits
5. AI Parameters
6. Configuration Details

The pricing step continues to show input/output rates and per-1K/per-1M units.
Explain briefly that these are reference prices and actual usage/billing is
available in the provider's API portal. Do not show running totals or imply
LOTTO reconciles provider invoices. Update the matching Help copy when this
wording change is implemented.

### Provider compatibility without more controls

- Port FEED's model capability decisions for output-token field selection,
  supported sampling, and provider-specific reasoning/thinking requirements.
  Use conservative translation defaults internally; do not expose FEED's
  advanced reasoning controls in LOTTO.
- LOTTO currently persists a hidden `thinkingLevel: high` that its engine
  ignores. Do not start honoring that dormant value during the port. Preserve
  existing records without a bulk rewrite; use the documented internal model
  profile for requests and stop inserting misleading hidden defaults in new
  records. Test this explicitly to avoid an accidental latency/cost change.
- Carry existing visible `topP` and temperature choices through the effective
  model configuration where supported. Reflect FEED's constraints in
  the existing Parameters step and enforce them server-side. Preserve zero
  values with nullish defaults.
- Share single/batch request construction. Check serialized REST bodies,
  including Google field names, Anthropic sampling restrictions, and OpenAI
  token/reasoning fields. FEED SDK objects are not necessarily REST payloads.
- Preserve the 100-row compatible-batch boundary, exact stable-ID response
  validation, one bulk translation write, and 8,192/16,384 request budgets.
  Keep timeouts and the one allowed validation split bounded for serverless
  execution; authentication, quota, HTTP, and network failures must not split.
- Preserve model selection order, prompts, language readiness, and current
  localization consumers, including Announcements and public-brand text.
  No automatic provider failover or new AI workload is proposed.

### Test, Save, and errors

Extend the current free Test request to include the chosen model (from the
candidate form or stored configuration). Use FEED's model-specific access
logic where supported. Success copy should say credentials and model visibility
were checked; this does not prove generation entitlement or available credit.
Unsupported/inconclusive access checks must say so.

Keep ordinary Save/activation free of generation calls and preserve the CRUD
workflow. A billed in-app translation probe would be a separate product choice,
not an assumed dependency of this refresh. Actual generation will be exercised
during the agreed local/staging validation phase.

Adapt FEED's actionable auth/model, quota, temporary-busy, and unavailable
messages into existing LOTTO feedback. Sanitize provider details and never
return keys or key-bearing URLs. Preserve edits on failure and stored keys on
blank edits. Keep deactivation and deletion possible when a provider fails.
Verify bounded job recovery does not repeatedly submit requests after a
terminal provider failure; make only the necessary correction if it does.

## 6. Compatibility and persistence

No new database tables, usage writes, or production data migration are expected.
Keep existing configuration IDs, encrypted keys/salts, names, active order,
saved price overrides, and translations. Catalogue loading must not overwrite
an edited form or silently replace an existing model or rate.

Resolve withdrawn models consistently in edit surfaces using the complete
catalogue, not only its offered subset. Staff can see the saved model and
intentionally select a replacement. Unknown models stay recoverable through
Custom. Reject provider/model mismatches without preventing deletion or
deactivation of old records.

Test both stores with rc.3-shaped records. If a schema or stored-data change
proves necessary, document its exact purpose and compatibility impact for
discussion before expanding scope. Dormant FEED fields alone do not justify it.

## 7. Implementation sequence after approval

| Phase | Work and exit condition |
| --- | --- |
| A — Baseline | Re-read AGENTS and relevant installed Next.js guides, run audit, refresh Git state, and reconcile `dev` with current main without losing post-rc.3 fixes. Work on `codex/ai-configuration-rc4` and stage through `dev`. |
| B — Catalogue | Copy the pinned FEED module, adapt existing selector/metadata consumers, retain legacy resolution, and test prices, units, defaults, and capabilities. |
| C — Runtime | Port the request compatibility and selected-model Test/error logic needed for the refreshed catalogue. Verify visible settings, internal defaults, keys, and bounded batch behavior. |
| D — UI | Apply relevant source changes inside the existing six-step wizard/list; add concise lifecycle notices and agreed pricing copy. Update staff Help alongside behavior. |
| E — Validation | Run automated checks and Computer-driven desktop/legacy testing, then bounded live provider tests with supplied test keys. Record evidence and unresolved cases. |
| F — Release | Validate an isolated preview through `dev`, complete documentation/version metadata, tag GitHub rc.4 as a prerelease, and promote only after validation gates pass. |

## 8. Testing and acceptance

Automated coverage should prove:

- One authoritative catalogue; correct prices/units; offered vs historical
  choices; Custom and all older LOTTO presets remain understandable.
- Six-step navigation, icons, footer/scroll behavior, list actions, saved edits,
  unsupported controls, and zero values behave correctly.
- Single and batch requests use the selected model, supported visible
  parameters, bounded output, and internal reasoning defaults. Dormant hidden
  `high` values never become active accidentally.
- Test checks the selected model and describes its limitations; Save, opening
  dialogs, and catalogue reads generate no billed requests.
- Blank key edits preserve encryption; responses/errors reveal no keys;
  authentication and old-record file/Neon round trips remain correct.
- 100 compatible rows use one generation and one bulk translation write;
  invalid structured output splits at most once; other provider failures do
  not recurse. Existing row metadata is preserved without new accounting writes.
- Language readiness, Find Missing/retry, System Prompts, inventory,
  announcements, and public-brand translations continue to work.

Extend relevant tests such as `api-ai-config`, `ai-validate`,
`ai-translate-batch`, `ai-output-budget`, `translation-engine-batch`,
`translations-store-db-batch`, and `run-translation`. Run the full Vitest suite,
lint, typecheck, production build, `check:legacy-bundles`, and `smoke:legacy`.
Follow AGENTS' isolation/full-suite rerun rule for suspected flakes.

### Computer and legacy devices

Use the requested Computer capability for Mac browser and Xcode Simulator
interaction during Task 7. Read the callable UI tool documentation then; shell
test results do not replace on-screen checks. The earlier inventory found iOS
15.4 and LOTTO iPad mini 4/iPhone 7 Plus simulators installed; refresh their
state before testing.

Test development and built behavior on the **iOS 15.4 runtime**: portrait and
landscape, dropdowns, keys, sliders, navigation, notices, themes, and touch/
keyboard access. Preserve the development WebSocket shim and manually refresh
on this runtime. Confirm hydration on screen. A modern simulator can validate
layout but cannot validate the iOS 15 engine floor.

Current `src/proxy.ts` permits local non-Vercel development Admin access; built
authenticated Admin acceptance belongs on an isolated preview with real auth.
Never enable production auth bypass. Include physical iPadOS 15.8 sign-in and
Admin acceptance before promotion, with user assistance if necessary. After
production builds, stop the exact server PID and remove the generated `.next`
tree before returning to dev, as AGENTS requires.

### Live validation

Before billed tests, obtain separately supplied test keys and agree a small
one-time test budget. This is a development test constraint, not an in-product
tracking feature. Use a finite matrix and provider portals to review actual
usage; do not build an accounting subsystem for the test harness.

Exercise every offered model with a minimal structured translation, plus a
representative 100-row batch per provider and Latin/CJK/RTL, placeholder, and
Markdown cases. Check Icelandic and inherited coverage assumptions. Use fixtures
for quota/overload cases rather than manufacturing expensive live failures.
Record model/endpoint, sanitized settings, outcome, and latency in a validation
report. Models lacking entitlement or credits remain explicitly unvalidated;
resolve those cases before claiming full coverage.

## 9. Documentation, release, and rollback

Update the parity document, Feature 3 roadmap,
`docs/user-guides/11-ai-translation.md`, changelog, release notes/runbook, and
affected Help screenshots with the implementation. Describe reference pricing
and provider-portal usage checking, without advertising cost tracking or extra
FEED steps. Keep unrelated stable-v2 realtime acceptance gates separate.

After implementation approval and successful validation:

1. Confirm staging isolation from production data/secrets and validate the
   preview built from the exact candidate commit through `dev`.
2. Set package/lock/release metadata to `2.0.0-rc.4`, finish documentation, and
   validate the final release build. Preserve a known-good deployment and
   configuration/database backup.
3. Refresh remote tags, then publish the annotated `v2.0.0-rc.4` tag and GitHub
   **prerelease** for that commit.
4. Promote the validated build only after testing gates pass. Verify release
   identity, authentication, AI configuration, public surfaces, and queue/
   realtime behavior. Any billed production smoke must be explicitly agreed;
   never silently swap production keys/models for test credentials.
5. If verification fails, restore the prior deployment and any deliberately
   changed test configuration, then verify normal operation. An AI rollback
   must not reset production queue/history or delete real translations.

## 10. Approved decisions

The approved scope is FEED catalogue and necessary runtime
support inside LOTTO's simplified experience. No cost-tracking decision remains
open; it is excluded by the user's confirmed design intent.

The approved visible choices are **Model Pricing** wording and the
**Gemini 3.5 Flash Lite** default for new configurations. **Test key and model**
performs a free selected-model visibility check with explicit limitations.
Temporary keys have been supplied; agreement on a one-time billed test budget
is pending. No production release is implied by local implementation passing.
