// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE.

/**
 * Legacy-compatibility SMOKE TEST.
 *
 * Reproduces the iPadOS 15.8 outage class — "elements render but are not
 * interactive" — by loading the two pages that broke (the visitor home page
 * `/` and the staff login `/login`) and asserting that React HYDRATION actually
 * completed: the page must have no uncaught script errors, the OTP/Magic-Link
 * tabs must switch on click, and the email field must accept typed input.
 *
 * Usage:
 *   1. Build + start a production server:  npm run build && npm start
 *      (Production build is important — this bug only manifests in the bundled
 *      output, not in `next dev`.)
 *   2. Run:  npm run check:legacy-bundles   (static guard, see that script)
 *   3. Run:  node scripts/smoke-legacy-compat.mjs
 *
 * Env overrides:
 *   SMOKE_BASE_URL   base URL of the running app (default http://localhost:3000)
 *   CHROME_PATH      path to the Chrome/Chromium binary
 *
 * IMPORTANT — what this does and does not prove:
 *   Puppeteer drives a MODERN Chromium, which will NOT reproduce an iOS-15
 *   parse failure on its own. This smoke test therefore catches *hydration /
 *   interactivity regressions in general* and is the local gate. To truly
 *   verify the iOS 15.8 / Android 8 floor, point a real old-WebKit device at
 *   the same assertions — set SMOKE_BASE_URL to a tunnel and run the same flow
 *   on BrowserStack/Sauce Labs (iPad iOS 15.8 Safari, Android 8 Chrome 80).
 *   The DOM selectors below (login-tabs-trigger-*, #email-otp) are stable hooks
 *   for those external runs too.
 */

import puppeteer from "puppeteer-core";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const CHROME_PATH =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Emulate an iPadOS 15.8 Safari client for viewport/UA realism (engine is still
// modern Chromium — see the header note).
const IPAD_IOS15_UA =
  "Mozilla/5.0 (iPad; CPU OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {{name:string, errors:string[]}[]} */
const failures = [];
/** @type {{name:string, warnings:string[]}[]} */
const warnings = [];

function fail(name, message) {
  const existing = failures.find((f) => f.name === name);
  if (existing) existing.errors.push(message);
  else failures.push({ name, errors: [message] });
}

function warn(name, message) {
  const existing = warnings.find((f) => f.name === name);
  if (existing) existing.warnings.push(message);
  else warnings.push({ name, warnings: [message] });
}

// Signatures of a genuine script/hydration crash (vs. backend/runtime noise such
// as API 500s or 404s, which are environmental and must NOT fail this test —
// its job is to isolate hydration/interactivity, not backend provisioning).
const HYDRATION_CRASH_SIGNATURES = [
  "syntaxerror",
  "is not defined",
  "is not a function",
  "unexpected token",
  "hydrat", // "Hydration failed", "hydrating", etc.
  "minified react error",
  "invalid regular expression",
];

function isHydrationCrash(text) {
  const t = text.toLowerCase();
  return HYDRATION_CRASH_SIGNATURES.some((sig) => t.includes(sig));
}

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(IPAD_IOS15_UA);
  await page.setViewport({ width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  return page;
}

/**
 * Watch for the fingerprint of a failed hydration. An uncaught `pageerror` (the
 * exact failure mode of the iOS-15 lookbehind parse error) is always fatal.
 * Console errors are fatal only when they match a script/hydration-crash
 * signature; backend resource errors (API 500/404) are environmental and are
 * reported as warnings.
 */
function watchErrors(page, label) {
  page.on("pageerror", (err) => fail(label, `Uncaught page error: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isHydrationCrash(text)) fail(label, `Console error (script/hydration): ${text}`);
    else warn(label, `Console error (non-fatal, likely backend/env): ${text}`);
  });
}

async function smokeLogin(browser) {
  const label = "/login";
  const page = await newPage(browser);
  watchErrors(page, label);

  // Use domcontentloaded (the home page polls, so networkidle never settles).
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await wait(800); // allow hydration

  // 1. Select Verification Code. Magic Link is deliberately first/default
  // for scanner safety, while both animated panels remain mounted; typing an
  // off-canvas OTP input tests the wrong node rather than hydration.
  const otpTrigger = "#login-tabs-trigger-otp";
  if ((await page.$(otpTrigger)) === null) {
    fail(label, `Verification Code tab trigger (${otpTrigger}) not found`);
  } else {
    await page.click(otpTrigger);
    await wait(300);
  }

  // 2. Email field accepts input (proves the OTP form is interactive).
  const emailSel = "#email-otp";
  const emailEl = await page.waitForSelector(emailSel, { timeout: 10000 }).catch(() => null);
  if (emailEl === null) {
    fail(label, `OTP email field (${emailSel}) not found in DOM`);
  } else {
    await page.click(emailSel);
    await page.type(emailSel, "staff@williamtemple.org", { delay: 10 });
    const value = await page.$eval(emailSel, (el) => /** @type {HTMLInputElement} */ (el).value);
    if (value !== "staff@williamtemple.org") {
      fail(label, `email field did not accept input (got "${value}") — hydration likely failed`);
    }
  }

  // 3. Tabs switch back (proves both directions of the toggle are wired).
  const magicTrigger = "#login-tabs-trigger-magic";
  if ((await page.$(magicTrigger)) === null) {
    fail(label, `Magic Link tab trigger (${magicTrigger}) not found`);
  } else {
    await page.click(magicTrigger);
    await wait(300);
    const magicEmailVisible = await page.$("#email-magic");
    if (magicEmailVisible === null) {
      fail(label, "clicking the Magic Link tab did not reveal the magic-link form — tabs are inert");
    }
  }

  await page.close();
}

async function smokeHome(browser) {
  const label = "/";
  const page = await newPage(browser);
  watchErrors(page, label);
  // The home page polls continuously, so wait for DOM + a content selector
  // rather than network idle.
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await wait(800);
  // The home page is the other surface that loaded the broken chunk. We mainly
  // assert it hydrated without uncaught errors; watchErrors handles that.
  // Require *some* rendered content (proves the document mounted); whether the
  // <main> body fully renders can depend on backend state in this env, so a
  // missing <main> is a warning, not a failure (pageerror still catches crashes).
  const bodyChildren = await page.evaluate(() => document.body?.childElementCount ?? 0);
  if (bodyChildren === 0) fail(label, "home page rendered no DOM content at all");
  const main = await page.$("main");
  if (main === null) warn(label, "home page rendered without <main> (likely backend state in this env)");
  await page.close();
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--hide-scrollbars", "--disable-gpu"],
  });
  try {
    await smokeHome(browser);
    await smokeLogin(browser);
  } finally {
    await browser.close();
  }

  if (warnings.length > 0) {
    console.warn("\n⚠️  Non-fatal warnings (backend/env, not hydration):\n");
    for (const { name, warnings: ws } of warnings) {
      console.warn(`  ${name}`);
      for (const w of ws) console.warn(`    • ${w}`);
    }
  }

  if (failures.length > 0) {
    console.error("\n❌ Legacy-compat smoke test FAILED (hydration/interactivity):\n");
    for (const { name, errors } of failures) {
      console.error(`  ${name}`);
      for (const e of errors) console.error(`    • ${e}`);
    }
    console.error("");
    process.exit(1);
  }
  console.log("\n✅ Legacy-compat smoke test passed: /login and / hydrate and are interactive.");
}

run().catch((err) => {
  console.error("Smoke test harness error:", err);
  process.exit(1);
});
