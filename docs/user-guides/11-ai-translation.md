# AI-Powered Translation

LOTTO ships with eight core languages built in. Staff can turn on **AI-powered
translation** to add many more, covering client-facing app text, the active
custom public service label, announcements, and "What's in stock" inventory
names. Sign-in and Admin Appearance copy is staff-facing and is not localized.

![The Translation card with Language Settings, AI Configuration, and Translation Management tabs](/help-screenshots/translation.webp)

## Language Settings

1. Open the [Staff Dashboard](02-staff-controls.md), expand **Advanced**, and
   open **Translation → Language Settings**.
2. Search the full language list and turn on any you need. The eight core
   languages are always on and can't be disabled.
3. Choose **Save changes** and keep LOTTO open while it finds, queues, and
   prepares every missing translation.
4. The new language stays hidden from Home, Display, and Arcade menus until its
   required translations complete. If anything fails, LOTTO keeps the language
   hidden and directs you to **Translation Management** to review and retry it.

## AI Configuration

Before translations can run, connect at least one AI provider:

![The AI Configuration tab for adding, testing, editing, and prioritizing translation providers](/help-screenshots/ai-configuration.webp)

1. Open the **AI Configuration** tab and add a configuration — OpenAI,
   Anthropic, or Google.
2. Pick a model from the dropdown (reference prices and token limits fill in
   automatically) or choose Custom for any model ID, then paste an API key.
   Keys are encrypted and never shown again after saving.
3. Complete the six setup steps: Service Configuration, API Credentials,
   Model Pricing, Token Limits, AI Parameters, and Configuration Details.
   New configurations start with Google / Gemini 3.5 Flash Lite; you can select
   another provider or model. Existing configurations keep their saved model.
4. Use the configuration's Actions menu → **Test key and model**. This free
   check confirms that the provider accepts the key and can see the selected
   model. It does not generate a translation or confirm available credit.
   Saving or activating a configuration does not run a billed test.

### Model pricing and parameters

**Model Pricing** shows reference input/output token rates, which you can edit.
LOTTO does not track spending or enforce a spending budget. Check actual usage,
charges, and credits in your provider's API portal. Rates can change, and your
account's pricing may differ from the catalog.

**AI Parameters** offers controls supported by the selected model. A fixed
temperature is shown but cannot be changed. Models that reject temperature and
top-p show an explanation instead of sliders. Some Anthropic models accept only
one of these settings; LOTTO uses temperature. Reasoning settings are handled
automatically for translation and do not add another setup step.

### Editing older configurations

Older saved models remain visible, with a notice when a model is legacy,
deprecated, retired, or in preview. Open **Edit** to review the notice and
intentionally choose a replacement; LOTTO never switches an active model for
you. A Custom model ID remains editable. Leave **New API key (optional)** blank
to keep the encrypted key already saved. Changing models fills in that model's
reference prices and token limits, so review any previous overrides before
saving. A failed access check does not prevent deactivation or deletion.

The model's **Output Token Limit** is its advertised technical capability. The
separate **Translation Output Budget Per Request** controls how much LOTTO may
ask that model to return at once. LOTTO defaults this budget to 8,192 tokens,
adapts it downward for short jobs, and never permits more than 16,384. A larger
model context window therefore does not make an ordinary translation request
needlessly large or expensive.

## Translation Management

Once a provider is configured, the **Translation Management** tab handles the
actual translating:

![Translation Management controls and the per-string translation status table](/help-screenshots/translation-management.webp)

- **Find Missing** scans client-facing app text, the active custom public
  service label, announcements, and inventory names for anything not yet
  translated into an enabled language and queues it.
- Queued items translate through staged requests while LOTTO remains open. Up
  to 100 items with the same language and content type share one structured AI
  request, and LOTTO verifies every item before saving the batch. The table
  still shows each item's status (pending / completed / failed).
- **Recover stuck** re-runs anything that's been pending too long.
- Any translation can be edited, retried, or deleted by hand if the
  AI-generated wording needs a human touch.

If a provider returns malformed structured output, LOTTO splits that batch once
to isolate the problem. Authentication, quota, network, and provider failures
are not repeatedly retried in the background; affected rows remain visible so
staff can correct the configuration or retry them deliberately.
Staged work stops when a provider reports an access, quota, or availability
failure. Follow the message, then use Translation Management to retry the
affected rows and run **Find Missing** again for work that has not completed.

## What To Read Next

- Where guests choose a language: [Languages & Themes](06-languages-themes.md).
- Running the rest of the queue: [Staff Controls](02-staff-controls.md).
