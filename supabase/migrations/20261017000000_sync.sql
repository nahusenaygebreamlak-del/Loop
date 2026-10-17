-- Loop: sync support (Milestone 4).
-- 1. Subtasks and tag ids live on the task row (the app edits them together with the task).
-- 2. A tombstone table so deletes reach other devices.
-- 3. Check-in times can be off (null), plus the theme follows the account.

alter table public.tasks
  add column if not exists subtasks jsonb not null default '[]'::jsonb,
  add column if not exists tag_ids uuid[] not null default '{}';

drop table if exists public.task_tags;
drop table if exists public.subtasks;

-- Two phones offline can both create "#design"; ids stay unique, names may repeat.
alter table public.tags drop constraint if exists tags_user_id_name_key;

alter table public.profiles
  alter column morning_time drop not null,
  alter column afternoon_time drop not null,
  alter column sort_time drop not null;

create table if not exists public.deleted_rows (
  id         bigserial primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  table_name text not null check (table_name in ('lists', 'tasks', 'tags', 'inbox_items', 'notes')),
  row_id     uuid not null,
  deleted_at timestamptz not null default now()
);
create index if not exists deleted_rows_user_idx on public.deleted_rows (user_id, deleted_at);

alter table public.deleted_rows enable row level security;
drop policy if exists "own rows" on public.deleted_rows;
create policy "own rows" on public.deleted_rows
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, delete on public.deleted_rows to authenticated;
grant usage, select on sequence public.deleted_rows_id_seq to authenticated;

-- Pulls ask for "changed since"; index updated_at.
create index if not exists lists_updated_idx on public.lists (user_id, updated_at);
create index if not exists tasks_updated_idx on public.tasks (user_id, updated_at);
create index if not exists tags_updated_idx on public.tags (user_id, updated_at);
create index if not exists inbox_items_updated_idx on public.inbox_items (user_id, updated_at);
create index if not exists notes_updated_idx on public.notes (user_id, updated_at);

-- Tombstones older than 60 days are no longer needed.
create or replace function public.purge_tombstones()
returns void language sql security definer set search_path = '' as $$
  delete from public.deleted_rows where deleted_at < now() - interval '60 days';
$$;
revoke execute on function public.purge_tombstones() from public, anon, authenticated;
select cron.schedule('loop-purge-tombstones', '30 3 * * *', 'select public.purge_tombstones()');
