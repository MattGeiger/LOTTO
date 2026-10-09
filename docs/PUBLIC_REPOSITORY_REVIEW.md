# Public Repository Review — October 9, 2026

## Scope and Result

Reviewed the local publishable working tree (tracked files plus nonignored new
files), locally reachable Git history and current documentation/Help screenshots.
The initial inventory contained 1,187 file paths. No hosted application,
database, credential, operating schedule or account configuration was changed.
Source ownership, licensing and intentional author/asset credits are preserved.

- Scanned current text for private keys, recognizable provider/GitHub keys,
  signed-token strings, credential-bearing database URLs, literal secret
  assignments, email addresses and personal home-directory paths.
- Scanned 4,081 historical text blobs reachable from local Git refs for key,
  token and credential-URL patterns. No oversized blobs were skipped. Matches
  were example values, local Docker credentials or test fixtures; no unexplained
  credential-pattern match was found. No Git history was rewritten.
- Locally OCR-reviewed 86 distinct current screenshot images, deduplicating
  exact copies. Detected email text was sample sign-in/contact copy; no personal
  address or key pattern was detected. Also visually inspected the production
  AI configuration receipt. No personal home-directory or textual GPS markers
  were found in the current image bytes checked.
- Reviewed the committed validation JSON: synthetic translation samples,
  provider/model test outcomes, timings and test configuration IDs remain
  reproducibility evidence, rather than secrets or client records.

This is a bounded review, not a guarantee that every possible secret format is
absent. Pattern checks do not establish credential validity. OCR can miss text,
and binary metadata-marker checks are not a complete EXIF/GPS parser. Historical
binary images, external GitHub refs/caches/forks, ignored local files and Git
author metadata were not comprehensively inspected or changed. Public release
and infrastructure IDs/hostnames are identifiers, not authentication credentials.

## Cleanup Performed

- Replaced personal machine paths with portable repo/home placeholders in
  documentation. Replace `<LOTTO_REPO>`, `<FEED_REPO>`, `<RELATED_REPO>` and
  `<HOME>` with your own paths before running those documented examples.
- Replaced operational sign-in/test addresses with role placeholders in the
  migration/publication records. The roles and verification history remain;
  exact login addresses belong in the organization's private account inventory.
- Changed example allowlists to reserved `example.org` addresses and made the
  sample Resend key an explicit placeholder.
- The stable-release rescan also replaced a personal development-test address
  with `visitor@example.org`, preserving the test's policy assertion.
- Preserved the modified `progress.md` scratch log locally under
  `data/agent-progress/2026-10-09-progress.md`, then removed it from the
  publishable tree. Implementation plans and release receipts remain in `docs/`.
- Added ignore rules for local progress/review storage, browser HAR traces,
  credential exports, certificate/private-key files, database dumps/logs and
  test reports. Ignore rules do not remove previously committed files.

Intentional public maintainer contact details, author attribution, creator
license readmes, demonstration addresses, schema/migration files, the documented
Arcade tribute seed and release validation evidence were retained. Original font
assets and screenshot pairs support licensing and UI verification; they are not
discarded simply because they are binary or large.

## Publication and Follow-up Boundaries

The stable release includes this reviewed cleanup. Existing commits may still contain the operational
addresses and paths removed from current files. A history rewrite requires a
separate coordinated decision; this review did not force-push, delete tags or
change collaborators' history. If a real exposed credential is subsequently
identified, revoke/rotate it at its provider; deleting text alone is insufficient.

The initial production dependency audit was **26 moderate, nine high and one
critical advisory**. The separate [dependency security review](DEPENDENCY_SECURITY_REVIEW.md)
subsequently patched server and browser dependency resolutions, leaving four
high affected packages in Nodemailer/Auth.js and zero moderate or critical.
Production SMTP is blocked; deployment and physical-device checks are recorded
separately in that review.
The historical February security report is not a current security clearance.

Original v2.0 RC notes are retained in
[the historical archive](archive/V2.0_RELEASE_CANDIDATES.md). The condensed
[in-app release summary](release-notes.md) starts from v1.26.0, the last stable
point release. Package/lock versions are 2.0.0; RC.12 deployment and owner-reported
real-iPad acceptance are recorded in the dependency review. Stable deployment
and GitHub publication receipts are maintained in `RELEASES.md`.

## Local Validation

- Issue 28: 69 focused API/editor tests passed, including rejected requests
  making no persistence call and valid saved time formats passing unchanged.
- Full suite: 146 files / 1,098 tests passed, with one expected skip. Two
  repeated full-suite-only Hanoi progression timeouts led to a per-test
  15-second budget; no assertions or global test settings were weakened. A
  later one-off Arabic badge failure passed isolation and an unchanged rerun.
- TypeScript, lint and whitespace/diff checks passed. Production build and
  the 49-chunk legacy regex scan passed in an isolated local source copy.
- A controlled build comparison with/without only the Issue 28 API change
  preserved all 55 browser asset filenames and SHA-256 hashes. This proves
  that API fix has no browser bundle delta; separate local UI changes retain
  their own device-validation requirements. The temporary server, production
  output and cloned dependencies were cleaned up after verification.
- Hydration/interactivity smoke passed with documented local backend/auth
  warnings. This is modern Chromium, not a real iPadOS 15 test or hosted
  email/Neon acceptance. Production credentials were not copied into validation;
  the local simulation used file storage and a loopback-only dummy database URL.
- Confirmed that the archived RC text preserves the original notes and that
  the earlier stable-release notes remain byte-identical. Package and lockfile
  versions match; no stable release or deployment was performed.
