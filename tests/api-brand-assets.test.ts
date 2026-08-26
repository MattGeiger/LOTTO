// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/brand-config/assets/route";

const CLEAN_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80">
  <rect width="320" height="80" fill="#76b900"/>
</svg>`;

const uploadFile = (bytes: Uint8Array, name: string, type: string): File => {
  const file = new File([bytes as unknown as BlobPart], name, { type });
  // jsdom's File lacks the modern arrayBuffer() method used by Next route
  // handlers; attach the standards-compatible result for this focused test.
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return file;
};

const uploadRequest = (file: File): Request => {
  const form = new FormData();
  form.set("kind", "logo-light");
  form.set("file", file);
  // Route logic only consumes request.formData(). A minimal request avoids
  // jsdom/undici's incompatible multipart stream implementations hanging the
  // unit test before the route receives the form.
  return { formData: async () => form } as Request;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("brand asset upload API messages", () => {
  it("explains how to fix an unreadable image", async () => {
    const response = await POST(
      uploadRequest(
        uploadFile(new TextEncoder().encode("not an image"), "logo.svg", "image/svg+xml"),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.code).toBe("BRAND_ASSET_UNREADABLE");
    expect(body.error).toMatch(/export it as a PNG, JPEG, WebP, or plain self-contained SVG/i);
  });

  it("reports missing hosted storage without blaming the image", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "");
    vi.stubEnv("VERCEL", "1");

    const response = await POST(
      uploadRequest(
        uploadFile(new TextEncoder().encode(CLEAN_SVG), "logo.svg", "image/svg+xml"),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("BRAND_ASSET_STORAGE_UNAVAILABLE");
    expect(body.error).toMatch(/connect a public Vercel Blob store/i);
  });

  it("gives an actionable limit before Vercel rejects the request body", async () => {
    const response = await POST(
      uploadRequest(
        uploadFile(new Uint8Array(4 * 1024 * 1024 + 1), "large.png", "image/png"),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.code).toBe("BRAND_ASSET_TOO_LARGE");
    expect(body.error).toMatch(/larger than 4 MB/i);
    expect(body.error).toMatch(/export or compress/i);
  });
});
