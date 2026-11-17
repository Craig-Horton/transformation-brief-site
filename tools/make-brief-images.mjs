// Render a Brief issue's cover and internal decision graphic into images/.
//
//   node tools/make-brief-images.mjs tools/briefs/issue-19.json
//   node tools/make-brief-images.mjs tools/briefs/issue-19.json --out /some/folder
//
// Copy the newest tools/briefs/issue-NN.json, change the wording to match the
// approved draft, and run this. Uses Playwright's Chromium when it is
// installed, otherwise Edge or Chrome (set BROWSER_PATH to choose).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const specPath = process.argv[2];
if (!specPath) { console.error('Usage: node tools/make-brief-images.mjs tools/briefs/issue-NN.json [--out dir]'); process.exit(1); }
const outIdx = process.argv.indexOf('--out');
const outDir = path.resolve(outIdx > -1 ? process.argv[outIdx + 1] : path.join(root, 'images'));
const spec = JSON.parse(fs.readFileSync(path.resolve(specPath), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=block" rel="stylesheet">`;

// Cover, 2000 x 1125 rendered at 1.28 to give 2560 x 1440, as Issue 17.
function coverHtml() {
  const c = spec.cover;
  const lines = (Array.isArray(c.title) ? c.title : [c.title]).map(esc).join('<br>');
  const n = Math.max(...(Array.isArray(c.title) ? c.title : [c.title]).map((l) => l.length));
  const size = n <= 22 ? 128 : n <= 30 ? 112 : 96;
  const strong = c.standfirstStrong ? ` <strong>${esc(c.standfirstStrong)}</strong>` : "";
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8">${fonts}<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 2000px; height: 1125px; overflow: hidden; }
  body { background: linear-gradient(180deg, #1a2a47 0%, #16223b 100%); color: #ffffff; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  .rule { height: 16px; background: linear-gradient(90deg, #c97a2b 0%, #e2a358 100%); }
  .page { padding: 106px 150px 0; height: 1109px; display: flex; flex-direction: column; }
  .kicker { font-weight: 600; font-size: 27px; letter-spacing: 0.16em; color: #e2a358; }
  .masthead { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 104px; line-height: 1; margin-top: 30px; }
  .meta { font-weight: 600; font-size: 25px; letter-spacing: 0.14em; color: #e2a358; margin-top: 34px; }
  .bar { width: 138px; height: 7px; background: #c97a2b; margin-top: 72px; }
  .title { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: ${size}px; line-height: 0.98; margin-top: 70px; }
  .stand { font-size: 33px; line-height: 1.6; color: #ffffff; max-width: 1400px; margin-top: 50px; font-weight: 400; }
  .stand strong { font-weight: 700; }
  .foot { margin-top: auto; padding-bottom: 76px; display: flex; justify-content: space-between; align-items: baseline; }
  .site { font-weight: 600; font-size: 26px; letter-spacing: 0.02em; color: #e2a358; }
  .tag { font-weight: 500; font-size: 23px; letter-spacing: 0.12em; color: #ffffff; }
</style></head><body><div class="rule"></div><div class="page">
  <div class="kicker">Craig Horton</div>
  <div class="masthead">The Transformation Brief</div>
  <div class="meta">Issue ${esc(spec.issue)} &nbsp;·&nbsp; ${esc(spec.date)}</div>
  <div class="bar"></div>
  <div class="title">${lines}</div>
  <div class="stand">${esc(c.standfirst)}${strong}</div>
  <div class="foot"><div class="site">brief.craighortonadvisory.com</div><div class="tag">The week in enterprise AI, every Friday</div></div>
</div></body></html>`;
}

// Internal decision graphic, 1800 x 1100 at 1x, as Issue 18.
function graphicHtml() {
  const g = spec.graphic;
  const steps = g.steps.map((s, i) => `<div class="step"><div class="dot">${i + 1}</div><div class="head">${esc(s.head)}</div><div class="text">${esc(s.text)}</div></div>`).join('');
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8">${fonts}<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1800px; height: 1100px; overflow: hidden; }
  body { background: #ffffff; color: #1a2a47; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  .rule { height: 9px; background: linear-gradient(90deg, #c97a2b 0%, #e2a358 60%, rgba(226, 163, 88, 0) 100%); }
  .page { padding: 58px 90px 0; height: 1091px; display: flex; flex-direction: column; }
  .top { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 22px; border-bottom: 4px solid #1a2a47; }
  .brand { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 36px; }
  .label { font-weight: 600; font-size: 22px; letter-spacing: 0.12em; color: #c97a2b; }
  .kicker { font-weight: 600; font-size: 22px; letter-spacing: 0.12em; color: #c97a2b; margin-top: 64px; }
  .title { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 68px; line-height: 1.05; margin-top: 18px; }
  .sub { font-size: 24px; line-height: 1.5; margin-top: 18px; }
  .steps { display: grid; grid-template-columns: repeat(${g.steps.length}, 1fr); gap: 0 40px; margin-top: 78px; position: relative; }
  .steps::before { content: ''; position: absolute; left: 40px; right: 60px; top: 41px; height: 5px; background: rgba(26, 42, 71, 0.12); }
  .step { position: relative; padding-left: 10px; }
  .dot { width: 84px; height: 84px; border-radius: 50%; background: #c97a2b; color: #ffffff; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 42px; display: flex; align-items: center; justify-content: center; margin-left: 28px; }
  .head { font-weight: 600; font-size: 25px; margin-top: 42px; }
  .text { font-size: 20px; line-height: 1.55; margin-top: 18px; }
  .callout { background: #1a2a47; color: #ffffff; padding: 40px 36px 44px; margin-top: auto; }
  .callout .label { color: #e2a358; font-size: 20px; }
  .callout .line { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-size: 42px; margin-top: 22px; }
  .foot { display: flex; justify-content: space-between; font-size: 18px; padding: 66px 0 52px; }
</style></head><body><div class="rule"></div><div class="page">
  <div class="top"><div class="brand">Craig Horton</div><div class="label">${esc(g.label)} | Issue ${esc(spec.issue)}</div></div>
  <div class="kicker">${esc(g.kicker)}</div>
  <div class="title">${esc(g.title)}</div>
  <div class="sub">${esc(g.subtitle)}</div>
  <div class="steps">${steps}</div>
  <div class="callout" style="margin-top: 110px"><div class="label">${esc(g.calloutLabel)}</div><div class="line">${esc(g.callout)}</div></div>
  <div class="foot"><div>Written in a personal capacity from public sources. Views are my own.</div><div>brief.craighortonadvisory.com</div></div>
</div></body></html>`;
}

const jobs = [
  { html: coverHtml(), file: spec.cover.file, w: 2000, h: 1125, scale: 1.28 },
  { html: graphicHtml(), file: spec.graphic.file, w: 1800, h: 1100, scale: 1 },
];

fs.mkdirSync(outDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brief-images-'));
let playwright = null;
try { playwright = createRequire(import.meta.url)('playwright'); } catch {}

if (playwright) {
  const b = await playwright.chromium.launch();
  for (const j of jobs) {
    const page = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.scale });
    await page.setContent(j.html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(outDir, j.file) });
    console.log('made', path.join(outDir, j.file));
  }
  await b.close();
} else {
  const browser = [process.env.BROWSER_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome'].find((p) => p && fs.existsSync(p));
  if (!browser) { console.error('No Playwright, Edge or Chrome found. Set BROWSER_PATH.'); process.exit(1); }
  for (const [i, j] of jobs.entries()) {
    const htmlFile = path.join(tmp, `job-${i}.html`);
    const outFile = path.join(outDir, j.file);
    fs.writeFileSync(htmlFile, j.html);
    fs.rmSync(outFile, { force: true });
    execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      `--force-device-scale-factor=${j.scale}`, `--window-size=${j.w},${j.h}`,
      '--virtual-time-budget=8000', `--user-data-dir=${path.join(tmp, `profile-${i}`)}`,
      `--screenshot=${outFile}`, pathToFileURL(htmlFile).href], { stdio: 'ignore' });
    for (let k = 0; k < 100 && !(fs.existsSync(outFile) && fs.statSync(outFile).size > 0); k += 1) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    }
    console.log(fs.existsSync(outFile) ? `made ${outFile}` : `not written: ${j.file}`);
  }
}
try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch {}
