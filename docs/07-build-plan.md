# Build plan

Build in small, testable slices. At the end of each milestone, give the owner an installable build (APK or preview) or a web link, plus screenshots next to the matching design screens and a short list of differences.

| # | Milestone | Done when | Screens |
|---|---|---|---|
| 0 | **Setup** | Expo project (TypeScript), theme from `tokens.json` with light/dark switch, font loaded, Supabase project with tables and RLS, Google sign-in works. | `NSignIn` |
| 1 | **Tasks core (local)** | Today (timeline + anytime), lists, task details, quick add with natural-language parsing, tick with undo, delete to Trash with undo, all pickers. Works offline on the device. | `VToday`, `VQuickAdd`, `NAdded`, `VTaskDetail`, `VProject`, `NDoneUndo`, `NDeleteUndo`, `NQuickActions`, `NDatePicker`, `NRepeat`, `NMoveList`, `NPriority`, `NTags`, `NTaskMore` |
| 2 | **Navigation** | Side menu, Next 7 Days, All tasks, lists add/edit/archive/delete, tags view, Completed, Trash (restore, delete for good, empty, 30-day purge), Search, Settings. | `NSideMenu2`, `NNext7`, `NAllTasks`, `NListNew`, `NListMenu`, `NListDelete`, `NTagView`, `NCompleted`, `NTrash`, `NTrashItem`, `NEmptyTrash`, `VSearch`, `NSettings2`, `NTimePicker` |
| 3 | **Inbox and Notes** | Inbox capture, sorting flow, all sorted, undo sorting until midnight, Notes list and editor with checklists, note ↔ task. | `VInbox`, `NQuickAddInbox`, `NAddedInbox`, `NSortNote`, `NSortNoteSet`, `NMovedToNotes`, `NAllSorted`, `NUndoSorting`, `NNotes`, `NNoteEditor`, `NNoteMenu` |
| 4 | **Sync** | Supabase sync with offline queue; the same data on two devices; "Offline" line. | All |
| 5 | **Check-ins** | Morning / afternoon / Inbox notifications with working action buttons from the lock screen, full-screen check-in, reschedule, after-check-in Today, Remind until I act, weekends rule. | `VCheckInNotification`, `NNotifActed`, `VCheckIn`, `VCheckInReschedule`, `NAfterCheckin`, `NMorningPlain`, `NAfternoon`, `NSortNotif` |
| 6 | **First launch and setup when it matters** | Notification permission, tutorial (3 steps, skippable, replayable), the three setup offers with their triggers, Android full-screen permission path. | `NAllowNotif`, `NTut1`–`NTut3`, `NTutDone`, `NSetupCheckins`, `NSetupFullScreen`, `NAndroidFullScreen`, `NCheckinsOn`, `NSetupSort`, `NSortReminderOn` |
| 7 | **Calendar and Google** | Month / week / day views, drag an anytime task onto a time, Google Calendar connect (read-only), per-calendar toggles, event sheet, hide event, account and sign out. | `VCalendar`, `NCalWeek`, `NCalDay`, `NEventDetail`, `NSetupGoogle`, `NGoogleConsent`, `NCalendarConnected`, `NAccount`, `NSignOut` |
| 8 | **Widgets and polish** | The three Android widgets, full motion spec, dark-mode pass on every screen, accessibility pass, APK install guide for the owner. | `VWidgets`, all `D*` |
| 9 | **Desktop (web)** | The computer layout from `docs/11-desktop-design.md`: sidebar + list + detail panel, quick-add bar, right-click menu, drag to lists / days / calendar times, all keyboard shortcuts, check-in card on Today, browser notifications, narrow-window rules, light and dark. Designs approved by the owner on 20 Oct 2026. | All `W*` and `DW*` (40 + 40) |

Each milestone should leave the app usable. Don't start the next one until the owner has seen the current one.
