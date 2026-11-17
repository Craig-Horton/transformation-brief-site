-- Migration: sending an issue to email subscribers
-- Run this in the Supabase SQL Editor of the project that holds public.brief_subscribers.
-- Idempotent, safe to re-run. Adds two tables, existing data is untouched.
--
-- /api/send-issue reads what to send from brief_send_jobs and records who has
-- been sent it in brief_send_log, so the same issue never reaches anyone twice.

-- 1. One row per thing to send: an issue, or a one-off note.

create table if not exists public.brief_send_jobs (
  id         uuid        primary key default gen_random_uuid(),
  slug       text        not null unique,          -- e.g. issue-33, used in the send record
  markdown   text        not null,                 -- the approved text, first "# " line is the subject
  status     text        not null default 'draft'
             check (status in ('draft', 'approved', 'sent')),
  test_to    text,                                 -- the only address a test copy can go to
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);

-- 2. Who has been sent each job. The primary key is what stops a second send.
--    A row is a claim until sent_at is filled in: only rows with a sent_at count
--    as delivered, and an unsent claim older than ten minutes is tried again.

create table if not exists public.brief_send_log (
  job_id        uuid        not null references public.brief_send_jobs (id) on delete cascade,
  subscriber_id uuid        not null references public.brief_subscribers (id) on delete cascade,
  claimed_at    timestamptz not null default now(),
  sent_at       timestamptz,
  primary key (job_id, subscriber_id)
);

-- For a database that ran the first version of this file.
alter table public.brief_send_log add column if not exists claimed_at timestamptz not null default now();
alter table public.brief_send_log alter column sent_at drop not null;
alter table public.brief_send_log alter column sent_at drop default;

-- 3. RLS on, no policies: only the service role, used by /api/send-issue, can read or write.

alter table public.brief_send_jobs enable row level security;
alter table public.brief_send_log  enable row level security;
