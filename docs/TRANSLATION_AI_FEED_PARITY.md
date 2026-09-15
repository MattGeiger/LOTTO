# Translation AI FEED Parity

## Purpose

The Translation card's AI surfaces reuse FEED's component structure and
interaction patterns within LOTTO's deliberately simpler product scope. Staff
who use both apps should recognize the setup, controls, and animated icon
language. Parity does not require every FEED feature or wizard step; the
approved LOTTO differences below govern what is included.

## Source Of Truth

**Approved rc.4 port:** [AI Configuration rc.4 port plan](AI_CONFIGURATION_RC4_PORT_PLAN.md)
pins FEED `v1.8.0` (`b53e2e5`) as the catalogue and provider-compatibility source
for LOTTO rc.4. The production implementation preserves LOTTO's
simplified experience and excludes usage/cost tracking. Release validation is
recorded in [rc.4 validation](AI_CONFIGURATION_RC4_VALIDATION.md).

Use FEED as the canonical implementation for these LOTTO surfaces:

- `Language Settings`
- `AI Configuration`
- `System Prompts`
- `Translation Management`

Relevant FEED frontend paths:

- `../williamtemple-feed/packages/frontend/src/components/ai-configuration/index.tsx`
- `../williamtemple-feed/packages/frontend/src/components/ai-configuration/AddAIModelDialog.tsx`
- `../williamtemple-feed/packages/frontend/src/components/ai-configuration/EditAIModelDialog.tsx`
- `../williamtemple-feed/packages/frontend/src/components/ai-configuration/AddSystemPromptDialog.tsx`
- `../williamtemple-feed/packages/frontend/src/components/ai-configuration/EditSystemPromptDialog.tsx`
- `../williamtemple-feed/packages/frontend/src/components/ai-configuration/shared/BaseAIConfigDialog.tsx`
- `../williamtemple-feed/packages/frontend/src/components/ai-configuration/shared/StepWrapper.tsx`
- `../williamtemple-feed/packages/frontend/src/components/ai-configuration/shared/stepDefinitions.ts`
- `../williamtemple-feed/packages/frontend/src/components/ai-configuration/steps/*`
- `../williamtemple-feed/packages/frontend/src/components/translation-management/*`
- `../williamtemple-feed/packages/frontend/src/components/language-management/*`

## Required Porting Approach

1. Reuse FEED's component structure first within the approved LOTTO scope;
   port relevant changes into existing LOTTO components.
2. Port missing FEED animate-ui icons/utilities before choosing substitutes.
3. Adapt only at app boundaries: FEED services become LOTTO `fetch` calls to
   Next.js route handlers; FEED backend models map to LOTTO stores/API types.
4. Remove or rename FEED-only domain concepts only when the design difference is
   documented.
5. Keep FEED wizard ordering, dialog dimensions, scroll behavior, validation,
   step headers, icon choices, and table/action-menu behavior unless the user
   approves a deviation.

## Current Approved LOTTO Deviations

- **Simplified AI Configuration (design intent reaffirmed 2026-09-14):**
  LOTTO keeps its existing six-step model wizard and configuration list/actions.
  FEED's additional Thinking Level, Cost Limits, Provider Allowances, and more
  extensive management controls are not missing LOTTO requirements. Catalogue
  refreshes should preserve this simplified experience.
- **Reference pricing, no usage/cost tracking:** LOTTO's limited localization
  and inventory-display use does not warrant FEED's accounting system. Staff
  check actual usage and charges in their provider's API portal. Input/output
  token prices may be shown in AI Configuration; no usage ledger, spending
  dashboard, billed-failure accounting, or budget enforcement is planned.
  Existing translation-row metadata stays intact but is not total account
  spending. Dormant schema fields do not imply planned tracking features.
  The pricing step is labelled **Model Pricing**, with provider-portal guidance.
- **Internal reasoning defaults:** LOTTO omits FEED's Thinking Level control.
  Requests use the copied capability profile's translation default. Old hidden
  `thinkingLevel: high` values remain stored but are not activated. Unsupported
  sampling is omitted, fixed temperature is shown disabled, and Claude models
  that permit only one sampling parameter use temperature.
