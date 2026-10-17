-- Google Calendar (Milestone 7). The read-only refresh token lives here, readable only by the
-- google-calendar Edge Function (service role). No policies = no access for app users.
create table if not exists public.google_tokens (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);
alter table public.google_tokens enable row level security;
