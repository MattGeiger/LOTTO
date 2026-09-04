// Regenerates the README screenshots in docs/screenshots/ and the light/dark
// in-app Help pairs in public/help-screenshots/ by driving the installed Google
// Chrome via puppeteer-core (no bundled browser download).
//
// Usage:
//   1. Start the app:  npm run dev   (or `npm start` after a build)
//   2. Run:            npm run screenshots
//
// Env overrides:
//   SCREENSHOT_BASE_URL  base URL of the running app (default http://localhost:3000)
//   CHROME_PATH          path to the Chrome/Chromium binary
//   SCREENSHOT_NAMES     optional comma-separated output names to regenerate
//
// Each shot can pin a theme (light/dark) and a UI language; both are applied via
// the same storage keys the app itself uses (next-themes `theme`, and the
// language-context `display-language` / `display-language-session`) so the
// screenshots match what a real user with those settings would see.

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const CHROME_PATH =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(REPO_ROOT, "docs", "screenshots");
const HELP_OUT_DIR = join(REPO_ROOT, "public", "help-screenshots");
const REQUESTED_NAMES = new Set(
  (process.env.SCREENSHOT_NAMES ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);

/** @typedef {"appearance"|"home-ticket"|"admin-advanced"|"announcement"|"translation"|"appearance-help"|"appearance-wizard"|"login-code"} Preparation */
/** @typedef {{name:string,route:string,width:number,height:number,theme?:"light"|"dark",lang?:string,prepare?:Preparation,outDir?:string,target?:string,format?:"png"|"webp"}} Shot */

/** @type {Shot[]} */
const SHOTS = [
  // Light (default English)
  { name: "login", route: "/login", width: 1440, height: 900 },
  { name: "client-ticket", route: "/", width: 1440, height: 900, prepare: "home-ticket" },
  { name: "admin-dashboard", route: "/admin", width: 1440, height: 900 },
  { name: "display-board", route: "/display", width: 1600, height: 900 },
  { name: "inventory", route: "/inventory", width: 1440, height: 1000 },
  { name: "arcade", route: "/arcade", width: 1440, height: 950 },
  { name: "admin-appearance", route: "/admin", width: 1440, height: 1000, prepare: "appearance" },
  { name: "help", route: "/help", width: 1440, height: 1000 },
  // Dark mode
  { name: "display-board-dark", route: "/display", width: 1600, height: 900, theme: "dark" },
  { name: "login-dark", route: "/login", width: 1440, height: 900, theme: "dark" },
  // Localizations
  { name: "display-board-zh", route: "/display", width: 1600, height: 900, lang: "zh" },
  { name: "display-board-ru", route: "/display", width: 1600, height: 900, lang: "ru" },
  { name: "display-board-ar", route: "/display", width: 1600, height: 900, lang: "ar" },
];

/** @type {Omit<Shot, "theme"|"outDir">[]} */
const HELP_SHOT_BASES = [
  { name: "staff-dashboard", route: "/admin", width: 1280, height: 800 },
  { name: "display-board", route: "/display", width: 1280, height: 720 },
  { name: "client-ticket", route: "/", width: 1280, height: 800, prepare: "home-ticket" },
  { name: "inventory", route: "/inventory", width: 1280, height: 820 },
  { name: "languages", route: "/display", width: 1280, height: 720, lang: "ar" },
  { name: "arcade", route: "/arcade", width: 1280, height: 820 },
  { name: "sign-in-code", route: "/login", width: 1100, height: 760, prepare: "login-code" },
  {
    name: "announcement-editor",
    route: "/admin",
    width: 1280,
    height: 900,
    prepare: "announcement",
    target: "[data-screenshot-target='announcement']",
  },
  {
    name: "translation",
    route: "/admin",
    width: 1280,
    height: 900,
    prepare: "translation",
    target: "[data-screenshot-target='translation']",
  },
  {
    name: "appearance",
    route: "/admin",
    width: 1280,
    height: 900,
    prepare: "appearance-help",
  },
  {
    name: "appearance-wizard",
    route: "/admin",
    width: 1280,
    height: 900,
    prepare: "appearance-wizard",
    target: "[role='dialog']",
  },
];

for (const base of HELP_SHOT_BASES) {
  SHOTS.push(
    { ...base, outDir: HELP_OUT_DIR, theme: "light", format: "webp" },
    { ...base, name: `${base.name}-dark`, outDir: HELP_OUT_DIR, theme: "dark", format: "webp" },
  );
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(HELP_OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--hide-scrollbars", "--disable-gpu"],
  });

  try {
    for (const shot of SHOTS) {
      if (REQUESTED_NAMES.size > 0 && !REQUESTED_NAMES.has(shot.name)) continue;
      const theme = shot.theme ?? "light";
      const lang = shot.lang ?? "en";
      const page = await browser.newPage();
      await page.setViewport({ width: shot.width, height: shot.height, deviceScaleFactor: 1 });
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);

      if (["appearance", "appearance-help", "appearance-wizard"].includes(shot.prepare ?? "")) {
        await page.setRequestInterception(true);
        page.on("request", (request) => {
          if (new URL(request.url()).pathname === "/api/brand-config") {
            void request.respond({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ configurations: [], activeId: null }),
            });
            return;
          }
          void request.continue();
        });
      }

      // Visit once to get an origin, seed the same storage keys the app uses,
      // then reload so the app boots with the chosen theme + language.
      await page.goto(`${BASE_URL}${shot.route}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        (t, l, preparation) => {
          localStorage.setItem("theme", t);
          localStorage.setItem("display-language", l);
          sessionStorage.setItem("display-language-session", l);
          if (preparation === "home-ticket") {
            const now = Date.now();
            localStorage.setItem("homepage-ticket-selection-v1", JSON.stringify({
              ticketNumber: 25,
              savedAt: now,
              expiresAt: now + 8 * 60 * 60 * 1000,
            }));
          }
          if (preparation === "announcement") {
            localStorage.setItem("lotto:announcement-draft", JSON.stringify({
              enabled: true,
              markdown: "## Pantry update\n\nFresh produce is available **while supplies last**.\n\n- Check today's inventory\n- Keep your ticket nearby",
              startsAt: null,
              endsAt: null,
              updatedAt: 0,
            }));
          }
        },
        theme,
        lang,
        shot.prepare,
      );
      await page.reload({ waitUntil: "networkidle2" });
      // Let polling, the inventory fetch, and language/scramble transitions settle.
      await wait(4000);

      // Screenshot the product rather than development-only controls. These are
      // absent from production but intentionally present during `npm run dev`.
      await page.evaluate(() => {
        document.querySelectorAll("nextjs-portal").forEach((portal) => {
          portal.style.display = "none";
        });
        const palette = document.querySelector('[aria-label="Open palette calibration"]');
        if (palette instanceof HTMLElement) palette.style.display = "none";
      });

      const openAdvanced = async () => {
        await page.evaluate(() => {
          const advanced = Array.from(document.querySelectorAll("button")).find((button) =>
            button.textContent?.trim().startsWith("Advanced"),
          );
          advanced?.click();
        });
        await page.waitForFunction(() => document.body.textContent?.includes("Set operating hours"));
        await wait(500);
      };

      const markCard = async (label, targetName) => {
        await page.evaluate((text, name) => {
          const card = Array.from(document.querySelectorAll("[data-slot='card']"))
            .filter((element) => element.textContent?.includes(text))
            .sort((left, right) =>
              (left.textContent?.length ?? 0) - (right.textContent?.length ?? 0),
            )[0];
          if (card instanceof HTMLElement) card.dataset.screenshotTarget = name;
        }, label, targetName);
        await page.waitForSelector(`[data-screenshot-target='${targetName}']`, { visible: true });
      };

      if (shot.prepare === "login-code") {
        await page.click("#login-tabs-trigger-otp");
        await wait(500);
      }

      if (shot.prepare === "admin-advanced") {
        await openAdvanced();
      }

      if (shot.prepare === "announcement") {
        await openAdvanced();
        await markCard("Announcement", "announcement");
        await page.waitForSelector('[aria-label="Announcement message"]');
        await wait(500);
      }

      if (shot.prepare === "translation") {
        await openAdvanced();
        await markCard("Translation", "translation");
      }

      if (shot.prepare === "appearance" || shot.prepare === "appearance-help") {
        await openAdvanced();
        await page.waitForSelector("[data-appearance-preview]", { visible: true });
        await page.evaluate(() => {
          const manager = document.querySelector("[data-appearance-manager]");
          const preview = document.querySelector("[data-appearance-preview]");
          const target = manager?.parentElement;
          if (target instanceof HTMLElement && target.contains(preview)) {
            target.dataset.screenshotTarget = "appearance";
          }
        });
        await page.$eval("[data-appearance-preview]", (element) =>
          element.scrollIntoView({ block: "center", inline: "nearest" }),
        );
        await wait(800);
      }

      if (shot.prepare === "appearance-wizard") {
        await openAdvanced();
        await page.waitForSelector("[data-appearance-manager]", { visible: true });
        await page.evaluate(() => {
          const setupButton = Array.from(document.querySelectorAll("button")).find((button) =>
            ["Set up appearance", "New appearance"].includes(button.textContent?.trim() ?? ""),
          );
          setupButton?.click();
        });
        await page.waitForSelector("[role='dialog']", { visible: true });
        await wait(800);
      }

      const format = shot.format ?? "png";
      const path = join(shot.outDir ?? OUT_DIR, `${shot.name}.${format}`);
      const screenshotOptions = {
        path,
        type: format,
        ...(format === "webp" ? { quality: 84 } : {}),
      };
      if (shot.target) {
        const target = await page.waitForSelector(shot.target, { visible: true });
        if (!target) throw new Error(`Screenshot target not found: ${shot.target}`);
        await target.screenshot(screenshotOptions);
      } else {
        await page.screenshot(screenshotOptions);
      }
      console.log(`✓ ${shot.name}.${format} (${theme}, ${lang})`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
