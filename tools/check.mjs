#!/usr/bin/env node
// Render a deck in headless Chromium, take a picture of every slide and report what a reader of
// the HTML can't see: content that doesn't fit, lines too long for their box, boxes off the grid.
//
//   node tools/check.mjs [deck.html] [--dark] [--pdf]
//
// Pictures go to shots/ next to the deck (01.png, 02.png, …), with --pdf a PDF next to it too.
// Exits with 1 if anything doesn't fit; boxes off the grid are warnings only.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const deck = path.resolve(args.find((arg) => !arg.startsWith("--")) ?? "index.html");
const shots = path.join(path.dirname(deck), "shots");

// any installed Chromium will do; playwright-core brings none of its own
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const name of ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable"]) {
    try {
      return execFileSync("which", [name], { encoding: "utf8" }).trim();
    } catch {}
  }
  throw new Error("no Chromium on the PATH; set CHROMIUM_PATH");
}

// Runs in the page. Every slide is in layout whether shown or not, so all are measured at once.
function inspect() {
  function measure(css) {
    const probe = document.createElement("div");
    probe.style.cssText = `position: fixed; ${css}`;
    document.body.append(probe);
    const rect = probe.getBoundingClientRect();
    probe.remove();
    return rect;
  }
  const line = measure("height: var(--line-height)").height;
  const column = measure("width: 1ch").width;
  const half = line / 2;

  // Boxes only: inline elements start at their glyphs, not their line, and table rows and groups
  // are covered by their cells.
  const skippedDisplays = new Set(["inline", "contents", "none", "table-row", "table-row-group",
    "table-header-group", "table-footer-group"]);
  // Off the grid on purpose: raised footnote marks, checkboxes centred in their line, and captions
  // half a line under an image (slides.js pads the figure as a whole instead)
  const offGridOnPurpose = "sup, input[type=checkbox], figure:has(> img, > video) > figcaption";

  function describe(element) {
    const classes = [...element.classList].map((name) => `.${name}`).join("");
    const text = element.textContent.trim().replace(/\s+/g, " ");
    const quote = text ? ` "${text.length > 24 ? `${text.slice(0, 24)}…` : text}"` : "";
    return `<${element.localName}${classes}>${quote}`;
  }
  const count = (length, unit) => {
    const n = Math.ceil(length / unit - 0.01);
    return `${n} ${unit === line ? "line" : "column"}${n === 1 ? "" : "s"}`;
  };

  const slides = [...document.querySelectorAll("body > section")];
  const first = slides[0].getBoundingClientRect();
  const firstStyle = getComputedStyle(slides[0]);
  const width = parseFloat(firstStyle.width);
  const height = parseFloat(firstStyle.height);
  const scale = first.width / width;

  const reports = slides.map((slide) => {
    const errors = [];
    const warnings = [];
    const box = slide.getBoundingClientRect();
    const style = getComputedStyle(slide);
    // the content area, in the slide's own unscaled pixels
    const area = {
      left: parseFloat(style.paddingLeft),
      top: parseFloat(style.paddingTop),
      right: width - parseFloat(style.paddingRight),
      bottom: height - parseFloat(style.paddingBottom),
    };
    // code blocks reach half a rule past either side
    const slack = 1.5;
    const outside = [];

    for (const element of slide.querySelectorAll("*")) {
      const elementStyle = getComputedStyle(element);
      if (skippedDisplays.has(elementStyle.display)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      // where layout put it: a relative offset (h2, tables, .no) moves only the drawing
      const moved = elementStyle.position === "relative";
      const left = (rect.left - box.left) / scale - (moved ? parseFloat(elementStyle.left) || 0 : 0);
      const top = (rect.top - box.top) / scale - (moved ? parseFloat(elementStyle.top) || 0 : 0);
      const right = left + rect.width / scale;
      const bottom = top + rect.height / scale;

      // past the content area; what's inside such a box is past it too, and is left out
      if (!outside.some((other) => other.contains(element))) {
        const over = [];
        if (bottom > area.bottom + slack) over.push(`${count(bottom - area.bottom, line)} below`);
        if (top < area.top - slack) over.push(`${count(area.top - top, line)} above`);
        if (right > area.right + slack) over.push(`${count(right - area.right, column)} right of`);
        if (left < area.left - slack) over.push(`${count(area.left - left, column)} left of`);
        if (over.length) {
          outside.push(element);
          errors.push(`${describe(element)} ends ${over.join(" and ")} the content area`);
        }
      }

      // wider than its own box: a long line of code, a word that can't break, a wide table
      const extra = element.scrollWidth - element.clientWidth;
      if (extra > 1 && element.clientWidth > 0) {
        errors.push(`${describe(element)} holds content ${count(extra, column)} wider than itself`);
      }

      if (!element.closest(offGridOnPurpose)) {
        const rest = ((top % half) + half) % half;
        if (Math.min(rest, half - rest) > 0.1) {
          warnings.push(`${describe(element)} starts off the grid (${rest.toFixed(2)}px into a half line)`);
        }
      }
    }

    // text set straight in the section has no box of its own to catch above
    if (!errors.length && (slide.scrollHeight > slide.clientHeight + 1 || slide.scrollWidth > slide.clientWidth + 1)) {
      errors.push("content runs past the slide's edge");
    }
    return { errors, warnings };
  });

  const failedFonts = [...document.fonts].filter((face) => face.status === "error").length;
  return { width, height, reports, failedFonts };
}

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  colorScheme: flags.has("--dark") ? "dark" : "light",
});
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("requestfailed", (request) => pageErrors.push(`failed to load ${request.url()}`));

