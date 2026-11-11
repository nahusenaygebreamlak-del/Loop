-- Loop: goal lines and the coach's brief on a season (docs/13 §18, 11 Nov 2026).
-- goals: { list id: "the outcome that list is working toward this season" }.
-- brief: a short summary of what the person told the coach at setup; the daily plan reads it.
-- Safe to run more than once. Until it has run, the app keeps both on the device and syncs the rest.

alter table public.seasons add column if not exists goals jsonb not null default '{}'::jsonb;
alter table public.seasons add column if not exists brief text;
