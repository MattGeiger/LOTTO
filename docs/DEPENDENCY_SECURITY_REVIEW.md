# Dependency security review — October 9, 2026

## Scope and release status

This review covers the installed production dependency graph of the local
`dev` working tree, prepared as `2.0.0-rc.12` for WTH production testing.
Existing RC/game, operating-hours and documentation work is preserved.
The owner explicitly replaced preview validation with live production testing
because WTH has no configured preview build. Real-iPad sign-in and announcement
editing were completed by the owner after deployment, with no issues reported;
stable v2.0 is not released by this update.
Release-specific configuration publication is required, but saved hours,
announcements, queue, branding and other agency deployments are preserved.

The session-start `npm audit --omit=dev` reports **36 affected packages**:
26 moderate, nine high and one critical. These are package counts, not 36
independent exploits: Tiptap extensions and Auth.js inherit findings from
their dependencies. The complete original report contains 26 individual
advisories across eight families: Next.js, Tiptap core, Nodemailer, sharp,
Undici, ProseMirror view, markdown-it and source-map-js.

## Implementation plan and decisions

1. Trace each finding through LOTTO's imports, options and production guards.
2. Apply compatible server lockfile fixes: sharp `0.35.4 → 0.35.5` and
   Blob's Undici `6.28.0 → 6.29.0`, without adding a direct Undici dependency
   or changing Blob's version. Keep sharp's existing compatible declaration
   `^0.35.4`; the committed lockfile resolves `0.35.5`. Preserve the exact
   NextAuth beta pin.
3. Compare all built client chunk filenames and SHA-256 hashes using the same
   source and isolated build directory. Investigate any differences before
   calling the change server-only. Run real image-processing and email-boundary
   tests, TypeScript, lint and production checks.
4. Prepare an isolated validation candidate with the smallest available
   patched Next.js line (`16.3.8`) and a consistent Tiptap cohort at `3.31.4`.
   Do not replace LOTTO's Markdown pipeline or upgrade React/Auth.js as a side
   effect. Inspect the complete lockfile change and refreshed audit.
5. Run built legacy scan and smoke before deployment. The owner authorized
   WTH production testing in place of the normal `dev` preview step. Confirm
   sign-in and announcement editing on the real iPad at the iPadOS 15 floor;
   a modern simulator/desktop pass does not satisfy this acceptance gate.
6. Record the remaining Nodemailer exception and its production boundary.
   Do not force an unsupported Auth.js peer override or migrate authentication
   as incidental dependency maintenance.

The local server fixes reduce the audit to **34 packages**: 26 moderate,
seven high and one critical. The completed browser candidate reduces this to
**four high affected packages**, with zero moderate or critical findings.
All four inherit the remaining Nodemailer findings. Production rollout and
physical-device acceptance are recorded separately below.

## Exposure assessment

