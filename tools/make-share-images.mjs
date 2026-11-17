// Render the 1200 x 630 share cards (og:image) into images/share/.
//
//   node tools/make-share-images.mjs            all cards in tools/share-cards.json
//   node tools/make-share-images.mjs issue-18   only cards whose file name contains "issue-18"
//
// For a new issue: add one line to tools/share-cards.json, run this, then point
// the page's og:image and twitter:image at the new file.
//
// Uses the Edge or Chrome already installed on this machine, in headless mode.
// Set BROWSER_PATH to use a different one.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// Resolved, because the browser refuses a screenshot path that contains '..'.
const root = path.resolve(here, '..');
const outDir = path.join(root, 'images', 'share');
const cards = JSON.parse(fs.readFileSync(path.join(here, 'share-cards.json'), 'utf8'));
const only = process.argv[2];

const browser = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => p && fs.existsSync(p));
if (!browser) {
  console.error('No Edge or Chrome found. Set BROWSER_PATH.');
  process.exit(1);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Longer headlines get a smaller size so every card fills the same space.
function titleSize(title) {
  const n = title.length;
  if (n <= 24) return 124;
  if (n <= 34) return 104;
  if (n <= 48) return 88;
  if (n <= 64) return 76;
  return 66;
}

function cardHtml(card) {
  return `<!DOCTYPE html>
<html lang="en-GB"><head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Inter:wght@500;600&display=block" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body { background: #1a2a47; color: #ffffff; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  .rule { height: 10px; background: linear-gradient(90deg, #c97a2b 0%, #e2a358 45%, rgba(226, 163, 88, 0) 100%); }
  .card { height: 620px; padding: 62px 76px 56px; display: flex; flex-direction: column; }
  .kicker { font-weight: 600; font-size: 25px; letter-spacing: 0.16em; color: #e2a358; }
  .title { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: ${titleSize(card.title)}px; line-height: 1.04; letter-spacing: -0.015em; margin-top: 26px; max-width: 1020px; }
  .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: baseline; padding-top: 26px; border-top: 1px solid rgba(255, 255, 255, 0.22); }
  .name { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 36px; }
  .meta { font-weight: 500; font-size: 23px; color: #e2a358; }
</style></head>
<body>
<div class="rule"></div>
<div class="card">
  <div class="kicker">${esc(card.kicker)}</div>
  <div class="title">${esc(card.title)}</div>
  <div class="foot"><div class="name">Craig Horton</div><div class="meta">${esc(card.foot)}</div></div>
</div>
</body></html>`;
}

fs.mkdirSync(outDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'share-cards-'));
let made = 0;
for (const card of cards) {
  if (only && !card.file.includes(only)) continue;
  const htmlFile = path.join(tmp, card.file.replace(/\.png$/, '.html'));
  const outFile = path.join(outDir, card.file);
  fs.writeFileSync(htmlFile, cardHtml(card));
  fs.rmSync(outFile, { force: true });
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--virtual-time-budget=8000',
    // A fresh profile per card, so one run never hands off to another.
    `--user-data-dir=${path.join(tmp, `profile-${made}-${Date.now()}`)}`,
    `--screenshot=${outFile}`,
    pathToFileURL(htmlFile).href,
  ], { stdio: 'ignore' });
  // The browser can return before the file is on disk, so wait for it.
  for (let i = 0; i < 100 && !(fs.existsSync(outFile) && fs.statSync(outFile).size > 0); i += 1) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  if (!fs.existsSync(outFile)) { console.error('not written:', card.file); process.exitCode = 1; continue; }
  console.log('made', path.relative(root, outFile));
  made += 1;
}
// The browser can hold its profile folder for a moment after it exits.
try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch {}
console.log(`${made} card(s) written to images/share/`);
