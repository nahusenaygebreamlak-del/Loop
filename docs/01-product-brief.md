# Loop — Product Brief

_Last updated: 16 Oct 2026_

## Name
**Loop**: the daily cycle of capture → plan → check in. (Microsoft has a product called Loop; fine for personal use, revisit if it's ever released.)

## Problem
Keeping a task system up to date is work in itself. Miss a day, tasks pile up and go stale, you feel behind, and you quit. Most apps punish you for being away.

## Who it's for
Me (a busy person juggling several jobs and projects, who has tried and dropped productivity apps). Personal use, not a business.

## Why build instead of using TickTick
TickTick fits the need, but key features are behind a paywall. Confirmed 16 Oct: every calendar view (month, week, day) and "remind until I act" are Premium-only.

## Goals (what success looks like)
1. See all projects, and which tasks from which projects are due today or any day
2. Add tasks quickly and easily
3. Get reminded what to do, morning and afternoon
4. Dump notes, and get nudged to sort them into tasks later
5. Coming back after missed days is easy, not overwhelming

## Scope — v1
**In**
- Projects (lists), each with tasks
- Tags, priorities, subtasks
- Today view: timeline for timed tasks and calendar events, compact list below for untimed tasks
- Fast task entry with natural language (dates, #tags, !priority)
- Inbox as a quick dump, with a nudge to sort items into tasks
- Notes: a separate free-form notes section (title, text, checklists), added 16 Oct
- Calendar view of tasks, plus Google Calendar events (read-only)
- Morning check-in: notification with action buttons + full-screen check-in for leftover tasks (move to today, reschedule, mark all done, archive all)
- Afternoon reminder
- Android home-screen widgets: Today list, Quick add, Calendar
- Search, Settings
- First launch: sign in, allow notifications, then an interactive Notion-style tutorial (add a task, tick it off, dump a note) instead of an empty screen

**Out**
- Finance
- AI features
- iPhone app
- Sharing / collaboration
- Modular "pick your features" setup
- Coaching people to be "more productive"
- TickTick extras: Pomodoro, habits, Eisenhower matrix, countdown, stats, Summary
- Leftover-tasks banner on Today (removed 16 Oct; leftovers live only in the morning notification and check-in)

## Key behaviours (from user flows, 16 Oct)
- Anything added without a date or list goes to the Inbox to be sorted later.
- **Setup when it matters:** features are set up the first time they become useful, never on day one.
  - First time tasks are left over → introduce check-ins, pick morning and afternoon times, offer full-screen alerts (can skip).
  - First time Calendar is opened → offer to show Google Calendar events (can skip).
  - Inbox reaches 5 notes → offer a sort reminder and pick a time.
- Morning check-in: leftovers → notification with buttons (Move to today / All done / Review). No leftovers → plain "today's plan" notification. Swiping it away counts as "Not now"; leftovers come back the next morning.
- Afternoon check-in: only if open tasks remain today; otherwise stays quiet.
- Ticking a task or deleting it shows an undo. Deleted items stay in Trash for 30 days.
- Inbox sorting can be undone per note or all at once until midnight. "Keep as note" moves the item into Notes.
- Google events are read-only; ticking one only hides it from your list.

## Screens
**Designed (Visual v1):** Today, side menu, quick add, task details, list, Inbox, calendar month, search, settings, check-in notification, full-screen check-in, reschedule, widgets home screen, PC Today, PC calendar week, PC Inbox sorting.

**Designed on the "New screens" page (phone, 16 Oct):** every phone screen in the six user flows, 58 in all.
- First launch: sign in, allow notifications, tutorial 1–3, Today with your first task
- Setup when it matters: meet the check-ins, full-screen alerts, Android setting (system), check-ins on, show Google events, Google consent (system), calendar with events, sort reminder, sort reminder set
- Task actions: done with undo, quick actions, date and reminder, repeat, move to list, priority, tags, delete with undo, task ⋯ options
- Capture and sort: quick add with no date, saved to Inbox, saved with a date, 18:00 sort notification, sort one note (empty and chosen), moved to Notes, all sorted, undo sorting
- Check-ins: plain morning notification, after a notification button, 14:00 notification, Today after the check-in
- Navigation: side menu with Notes, Next 7 Days, Notes, note editor, note options, All tasks, add a list, list options, delete list, tag view, Completed, Trash, Trash item, empty Trash, calendar week and day, Google event, full Settings, check-in time picker, Account and Google, sign out

**Open choices to review (16 Oct):**
- Afternoon notification has "Move to tomorrow" and "Open Today" buttons; the flow only had tap.
- Task ⋯ options include "Turn into a note" and "Back to Inbox".
- Settings adds "On weekends" (off), time format, and a Lists page.
- Medium priority orange is close to the Personal list orange.
- Quick actions include Duplicate.

**PC screens:** after the phone screens are approved.

## Platforms & tech
- Android app (notifications and widgets live here) + web app for PC
- One codebase: React Native (Expo)
- Sync and login: Supabase (decided 16 Oct)
- Android installed directly (no Play Store, no fees)
- Full-screen morning check-in needs a one-time permission in Android settings
- Widgets need native Android work on top of Expo

## Visual design (approved 16 Oct: Style A · Clear blue)
- **Palette:** background #F2F4F9, cards #FFFFFF, text #141A2E, secondary text #636B80, lines/empty checks #C9D2E3, soft tint #DCE6FB, accent #2F6BE3 (white text on it)
- **List colors:** Work #2F6BE3, Personal #E0913A, Learning #3A9E7A; extra list colours purple #7A4FD6, pink #D2467E, slate #5B6478. High priority: red check ring #C7372F, medium #D9822B.
- **Font:** Plus Jakarta Sans. "Today" title 36px extra bold; card titles 16px bold; secondary lines 14px
- **Cards:** plain white, 20px corners, generous padding, 12px between cards. No drop shadows anywhere, no dashed outlines.
- **Current item:** filled accent card with white text
- **Timeline:** thin accent line on the left with small rings per item; bigger, thicker ring for the current item
- **Time:** shown under the title ("10:00 – 11:00 · Work"), never in the card corner
- **Check marks:** round check on the right of every task and event; done = filled accent circle with white tick, title crossed out and greyed
- **Events vs tasks:** "Google Calendar" in the secondary line marks events; in calendars events are light grey, tasks light blue
- **Header:** date line, big "Today", week strip with dots for days that have items
- **Add button:** large rounded square, accent color, bottom center, no shadow
- **Sheets and feedback:** bottom sheets over a dim #8E95A6 background; dark #141A2E snackbars with an #8FB0FF Undo
- **Spacing:** keep it airy; avoid cramped layouts
- **Dark mode (16 Oct, "Dark mode" page):** ground #0F1320, cards #1A2030, text #E8ECF5, secondary #9AA3B8, lines and empty checks #3A4357, tint #1E2D52, fills #232B3D, snackbars #2C3550, sheet backdrop #05070D. Accent stays #2F6BE3 for fills; accent text #7AA2FF, red text #FF7D72, red rings #E5544A. Settings › Theme: Light, Dark or follow the phone.
- **Motion:** sheets slide up, the side menu slides in, notifications drop in, snackbars rise, dialogs pop, ticks pop, buttons press in. All off when the phone asks for reduced motion.

## Roles
- Me: UX research and design, review
- Claude: feasibility, all code

## Process
1. Problem ✅
2. Stress test ✅
3. Scope ✅
4. Design ← in progress (visual v1 approved; flows revised 16 Oct; all phone screens designed 16 Oct, awaiting review; PC next)
5. Build
