// /api/subscribe
//
// Vercel serverless function. Receives a subscribe submission from the brief
// site and writes one row into public.brief_subscribers.
//
// Mirrors the pulse-submit.js pattern. Same env vars, same CORS allowlist,
// same Supabase service-role write path.
//
// Required environment variables (set in Vercel project settings):
//   SUPABASE_URL                  e.g. https://xxxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY     server-only, bypasses RLS
//   ALLOWED_ORIGINS               comma-separated CORS allowlist
//
// A new subscriber is also added as a Resend contact and sent the welcome
// email, once RESEND_API_KEY and BRIEF_FROM_EMAIL are set (see _email.js).
// Without them this function behaves as it always has.

import { emailConfigured, setContact, sendWelcome } from './_email.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Soft in-memory rate limit, resets on cold start. Prevents trivial mashing.
const recentSubmissions = new Map();
const WINDOW_MS = 60 * 1000;

function corsHeaders(origin) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const { email, source, anon_token, path, referrer, utm_source, utm_medium, utm_campaign } = req.body || {};

    if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'bad_email' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Soft dedupe / rate limit, 60s per IP+email
    const ip = req.headers['x-forwarded-for'] || 'unknown';
    const key = `${ip}:${cleanEmail}`;
    const now = Date.now();
    const last = recentSubmissions.get(key);
    if (last && now - last < WINDOW_MS) {
      return res.status(429).json({ error: 'too_fast' });
    }
    recentSubmissions.set(key, now);
    if (recentSubmissions.size > 500) {
      for (const [k, t] of recentSubmissions) {
        if (now - t > WINDOW_MS) recentSubmissions.delete(k);
      }
    }

    const url = process.env.SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !svcKey) {
      console.error('subscribe, missing supabase env vars');
      return res.status(500).json({ error: 'config' });
    }

    const row = {
      email: cleanEmail,
      source: typeof source === 'string' && source.length <= 64 ? source : 'web',
      anon_token: typeof anon_token === 'string' && anon_token.length <= 64 ? anon_token : null,
      user_agent: (req.headers['user-agent'] || '').slice(0, 256),
    };

    // Sign-up attribution, sent by site.js. Columns come from migration 003.
    const clip = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
    const attribution = {
      landing_path: clip(path, 200),
      referrer: clip(referrer, 200),
      utm_source: clip(utm_source, 100),
      utm_medium: clip(utm_medium, 100),
      utm_campaign: clip(utm_campaign, 100),
    };
    const hasAttribution = Object.values(attribution).some((v) => v !== null);

    const insert = (body) =>
      fetch(`${url}/rest/v1/brief_subscribers`, {
        method: 'POST',
        headers: {
          'apikey': svcKey,
          'Authorization': `Bearer ${svcKey}`,
          'Content-Type': 'application/json',
          // Treat duplicate emails as success, the user does not need to know.
          // The new row comes back so its id can sign the unsubscribe link.
          'Prefer': 'return=representation,resolution=ignore-duplicates',
        },
        body: JSON.stringify(body),
      });

    let resp = await insert(hasAttribution ? { ...row, ...attribution } : row);

    // If the attribution columns are not there yet (migration 003 not run),
    // PostgREST answers 400. Keep the sign-up and drop the attribution.
    if (resp.status === 400 && hasAttribution) {
      const text = await resp.text().catch(() => '');
      console.warn('subscribe, retrying without attribution', text.slice(0, 200));
      resp = await insert(row);
    }

    if (!resp.ok && resp.status !== 409) {
      const text = await resp.text().catch(() => '');
      console.error('subscribe, supabase rejected', resp.status, text.slice(0, 300));
      return res.status(502).json({ error: 'upstream' });
    }

    // Only a newly created row gets a welcome. An address that is already on
    // the list comes back as 409 or an empty result, and is left alone.
    let created = null;
    if (resp.ok) {
      const saved = await resp.json().catch(() => null);
      if (Array.isArray(saved) && saved[0] && saved[0].id) created = saved[0];
    }

    if (created && emailConfigured()) {
      // Awaited so the work finishes before the function is frozen. A failure
      // here is logged and never costs the visitor their sign-up.
      const results = await Promise.allSettled([
        setContact(cleanEmail, false),
        sendWelcome(cleanEmail, created.id),
      ]);
      results.forEach((r) => {
        if (r.status === 'rejected') console.error('subscribe, email step failed', r.reason);
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('subscribe, unexpected error', err);
    return res.status(500).json({ error: 'server' });
  }
}
