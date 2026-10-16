# Behaviour spec

The rules behind the screens. Screen names in `code` match `docs/04-screens-and-interactions.md`.

## 1. Core objects

| Object | Fields | Notes |
|---|---|---|
| **Task** | title, notes (description), date (optional), start time + end time (optional), list, priority (none/low/medium/high), tags, reminder, repeat rule, subtasks, done-at, deleted-at | A task with no date and no list is an Inbox note, not a task (see Inbox). |
| **Subtask** | title, done | Shown as "1 of 3 subtasks" under the parent. |
| **List** | name, colour (6 options), order, archived | Default lists: Work (blue), Personal (orange), Learning (green). |
| **Tag** | name | Typed as `#tag`. Tag view lists every task with it, across lists. |
| **Inbox note** | text, created-at | Undated capture waiting to be sorted. |
| **Note** | title, body (text + checklists), pinned, from-Inbox flag | Free-form notes, separate from tasks. |
| **Google event** | read-only copy of a Google Calendar event | Never written back to Google. |

## 2. Capture: quick add

- The **+** button (bottom centre on every main screen) opens quick add (`VQuickAdd`) over the current screen.
- The text is parsed as you type and the recognised parts are highlighted and shown as chips:
  - dates and times: "tomorrow 3pm", "fri", "next week", "oct 20", "18:00" → date chip
  - `#tag` → tag chip
  - `!high`, `!medium`, `!low` → priority chip
  - `~list` → list chip
- Chips can also be set by tapping them (date picker, priority, tags, list sheets).
- **Rule:** if the result has a date **or** a list, it is saved as a task (`NAdded`: snackbar "Added for tomorrow, 15:00" with View and Undo). If it has neither, it is saved to the **Inbox** (`NQuickAddInbox` shows "No date or list, so it goes to Inbox"; then `NAddedInbox`: "Saved to Inbox" with Open and Undo).
- The Inbox screen also has its own "Dump a thought" field, which always saves to the Inbox.
- The Android **Quick add widget** opens the same quick add.

## 3. Inbox and sorting

- Inbox (`VInbox`) shows undated notes, newest first, with a blue "N notes to sort · about N minutes" card and **Sort now**. Each row has its own **Sort**.
- **Sorting** (`NSortNote`) goes one note at a time with a progress bar ("2 of 5"):
  - **When?** Today / Tomorrow / This week / Pick date
  - **Which list?** Work / Personal / Learning (and other lists)
  - The main button is disabled until a When is chosen, then names the result: "Add to Tomorrow · Personal" (`NSortNoteSet`).
  - **Keep as note** moves it to Notes, marked "from Inbox"; snackbar "Moved to Notes" with Open and Undo (`NMovedToNotes`).
  - **Delete** sends it to Trash. **Skip for now** leaves it in the Inbox and moves on.
  - The X closes sorting; progress so far is kept.
- **All sorted** (`NAllSorted`): a tick, "5 notes, done in about a minute", and a summary: became tasks / went to Notes / deleted. Buttons: Go to Today, Undo sorting.
- **Undo sorting** (`NUndoSorting`): lists everything sorted today with its outcome and its own Undo, plus "Put all N back in the Inbox". Available until midnight that day.

## 4. Today

- Header: date line, big "Today", week strip (Sun–Sat, dots on days that have items, today highlighted). Search top right, menu top left.
- **Schedule:** timed tasks and Google events in time order on a thin blue timeline. The current item is a filled blue card with a bigger ring.
- **Anytime today:** tasks dated today without a time.
- Every task and event has a round check on the right. Ticking a **task** marks it done (filled blue circle, white tick, title crossed out) and shows a "Task done · Undo" snackbar (`NDoneUndo`). Ticking a **Google event** only hides it from your lists; Loop never changes Google.
- Overdue tasks don't sit on Today as a banner. They come back only through the morning check-in (below).
- Task priority shows only as the colour of the check ring: high red, medium orange, low blue, none grey.

## 5. Task actions

