-- Loop: initial schema (docs/06-technical-plan.md › Data model).
-- Every table is scoped to the signed-in user with Row Level Security.

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Profiles (one per auth user; holds settings) ───────────────────────────

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text,
  theme               text not null default 'system' check (theme in ('system', 'light', 'dark')),
  week_start          smallint not null default 0 check (week_start between 0 and 6), -- 0 = Sunday
  time_format         text not null default '24h' check (time_format in ('12h', '24h')),
  morning_time        time not null default '08:30',
  afternoon_time      time not null default '14:00',
  sort_time           time not null default '18:00',
  checkins_enabled    boolean not null default false, -- turned on by "Meet the check-ins"
  weekends_enabled    boolean not null default false,
  full_screen_enabled boolean not null default false,
  remind_until_act    boolean not null default false,
  sort_reminder_enabled boolean not null default false,
  tutorial_done_at    timestamptz,
  setup_flags         jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Lists ──────────────────────────────────────────────────────────────────

create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  color       text not null check (color in ('work', 'personal', 'learning', 'purple', 'pink', 'slate')),
  sort_order  integer not null default 0,
  sort_by     text not null default 'date',
  show_done   boolean not null default false,
  archived_at timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index lists_user_idx on public.lists (user_id);

-- ─── Tasks ──────────────────────────────────────────────────────────────────

create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id            uuid references public.lists (id) on delete set null,
  title              text not null,
  notes              text,
  due_date           date,
  start_time         time,
  end_time           time,
  priority           smallint not null default 0 check (priority between 0 and 3), -- 0 none, 1 low, 2 medium, 3 high
  reminder_minutes   integer,
  repeat_rule        text, -- RRULE
  carried_over_count integer not null default 0,
  sort_order         integer not null default 0,
  done_at            timestamptz,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index tasks_user_due_idx on public.tasks (user_id, due_date);
create index tasks_list_idx on public.tasks (list_id);

create table public.subtasks (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  title      text not null,
  done_at    timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subtasks_task_idx on public.subtasks (task_id);

-- ─── Tags ───────────────────────────────────────────────────────────────────

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.task_tags (
  task_id uuid not null references public.tasks (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (task_id, tag_id)
);

-- ─── Inbox ──────────────────────────────────────────────────────────────────

create table public.inbox_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text           text not null,
  sorted_at      timestamptz,
  sorted_outcome text check (sorted_outcome in ('task', 'note', 'deleted')),
  sorted_ref_id  uuid,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index inbox_items_user_idx on public.inbox_items (user_id, created_at desc);

-- ─── Notes ──────────────────────────────────────────────────────────────────

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null default '',
  body       jsonb not null default '[]'::jsonb, -- blocks: { type: 'text' | 'checklist', ... }
  pinned     boolean not null default false,
  from_inbox boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_idx on public.notes (user_id, updated_at desc);

-- ─── Google Calendar (read-only mirror settings) ────────────────────────────

create table public.google_calendars (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  google_id  text not null,
  name       text not null,
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_id)
);

create table public.hidden_events (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  google_event_id text not null,
  created_at      timestamptz not null default now(),
  primary key (user_id, google_event_id)
);

-- ─── updated_at triggers ────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['profiles', 'lists', 'tasks', 'subtasks', 'tags', 'inbox_items', 'notes', 'google_calendars']
  loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.lists            enable row level security;
alter table public.tasks            enable row level security;
alter table public.subtasks         enable row level security;
alter table public.tags             enable row level security;
alter table public.task_tags        enable row level security;
alter table public.inbox_items      enable row level security;
alter table public.notes            enable row level security;
alter table public.google_calendars enable row level security;
alter table public.hidden_events    enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['lists', 'tasks', 'tags', 'inbox_items', 'notes', 'google_calendars', 'hidden_events']
  loop
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t);
  end loop;
end $$;

-- Child tables inherit ownership from their task / tag.
create policy "own subtasks" on public.subtasks
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())));

create policy "own task tags" on public.task_tags
  for all to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.tags g where g.id = tag_id and g.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.tags g where g.id = tag_id and g.user_id = (select auth.uid()))
  );

-- ─── New user: profile + default lists (Work, Personal, Learning) ───────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));

  insert into public.lists (user_id, name, color, sort_order) values
    (new.id, 'Work', 'work', 0),
    (new.id, 'Personal', 'personal', 1),
    (new.id, 'Learning', 'learning', 2);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Trash: delete for good after 30 days ───────────────────────────────────

create or replace function public.purge_trash()
returns void language sql security definer set search_path = '' as $$
  delete from public.tasks       where deleted_at < now() - interval '30 days';
  delete from public.inbox_items where deleted_at < now() - interval '30 days';
  delete from public.notes       where deleted_at < now() - interval '30 days';
  delete from public.lists       where deleted_at < now() - interval '30 days';
$$;
revoke execute on function public.purge_trash() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('loop-purge-trash', '15 3 * * *', 'select public.purge_trash()');
