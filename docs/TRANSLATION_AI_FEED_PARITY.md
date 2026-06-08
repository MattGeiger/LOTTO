# Translation AI FEED Parity

## Purpose

The Translation card's AI surfaces are intended to match the mature production
workflow in FEED as closely as LOTTO's app boundaries allow. Staff who use both
apps should encounter the same setup model, wizard structure, table behavior,
row actions, and animated icon language.

## Source Of Truth

Use FEED as the canonical implementation for these LOTTO surfaces:

- `Language Settings`
- `AI Configuration`
- `System Prompts`
- `Translation Management`

Relevant FEED frontend paths:

- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/ai-configuration/index.tsx`
- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/ai-configuration/AddAIModelDialog.tsx`
- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/ai-configuration/EditAIModelDialog.tsx`
- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/ai-configuration/AddSystemPromptDialog.tsx`
- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/ai-configuration/EditSystemPromptDialog.tsx`
- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/ai-configuration/shared/BaseAIConfigDialog.tsx`
- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/ai-configuration/shared/StepWrapper.tsx`
- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/ai-configuration/shared/stepDefinitions.ts`
- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/ai-configuration/steps/*`
- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/translation-management/*`
- `/Users/russbook/williamtemple-feed/packages/frontend/src/components/language-management/*`

## Required Porting Approach

1. Copy FEED's component structure first.
2. Port missing FEED animate-ui icons/utilities before choosing substitutes.
3. Adapt only at app boundaries: FEED services become LOTTO `fetch` calls to
   Next.js route handlers; FEED backend models map to LOTTO stores/API types.
4. Remove or rename FEED-only domain concepts only when the design difference is
   documented.
5. Keep FEED wizard ordering, dialog dimensions, scroll behavior, validation,
   step headers, icon choices, and table/action-menu behavior unless the user
   approves a deviation.

## Current Approved LOTTO Deviations

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

## Current LOTTO Implementation Map

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
- FEED slider control -> `src/components/ui/slider.tsx`

## Review Checklist

Before merging Translation AI UI changes:

- Does the LOTTO component retain the FEED component boundary and step model?
- Are substitutions documented as approved LOTTO deviations?
- Are animated icons copied from FEED where FEED has a specific icon?
- Do action menus, tables, dialogs, and scroll areas preserve FEED behavior?
- Are docs and `CHANGELOG.md` updated?
- Did `npm run lint`, targeted Vitest tests, and `npm run build` pass?