await page.goto(pathToFileURL(deck).href, { waitUntil: "load" });
if (await page.evaluate(() => !document.querySelector("html.deck > body > section"))) {
  console.error(`${deck}: no slides, or slides.js didn't run`);
  await browser.close();
  process.exit(1);
}
await page.evaluate(() => document.fonts.ready);
// the window takes the slide's size, so pictures are of the slide alone at a scale of 1
const size = await page.evaluate(() => {
  const style = getComputedStyle(document.querySelector("body > section"));
  return { width: Math.ceil(parseFloat(style.width)), height: Math.ceil(parseFloat(style.height)) };
});
await page.setViewportSize(size);
// let slides.js refit and pad figures against the fonts' real sizes before measuring
await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

const { reports, failedFonts } = await page.evaluate(inspect);

rmSync(shots, { recursive: true, force: true });
mkdirSync(shots, { recursive: true });
const digits = String(reports.length).length;
let failed = pageErrors.length > 0 || failedFonts > 0;
let warned = 0;
for (const [index, { errors, warnings }] of reports.entries()) {
  const no = String(index + 1).padStart(digits, "0");
  await page.evaluate((n) => { location.hash = `#${n}`; }, index + 1);
  await page.waitForFunction((n) => document.querySelectorAll("body > section")[n].classList.contains("current"), index);
  await page.screenshot({ path: path.join(shots, `${no}.png`) });

  console.log(`${no}  ${errors.length ? "FAIL" : warnings.length ? "warn" : "ok"}`);
  for (const error of errors) console.log(`    ${error}`);
  for (const warning of warnings) console.log(`    (${warning})`);
  failed ||= errors.length > 0;
  warned += warnings.length;
}
for (const error of pageErrors) console.log(`page: ${error}`);
if (failedFonts) console.log(`page: ${failedFonts} font files failed to load`);

if (flags.has("--pdf")) {
  const pdf = deck.replace(/\.html?$/, "") + ".pdf";
  await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  console.log(`pdf: ${path.relative(process.cwd(), pdf)}`);
}
await browser.close();

console.log(`${reports.length} slides in ${path.relative(process.cwd(), shots) || "."}/` +
  (failed ? ", some don't fit" : warned ? `, all fit, ${warned} off the grid` : ", all fit and on the grid"));
process.exit(failed ? 1 : 0);
