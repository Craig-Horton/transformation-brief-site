// POST /api/send-issue   { "job": "<job id>", "mode": "test" | "send", "confirm_count": 33 }
//
// Sends one approved issue, in full, to the people who subscribed by email. It runs
// here, on the site's own server, so the Resend and Supabase keys never leave Vercel.
//
// What is sent comes from a row in public.brief_send_jobs (migration 004), never from
// the request. The job id is a random uuid that only the person who created the row
// knows, so nobody else can start a send.
//
//   mode "test"  sends one copy, marked [Test], to the test address stored on the job.
//                The caller cannot choose the recipient.
//   mode "send"  sends to every active subscriber. The job must be marked approved,
//                and confirm_count must equal the number of active subscribers.
//
// Every subscriber is claimed in public.brief_send_log before their email goes, so a
// second call, or two calls at once, can never send the same issue to anyone twice.
// A long list is sent across several calls: the response says how many remain.
//
// Required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, BRIEF_FROM_EMAIL. Optional: BRIEF_REPLY_TO, SITE_URL.

import { UUID_RE, emailConfigured, unsubscribeUrl } from './_email.js';
import { parseIssue, renderHtml, renderText } from './_issue.js';

const RESEND = 'https://api.resend.com';
const TEST_ID = '00000000-0000-4000-8000-000000000000';
const BUDGET_MS = 40 * 1000; // stop starting new emails after this, and report what remains
const CHUNK = 5;             // emails in flight at once, under Resend's 10 requests a second

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const { job: jobId, mode, confirm_count } = req.body || {};
    if (typeof jobId !== 'string' || !UUID_RE.test(jobId)) return res.status(404).json({ error: 'not_found' });

    const url = process.env.SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !svcKey) return res.status(500).json({ error: 'config' });
    if (!emailConfigured()) return res.status(503).json({ error: 'email_off' });

    const db = (path, init = {}) =>
      fetch(`${url}/rest/v1/${path}`, {
        ...init,
        headers: { 'apikey': svcKey, 'Authorization': `Bearer ${svcKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
      });

    const jobResp = await db(`brief_send_jobs?id=eq.${encodeURIComponent(jobId)}&select=id,slug,markdown,status,test_to`);
    if (!jobResp.ok) return res.status(502).json({ error: 'upstream' });
    const job = (await jobResp.json())[0];
    if (!job) return res.status(404).json({ error: 'not_found' });

    const issue = parseIssue(job.markdown);
    if (!issue.title) return res.status(422).json({ error: 'no_headline' });

    const sendOne = async (email, id, subject) => {
      const link = unsubscribeUrl(id);
      const message = {
        from: process.env.BRIEF_FROM_EMAIL,
        to: [email],
        subject,
        html: renderHtml(issue, link),
        text: renderText(issue, link),
        headers: { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      };
      if (process.env.BRIEF_REPLY_TO) message.reply_to = process.env.BRIEF_REPLY_TO;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const resp = await fetch(`${RESEND}/emails`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `${job.slug}-${id}${subject.startsWith('[Test]') ? `-test-${Date.now()}` : ''}`,
          },
          body: JSON.stringify(message),
        });
        if (resp.ok) return { ok: true };
        const text = (await resp.text().catch(() => '')).slice(0, 200);
        if (resp.status === 429 && !/quota/i.test(text)) { await sleep(1200); continue; }
        return { ok: false, status: resp.status, text, quota: /quota/i.test(text) };
      }
      return { ok: false, status: 429, text: 'rate limited' };
    };

    // ---- test: one copy to the address stored on the job ----
    if (mode === 'test') {
      if (!job.test_to) return res.status(422).json({ error: 'no_test_address' });
      const result = await sendOne(job.test_to, TEST_ID, `[Test] ${issue.title}`);
      if (!result.ok) {
        console.error('send-issue, test failed', result.status, result.text);
        return res.status(502).json({ error: 'send_failed', status: result.status });
      }
      return res.status(200).json({ ok: true, mode: 'test', subject: issue.title });
    }

    if (mode !== 'send') return res.status(400).json({ error: 'bad_mode' });
    if (job.status !== 'approved') return res.status(409).json({ error: 'not_approved', status: job.status });

    // ---- send: every active subscriber who has not had this issue ----
    const subscribers = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await db(`brief_subscribers?select=id,email&unsubscribed_at=is.null&order=created_at.asc,id.asc&limit=1000&offset=${offset}`);
      if (!page.ok) return res.status(502).json({ error: 'upstream' });
      const rows = await page.json();
      subscribers.push(...rows);
      if (rows.length < 1000) break;
    }
    if (Number(confirm_count) !== subscribers.length) {
      return res.status(409).json({ error: 'count_mismatch', active: subscribers.length });
    }

    const logResp = await db(`brief_send_log?job_id=eq.${encodeURIComponent(job.id)}&select=subscriber_id&limit=100000`);
    if (!logResp.ok) return res.status(502).json({ error: 'upstream' });
    const done = new Set((await logResp.json()).map((r) => r.subscriber_id));
    const pending = subscribers.filter((s) => !done.has(s.id));

    // Claim first, send second. If the email fails, the claim is released so a later call retries it.
    const claim = async (subscriberId) => {
      const resp = await db('brief_send_log?on_conflict=job_id,subscriber_id', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation,resolution=ignore-duplicates' },
        body: JSON.stringify({ job_id: job.id, subscriber_id: subscriberId }),
      });
      if (!resp.ok) return false;
      const rows = await resp.json().catch(() => []);
      return Array.isArray(rows) && rows.length === 1;
    };
    const release = (subscriberId) =>
      db(`brief_send_log?job_id=eq.${encodeURIComponent(job.id)}&subscriber_id=eq.${encodeURIComponent(subscriberId)}`, { method: 'DELETE' }).catch(() => {});

    const started = Date.now();
    let sent = 0;
    let failed = 0;
    let stop = false;
    for (let i = 0; i < pending.length && !stop; i += CHUNK) {
      if (Date.now() - started > BUDGET_MS) break;
      const results = await Promise.all(pending.slice(i, i + CHUNK).map(async (s) => {
        if (!(await claim(s.id))) return 'skipped';
        const result = await sendOne(s.email, s.id, issue.title);
        if (result.ok) return 'sent';
        await release(s.id);
        console.error('send-issue, email failed', result.status, result.text);
        if (result.quota) stop = true;
        return 'failed';
      }));
      sent += results.filter((r) => r === 'sent').length;
      failed += results.filter((r) => r === 'failed').length;
      await sleep(700);
    }

    const after = await db(`brief_send_log?job_id=eq.${encodeURIComponent(job.id)}&select=subscriber_id&limit=100000`);
    const delivered = after.ok ? (await after.json()).length : done.size + sent;
    const remaining = Math.max(0, subscribers.length - delivered);
    if (remaining === 0 && failed === 0) {
      await db(`brief_send_jobs?id=eq.${encodeURIComponent(job.id)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
      });
    }
    return res.status(200).json({ ok: true, mode: 'send', active: subscribers.length, sent_now: sent, failed, delivered, remaining });
  } catch (err) {
    console.error('send-issue, unexpected error', err);
    return res.status(500).json({ error: 'server' });
  }
}
