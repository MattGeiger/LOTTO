// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

type AdminEmailPolicyEnv = {
  readonly ADMIN_EMAIL_ALLOWLIST?: string;
  readonly ADMIN_EMAIL_DOMAIN?: string;
  readonly NODE_ENV?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export type AdminEmailPolicy =
  | { mode: "allowlist"; allowedEmails: ReadonlySet<string> }
  | { mode: "domain"; allowedDomain: string }
  | { mode: "development-open" }
  | { mode: "production-closed" };

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function getAdminEmailPolicy(env: AdminEmailPolicyEnv = process.env): AdminEmailPolicy {
  const allowlistValue = env.ADMIN_EMAIL_ALLOWLIST?.trim();
  if (allowlistValue) {
    const allowedEmails = allowlistValue
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean);

    if (allowedEmails.length === 0 || allowedEmails.some((email) => !EMAIL_PATTERN.test(email))) {
      throw new Error(
        "ADMIN_EMAIL_ALLOWLIST must be a comma-separated list of complete email addresses.",
      );
    }

    return { mode: "allowlist", allowedEmails: new Set(allowedEmails) };
  }

  const domainValue = env.ADMIN_EMAIL_DOMAIN?.trim().toLowerCase().replace(/^@/, "");
  if (domainValue) {
    if (!DOMAIN_PATTERN.test(domainValue)) {
      throw new Error("ADMIN_EMAIL_DOMAIN must be a valid domain name without an email address.");
    }
    return { mode: "domain", allowedDomain: domainValue };
  }

  return env.NODE_ENV === "production"
    ? { mode: "production-closed" }
    : { mode: "development-open" };
}

export function isAdminEmailAllowed(
  email: string,
  env: AdminEmailPolicyEnv = process.env,
): boolean {
  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalizedEmail)) return false;

  const policy = getAdminEmailPolicy(env);
  switch (policy.mode) {
    case "allowlist":
      return policy.allowedEmails.has(normalizedEmail);
    case "domain":
      return normalizedEmail.endsWith(`@${policy.allowedDomain}`);
    case "development-open":
      return true;
    case "production-closed":
      return false;
  }
}
