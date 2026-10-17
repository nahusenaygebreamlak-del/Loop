-- Loop: check-ins (Milestone 5).
-- carried_at: the day a check-in moved the task, so Today can show it under "From yesterday".
-- remind_until_act already exists on profiles.

alter table public.tasks add column if not exists carried_at date;