- **Tap** a task → Task details (`VTaskDetail`): title, description, Date, List, Priority, Tags, Reminder, subtasks with "Add subtask". Each property row opens its picker sheet.
- **Long press** a task → Quick actions sheet (`NQuickActions`): Today, Tomorrow, Next week, Pick date, Move to list, Priority, Tags, Duplicate, Delete.
- **⋯ on Task details** → `NTaskMore`: Turn into a note, Back to Inbox (clears the date), Duplicate, Delete.
- Pickers (bottom sheets; tapping the dim backdrop closes them):
  - Date and reminder (`NDatePicker`): quick chips (Today, Tomorrow, a suggested day, No date), month calendar, Time, Reminder, Repeat.
  - Repeat (`NRepeat`): Never / Every day / Every week (pick days) / Every month / Every year, with a sentence summary ("Every Friday, starting Oct 23").
  - Move to list (`NMoveList`): search, Inbox + lists with counts, New list.
  - Priority (`NPriority`): High, Medium, Low, None. Tip: type `!high`.
  - Tags (`NTags`): create a new tag, toggle existing ones.
- **Delete** always goes to Trash with a snackbar "Task moved to Trash · Kept for 30 days · Undo" (`NDeleteUndo`).

## 6. Daily check-ins (the core feature)

Default times: **morning 08:30**, **afternoon 14:00**, Inbox sort reminder **18:00**. All changeable in Settings (`NTimePicker`). Check-ins are off at weekends unless "On weekends" is turned on.

### Morning, 08:30
- **With leftovers** (tasks dated before today, not done): notification "N tasks left from yesterday", body naming the first two, buttons **Move to today**, **All done**, **Review** (`VCheckInNotification`).
  - Move to today / All done act **without opening the app**; the notification updates to a confirmation ("Moved 4 tasks to today", Undo, Open Today) (`NNotifActed`).
  - Swiping it away = **Not now**: leftovers stay where they are and come back in tomorrow's check-in.
  - Review or tapping it opens the **full-screen check-in** (`VCheckIn`): the leftover list, then Move all to today, Reschedule, Mark all done, Archive all, Not now.
  - Reschedule (`VCheckInReschedule`): per task Today / Tomorrow / Next week / Pick date / Someday / Done, then "Save and see today".
  - Afterwards Today shows the moved tasks in a tinted "From yesterday" group with a summary snackbar ("2 moved to today, 1 to Monday · 1 marked done · Undo") (`NAfterCheckin`).
- **Without leftovers:** a plain "Today: 4 tasks, 2 events" notification listing the first items, with Open Today (`NMorningPlain`).
- **Full-screen alert (optional):** when enabled, the morning check-in takes over the lock screen (Android full-screen intent). Needs a one-time Android permission (see setup).
- A task carried over 3 times should prompt whether it belongs back in the Inbox (shown as "moved twice" in the subtitle today; the prompt itself is still to design, see open questions).

### Afternoon, 14:00
- Only if open tasks remain today: "Halfway there: 3 still open", naming them, with **Move to tomorrow** and **Open Today** (`NAfternoon`). Otherwise it stays quiet.

### Inbox sort reminder, 18:00
- Only if the Inbox has notes: "5 notes in your Inbox", with **Not today** and **Sort now** (`NSortNotif`). Not today waits until tomorrow 18:00.

### Remind until I act (setting)
- When on, an unanswered morning check-in repeats every 15 minutes.

## 7. First launch

1. Sign in with Google (`NSignIn`).
2. Allow notifications, explained as the two check-ins (`NAllowNotif`); Allow → Android permission prompt; Not now continues.
3. Interactive tutorial on the real Today screen, 3 steps, skippable (`NTut1`–`NTut3`): add a task with natural language, tick it off, dump a note in the Inbox.
4. Today with the first task and a "You're set" card (`NTutDone`).
- The tutorial can be replayed from Settings. Signing in on the computer with an account already used on the phone skips it.

## 8. Setup when it matters

Features are offered the first time they become useful, never on day one. Each offer is skippable.

