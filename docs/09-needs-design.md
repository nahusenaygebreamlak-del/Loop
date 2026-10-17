# Needs design

Everything in Loop that has no screen in `design/`. Some are built with a stand-in (marked **Built, stand-in**) so the app works; others aren't built yet (**Not built**). Send designs in any order; each one replaces its stand-in.

Updated 17 Oct 2026, after Milestone 5.

## A. From the open questions (7 and 8)

| # | What | Where it appears | Now |
|---|---|---|---|
| A1 | **Carried over 3 times → "Back to the Inbox?" prompt** | Morning check-in or Today, when a task has been moved for the 3rd time | Not built. The task's line only says "moved twice" / "moved 3 times". |
| A2 | **Offline state** | Wherever you think best (spec: "Offline · changes will sync later") | Built, stand-in: the text replaces "Synced just now" under Loop in the side menu, and shows in Account › Sync. |
| A3 | **Google sync failed card** ("Can't reach Google Calendar · your tasks are fine") | Calendar and Today | Not built (Milestone 7). |
| A4 | **Notifications turned off in Android settings** | Settings › Daily check-ins, maybe Today | Not built (Milestone 6). |
| A5 | **Empty Notes** | Notes, no notes yet | Built, stand-in: grey card "No notes yet. Notes are for things to keep that aren't tasks." |
| A6 | **Today all done** | Today, when every task is ticked | Not built: done tasks just stay ticked in place. |

## B. Sheets and pages built without a design

| # | What | How it works now |
|---|---|---|
| B1 | **Task time picker** (Date and reminder › Time) | Borrowed the check-in time wheel: length chips (No end / 30 min / 1 hour / 2 hours), hour and 5-minute wheel, "No time" and "Save 10:00 – 11:00". |
| B2 | **Reminder picker** (Date and reminder › Reminder, Task details › Reminder) | Option list like Priority: None, At the start, 5 / 15 / 30 min before, 1 hour before, 1 day before. Reminders are saved but don't notify yet. |
| B3 | **Settings › Lists** | Lists in menu order with up/down buttons, "New list", and an Archived section with Restore. |
| B4 | **Settings › Theme** | Option list: Light, Dark, Follow the phone. |
| B5 | **Settings › Week and time** | Two option lists (week starts Sunday / Monday; 24-hour / 12-hour) and Done. |
| B6 | **List options › Sort tasks by** | Option list: Date, Priority, Title. |
| B7 | **Edit list** (List options › Rename and colour) | Reuses New list with the title "Edit list" and a Save button. |
| B8 | **Check-in with nothing left over** (opening the check-in when nothing is overdue) | "Nothing left over" + "Go to Today". |
| B9 | **Account and Google before Google is connected** | "Not connected" row; Sync row shows the sync state; Sign out. |
| B10 | **Settings additions**: "Remind until I act" toggle, "Allow exact times" warning row (when Android blocks exact alarms) | Plain settings rows. |

## C. Empty states (built as a quiet grey card)

| # | Screen | Text now |
|---|---|---|
| C1 | Today with nothing at all | "Nothing planned for today. Tap + to add a task." |
| C2 | A list with no tasks | "No tasks in this list yet." |
| C3 | All tasks, nothing open | "No open tasks. Tap + to add one." |
| C4 | Tag view, nothing open | "No open tasks with this tag." |
| C5 | Completed, nothing done | "Nothing done yet. Ticked tasks show up here." |
| C6 | Trash empty | "Trash is empty." |
| C7 | Inbox empty and nothing sorted today | "Nothing waiting. Dump a thought above and sort it later." |
| C8 | Search with no results | "Nothing matches "…"." |
| C9 | Undo sorting with nothing left | "Nothing left to undo today." |
| C10 | Settings › Lists, no archived lists | "No archived lists." |

## D. Words and small states

| # | What | Now |
|---|---|---|
| D1 | Snackbars not in the designs | "Back in Inbox · Open · Undo", "Note moved to Trash", "Restored to Work", "List deleted · Its tasks are in Trash for 30 days", ""Work" archived · Restore it from Settings › Lists", "Added to Work" (a task with a list but no date). |
| D2 | Sync line states | "Syncing…", "Synced 5 min ago", "Can't sync right now · your tasks are fine" (side menu and Account). |
| D3 | Notification texts not drawn | "Today: nothing planned yet" (08:30 with no tasks), "Moved 3 tasks to tomorrow" (after the 14:00 button), the result after Undo, and the 18:00 reminder's "Later tonight" button (asks again 2 hours later). |
| D4 | Note editor | How headings, bullets and bold lines look; "Saving…" / "Saved · just now". |
| D5 | Sign-in error | Red line under the button: "Couldn't sign in. Check your connection and try again." |
| D6 | Quick add placeholder | "Add a task or dump a note". |
| D7 | 12-hour clock | Times like "3:00 PM" everywhere a time shows. |

## E. Not decided yet (behaviour, then design)

| # | What | Now |
|---|---|---|
| E1 | **Tapping a day in Today's week strip** | Days can't be tapped. |
| E2 | **Tag view ⋯ options** (rename, delete a tag) | No ⋯ button yet. |
| E3 | **App icon and splash screen** | Expo's placeholder icon and splash. |
| E4 | **Desktop / web layout** | Phone layout in the browser (planned after the phone app is approved). |
