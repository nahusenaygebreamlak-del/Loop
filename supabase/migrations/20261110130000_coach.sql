-- Loop: the coach (docs/13 §5 and §6, build slice 4).
-- Coach settings live on the profile; coach_usage counts calls per day so the server can stop at the daily limit.
-- Safe to run more than once.

alter table public.profiles
  add column if not exists coach_enabled     boolean not null default false,
  add column if not exists coach_consent_at  timestamptz,
  add column if not exists plan_window_start time not null default '09:00',
  add column if not exists plan_window_end   time not null default '18:00';

-- Written only by the coach function (service role). The owner can read their own count.
create table if not exists public.coach_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  calls   smallint not null default 0,
  primary key (user_id, day)
);
alter table public.coach_usage enable row level security;
drop policy if exists "read own usage" on public.coach_usage;
create policy "read own usage" on public.coach_usage
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.coach_usage from authenticated, anon;
grant select on public.coach_usage to authenticated;

-- One step that checks the limit and counts the call, so two calls at once can't both slip through.
create or replace function public.coach_count_call(p_user uuid, p_day date, p_limit int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.coach_usage (user_id, day, calls) values (p_user, p_day, 1)
  on conflict (user_id, day) do update set calls = public.coach_usage.calls + 1
    where public.coach_usage.calls < p_limit
  returning calls into n;
  return n is not null;
end $$;
revoke execute on function public.coach_count_call(uuid, date, int) from public, anon, authenticated;

-- Usage rows older than 30 days are no longer needed.
create or replace function public.purge_coach_usage()
returns void language sql security definer set search_path = '' as $$
  delete from public.coach_usage where day < current_date - 30;
$$;
revoke execute on function public.purge_coach_usage() from public, anon, authenticated;
select cron.unschedule('loop-purge-coach-usage') where exists (select 1 from cron.job where jobname = 'loop-purge-coach-usage');
select cron.schedule('loop-purge-coach-usage', '45 3 * * *', 'select public.purge_coach_usage()');