- **Free explicit access check:** **Test key and model** looks up the selected
  model's metadata. Success confirms credentials and visibility only; it does
  not test generation access or credits. Save and activation do not generate
  billed responses. Provider failures stop staged work with recovery guidance.
- LOTTO omits FEED's `classification` system-prompt category because LOTTO has
  no document auto-format/classification workflow.
- LOTTO uses three app-specific System Prompt categories:
  **UI Translations**, **Inventory**, and **Announcements**. This replaces
  FEED's Custom Translation / food-document-classification taxonomy because
  LOTTO needs finely calibrated instructions for app localization, imported
  inventory content, and public announcement text.
- LOTTO keeps the Translation Management fixed-height scroll shell with sticky
  table headers while also using FEED-style pagination controls.
- LOTTO removes the unused Endpoint URL input from the AI key step because the
  current provider adapters call the default provider endpoints.
- On queue-only brand profiles, LOTTO omits the Inventory category from **Find
  Missing**, performs no FEED preflight fetch, and suppresses the empty-source
  warning. This is a deployment-capability boundary, not a replacement of
  FEED's Translation Management interaction pattern. Inventory remains present
  unchanged for FEED-enabled profiles.
- LOTTO ports FEED's batch-translation principle through provider-neutral REST
  adapters rather than provider SDK classes. A batch contains at most 100 rows
  sharing one target language and content type, uses stable row identifiers,
  validates the exact response set, and performs one bulk store write.
- The provider model's advertised output limit and LOTTO's operational output
  budget are separate fields. The operational default is 8,192 tokens, the
  per-request estimate scales downward with source content, and the app ceiling
  is 16,384 even when a provider advertises a larger maximum.

## Current LOTTO Implementation Map

- FEED catalogue and pure helpers -> `src/lib/ai/catalogue.ts`; old consumer
  interfaces are retained by `src/lib/ai/model-specs.ts`.
- FEED provider decisions -> `src/lib/ai/provider-parameters.ts`, shared by
  single and structured-batch REST requests in `src/lib/ai/translate.ts`.
- FEED failure classifier -> `src/lib/ai/provider-failure.ts`; model-specific
  access lookup -> `src/lib/ai/validate.ts`.
- FEED lifecycle notices -> `src/components/translation/ai-config/model-notices.ts`.
- FEED `BaseAIConfigDialog` -> `src/components/translation/ai-config/shared/BaseAIConfigDialog.tsx`
- FEED `StepWrapper` -> `src/components/translation/ai-config/shared/StepWrapper.tsx`
- FEED `stepDefinitions` -> `src/components/translation/ai-config/shared/stepDefinitions.ts`
- FEED AI model steps -> `src/components/translation/ai-config/steps/*`
- FEED system-prompt steps -> `src/components/translation/ai-config/steps/PromptCategoryStep.tsx`,
  `TabbedPromptConfigStep.tsx`, `ParametersStep.tsx`, `NameStep.tsx`
- FEED prompt icons -> `src/components/animate-ui/icons/message-square-more.tsx`,
  `src/components/animate-ui/icons/message-square-quote.tsx`,
  `src/components/animate-ui/icons/sliders-vertical.tsx`, and
  `src/components/ui/file-text.tsx`
- FEED AI model type-picker icon -> `src/components/ui/cpu.tsx`
- FEED slider control -> `src/components/ui/slider.tsx`

## Review Checklist

Before merging Translation AI UI changes:

- Does the LOTTO component retain FEED's component patterns within LOTTO's
  approved simpler scope, including its six-step model wizard?
- Are reference prices clearly distinguished from provider usage/billing,
  without adding FEED-only tracking or management features?
- Are substitutions documented as approved LOTTO deviations?
- Are animated icons copied from FEED where FEED has a specific icon?
- Do action menus, tables, dialogs, and scroll areas preserve FEED behavior?
- Are docs and `CHANGELOG.md` updated?
- Did `npm run lint`, targeted Vitest tests, and `npm run build` pass?
- Do request-count tests prove that 100 compatible rows use one provider call
  and one store write, and that non-validation failures do not retry?
