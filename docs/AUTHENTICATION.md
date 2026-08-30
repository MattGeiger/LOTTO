# Authentication

LOTTO v1.22.0 provides two passwordless staff sign-in methods through one
brand-aware experience:

- **Magic Link** — the default and recommended method.
- **Verification Code** — a six-digit email code and reliable fallback.

Both methods enforce the same server-side staff email policy, expire after ten
minutes, and establish the same Auth.js session. Authentication gates access to
the staff workspace; it does not divide queue data by user.

## Scanner-Safe Magic Links

Microsoft Defender and other mail-security products inspect links before
delivering a message. A conventional one-click Magic Link consumes its
single-use token during that automated GET, leaving the staff member with an
expired link.

LOTTO avoids that failure without weakening the link:

1. LOTTO emails the Auth.js callback URL.
2. Any GET of that URL redirects to `/login/confirm` and consumes nothing.
3. The confirmation page explains which address will sign in.
4. Only an explicit **Sign in** button submits a POST to the native Auth.js
   callback and consumes the token.
5. Auth.js validates the token, applies the staff email policy, and establishes
   the session.

The confirmation page must never auto-submit, redirect through an effect, or
consume a token while rendering. An email scanner can follow and render pages;
the human button press is the security boundary. Repeated GETs are intentionally
harmless.

## Verification Code Flow

1. Staff select **Verification Code** and enter an allowed work email.
2. LOTTO creates a six-digit code, stores only its SHA-256 hash, and emails it.
3. LOTTO shows code entry only after the server confirms that the request was
   accepted. Delivery or authorization failures remain on the email step.
4. Staff enter the code. LOTTO atomically consumes a matching, unexpired OTP row
   and starts the Auth.js session.
5. Five failed attempts trigger the existing five-minute cooldown.

OTP rows use `verification_token.type = 'otp'`; Auth.js Magic Link rows retain
the column default, `magic_link`. Requesting a code therefore cannot delete or
invalidate a pending Magic Link for the same address.

## Staff Email Authorization

Every production deployment must configure at least one server-side
restriction:

1. `ADMIN_EMAIL_ALLOWLIST` — comma-separated complete addresses.
2. `ADMIN_EMAIL_DOMAIN` — an optional managed domain.

When both are configured, authorization is additive: an address is accepted if
it appears in the exact allowlist **or** belongs to the managed domain. The
shared policy gates Magic Link requests/completion and Verification Code
issuance/verification.

```text
# Exact-address policy for an agency temporarily using Gmail
ADMIN_EMAIL_ALLOWLIST=director@gmail.com,operations@gmail.com

# Domain policy for an agency with managed organizational email
ADMIN_EMAIL_DOMAIN=williamtemple.org

# Combined policy for a deployment with one external administrator
ADMIN_EMAIL_ALLOWLIST=queue-manager@example.org
ADMIN_EMAIL_DOMAIN=templepdx.com
```

Do not set `ADMIN_EMAIL_DOMAIN=gmail.com`; that would authorize every Gmail
address. Production fails closed when neither policy is configured.

## Branded Authentication Email Contract

Magic Link and Verification Code emails share one React Email shell. The shell
resolves the active runtime brand at send time, including a saved Appearance
configuration, and provides:

- the agency logo plus organization/app identity as live text, including the
  Appearance configuration's transparent or dark-plate light-logo treatment;
- email-safe hexadecimal brand colors rather than CSS variables or OKLCH;
- a branded sender display name over the deployment's verified `EMAIL_FROM`;
- a message-specific preheader, plain-text alternative, expiry statement, and
  security guidance;
- useful identity even when Outlook or another client blocks remote images.

The logo supports recognition, not authentication. Domain ownership and
deliverability still depend on a verified sending domain with SPF, DKIM, and
DMARC. Templates must never include a token, link, or code in server logs.

## Local Development

- `npm run dev` on localhost uses the documented authentication bypass.
- To exercise the real flows locally, use a disposable local database and
  MailDev (`EMAIL_SERVER_HOST=maildev`, `EMAIL_SERVER_PORT=1025`,
  `EMAIL_FROM=login@localhost`), then start development with
  `VERCEL=1 AUTH_BYPASS=false npm run dev`. The `VERCEL` marker disables only
  LOTTO's automatic localhost bypass for this parity test; never point that
  test at a production database.
- The local SMTP provider deliberately keeps the provider id `resend`, so the
  login screen and scanner-safe callback use the same route in development and
  production.

## Deployment and Migration

Before deploying v1.22.0, apply the complete idempotent `schema.sql` to every
agency database. The additive migration adds the token `type` column and its
lookup index. Existing Auth.js rows become `magic_link`; no session or user
table is replaced.

After deployment, verify both methods with one allowed and one disallowed
address. For Magic Link, confirm that opening the emailed URL lands on the
confirmation page, refreshing it remains harmless, and only pressing **Sign
in** completes authentication.

## Maintenance Notes

- Keep `next-auth` pinned exactly; callback semantics are part of the scanner
  safety contract and must be re-audited before an upgrade.
- Prefer individual staff addresses over one shared mailbox for clearer
  offboarding and accountability.
- Replace temporary shared-mailbox exceptions with individual organizational
  accounts as soon as they are available.
- Architecture and release acceptance are recorded in
  [`V1.22_AUTHENTICATION_PLAN.md`](V1.22_AUTHENTICATION_PLAN.md).
