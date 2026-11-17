-- Migration: sign-up attribution for Brief subscribers
-- Run this in the Supabase SQL Editor of the project that holds public.brief_subscribers.
-- Idempotent, safe to re-run. Adds columns only, existing rows are untouched.
--
-- /api/subscribe sends these when the columns exist and falls back to the
-- original columns when they do not, so the site keeps working either way.

alter table public.brief_subscribers
  add column if not exists landing_path text,   -- page the form was on, e.g. /archive.html
  add column if not exists referrer     text,   -- external referrer host only, e.g. www.linkedin.com
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text;

create index if not exists brief_subscribers_referrer_idx
  on public.brief_subscribers (referrer, created_at desc);
