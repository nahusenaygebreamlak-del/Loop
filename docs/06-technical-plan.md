# Technical plan

Decided with the owner: **Android app + web app from one React Native (Expo) codebase**, **Supabase** for login and sync, Android **installed directly** (APK, no Play Store). Everything else here is a proposal. Check current library docs and versions before using them, and tell the owner in one line if you pick differently.

## Stack

| Concern | Proposal | Notes |
|---|---|---|
| App framework | Expo (React Native) + TypeScript, Expo Router | Android + web from one codebase. Use a development build (not Expo Go), because notifications with actions, full-screen intents and widgets need native code. |
| Styling | A small theme layer from `design/tokens.json` (light/dark) | Any approach is fine as long as colours come from tokens and both themes work. |
| Font | `@expo-google-fonts/plus-jakarta-sans` | Weights 400–800. |
| Animation | `react-native-reanimated` | Implement the motion spec; respect reduced motion (`AccessibilityInfo.isReduceMotionEnabled`). |
| Backend | Supabase: Postgres, Auth (Google sign-in), Row Level Security | Single user, but still use RLS by `user_id`. |
| Local data / offline | Local store (e.g. SQLite via `expo-sqlite`, or WatermelonDB) that syncs with Supabase | The app must work offline and show "Offline · changes will sync later". |
| Natural-language dates | `chrono-node` plus a small parser for `#tag`, `!priority`, `~list` | Highlight the matched spans in quick add. |
| Notifications | `expo-notifications` with notification categories (action buttons) | The check-in buttons (Move to today, All done) must act from a background handler without opening the app. |
| Full-screen check-in | Android full-screen intent (`USE_FULL_SCREEN_INTENT`) | Needs a config plugin or native module. Android 14+ requires the user to allow it in settings, which is why the "Full-screen alerts" setup screen exists. |
| Exact timing | Exact alarms for 08:30 / 14:00 / 18:00 | Scheduling should recompute content at fire time (are there leftovers? open tasks? Inbox notes?), not at schedule time. Consider a native alarm and a headless task. |
| Widgets | `react-native-android-widget` or a native Glance widget | Today list, mini month, Add task (see `VWidgets`). |
| Google Calendar | OAuth with the read-only calendar scope; fetch through a Supabase Edge Function or on the device | Never write to Google. Cache events locally. Per-calendar toggles in `NAccount`. |
| Web | Expo web build hosted anywhere static (or Supabase hosting) | Desktop layout is designed later; for now the web build may use the phone layout centred. |

## Data model (proposal)

```
profiles      id (= auth user), display_name, theme ('system'|'light'|'dark'),
              week_start, time_format, morning_time, afternoon_time, sort_time,
              checkins_enabled, weekends_enabled, full_screen_enabled,
              remind_until_act, tutorial_done_at, setup_flags jsonb
lists         id, user_id, name, color, sort_order, archived_at, deleted_at
tasks         id, user_id, list_id null, title, notes, due_date null, start_time null,
              end_time null, priority smallint (0 none..3 high), reminder_minutes null,
              repeat_rule text null (RRULE), carried_over_count int default 0,
              done_at null, deleted_at null, created_at, updated_at
subtasks      id, task_id, title, done_at null, sort_order
tags          id, user_id, name
task_tags     task_id, tag_id
inbox_items   id, user_id, text, created_at, sorted_at null, sorted_outcome null
              ('task'|'note'|'deleted'), sorted_ref_id null, deleted_at null
notes         id, user_id, title, body jsonb (blocks: text | checklist item), pinned,
              from_inbox bool, deleted_at null, created_at, updated_at
google_calendars  id, user_id, google_id, name, enabled
hidden_events     user_id, google_event_id   (ticking an event = hide it)
```

- **Trash** = rows with `deleted_at` set. A daily job purges anything with `deleted_at` older than 30 days.
- **Undo sorting** uses `inbox_items.sorted_at`, `sorted_outcome` and `sorted_ref_id`, and is allowed while `sorted_at` is today.
- **Leftovers** = tasks with `due_date < today`, not done, not deleted. When the morning check-in moves them, increment `carried_over_count`.
- **Inbox rule:** quick-add text with no date and no list creates an `inbox_items` row, not a task.

## Notification logic

```
08:30  leftovers = overdue open tasks
       if leftovers: actionable notification (Move to today | All done | Review)
                     + full-screen intent if enabled and allowed
       else:         plain "Today: N tasks, M events" (Open Today)
       if remind_until_act and unanswered: repeat every 15 min
14:00  open = today's open tasks; if open: "Halfway there: N still open"
       (Move to tomorrow | Open Today); else nothing
18:00  if inbox has unsorted items: "N notes in your Inbox" (Not today | Sort now)
Weekends: skip unless weekends_enabled.
```

Notification actions run without opening the app, update the data, and replace the notification with a confirmation that has Undo (see `NNotifActed`).

## Quality bar

- Both themes, reduced motion, 44 px targets, screen-reader labels (the `.dc.html` sources include `aria-label`s to reuse as accessibility labels).
- Every destructive action is undoable (see behaviour spec §10).
- Test the check-in logic with unit tests (leftovers, weekends, quiet afternoon, Inbox-only reminder).
