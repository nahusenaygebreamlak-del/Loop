# Desktop design (web), 20 Oct 2026

This is the computer version of Loop: the same account, data and rules as the phone, laid out for a mouse and keyboard. The owner approved the designs on 20 Oct 2026. This doc is for milestone 9 in `07-build-plan.md`.

Copy `design/` into the repo's `design/` folder. Every screen has a light source (`design/source/desktop/light/W*.dc.html`), a dark twin (`design/source/desktop/dark/DW*.dc.html`) and a screenshot (`design/screenshots/desktop/{light,dark}/`). Screens are drawn at 1440 × 900, except `WNarrow`, which is 1024 × 768. The live prototype is the canvas page "Desktop". Every screen is clickable there, and dark screens link to other dark screens.

Behaviour that is the same on both devices is not repeated here. `02-behaviour-spec.md` still applies: sorting, check-in rules, the 3-moves rule, Trash keeping things for 30 days, Google being read-only, and so on.

## Decisions made with the owner

- **Layout:** three columns with no icon rail. Sidebar (264 px), then the main list, then the detail panel (400 px).
- **Check-ins on the computer** never pop up. They show as a quiet card at the top of Today (`WTodayCheckin`). The phone still sends its notifications, and answering on either device clears both.
- **Quick add** is a pop-up command bar opened with `Q` from anywhere (`WQuickAdd`). It uses the same parsing and highlighted chips as the phone.
- **Process:** core screens first, then the rest. All 40 are now done.

## Layout

