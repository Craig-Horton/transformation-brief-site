// Send one approved issue of the Brief, in full, to the people who subscribed by email.
//
// Nothing is sent unless you ask for it. In order of caution:
//
//   node tools/send-issue.mjs <issue.md>
//       Dry run. Shows the subject, word count and how many people would receive it,
//       and writes the email as an HTML file you can open. Sends nothing.
//
//   node tools/send-issue.mjs <issue.md> --test you@example.com
//       Sends one copy, marked [Test], to that address only.
//
//   node tools/send-issue.mjs <issue.md> --send --confirm-count 33
//       Sends to every active subscriber. The number must equal the current number
//       of active subscribers, so a send can never go to a list you have not looked at.
//
// Options:
//   --preview <file.html>   where to write the rendered email (default: a temp file)
//
// The issue file is the approved markdown draft, for example
// deliverables/issue-33-linkedin-draft-checked.md. The first "# " line is the headline
// and becomes the subject.
//
// Environment (the same values the Vercel project uses):
//   RESEND_API_KEY, BRIEF_FROM_EMAIL, BRIEF_REPLY_TO (optional)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   SITE_URL (optional, defaults to https://thetransformationbrief.ai)
// Put them in tools/.env (copy tools/.env.example), or set them in the terminal.
//
// Each subscriber gets their own one-click unsubscribe link. A record of who has been
// sent each issue is kept in tools/.sent/, so running --send twice does not send twice.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Keys can live in tools/.env (one NAME=value per line). That file is never committed.
// Anything already set in the environment wins.
const envFile = path.join(here, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const optionNames = ['--test', '--preview', '--confirm-count'];
const issuePath = args.find((a, i) => !a.startsWith('--') && !optionNames.includes(args[i - 1]));

if (!issuePath || !fs.existsSync(issuePath)) {
  console.error('Give the path of the approved issue file, for example deliverables/issue-33-linkedin-draft-checked.md');
  process.exit(1);
}

const SITE = (process.env.SITE_URL || 'https://thetransformationbrief.ai').replace(/\/+$/, '');
const RESEND = (process.env.RESEND_API_URL || 'https://api.resend.com').replace(/\/+$/, '');
const FOOTER = 'The Transformation Brief is written in a personal capacity and uses public sources.';
const TEST_ID = '00000000-0000-4000-8000-000000000000';

// ---------------------------------------------------------------------------
// Read the issue
// ---------------------------------------------------------------------------
const raw = fs.readFileSync(issuePath, 'utf8').replace(/\r\n/g, '\n');
const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Links and bold, on text that has already been escaped.
function inlineHtml(text) {
  return esc(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) => `<a href="${u}" style="color:#a65f1a;">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function inlineText(text) {
  return text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)').replace(/\*\*([^*]+)\*\*/g, '$1');
}

let title = '';
let dateline = '';
const parts = []; // { kind: 'h2' | 'h3' | 'p' | 'ul' | 'question', text | items }
let inQuestion = false;
for (const block of blocks) {
  if (block.startsWith('# ') && !title) { title = block.slice(2).trim(); continue; }
  if (!dateline && /^The Transformation Brief,/.test(block) && !block.includes('\n')) {
    dateline = block.replace(/^The Transformation Brief,\s*/, '').trim();
    continue;
  }
  if (block === FOOTER) continue; // the email carries this line in its own footer
  if (block.startsWith('### ')) { parts.push({ kind: 'h3', text: block.slice(4).trim() }); inQuestion = false; continue; }
  if (block.startsWith('## ')) {
    const text = block.slice(3).trim();
    parts.push({ kind: 'h2', text });
    inQuestion = /question/i.test(text);
    continue;
  }
  const lines = block.split('\n');
  if (lines.every((l) => /^[-*]\s+/.test(l))) {
    parts.push({ kind: 'ul', items: lines.map((l) => l.replace(/^[-*]\s+/, '')) });
    continue;
  }
  const text = lines.join(' ');
  if (inQuestion) { parts.push({ kind: 'question', text }); inQuestion = false; continue; }
  parts.push({ kind: 'p', text });
}

if (!title) {
  console.error('The issue file has no "# " headline line, so there is no subject.');
  process.exit(1);
}

const words = raw.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*>-]/g, ' ').split(/\s+/).filter(Boolean).length;
const slug = path.basename(issuePath).replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
const unsubscribeUrl = (id) => `${SITE}/api/unsubscribe?id=${encodeURIComponent(id)}`;

function renderHtml(id) {
  const P = 'margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a2a47;';
  const LI = 'margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a2a47;';
  const SMALL = 'margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#647087;';
  const H1 = 'margin:0 0 16px;font-family:Georgia,serif;font-size:28px;line-height:1.15;color:#1a2a47;font-weight:700;';
  const H2 = 'margin:26px 0 12px;padding-top:18px;border-top:1px solid #d9dce2;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;color:#c97a2b;';
  const H3 = 'margin:0 0 6px;font-family:Georgia,serif;font-size:19px;line-height:1.25;color:#1a2a47;font-weight:700;';
  const body = parts.map((p) => {
    if (p.kind === 'h2') return `<p style="${H2}">${inlineHtml(p.text)}</p>`;
    if (p.kind === 'h3') return `<h3 style="${H3}">${inlineHtml(p.text)}</h3>`;
    if (p.kind === 'ul') return `<ul style="margin:0 0 16px;padding-left:22px;">${p.items.map((i) => `<li style="${LI}">${inlineHtml(i)}</li>`).join('')}</ul>`;
    if (p.kind === 'question') return `<div style="margin:0 0 20px;background:#1a2a47;padding:20px 22px;font-family:Georgia,serif;font-size:19px;line-height:1.4;color:#ffffff;">${inlineHtml(p.text)}</div>`;
    return `<p style="${P}">${inlineHtml(p.text)}</p>`;
  }).join('\n');
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:600px;margin:0 auto;">
<div style="background:#1a2a47;padding:22px 24px;border-top:5px solid #c97a2b;">
<div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#ffffff;">The Transformation Brief</div>
${dateline ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.12em;color:#e2a358;margin-top:8px;">${esc(dateline)}</div>` : ''}
</div>
<div style="padding:26px 24px 8px;">
<h1 style="${H1}">${inlineHtml(title)}</h1>
${body}
<hr style="border:none;border-top:1px solid #d9dce2;margin:24px 0 14px;">
<p style="${SMALL}">You are receiving this because you subscribed on my website. <a href="${unsubscribeUrl(id)}" style="color:#a65f1a;">Unsubscribe with one click</a>.</p>
<p style="${SMALL}">${FOOTER}</p>
</div>
</div>
</body></html>`;
}

function renderText(id) {
  const out = [title, dateline ? `The Transformation Brief, ${dateline}` : 'The Transformation Brief', ''];
  for (const p of parts) {
    if (p.kind === 'ul') out.push(p.items.map((i) => `- ${inlineText(i)}`).join('\n'), '');
    else out.push(inlineText(p.text), '');
  }
  out.push(`Unsubscribe with one click: ${unsubscribeUrl(id)}`, '', FOOTER);
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Subscribers and sending
// ---------------------------------------------------------------------------
async function activeSubscribers() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const all = [];
  for (let offset = 0; ; offset += 1000) {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/brief_subscribers?select=id,email&unsubscribed_at=is.null&order=created_at.asc,id.asc&limit=1000&offset=${offset}`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    if (!resp.ok) throw new Error(`Could not read subscribers: ${resp.status} ${(await resp.text()).slice(0, 200)}`);
    const rows = await resp.json();
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  return all;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendOne(email, id, subject) {
  const message = {
    from: process.env.BRIEF_FROM_EMAIL,
    to: [email],
    subject,
    html: renderHtml(id),
    text: renderText(id),
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl(id)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
  if (process.env.BRIEF_REPLY_TO) message.reply_to = process.env.BRIEF_REPLY_TO;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const resp = await fetch(`${RESEND}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `${slug}-${id}`,
      },
      body: JSON.stringify(message),
    });
    if (resp.ok) return { ok: true };
    const text = (await resp.text().catch(() => '')).slice(0, 200);
    if (resp.status === 429 && !/quota/i.test(text)) { await sleep(1500); continue; }
    return { ok: false, status: resp.status, text };
  }
  return { ok: false, status: 429, text: 'rate limited three times' };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const previewFile = value('--preview') || path.join(os.tmpdir(), `${slug}-email-preview.html`);
fs.writeFileSync(previewFile, renderHtml(TEST_ID));

const subscribers = await activeSubscribers();
console.log(`Subject:     ${title}`);
console.log(`Issue line:  ${dateline || '(none found)'}`);
console.log(`Words:       ${words}${words > 750 ? '  (over the 750 limit)' : ''}`);
console.log(`Subscribers: ${subscribers ? subscribers.length + ' active' : 'not checked (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set)'}`);
console.log(`Preview:     ${previewFile}`);

const needsSending = flag('--send') || flag('--test');
if (needsSending && !(process.env.RESEND_API_KEY && process.env.BRIEF_FROM_EMAIL)) {
  console.error('Set RESEND_API_KEY and BRIEF_FROM_EMAIL to send.');
  process.exit(1);
}

if (flag('--test')) {
  const to = value('--test');
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) { console.error('Give --test an email address.'); process.exit(1); }
  const result = await sendOne(to, TEST_ID, `[Test] ${title}`);
  console.log(result.ok ? `Test copy sent to ${to}. Nobody else was sent anything.` : `Test send failed: ${result.status} ${result.text}`);
  process.exit(result.ok ? 0 : 1);
}

if (!flag('--send')) {
  console.log('Dry run. Nothing was sent.');
  process.exit(0);
}

if (!subscribers) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to send to subscribers.'); process.exit(1); }
const confirm = Number(value('--confirm-count'));
if (confirm !== subscribers.length) {
  console.error(`Not sent. There are ${subscribers.length} active subscribers; add --confirm-count ${subscribers.length} to send to all of them.`);
  process.exit(1);
}

const logDir = path.join(here, '.sent');
const logFile = path.join(logDir, `${slug}.json`);
fs.mkdirSync(logDir, { recursive: true });
const sent = new Set(fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : []);
let delivered = 0;
let skipped = 0;
for (const s of subscribers) {
  if (sent.has(s.id)) { skipped += 1; continue; }
  const result = await sendOne(s.email, s.id, title);
  if (!result.ok) {
    console.error(`Stopped after ${delivered} sent: ${result.status} ${result.text}. Run the same command again to carry on from here.`);
    process.exit(1);
  }
  sent.add(s.id);
  fs.writeFileSync(logFile, JSON.stringify([...sent]));
  delivered += 1;
  await sleep(150); // stay under Resend's 10 requests a second
}
console.log(`Sent to ${delivered} subscriber(s). Already sent earlier and skipped: ${skipped}.`);
