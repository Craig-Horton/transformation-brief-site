// /api/unsubscribe?id=<subscriber id>
//
// The link at the foot of every email from the Brief.
//   GET   shows a page with one button. Nothing changes on GET, so a mail
//         scanner that follows links cannot unsubscribe anyone by accident.
//   POST  unsubscribes. The button posts here, and so do mail clients that
//         use the List-Unsubscribe one-click header.
//
// The id is the subscriber row's random uuid. No email address is ever put
// in the link.
//
// Required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// If Resend is configured (see _email.js) the contact is marked unsubscribed
// there too, so Broadcasts stop as well.

import { UUID_RE, emailConfigured, setContact, siteUrl } from './_email.js';

function page(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${title} | The Transformation Brief</title>
<style>
  body { margin: 0; background: #1a2a47; color: #ffffff; font-family: -apple-system, 'Segoe UI', Arial, sans-serif; line-height: 1.6; }
  main { max-width: 560px; margin: 0 auto; padding: 72px 24px; }
  .kicker { font-weight: 600; font-size: 13px; letter-spacing: 0.16em; color: #e2a358; margin-bottom: 12px; }
  h1 { font-family: Georgia, serif; font-weight: 600; font-size: 32px; line-height: 1.2; margin: 0 0 16px; }
  p { font-size: 17px; margin: 0 0 20px; }
  button { font: inherit; font-weight: 600; font-size: 16px; padding: 13px 24px; background: #c97a2b; color: #ffffff; border: none; cursor: pointer; }
  button:hover { background: #e2a358; color: #1a2a47; }
  a { color: #e2a358; }
</style>
</head>
<body>
<main>
  <div class="kicker">The Transformation Brief</div>
  ${bodyHtml}
</main>
</body>
</html>`;
}

function send(res, status, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).send(html);
}

export default async function handler(req, res) {
  const id = String((req.query && req.query.id) || '');
  const home = siteUrl();

  if (!UUID_RE.test(id)) {
    return send(res, 400, page('Link not recognised',
      `<h1>This link is not recognised.</h1><p>Use the unsubscribe link at the foot of the most recent email from the Brief.</p><p><a href="${home}">Back to the site</a></p>`));
  }

  if (req.method === 'GET') {
    return send(res, 200, page('Unsubscribe',
      `<h1>Unsubscribe from The Transformation Brief?</h1>
  <p>You will stop receiving the Friday email.</p>
  <form method="POST" action="/api/unsubscribe?id=${encodeURIComponent(id)}"><button type="submit">Unsubscribe</button></form>`));
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, page('Not allowed', '<h1>That did not work.</h1>'));
  }

  try {
    const url = process.env.SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !svcKey) {
      console.error('unsubscribe, missing supabase env vars');
      return send(res, 500, page('Something went wrong',
        '<h1>That did not work.</h1><p>Reply to any email from the Brief and you will be removed by hand.</p>'));
    }

    const headers = {
      'apikey': svcKey,
      'Authorization': `Bearer ${svcKey}`,
      'Content-Type': 'application/json',
    };
    const failed = () => send(res, 502, page('Something went wrong',
      '<h1>That did not work.</h1><p>Give it a minute and try again, or reply to any email from the Brief and you will be removed by hand.</p>'));

    // Look the subscriber up whatever their state. A repeat click then
    // finishes an unsubscribe that only got half way the first time.
    const rowUrl = `${url}/rest/v1/brief_subscribers?id=eq.${encodeURIComponent(id)}`;
    const lookup = await fetch(`${rowUrl}&select=email,unsubscribed_at`, { headers });
    if (!lookup.ok) {
      const text = await lookup.text().catch(() => '');
      console.error('unsubscribe, lookup rejected', lookup.status, text.slice(0, 300));
      return failed();
    }
    const found = await lookup.json().catch(() => []);
    const row = Array.isArray(found) ? found[0] : null;

    if (row && !row.unsubscribed_at) {
      const resp = await fetch(rowUrl, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ unsubscribed_at: new Date().toISOString() }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.error('unsubscribe, supabase rejected', resp.status, text.slice(0, 300));
        return failed();
      }
    }

    // Broadcasts are sent from Resend, so the unsubscribe is only complete
    // once Resend has it too. If that step fails, say so, and let the next
    // click try again.
    if (row && emailConfigured()) {
      const ok = await setContact(row.email, true).catch((err) => {
        console.error('unsubscribe, contact step failed', err);
        return false;
      });
      if (!ok) return failed();
    }

    return send(res, 200, page('Unsubscribed',
      `<h1>You are unsubscribed.</h1><p>You will not receive the Friday email again. Every issue stays in the <a href="${home}/archive.html">archive</a> if you want to read one.</p>`));
  } catch (err) {
    console.error('unsubscribe, unexpected error', err);
    return send(res, 500, page('Something went wrong',
      '<h1>That did not work.</h1><p>Give it a minute and try again.</p>'));
  }
}
