-- Loop: morning debrief (docs/13 §2.2, build slice 3).
-- One row per day a debrief was opened or answered. Two devices may each write a row for the same day;
-- the app treats the day as answered when any of them is. Safe to run more than once.

create table if not exists public.debriefs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day              date not null,
  opened_at        timestamptz,
  answered_at      timestamptz,
  leftovers_action text check (leftovers_action in ('today', 'done', 'archive', 'reschedule', 'not_now', 'notif_today', 'notif_done')),
  -- Used by the coach's day plan (build slice 5); empty until then.
  plan             jsonb,
  plan_runs        smallint not null default 0,
  plan_state       jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists debriefs_updated_idx on public.debriefs (user_id, updated_at);
create index if not exists debriefs_day_idx on public.debriefs (user_id, day);

drop trigger if exists debriefs_updated_at on public.debriefs;
create trigger debriefs_updated_at before update on public.debriefs
  for each row execute function public.set_updated_at();

alter table public.debriefs enable row level security;
drop policy if exists "own rows" on public.debriefs;
create policy "own rows" on public.debriefs
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.debriefs to authenticated;

alter table public.deleted_rows drop constraint if exists deleted_rows_table_name_check;
alter table public.deleted_rows add constraint deleted_rows_table_name_check
  check (table_name in ('lists', 'tasks', 'tags', 'inbox_items', 'notes', 'seasons', 'debriefs'));

-- Debriefs older than 90 days are no longer needed.
create or replace function public.purge_debriefs()
returns void language sql security definer set search_path = '' as $$
  delete from public.debriefs where day < current_date - 90;
$$;
revoke execute on function public.purge_debriefs() from public, anon, authenticated;
select cron.unschedule('loop-purge-debriefs') where exists (select 1 from cron.job where jobname = 'loop-purge-debriefs');
select cron.schedule('loop-purge-debriefs', '40 3 * * *', 'select public.purge_debriefs()');
