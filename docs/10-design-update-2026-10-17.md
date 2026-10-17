# Design update, 17 Oct 2026

Answers `09-needs-design.md`. Copy `design/` into the repo's `design/` folder (new files are added; the listed existing files replace their old versions). Every screen has a light file, a dark twin `D<name>`, and a screenshot.

## Decisions made with the owner

- **E1 Week strip:** tapping a day shows that day on the Today screen. The title becomes the weekday ("Monday"), the day is highlighted in solid blue, a **Back to today** chip sits top right, and + adds to the day you're looking at. Swipe the strip for other weeks. `NTodayOtherDay`
- **E2 Tag options:** ⋯ on the tag view opens a sheet to rename the tag (renames it on every task) and to delete it (a confirm dialog; tasks stay, they lose the tag). `NTagMenu`, `NTagDelete`
- **E3 Brand:** the owner's logo is in `design/brand/`. App icon: white mark on accent blue #2F6BE3, adaptive (foreground SVG is inside the 66% safe zone), with themed and notification versions (`NAppIcon`). Splash: accent blue, white mark centred at 112 dp, small white wordmark 64 dp from the bottom (`NSplash`). The "L" badges on notifications, the side menu and Android settings are now the mark.
- **E4 Desktop** is still planned after phone approval.

## A. Open-question screens

| # | Screen | Notes |
|---|---|---|
| A1 | `NCarriedOver` | Bottom sheet, shown once per task the 3rd time it's moved (from the check-in or Today): Back to the Inbox / Give it a real date / Keep it on today / Let it go (delete). Tapping a "moved" task in the full check-in opens it in the prototype. |
| A2 | `NOffline` | A quiet grey pill under the Today title: "Offline · changes will sync later". New tasks say "waiting to sync" with a small cloud icon. Google events are replaced by a grey note. The side menu sync line also changes (see `NSnackbars`). |
| A3 | `NGoogleFailed` | White card with a red dot at the top of Calendar (and Today, once a day): "Can't reach Google Calendar", what may be missing, "Your tasks are fine", Sign in again / Later. Stale events show at 55% opacity with "last seen 09:00". |
| A4 | `NNotifOff` | Settings: an orange-dot card "Notifications are off for Loop" + Open phone settings. Check-in times show "Paused" and are struck through. Today itself is unchanged (leftovers show there when the app opens). |
| A5 | `NNotesEmpty` | Empty-state card with two ways in: New note, or "Keep as note" while sorting. |
| A6 | `NTodayDone` | A big tick card "All 6 done", tomorrow's count, chips See tomorrow / Sort Inbox · N, then a "Done today" group (first 2 + Show more). |

## B. Sheets and pages

| # | Screen | Notes |
|---|---|---|
| B1 | `NTimeSheet` | Starts / Ends tiles (the active one outlined), length chips (No end, 30 min, 1 hour, 2 hours), 5-minute wheel, No time / Save "10:00 – 11:00". Opened from Date and reminder › Time. |
| B2 | `NReminder` | Radio list with the resulting clock time under each option. Footnote: untimed tasks remind at 09:00. |
| B3 | `NSettingsLists` | Drag handles (not up/down buttons), pencil to edit each list, New list, Archived section with Restore. |
| B4 | `NTheme` | Three preview tiles: Light, Dark, Follow phone (selected = outlined, label in blue). |
| B5 | `NWeekTime` | Sunday/Monday segmented chips, then 24-hour / 12-hour radio with examples. |
| B6 | `NSortBy` | Date and time / Priority / Title, with the rule that groups stay. |
| B7 | `NListEdit` | Same as New list, titled "Edit list", with Save. |
| B8 | `NCheckinEmpty` | Tick, "Nothing left over", today's counts, Go to Today. |
| B9 | `NAccountNoGoogle` | "Not connected" row with a Connect button; Sync row with a spinner "Syncing 2 changes…". |
| B10 | `NNotifOff` | Also shows the "Remind until I act" toggle and the "Allow exact times" warning row (orange hint, Allow action, only when Android blocks exact alarms). |

## C. Empty states (`NEmptyStates` board, `NTodayEmpty` for C1)

One pattern: white card, tinted 56 px icon tile, title (17/800), one help line, at most one action. Centered when the whole screen is empty, in place of the list when one section is. The copy for C1–C10 is on the board; it replaces the stand-in grey cards.

## D. Words and small states

- **D1 Snackbars and D2 sync line:** `NSnackbars` (all copy, plus the five sync-line states with colours).
- **D3 Notifications:** `NNotifTexts`: 08:30 with nothing planned (Add a task / Open Today), the result after the 14:00 button (Undo / Open Today), the result after Undo, and the 18:00 reminder with **Not today / Later tonight / Sort now** (Later tonight asks again 2 hours later, as built).
- **D4 Note editor:** `NNoteFormats`: heading, body, bold, bullets, checklist, and "Saving…" in the top bar.
- **D5 Sign-in error:** `NSignInError`: red-tint alert above the button, button reads "Try again". The sign-in screen (`NSignIn`) now uses the real logo.
- **D6 Quick add:** `NQuickAddEmpty`: the placeholder, a hint example, and a disabled send button.
- **D7 12-hour clock:** "10:00 AM", "3:30 PM"; a range in one half of the day is "10:00 – 11:00 AM". See `NWeekTime` and `NSnackbars`.

## Updated existing screens

`NSignIn` (logo), `NSideMenu2` / `VCheckInNotification` / notification screens (mark instead of "L"), `NSettings2` (Theme → `NTheme`, Week and time → `NWeekTime`, Lists → `NSettingsLists`), `NListMenu` (Rename → `NListEdit`, Sort → `NSortBy`), `NDatePicker` (Time → `NTimeSheet`, Reminder → `NReminder`), `NTagView` (⋯ → `NTagMenu`), `VCheckIn` (a moved task → `NCarriedOver`).

## Brand files (`design/brand/`)

- `loop-logo.svg`: the full logo from the owner.
- `loop-mark.svg` and `loop-mark-white.svg`: the mark on its own.
- `loop-wordmark.svg`: the wordmark on its own.
- `icon-full.svg`: the full app icon, 432 px.
- `icon-foreground.svg`: the adaptive-icon foreground, with the mark inside the safe zone.
