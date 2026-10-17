-- Check-ins start off for new accounts; "Meet the check-ins" (NSetupCheckins) turns them on
-- the first time tasks are left over, and "Want a nudge to sort these?" (NSetupSort) sets the Inbox reminder.
alter table public.profiles
  alter column morning_time drop default,
  alter column afternoon_time drop default,
  alter column sort_time drop default;
