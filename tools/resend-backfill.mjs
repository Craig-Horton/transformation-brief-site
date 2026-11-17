// Copy the people already on the Brief's list into Resend as contacts.
//
// This script NEVER sends an email. It only creates contacts, so that the
// people who signed up before Resend was connected can receive a Broadcast
// you choose to send later.
//
// Run from this folder, with the same values the Vercel project uses:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... RESEND_API_KEY=... node tools/resend-backfill.mjs
// That is a dry run: it counts the active subscribers and changes nothing.
// Add --apply to create the contacts.

const apply = process.argv.includes('--apply');
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}
if (apply && !RESEND_API_KEY) {
  console.error('Set RESEND_API_KEY to use --apply.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const listResp = await fetch(
  `${SUPABASE_URL}/rest/v1/brief_subscribers?select=email&unsubscribed_at=is.null&order=created_at.asc`,
  { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
);
if (!listResp.ok) {
  console.error('Could not read subscribers:', listResp.status, (await listResp.text()).slice(0, 200));
  process.exit(1);
}
const emails = [...new Set((await listResp.json()).map((r) => String(r.email).trim().toLowerCase()))];
console.log(`${emails.length} active subscribers on the list.`);

if (!apply) {
  console.log('Dry run, nothing changed. Add --apply to create them as Resend contacts. No email is sent either way.');
  process.exit(0);
}

let created = 0;
let existing = 0;
let failed = 0;
for (const email of emails) {
  const resp = await fetch('https://api.resend.com/contacts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  if (resp.ok) {
    created += 1;
  } else {
    // Already a contact: leave it exactly as it is, including an unsubscribe.
    const check = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    if (check.ok) existing += 1;
    else failed += 1;
  }
  await sleep(250); // stay well under Resend's 10 requests a second
}
console.log(`Contacts created: ${created}. Already there, left alone: ${existing}. Failed: ${failed}. No email was sent.`);
