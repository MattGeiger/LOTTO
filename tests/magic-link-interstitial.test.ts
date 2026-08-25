// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authGet, authPost } = vi.hoisted(() => ({
  authGet: vi.fn(),
  authPost: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authHandlers: {
    GET: authGet,
    POST: authPost,
  },
}));

import { GET, POST } from "@/app/api/auth/[...nextauth]/route";

describe("scanner-safe Magic Link callback", () => {
  beforeEach(() => {
    authGet.mockReset();
    authPost.mockReset();
  });

  it("redirects repeated email-scanner GETs without consuming the token", async () => {
    const request = new NextRequest(
      "https://lotto.example/api/auth/callback/resend?token=secret&email=staff%40example.org&callbackUrl=%2Fadmin",
    );

    const first = await GET(request);
    const second = await GET(request);

    expect(first.status).toBe(307);
    expect(second.status).toBe(307);
    expect(first.headers.get("location")).toBe(
      "https://lotto.example/login/confirm?provider=resend&token=secret&email=staff%40example.org&callbackUrl=%2Fadmin",
    );
    expect(authGet).not.toHaveBeenCalled();
  });

  it("delegates non-email GETs and every POST to Auth.js", async () => {
    const getResponse = NextResponse.json({ delegated: "get" });
    const postResponse = NextResponse.json({ delegated: "post" });
    authGet.mockResolvedValue(getResponse);
    authPost.mockResolvedValue(postResponse);

    const sessionRequest = new NextRequest("https://lotto.example/api/auth/session");
    expect(await GET(sessionRequest)).toBe(getResponse);
    expect(authGet).toHaveBeenCalledWith(sessionRequest);

    const callbackRequest = new NextRequest("https://lotto.example/api/auth/callback/resend", {
      method: "POST",
    });
    expect(await POST(callbackRequest)).toBe(postResponse);
    expect(authPost).toHaveBeenCalledWith(callbackRequest);
  });

  it("requires an explicit form POST and never auto-submits the confirmation page", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/app/login/confirm/page.tsx"),
      "utf8",
    );

    expect(source).toContain('<form method="post" action={callbackAction}>');
    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("requestSubmit");
    expect(source).not.toContain("location.href");
  });
});
