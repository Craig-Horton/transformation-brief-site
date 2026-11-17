// Shared email helpers for the Brief's serverless functions.
// The leading underscore keeps this file from becoming a route.
//
// Environment variables (Vercel project settings). Email is switched off,
// and sign-ups keep working exactly as before, until the first two are set:
//   RESEND_API_KEY     server-only key from resend.com
//   BRIEF_FROM_EMAIL   sender on a domain verified in Resend,
//                      e.g. Craig Horton <brief@craighortonadvisory.com>
//   BRIEF_REPLY_TO     optional, where replies should go
//   SITE_URL           optional, defaults to https://www.craighortonadvisory.com

const RESEND = 'https://api.resend.com';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.BRIEF_FROM_EMAIL);
}

export function siteUrl() {
  return (process.env.SITE_URL || 'https://www.craighortonadvisory.com').replace(/\/+$/, '');
}

// The subscriber row id is a random uuid, so the link carries no email address.
export function unsubscribeUrl(id) {
  return `${siteUrl()}/api/unsubscribe?id=${encodeURIComponent(id)}`;
}

function resend(path, method, body, extraHeaders) {
  return fetch(`${RESEND}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Keep the Resend contact in step with the subscriber list. Contacts are what
// Broadcasts are sent to. Create first, and if the contact is already there,
// update its subscription state instead.
export async function setContact(email, unsubscribed) {
  const created = await resend('/contacts', 'POST', { email, unsubscribed });
  if (created.ok) return true;
  const updated = await resend(`/contacts/${encodeURIComponent(email)}`, 'PATCH', { unsubscribed });
  if (!updated.ok) {
    const text = await updated.text().catch(() => '');
    console.error('email, contact not saved', created.status, updated.status, text.slice(0, 200));
  }
  return updated.ok;
}

// Make sure a contact exists, without touching one that is already there.
// Used when an address that is already on the list signs up again: it repairs
// a contact that was never created, and it cannot re-subscribe anyone.
export async function ensureContact(email) {
  const created = await resend('/contacts', 'POST', { email, unsubscribed: false });
  return created.ok;
}

// ---------------------------------------------------------------------------
// Welcome email. Edit the wording here.
// ---------------------------------------------------------------------------
export const WELCOME_SUBJECT = 'You are on the list for The Transformation Brief';

const WELCOME_PARAGRAPHS = [
  'Hello,',
  'Thank you for subscribing to The Transformation Brief.',
  'Each Friday morning you will receive one lead story from the week and three shorter items on AI transformation, read through the lens of management, governance and behaviour. I write it for leaders who have to decide what changes in their organisation and what that means for their colleagues.',
  'If an issue matches what you are seeing in your own organisation, or you disagree with me, reply to this email and tell me.',
  'Craig',
];
const WELCOME_FOOTER = 'The Transformation Brief is written in a personal capacity and uses public sources.';

export function welcomeText(id) {
  return [
    ...WELCOME_PARAGRAPHS,
    `You can unsubscribe with one click here: ${unsubscribeUrl(id)}`,
    WELCOME_FOOTER,
  ].join('\n\n');
}

export function welcomeHtml(id) {
  const p = 'margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a2a47;';
  const small = 'margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#647087;';
  const body = WELCOME_PARAGRAPHS.map((t) => `<p style="${p}">${t}</p>`).join('');
  return `<!DOCTYPE html><html lang="en-GB"><body style="margin:0;padding:24px;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;">
${body}
<hr style="border:none;border-top:1px solid #d9dce2;margin:24px 0 16px;">
<p style="${small}">You can <a href="${unsubscribeUrl(id)}" style="color:#a65f1a;">unsubscribe with one click</a>.</p>
<p style="${small}">${WELCOME_FOOTER}</p>
</div></body></html>`;
}

export async function sendWelcome(email, id) {
  const message = {
    from: process.env.BRIEF_FROM_EMAIL,
    to: [email],
    subject: WELCOME_SUBJECT,
    text: welcomeText(id),
    html: welcomeHtml(id),
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl(id)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
  if (process.env.BRIEF_REPLY_TO) message.reply_to = process.env.BRIEF_REPLY_TO;

  // One welcome per subscriber row, even if the request is retried.
  const resp = await resend('/emails', 'POST', message, { 'Idempotency-Key': `welcome-${id}` });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    console.error('email, welcome not sent', resp.status, text.slice(0, 200));
  }
  return resp.ok;
}