| Family | Evidence in LOTTO | Decision |
| --- | --- | --- |
| sharp / librsvg | `src/lib/brand-config/assets.ts` uses sharp to measure/render uploaded SVGs and generate icons. The upload POST is staff-gated by `src/proxy.ts`, accepts at most 4 MB and sanitizes SVGs. Those restrictions do not prove safety from a native decoder defect. Next's image optimizer also resolves this package. | Patch to `0.35.5`; do not disable legitimate SVG branding. Validate PNG/SVG/icon processing. Linux binary/runtime conditions are not verified by a macOS test. |
| Undici | The production copy is a dependency of `@vercel/blob@2.8.0`. LOTTO imports Blob only in the server asset store; it does not call Undici's WebSocket constructor or retry interceptor. Browser realtime uses the browser's native WebSocket. Node's built-in fetch is a separate implementation, not patched by this npm update. | Refresh within Blob's existing `^6.23.0` range to `6.29.0`. No HTTP-client replacement or direct dependency added. |
| Nodemailer / Auth.js | `src/lib/auth-email-service.ts` imports Nodemailer, but refuses to construct its SMTP transport in production, including malformed/missing Resend keys and provider failure. `src/lib/auth.ts` requires production Resend configuration, selects Resend and overrides verification delivery with LOTTO's sender. Local SMTP/MailDev remains reachable. | Retain `8.0.11` with a production-unreachability exception. Current `next-auth@5.0.0-beta.32` and `@auth/core@0.41.3` peers permit `^7.0.7 || ^8.0.5`, while all current Nodemailer findings require newer versions. No supported beta/adapter update is available from the registry on this date. Reassess when peers change or SMTP is introduced in production. |
| Tiptap core | `src/components/markdown-editor.tsx` is a browser component used by staff. It accepts Markdown strings through `tiptap-markdown`, disables HTML and bounds output to 1,800 characters. It does not accept arbitrary JSON attribute objects or configure core's built-in Markdown parser. Large input can still enter parsing before the output bound. These facts narrow the reported paths but do not establish a general exemption. | Prepare core/react/pm/starter-kit/extensions at `3.31.4`; verify actual resolutions and the existing Markdown parser tests. Keep real-iPad validation as a gate. |
| Next.js | LOTTO uses App Router, image optimization for brand logos, trusted Blob remote patterns and shared Data Cache. Several findings concern unused features or different hosting conditions; image-related production routes still warrant remediation. | Use `16.3.8`, the patch covering all nine current Next advisories. Do not choose a framework minor upgrade solely because audit suggests the latest release. |
| ProseMirror view | The staff editor can paste HTML through its normal editing workflow. Disabling stored Markdown HTML does not remove the paste-parser exposure. | Resolve `1.42.6`, above the `1.42.3` fix, with the coherent Tiptap cohort. |
| markdown-it | The staff Markdown pipeline enables linkification. Large input can reach parsing before the output limit. | Resolve `14.3.2` within existing transitive ranges; both Markdown consumers share the patched copy. |
| source-map-js | Installed via Next/PostCSS and development tools. No app path accepting untrusted indexed source maps was found; production browser source maps are not enabled. | Refresh to `1.2.2` within existing ranges; no new direct dependency. |

### Next.js findings individually

