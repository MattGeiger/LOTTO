#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

const inputFiles = process.argv.slice(2);

if (inputFiles.length === 0) {
  console.error("Usage: node scripts/convert-css-colors-to-oklch.mjs <file.css> [...]");
  process.exitCode = 1;
}

const trimNumber = (value, precision = 6) => {
  const rounded = Number(value.toFixed(precision));
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

const srgbChannelToLinear = (value) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const srgbToOklch = ([red, green, blue], alpha = 1) => {
  const r = srgbChannelToLinear(red);
  const g = srgbChannelToLinear(green);
  const b = srgbChannelToLinear(blue);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const labB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.hypot(a, labB);
  const hue = chroma < 0.0000005 ? 0 : (Math.atan2(labB, a) * 180) / Math.PI;
  const normalizedHue = hue < 0 ? hue + 360 : hue;
  const alphaSuffix = alpha < 1 ? ` / ${trimNumber(alpha)}` : "";

  return `oklch(${trimNumber(lightness)} ${trimNumber(chroma)} ${trimNumber(normalizedHue, 3)}${alphaSuffix})`;
};

const parseHex = (value) => {
  const expanded = value.length <= 4
    ? value
        .slice(1)
        .split("")
        .map((character) => character + character)
        .join("")
    : value.slice(1);
  const hasAlpha = expanded.length === 8;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255);
  const alpha = hasAlpha ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return srgbToOklch(channels, alpha);
};

const parseRgbComponent = (value) =>
  value.endsWith("%") ? Number.parseFloat(value) / 100 : Number.parseFloat(value) / 255;

const parseAlpha = (value = "1") =>
  value.endsWith("%") ? Number.parseFloat(value) / 100 : Number.parseFloat(value);

const parseRgbFunction = (body) => {
  const [channelText, alphaText] = body.includes("/")
    ? body.split("/").map((part) => part.trim())
    : [body, undefined];
  const parts = channelText.includes(",")
    ? channelText.split(",").map((part) => part.trim())
    : channelText.trim().split(/\s+/);

  if (parts.length === 4 && alphaText === undefined) {
    return srgbToOklch(parts.slice(0, 3).map(parseRgbComponent), parseAlpha(parts[3]));
  }
  return srgbToOklch(parts.slice(0, 3).map(parseRgbComponent), parseAlpha(alphaText));
};

const hslToSrgb = (hue, saturation, lightness) => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = (((hue % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const options = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ];
  const match = lightness - chroma / 2;
  return options[Math.floor(sector) % 6].map((value) => value + match);
};

const parseHslFunction = (body) => {
  const [channelText, alphaText] = body.includes("/")
    ? body.split("/").map((part) => part.trim())
    : [body, undefined];
  const parts = channelText.includes(",")
    ? channelText.split(",").map((part) => part.trim())
    : channelText.trim().split(/\s+/);
  const alpha = parts.length === 4 && alphaText === undefined ? parseAlpha(parts[3]) : parseAlpha(alphaText);
  const rgb = hslToSrgb(
    Number.parseFloat(parts[0]),
    Number.parseFloat(parts[1]) / 100,
    Number.parseFloat(parts[2]) / 100,
  );
  return srgbToOklch(rgb, alpha);
};

for (const filePath of inputFiles) {
  const source = readFileSync(filePath, "utf8");
  const converted = source
    .replace(/#[0-9a-f]{8}\b|#[0-9a-f]{6}\b|#[0-9a-f]{4}\b|#[0-9a-f]{3}\b/gi, parseHex)
    .replace(/rgba?\(([^)]+)\)/gi, (_match, body) => parseRgbFunction(body))
    .replace(/hsla?\(([^)]+)\)/gi, (_match, body) => parseHslFunction(body));
  writeFileSync(filePath, converted);
}
