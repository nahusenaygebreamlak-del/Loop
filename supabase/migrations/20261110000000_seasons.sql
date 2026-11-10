-- Loop: seasons and tiers (docs/13 §2.1, build slice 2).
-- A season is a stretch of weeks. For that season each list is Core, Secondary or Support.
-- Tiers live on the season row as { list id: tier }; a list that isn't there is Support.
-- Safe to run more than once.

create table if not exists public.seasons (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text,
  start_date date not null,
  end_date   date not null,
  ended_at   timestamptz,                         -- set when the season is ended early
  tiers      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_dates_check check (end_date >= start_date)
);
create index if not exists seasons_updated_idx on public.seasons (user_id, updated_at);

drop trigger if exists seasons_updated_at on public.seasons;
create trigger seasons_updated_at before update on public.seasons
  for each row execute function public.set_updated_at();

alter table public.seasons enable row level security;
drop policy if exists "own rows" on public.seasons;
create policy "own rows" on public.seasons
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.seasons to authenticated;

-- Deletes reach other devices through the tombstone table; let it name seasons too.
alter table public.deleted_rows drop constraint if exists deleted_rows_table_name_check;
alter table public.deleted_rows add constraint deleted_rows_table_name_check
  check (table_name in ('lists', 'tasks', 'tags', 'inbox_items', 'notes', 'seasons'));