| Part | Rules |
|---|---|
| Sidebar | Holds, top to bottom: the logo and sync line ("Synced just now", "Offline · 2 changes waiting"), Search `/`, Today, Next 7 Days, Inbox, Notes, Calendar, All tasks, Lists (+ for a new list), Tags, then pinned to the bottom: Completed, Trash, Settings and Keyboard shortcuts `?`. Each item shows its open count. The active item has the tint background (#DCE6FB) with accent text. |
| Main | Has a header with the small date or context line, a 34 px title, and actions on the right. The primary action always shows its key (`Add task  Q`). Groups are white cards with 18 px corners. Rows are 56 px tall. The selected row uses the tint. |
| Detail panel | A white panel with 24 px corners, 16 px from the window edges. It shows whatever is selected (task, event, deleted item, sorting card). With nothing selected it says "Pick a task to see it here" and gives the key hint. Edits save on their own. It can be turned off in Settings › Detail panel, which gives the main column the space. |
| Pop-ups | Command bar, search, shortcuts, dialogs. Each is centred near the top over a 32% ink scrim, with a 1 px #E4E8F1 border and no shadows. `Esc` or a click outside closes it. |
| Menus | Right-click menu, list ⋯, note ⋯, time picker. Each is a 270 px floating card that opens at the pointer or button. The item under the pointer gets a grey highlight, and delete items are red. |
| Toasts | Sit at the bottom, centred over the main column, in the snackbar style (#141A2E, with #8FB0FF for the action). Undo is `Ctrl Z`, and the toast stays for 6 s. |

### Narrow windows (`WNarrow`)

- **Under 1200 px:** the sidebar hides behind a ☰ button in a top bar, which also holds Search and Add task.
- **Under 900 px:** the detail panel slides over the list and closes with `Esc` or ×.
- **Under 600 px:** use the phone layout.

## Phone patterns and their computer equivalents

| Phone | Computer |
|---|---|
| Bottom sheet | A dialog (`dlgc`, 460 px) or an anchored pop-over |
| Long press → quick actions sheet | Right-click menu (`WContext`), or ⋯ in the detail panel |
| Swipe | Not used. Use the checkbox, the keys or the menu |
| Full-screen check-in, notification buttons | Check-in card on Today (`WTodayCheckin`), plus a browser notification (`WBrowserNotif`) |
| Side menu | Always-visible sidebar |
| Time wheel | Typed field with quick picks; ↑/↓ change it in 15-minute steps (`WCheckinTime`, `WDatePop`) |
| Drag handle | Drag the row itself |

## Keyboard (`WShortcuts` is the source of truth)

- **Anywhere:** `Q` quick add, `N` dump a note to Inbox, `/` search, `?` shortcuts, `G` then `T`/`I`/`C` go to Today/Inbox/Calendar, `Ctrl Z` undo.
- **Selected task:** `↑`/`↓` move, `Enter` open, `Space` done, `D` date, `M` list, `P` priority, `T` tags, `Del` delete (to Trash, with undo).
- **Inbox sorting:**
  - `T` / `M` / `W` pick Today, Tomorrow or This week.
  - `1` / `2` / `3` pick a list.
  - `N` keeps it as a note and `S` skips it.
  - `Enter` confirms and `Esc` stops.
- **Check-in card:** `1` / `2` / `3` pick Today, Tomorrow or Pick day for the focused task, and `A` moves all to today.
- **Notes:** `Ctrl Enter` turns the selected line into a task.

Single-letter keys don't fire while typing in a field. Show the key next to every action that has one.

## Mouse

- **Drag a task** onto a list or tag in the sidebar to move or tag it (the target highlights).
- **Drag onto a day** in Next 7 Days (the day outlines in accent and says "Drop to move here").
- **Drag from "Not scheduled"** onto a time in the Calendar week or day view (`WCalWeek`, `WCalDay`).
- **Right-click a task** for quick actions.
- **Hover a row** for its small actions: Mark not done in Completed, Restore in Trash.

## Check-ins on the computer

- **The card on Today** follows the same rules as the phone. It is answered per task, and "Not now" leaves the tasks where they are.
- **Browser notification:** sent only when Loop is open in a background tab and the person has allowed it (Settings › Browser notifications, on by default once allowed). It has two buttons: "Move all to today" and "Decide in Loop".
- **Blocked notifications:** if the browser blocks them, Settings shows the red "Blocked by your browser" state with how to fix it (`WNotifBlocked`), and check-ins stay as the card on Today.

## Screens

### Core (approved first)

| Screen | What it shows |
|---|---|
| `WToday` | Today: week strip, schedule, anytime tasks, key hints, task in the panel |
| `WTodayCheckin` | Morning check-in card; the panel is empty |
| `WQuickAdd` | `Q` command bar with parsed chips |
| `WList` | A list (Work), grouped by date |
| `WContext` | Right-click quick actions |
| `WDatePop` | `D` date pop-up: typed date, month, time, reminder, repeat |
| `WInbox` | Sorting in the panel, with keys |
| `WCalWeek`, `WCalMonth`, `WCalDay` | Calendar, with the "Not scheduled" drag panel |
| `WSettings` | Two-column settings, plus Browser notifications and Detail panel |
| `WShortcuts` | `?` overlay |
| `WSearch` | `/` search with filters and highlighted matches |

### Views, notes and lists

| Screen | What it shows |
|---|---|
| `WNext7` | Seven day cards in two columns: Google events in grey, "Nothing planned" days, a day as a drop target |
| `WAllTasks` | Grouped by list. Filter chips: All, Has a date, No date, High priority, Overdue. Group and sort menus |
| `WNotes` | Notes list (Pinned / Others) with the editor in the right column. Toolbar: bold, italic, heading, list, checklist. A line can become a task (it shows a "Task · Tue" chip). Has a "Turn into task" button |
| `WNoteMenu` | Note ⋯ menu: Unpin, Turn into task, Send back to Inbox, Duplicate, Download as text, Delete |
| `WCompleted` | Grouped by day, with Mark not done. The panel shows when it was done and when it was due |
| `WTrash` | Note about 30 days, days left on each item (red when 3 or fewer), Restore to [list] and Delete forever in the panel |
| `WEmptyTrash` | Confirm dialog that counts what will go |
| `WTag` | Tag view across lists, with Rename, Delete tag and "Add with #design" |
| `WTagDelete` | Confirm: tasks keep everything except the tag |
| `WListNew` | Name plus 8 colours, and a hint about lists versus tags |
| `WListMenu` | List ⋯ menu: Rename, Colour (inline swatches), Sort by, Show completed, Archive, Delete |
| `WListDelete` | Choose whether the tasks move to Inbox (default) or get deleted too; the list goes to Trash |
| `WEventDetail` | A Google event in the panel (read-only badge), with Add a prep task, Hide from my list and Open in Google |
| `WDoneUndo` | Task ticked, with a toast "Done: … Undo `Ctrl Z`". Delete uses the same toast ("Moved to Trash") |

### Empty, error and edge states

| Screen | What it shows |
|---|---|
| `WTodayDone` | All done: tick, count, Look at tomorrow / Sort Inbox, the rest of the calendar, completed collapsed |
| `WTodayEmpty` | Nothing planned: Add task / Sort Inbox / See next 7 days |
| `WInboxEmpty` | Inbox is clear: a summary of what happened, and Undo sorting (until midnight) |
| `WNotesEmpty` | No notes yet, with what notes are for |
| `WOffline` | Orange banner "You're offline", changes waiting, retry countdown; the sidebar sync line changes |
| `WGoogleFailed` | Red banner on Calendar with Try again / Reconnect; stale events at 60% |
| `WNotifBlocked` | Browser blocks notifications: disabled switch with how to fix it |
| `WCheckinTime` | Check-in time pop-over: quick picks, typed time, Turn off / Save |
| `WBrowserNotif` | The browser notification while another tab is open |
| `WNarrow` | 1024 px window rules |

### Sign-in and first time

| Screen | What it shows |
|---|---|
| `WSignIn` | Blue brand panel with the logo and pitch; Continue with Google (the same button creates an account) |
| `WSignInError` | The Google window was closed, so it shows Try again |
| `WWelcome` | First time on the computer: three differences (Q / N, drag and right-click, check-ins on Today); See all shortcuts / Got it. Can be replayed from Settings |

New users who sign up on the computer see `WWelcome`. They set up check-in times on the phone, or in Settings.

## Dark mode

The palette is the same as the phone (`03-design-system.md` and `10-design-update`). Two additions:

- The pop-up scrim is `rgba(0,0,0,.55)`.
- The month calendar's today cell uses the dark tint #1E2D52.

## Build notes

- **Shared code:** the task, list, sort and parse logic is shared with the phone, so only the layout is new.
- **Shortcuts:** use one handler that is aware of the current context (selected task, sorting, check-in card), so the same letter can mean different things there (`T` = tags or Today while sorting).
- **Drag and drop:** needs keyboard alternatives, which already exist (`D`, `M`).
- **Browser notifications:** use the Notifications API through a service worker so the action buttons work. Fall back to no buttons where the browser doesn't support them.