| Advisory | Required conditions and local evidence | Assessment |
| --- | --- | --- |
| [Windows RCE](https://github.com/advisories/GHSA-p293-qw3h-jr36) | Windows-hosted filesystem. Production is Vercel; local host is macOS. | Reported Windows condition is absent from the known environments. |
| [AVIF optimizer RCE](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) | Optimizing AVIF input through the native decoder. LOTTO uses `next/image`; no AVIF output setting is configured. | Default WebP output does not establish absence of AVIF input. Patch; do not infer exemption from output settings. |
| [Node ImageResponse RCE](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) | Attacker-controlled SVG content/attributes/styles passed to Node `next/og`. | No `next/og` or `ImageResponse` imports in `src`; reported application path not found. |
| [Draft Mode cache leakage](https://github.com/advisories/GHSA-3w37-wq28-93x7) | Cache Components/experimental useCache plus draft-dependent cached previews. | No Cache Components, useCache or Draft Mode configuration/imports found. `unstable_cache` alone is not this feature. |
| [Self-hosted Pages cache poisoning](https://github.com/advisories/GHSA-4jqv-mc3x-m676) | Self-hosted Pages Router SSG/ISR; provider explicitly excludes Vercel. | Known production architecture does not match. |
| [Dev MCP disclosure](https://github.com/advisories/GHSA-39w2-rjm5-chcv) | `next dev` MCP endpoint. | Local development concern; not a production endpoint. Retain patch priority for developer protection. |
| [Metadata dynamicParams bypass](https://github.com/advisories/GHSA-f87g-xv8r-7p7x) | Webpack metadata-image routes for excluded dynamic segments. | Build uses Turbopack; no matching dynamic opengraph/twitter-image routes found. |
| [Catch-all response-cache poisoning](https://github.com/advisories/GHSA-mcj8-r9mp-w47p) | Root catch-all page plus SSG/ISR. | No root catch-all page found; `/help/[slug]` is an ordinary dynamic segment. |
| [Image SSRF](https://github.com/advisories/GHSA-cjq9-62q9-8jv4) | Attacker-controlled allow-listed remote URL/DNS. Remote pattern permits `*.public.blob.vercel-storage.com`. | Provider-owned DNS narrows the scenario, but this review has not proved optimizer/DNS behavior. Patch rather than accept an unverified exemption. |

### Source advisories for the other families

- [sharp/librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w): patched
  `0.35.5`, bundled librsvg `2.63.2`; runtime-specific glibc Linux RCE concern.
- Tiptap: [attribute prototype manipulation](https://github.com/advisories/GHSA-cp6q-959q-f8rh)
  fixed in `3.30.4`; [Markdown attribute ReDoS](https://github.com/advisories/GHSA-j95f-988m-3j2f)
  fixed in `3.30.5`.
- ProseMirror: [HTML paste XSS](https://github.com/advisories/GHSA-c8x8-7fp4-3x9w),
  fixed in `1.42.3`.
- markdown-it: [linkification complexity](https://github.com/advisories/GHSA-253c-mchw-3w2r),
  fixed in `14.3.1`.
- source-map-js: [indexed source-map denial of service](https://github.com/advisories/GHSA-68fv-2mgg-jv7q),
  fixed in `1.2.2`.
- Undici: [WebSocket decompression](https://github.com/advisories/GHSA-3wwx-pv8p-q78v),
  [retry response splitting](https://github.com/advisories/GHSA-r53p-7pc4-xj5r),
  [unrequested WebSocket protocol](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5).
  Current 6.x findings are fixed from `6.28.1`.
- Nodemailer: [raw message access](https://github.com/advisories/GHSA-p6gq-j5cr-w38f),
  [legacy resolveContent access](https://github.com/advisories/GHSA-8m3c-c648-2xjj),
  [IDN allowlist bypass](https://github.com/advisories/GHSA-wmmp-3585-3rmp),
  [address-list complexity](https://github.com/advisories/GHSA-2x7j-588g-ccc2),
  [recipient comment parsing](https://github.com/advisories/GHSA-cc9r-2j5m-2m83),
  [DNS/TLS credential disclosure](https://github.com/advisories/GHSA-6vj9-mwq6-2f5v),
  [nested recipients](https://github.com/advisories/GHSA-8vvx-rff5-p5rq),
  [free-text parser complexity](https://github.com/advisories/GHSA-v53p-9fqp-m79j).
  `10.0.16` is the current registry version, outside Auth.js's peer range.

## Verification record

- Session-start and post-server-update production audits recorded locally.
- Initial server lockfile changes were confined to sharp/native dependencies
  and the production Undici copy. The final candidate also includes the
  framework/editor and Markdown/source-map resolutions described above.
  Developer-only Miniflare dependencies remain
  separate and are not included in the reported production counts.
- 39 focused tests pass, including real native logo/icon processing and ten
  email transport tests. Four new cases prove that neither OTP nor Magic Link
  falls back to SMTP after a production Resend rejection or network failure.
- TypeScript and lint pass. Lint emits the existing stale Browserslist-data
  notice; refreshing browser support data is outside this security patch.
- Baseline and server-patched production builds pass with file storage and a
  dummy loopback database address, without production credentials.
- Initial comparison changed one JS filename solely because the client imports
  `package.json` for its version and includes its complete metadata. The byte
  comparison found exactly one changed byte: sharp's declared patch version.
  Keeping the existing compatible range while updating the lockfile removes
  that metadata change. A repeated baseline reproduced all original hashes;
  the final patched build has **all 55 client files byte-identical**, including
  unchanged filenames. This proof applies to the server fixes before the
  separately tested framework/editor upgrades and RC.12 metadata change.
- Server-stage full suite: 146 files, 1,102 tests, one expected skip.
  Final browser candidate: 146 files, 1,103 tests pass. A canary revision
  assertion failed once under the full suite, passed 9/9 in isolation, and
  the unchanged full rerun passed. No assertions or global timing changed.
  Both production builds and their 49-JavaScript-chunk legacy scans pass.
- Local hydration smoke passes with expected missing-Resend/file-backend
  warnings, using modern Chromium. It does not prove production authentication
  or the iPadOS 15 engine's behavior.
- A `3.30.5` editor trial resolved optional bubble/floating-menu extensions to
  `3.31.4`, conflicting with the older cohort's exact peer requirements. The
  final candidate aligns the whole Tiptap cohort at `3.31.4`, without direct
  unused extensions, dependency overrides or forced peer acceptance.
- React, NextAuth and its adapter remain unchanged. Final peer resolution
  passes without overrides or forced acceptance. The candidate production
  audit reports four high, zero moderate and zero critical affected packages.
- Live production and owner-reported physical-iPad results are recorded below.

## Release gate

RC.12's device acceptance is owner-reported complete. The owner separately
authorized stable v2.0 on October 9; its release receipt is in `RELEASES.md`.
The release-turn production audit remains four high, zero moderate and zero
critical affected packages, with the documented SMTP/Auth.js exception retained.
A lower count is not evidence
of deployment or proof that all vulnerabilities are absent.

## WTH production receipt — October 9, 2026

- Authorized account `technology-3236`, team `wth-apps`, project `wthlotto` /
  `prj_zNP9ZGxuCuG6OhXgtyCwth1KTzdm` were verified before deployment. An isolated
  CLI authorization preserves the personal CLI account. No Git push/tag,
  ownership transfer or other-agency rollout occurred.
- RC.12 source snapshot contains 1,188 files, excluding local credentials,
  Git metadata and build trees. Manifest SHA-256:
  `2c49f29d897876b7e2bb5734a549f2e203e27825580db858c7c05271dd910066`.
  Final documentation receipts follow the deployed snapshot; application,
  dependency and in-app-note sources are the tested RC.12 candidate.
- Final-version build, 49-chunk legacy scan, TypeScript, lint and local hydration
  smoke pass. The smoke uses modern Chromium and a dummy local database, with
  expected missing-Resend/file-backend warnings; it is not real sign-in.
  The refreshed installed production audit remains four high, zero moderate
  and zero critical. Framework/editor peer resolutions have no conflicts.
- Gate-off deployment `dpl_FMVS4N3X5hurwiq6ZSEVmCDaLfQ8` reached Ready and was
  promoted. Authenticated activation accepted configuration revision 6 with
  RC.12, the correct WTH agency, valid checksum and unchanged public data.
- Gate-on deployment `dpl_Aw5EK2MXYV6JRuuVBiQgrMJg8FR8`,
  `wthlotto-8sk3hun6z-wth-apps.vercel.app`, reached Ready and was promoted to
  `williamtemple.app` at approximately **11:17 PDT**. Both hosted builds pass.
  Live Chrome verifies RC.12, working login tabs, consolidated release notes
  and the About dialog's font creator/license/modification credit.
- Anonymous catalog, Chinese pack, legacy queue request and manifest return
  HTTP 200. Catalog/pack and queue identify Cloudflare. These routing checks
  are not a SQL-counter experiment or a new compute-savings claim.
- Issue 28 live checks reject an impossible time and equal open/close times
  with field-specific HTTP 400 responses. Public saved hours/timezone remain
  unchanged. No valid operating-hours or announcement save was submitted.
- The owner was given the real iPadOS 15 checklist for fresh Magic Link and
  OTP sign-in, Admin persistence and announcement formatting. **That acceptance
  was subsequently reported complete by the owner, without reported issues.**
  This is owner-reported acceptance, not agent-observed iPad evidence.
  No email was submitted by the agent. Stable v2.0 is not released.
- Prior RC.11 is the recovery reference; rollback still needs authorization.
  Local development was restarted on port 3000; verified build trees are
  archived outside the repo. Temporary staff-session/environment exports were
  emptied. Evidence remains under `/tmp/lotto-rc12-*`.

Exclude the deployment/publication/staff diagnostics beginning around
**11:14 PDT**, subsequent device acceptance and billable idle tails from quiet
Neon comparisons. No new 48–72-hour observation was performed this turn.
