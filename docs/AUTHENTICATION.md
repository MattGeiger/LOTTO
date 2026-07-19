# Authentication

## Supported Methods

- One-Time Passcode (OTP) (email-based)
- Magic Link (email-based)

## Local Development Behavior

- On localhost development (`npm run dev`), authentication is bypassed automatically.
- OTP and Magic Link flows are required in production deployments.

## Staff Email Authorization

Every production deployment must configure one server-side staff-email policy:

1. `ADMIN_EMAIL_ALLOWLIST` — comma-separated complete addresses. When present,
   this is authoritative and `ADMIN_EMAIL_DOMAIN` is ignored.
2. `ADMIN_EMAIL_DOMAIN` — domain-wide fallback when no exact allowlist exists.

If neither is configured, production fails closed. Local development remains
available because localhost uses the documented authentication bypass.

Examples:

```text
# Exact-address policy for an agency temporarily using Gmail
ADMIN_EMAIL_ALLOWLIST=director@gmail.com,operations@gmail.com

# Domain policy for an agency with managed organizational email
ADMIN_EMAIL_DOMAIN=williamtemple.org
```

Do not set `ADMIN_EMAIL_DOMAIN=gmail.com`; that would authorize every Gmail
address. The shared policy gates OTP issuance, OTP verification, and Magic Link
sign-in so one method cannot bypass another.

## William Temple House IT Limitation

- Magic links are currently not viable. CCSI uses Microsoft Defender, which screens all links
  contained in an email body. This inspection protocol is automatic and burns the single-use token
  embedded in the Magic Link.
- Microsoft Defender preemptively clicks and invalidates the link tokens.
- Disabling Defender is not acceptable from a cybersecurity standpoint.

## Recommended And Supported Method

➡️ One-Time Passcode (OTP)

## OTP Flow

1. User enters an address allowed by that deployment's staff-email policy.
2. A 6-digit numeric code is emailed.
3. User copies and pastes the code into the app.
4. A secure authentication cookie is stored in the browser.

Users do not need to repeat this process each time.

## Maintenance Notes

- St. Johns may launch with an exact Gmail allowlist and migrate later to
  individual `@stjohnsfoodshare.org` addresses without changing application
  code.
- Prefer individual staff addresses over one shared mailbox for clearer
  offboarding and accountability.
