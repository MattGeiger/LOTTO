// Regenerates the README screenshots in docs/screenshots/ by driving the
// installed Google Chrome via puppeteer-core (no bundled browser download).
//
// Usage:
//   1. Start the app:  npm run dev   (or `npm start` after a build)
//   2. Run:            npm run screenshots
//
// Env overrides:
//   SCREENSHOT_BASE_URL  base URL of the running app (default http://localhost:3000)
//   CHROME_PATH          path to the Chrome/Chromium binary
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

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "screenshots");

/** @type {{name:string,route:string,width:number,height:number,theme?:"light"|"dark",lang?:string}[]} */
const SHOTS = [
  // Light (default English)
  { name: "staff", route: "/staff", width: 1440, height: 900 },
  { name: "display-board", route: "/display", width: 1600, height: 900 },
  { name: "inventory", route: "/inventory", width: 1440, height: 1000 },
  { name: "arcade", route: "/arcade", width: 1440, height: 950 },
  { name: "help", route: "/help", width: 1440, height: 1000 },
  // Dark mode
  { name: "display-board-dark", route: "/display", width: 1600, height: 900, theme: "dark" },
  { name: "staff-dark", route: "/staff", width: 1440, height: 900, theme: "dark" },
  // Localizations
  { name: "display-board-zh", route: "/display", width: 1600, height: 900, lang: "zh" },
  { name: "display-board-ru", route: "/display", width: 1600, height: 900, lang: "ru" },
  { name: "display-board-ar", route: "/display", width: 1600, height: 900, lang: "ar" },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--hide-scrollbars", "--disable-gpu"],
  });

  try {
    for (const shot of SHOTS) {
      const theme = shot.theme ?? "light";
      const lang = shot.lang ?? "en";
      const page = await browser.newPage();
      await page.setViewport({ width: shot.width, height: shot.height, deviceScaleFactor: 1 });
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);

      // Visit once to get an origin, seed the same storage keys the app uses,
      // then reload so the app boots with the chosen theme + language.
      await page.goto(`${BASE_URL}${shot.route}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        (t, l) => {
          localStorage.setItem("theme", t);
          localStorage.setItem("display-language", l);
          sessionStorage.setItem("display-language-session", l);
        },
        theme,
        lang,
      );
      await page.reload({ waitUntil: "networkidle2" });
      // Let polling, the inventory fetch, and language/scramble transitions settle.
      await wait(4000);

      const path = join(OUT_DIR, `${shot.name}.png`);
      await page.screenshot({ path, type: "png" });
      console.log(`✓ ${shot.name}.png (${theme}, ${lang})`);
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
