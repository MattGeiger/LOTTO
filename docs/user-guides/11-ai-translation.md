# AI-Powered Translation

LOTTO ships with eight core languages built in. Staff can turn on **AI-powered
translation** to add many more, covering the app's text and "What's in stock"
inventory names.

## Language Settings

1. Open the [Staff Dashboard](02-staff-controls.md) (`/admin`), expand
   **Advanced**, and open the **Translation** card's **Language Settings** tab.
2. Search the full language list and turn on any you need. The eight core
   languages are always on and can't be disabled.
3. A newly enabled language stays hidden from guests until its translations
   are ready — usually just a few minutes.

## AI Configuration

Before translations can run, connect at least one AI provider:

1. Open the **AI Configuration** tab and add a configuration — OpenAI,
   Anthropic, or Google.
2. Pick a model from the dropdown (cost and token limits fill in
   automatically) or choose Custom for any model ID, then paste an API key.
   Keys are encrypted and never shown again after saving.
3. Use **Test** to confirm the key works before relying on it.

## Translation Management

Once a provider is configured, the **Translation Management** tab handles the
actual translating:

- **Find Missing** scans the app's text and inventory names for anything not
  yet translated into an enabled language and queues it.
- Queued items translate automatically in the background; the table shows
  each one's status (pending / completed / failed).
- **Recover stuck** re-runs anything that's been pending too long.
- Any translation can be edited, retried, or deleted by hand if the
  AI-generated wording needs a human touch.

## What To Read Next

- Where guests choose a language: [Languages & Themes](06-languages-themes.md).
- Running the rest of the queue: [Staff Controls](02-staff-controls.md).
