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
// How a send is recorded, in public.brief_send_log:
//   1. A subscriber is claimed (a row with no sent_at) before their email goes, so two
//      calls at once cannot both send to them.
//   2. When Resend accepts the email, the row gets its sent_at. Only rows with a
//      sent_at count as delivered.
//   3. If the email fails, or the request breaks, the claim is removed. A claim that
//      is still unsent after ten minutes is treated as abandoned and tried again. The
//      Idempotency-Key stops Resend sending a second copy if the first did go.
// A long list is sent across several calls: the response says how many remain.
//
// Required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, BRIEF_FROM_EMAIL. Optional: BRIEF_REPLY_TO, SITE_URL.

import { UUID_RE, emailConfigured, unsubscribeUrl } from './_email.js';
import { parseIssue, renderHtml, renderText } from './_issue.js';

const RESEND = 'https://api.resend.com';
const TEST_ID = '00000000-0000-4000-8000-000000000000';
const BUDGET_MS = 40 * 1000;        // stop starting new emails after this, and report what remains
const CHUNK = 5;                    // emails in flight at once, under Resend's 10 requests a second
const STALE_MS = 10 * 60 * 1000;    // an unsent claim older than this is abandoned

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

    // Never throws: a broken connection is reported as a failed send.
    const sendOne = async (email, id, subject) => {
      try {
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
      } catch (err) {
        return { ok: false, status: 0, text: String(err && err.message ? err.message : err).slice(0, 200) };
      }
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

    const jobFilter = `job_id=eq.${encodeURIComponent(job.id)}`;
    const readLog = async () => {
      const resp = await db(`brief_send_log?${jobFilter}&select=subscriber_id,claimed_at,sent_at&limit=100000`);
      if (!resp.ok) return null;
      return new Map((await resp.json()).map((r) => [r.subscriber_id, r]));
    };
    const log = await readLog();
    if (!log) return res.status(502).json({ error: 'upstream' });

    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    const isStale = (row) => !row.sent_at && row.claimed_at < cutoff;
    // Not yet sent: nobody has claimed them, or the claim was abandoned.
    const pending = subscribers.filter((s) => !log.has(s.id) || isStale(log.get(s.id)));

    const one = (subscriberId) => `${jobFilter}&subscriber_id=eq.${encodeURIComponent(subscriberId)}`;
    const owns = async (resp) => {
      if (!resp.ok) return false;
      const rows = await resp.json().catch(() => []);
      return Array.isArray(rows) && rows.length === 1;
    };
    // Take the subscriber for this call. Only one caller can succeed.
    const claim = async (subscriberId) => {
      const now = new Date().toISOString();
      if (log.has(subscriberId)) {
        // an abandoned claim: take it over, but only if it is still abandoned
        return owns(await db(`brief_send_log?${one(subscriberId)}&sent_at=is.null&claimed_at=lt.${encodeURIComponent(cutoff)}`, {
          method: 'PATCH',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({ claimed_at: now }),
        }));
      }
      return owns(await db('brief_send_log?on_conflict=job_id,subscriber_id', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation,resolution=ignore-duplicates' },
        body: JSON.stringify({ job_id: job.id, subscriber_id: subscriberId, claimed_at: now }),
      }));
    };
    const markSent = (subscriberId) =>
      db(`brief_send_log?${one(subscriberId)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ sent_at: new Date().toISOString() }),
      });
    const release = (subscriberId) => db(`brief_send_log?${one(subscriberId)}&sent_at=is.null`, { method: 'DELETE' });

    const started = Date.now();
    let sent = 0;
    let failed = 0;
    let stop = false;
    for (let i = 0; i < pending.length && !stop; i += CHUNK) {
      if (Date.now() - started > BUDGET_MS) break;
      const results = await Promise.all(pending.slice(i, i + CHUNK).map(async (s) => {
        try {
          if (!(await claim(s.id))) return 'skipped';
          const result = await sendOne(s.email, s.id, issue.title);
          if (result.ok) {
            await markSent(s.id);
            return 'sent';
          }
          await release(s.id);
          console.error('send-issue, email failed', result.status, result.text);
          if (result.quota) stop = true;
          return 'failed';
        } catch (err) {
          // A database call broke. Leave any claim to go stale; it is retried later.
          console.error('send-issue, subscriber step failed', err);
          return 'failed';
        }
      }));
      sent += results.filter((r) => r === 'sent').length;
      failed += results.filter((r) => r === 'failed').length;
      await sleep(700);
    }

    // What is left is worked out from today's active subscribers, not from a count.
    const after = await readLog();
    const delivered = after ? subscribers.filter((s) => after.has(s.id) && after.get(s.id).sent_at).length : null;
    const remaining = delivered === null ? null : subscribers.length - delivered;
    if (remaining === 0) {
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
