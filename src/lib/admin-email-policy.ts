// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

type AdminEmailPolicyEnv = {
  readonly ADMIN_EMAIL_ALLOWLIST?: string;
  readonly ADMIN_EMAIL_DOMAIN?: string;
  readonly NODE_ENV?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Printable ASCII only. An operator-managed admin allowlist has no legitimate
// need for internationalized addresses, and excluding non-ASCII removes the
// entire Unicode-confusable class rather than blocklisting known homoglyphs.
const ASCII_ONLY = /^[\x20-\x7E]+$/;
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export type AdminEmailPolicy =
  | {
      mode: "restricted";
      allowedEmails: ReadonlySet<string>;
      allowedDomain: string | null;
    }
  | { mode: "development-open" }
  | { mode: "production-closed" };

// Normalize *before* validating. Unicode confusables such as U+FF20 FULLWIDTH
// COMMERCIAL AT collapse to plain ASCII under NFKC, so an address that looks
// structurally single-"@" while raw can gain a second one afterwards. The
// upstream Auth.js flaw (GHSA-7rqj-j65f-68wh) was exactly this ordering bug:
// it validated first and normalized second, letting a homoglyph change which
// domain an address actually belongs to after the check had already passed.
const normalizeEmail = (email: string) => email.normalize("NFKC").trim().toLowerCase();

export function getAdminEmailPolicy(env: AdminEmailPolicyEnv = process.env): AdminEmailPolicy {
  const allowlistValue = env.ADMIN_EMAIL_ALLOWLIST?.trim();
  let allowedEmails: string[] = [];
  if (allowlistValue) {
    allowedEmails = allowlistValue
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean);

    if (allowedEmails.length === 0 || allowedEmails.some((email) => !EMAIL_PATTERN.test(email))) {
      throw new Error(
        "ADMIN_EMAIL_ALLOWLIST must be a comma-separated list of complete email addresses.",
      );
    }
  }

  const domainValue = env.ADMIN_EMAIL_DOMAIN?.trim().toLowerCase().replace(/^@/, "");
  if (domainValue) {
    if (!DOMAIN_PATTERN.test(domainValue)) {
      throw new Error("ADMIN_EMAIL_DOMAIN must be a valid domain name without an email address.");
    }
  }

  if (allowedEmails.length > 0 || domainValue) {
    return {
      mode: "restricted",
      allowedEmails: new Set(allowedEmails),
      allowedDomain: domainValue || null,
    };
  }

  return env.NODE_ENV === "production"
    ? { mode: "production-closed" }
    : { mode: "development-open" };
}

export function isAdminEmailAllowed(
  email: string,
  env: AdminEmailPolicyEnv = process.env,
): boolean {
  // Screen for non-ASCII on the RAW address, before any normalization.
  // Running this check post-NFKC would be useless against precisely the
  // confusables it exists to stop: U+FF20 has already become a plain "@" by
  // then and would sail straight through. Rejecting here also keeps LOTTO's
  // authorization decision aligned with the literal string Auth.js will
  // deliver the magic link to — a divergence between those two is the bypass.
  if (!ASCII_ONLY.test(email.trim())) return false;

  // NFKC below is then defense in depth rather than the primary control:
  // it is identity on ASCII, but keeps validate-after-normalize correct if
  // the ASCII screen is ever relaxed for internationalized addresses.
  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalizedEmail)) return false;

  const policy = getAdminEmailPolicy(env);
  switch (policy.mode) {
    case "restricted":
      return (
        policy.allowedEmails.has(normalizedEmail) ||
        (policy.allowedDomain !== null && normalizedEmail.endsWith(`@${policy.allowedDomain}`))
      );
    case "development-open":
      return true;
    case "production-closed":
      return false;
  }
}