| Trigger | Offer | Screens |
|---|---|---|
| Tasks left over for the first time | "Meet the check-ins": pick morning and afternoon times → offer full-screen alerts → Android settings toggle → "Check-ins are on" | `NSetupCheckins`, `NSetupFullScreen`, `NAndroidFullScreen`, `NCheckinsOn` |
| Calendar opened for the first time | Inline card "See your meetings next to your tasks?" → Google consent (read-only calendar scope) → calendar with events, "Google Calendar connected · Choose" | `NSetupGoogle`, `NGoogleConsent`, `NCalendarConnected` |
| Inbox reaches 5 notes | Inline card "Want a nudge to sort these?" with 12:00 / 18:00 / 21:00 → "Reminder set for 18:00 · Undo" | `NSetupSort`, `NSortReminderOn` |

## 9. Navigation

Side menu (`NSideMenu2`), opened from the top-left button: Today, Next 7 Days, Inbox, Notes, Calendar, All tasks; then Lists (with + to add); then Tags; then Completed and Trash. Settings is the gear at the top. Counts on the right.

- **Next 7 Days** (`NNext7`): grouped by day, empty days say "Nothing planned · + Add".
- **All tasks** (`NAllTasks`): group by list / date / priority.
- **Lists:** list screen (`VProject`) grouped Overdue / Today / Next 7 days / No date. ⋯ opens list options (`NListMenu`): Rename and colour, Sort tasks by, Show done tasks, Archive list, Delete list → confirm (`NListDelete`, which offers "Archive instead"; deleting sends the list's tasks to Trash). New list (`NListNew`): name + 6 colours.
- **Tag view** (`NTagView`): tasks with that tag grouped Today / Later / No date.
- **Notes** (`NNotes`): cards with title, preview, date, "from Inbox" tag. Editor (`NNoteEditor`): title, text, checklists with the same round checks, toolbar (checklist, bullets, heading, bold). ⋯ (`NNoteMenu`): Make a task, Pin to top, Duplicate, Delete.
- **Completed** (`NCompleted`): grouped by day, filter by list; tapping a filled circle brings the task back.
- **Trash** (`NTrash`): tasks, Inbox notes and notes, each labelled by kind with days left (3 or fewer in red), Restore per row; tap a row for details (`NTrashItem`: Restore to <list>, Delete for good). "Empty Trash now" → confirm (`NEmptyTrash`). Items are deleted for good after 30 days.
- **Calendar:** Month (`VCalendar`: blue dot = tasks, grey dot = Google events; the selected day's agenda below), Week (`NCalWeek`: 7 columns, tasks light blue, events light grey, current task solid blue, red "now" line), Day (`NCalDay`: time grid, "Anytime" chips you can drag onto a time). Tapping an event opens the read-only event sheet (`NEventDetail`: place, guests, notes, "Add a prep task before it", Hide from my list, Open in Google).
- **Search** (`VSearch`): filter chips All / Tasks / Notes / Lists, matches highlighted, recent searches.
- **Settings** (`NSettings2`): Account and Google; Daily check-ins (morning, afternoon, full screen when locked, on weekends); Inbox sort reminder; Lists; Theme (light / dark / follow the phone); Week and time (week start, 12/24 h); Replay the tutorial. **Account and Google** (`NAccount`): profile, Google Calendar status and per-calendar toggles, Disconnect, sync status, Sign out → confirm (`NSignOut`).

## 10. Feedback and safety rules

- Every destructive or bulk action is undoable: tick (snackbar Undo), delete (Trash + Undo), sorting (Undo until midnight), check-in actions (Undo).
- Snackbars sit above the + button, dark, with a light-blue action, and disappear after a few seconds.
- Errors are quiet and in place, and always say whether tasks are safe (e.g. offline: "Offline · changes will sync later"; Google failing: "Can't reach Google Calendar · your tasks are fine"). These states are not drawn yet; follow this tone.

## 11. Widgets (Android)

Today list (with "1 of 6 done" and +), mini month calendar, and a large "Add task or dump a note" button (`VWidgets`). Ticking in the widget marks done.
