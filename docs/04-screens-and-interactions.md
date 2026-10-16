# Screen inventory and interactions

Every phone screen, in flow order. Each has a light file in `design/source/light/`, a dark twin `D<name>` in `design/source/dark/`, and screenshots in `design/screenshots/light|dark/`.

"Tap → target" lists every hotspot wired in the clickable prototype. `(backdrop)` = tapping the dimmed area behind a sheet. Targets are screens in this list.

## Core screens (Visual v1)

### Today  `VToday`

![Today](../design/screenshots/light/VToday.png)

- timeline task card → Task details `VTaskDetail`
- timeline Google event card → Google event `NEventDetail`
- "Read chapter 4" row → Task details `VTaskDetail`
- "Open menu" → Side menu with Notes `NSideMenu2`
- "Search" → Search `VSearch`
- "Add task" (+) → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`


### Quick add  `VQuickAdd`

![Quick add](../design/screenshots/light/VQuickAdd.png)

- (backdrop) → Today `VToday`
- "Add task" → Saved with a date `NAdded`
- "Tomorrow, 15:00" → Date and reminder `NDatePicker`
- "High" → Priority `NPriority`
- "#personal" → Tags `NTags`
- "Personal" → Move to list `NMoveList`


### Task details  `VTaskDetail`

![Task details](../design/screenshots/light/VTaskDetail.png)

- "Back" → Today `VToday`
- "More options" → Task details › ⋯ options `NTaskMore`
- "Mark done" → Done, with undo `NDoneUndo`
- Date row → Date and reminder `NDatePicker`
- List row → Move to list `NMoveList`
- Priority row → Priority `NPriority`
- Tags row → Tags `NTags`
- Reminder row → Date and reminder `NDatePicker`


### Project (Work)  `VProject`

![Project (Work)](../design/screenshots/light/VProject.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "List options" → List › ⋯ options `NListMenu`
- "Add task to Work" → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`
- Draft row → Task details `VTaskDetail`
- Review row → Task details `VTaskDetail`
- Send row → Task details `VTaskDetail`
- Prepare row → Long press · quick actions `NQuickActions`
- Clean row → Task details `VTaskDetail`

### Inbox (notes dump)  `VInbox`

![Inbox (notes dump)](../design/screenshots/light/VInbox.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "Sort now" → Sort one note `NSortNote`
- "Sort" → Sort one note `NSortNote`


### Calendar  `VCalendar`

![Calendar](../design/screenshots/light/VCalendar.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "Week" → Calendar · week `NCalWeek`
- "Day" → Calendar · day `NCalDay`
- "Add task" → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`


### Search  `VSearch`

![Search](../design/screenshots/light/VSearch.png)

- "Back" → Today `VToday`
- "Mark done" → Done, with undo `NDoneUndo`
- Send row → Task details `VTaskDetail`
- <div class="t" style="color: #636B80 row → Completed `NCompleted`
- New row → Inbox (notes dump) `VInbox`


### Check-in · 1 Notification  `VCheckInNotification`

![Check-in · 1 Notification](../design/screenshots/light/VCheckInNotification.png)

- "Move to today" → After a notification button `NNotifActed`
- "All done" → After a notification button `NNotifActed`
- "Review" → Check-in · 2 Full screen `VCheckIn`
- notification title → Check-in · 2 Full screen `VCheckIn`


### Check-in · 2 Full screen  `VCheckIn`

![Check-in · 2 Full screen](../design/screenshots/light/VCheckIn.png)

- "Move all to today" → Today after the check-in `NAfterCheckin`
- "Reschedule" → Check-in · 3 Reschedule `VCheckInReschedule`
- "Mark all done" → Today after the check-in `NAfterCheckin`
- "Archive all" → Today after the check-in `NAfterCheckin`
- "Not now" → Today `VToday`
- "Close check-in" → Today `VToday`


### Check-in · 3 Reschedule  `VCheckInReschedule`

![Check-in · 3 Reschedule](../design/screenshots/light/VCheckInReschedule.png)

- "Back" → Check-in · 2 Full screen `VCheckIn`
- "Save and see today" → Today after the check-in `NAfterCheckin`


### Home screen widgets  `VWidgets`

![Home screen widgets](../design/screenshots/light/VWidgets.png)

- "Add task" → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`


## First launch

### Sign in  `NSignIn`

![Sign in](../design/screenshots/light/NSignIn.png)

- "G Continue" → Allow notifications `NAllowNotif`

### Allow notifications  `NAllowNotif`

![Allow notifications](../design/screenshots/light/NAllowNotif.png)

- "Allow notifications" → Tutorial 1 · Add a task `NTut1`
- "Not now" → Tutorial 1 · Add a task `NTut1`

### Tutorial 1 · Add a task  `NTut1`

![Tutorial 1 · Add a task](../design/screenshots/light/NTut1.png)

- "Save task" → Tutorial 2 · Tick it off `NTut2`
- "Skip" → Today, with your first task `NTutDone`

### Tutorial 2 · Tick it off  `NTut2`

![Tutorial 2 · Tick it off](../design/screenshots/light/NTut2.png)

- "Mark done" → Tutorial 3 · Dump a note `NTut3`
- "Skip" → Today, with your first task `NTutDone`

### Tutorial 3 · Dump a note  `NTut3`

![Tutorial 3 · Dump a note](../design/screenshots/light/NTut3.png)

- "Save and finish" → Today, with your first task `NTutDone`
- "Skip" → Today, with your first task `NTutDone`

### Today, with your first task  `NTutDone`

![Today, with your first task](../design/screenshots/light/NTutDone.png)

- "Got it" → Today `VToday`
- "Open Inbox" → Inbox (notes dump) `VInbox`
- "Open menu" → Side menu with Notes `NSideMenu2`
- "Search" → Search `VSearch`
- "Add task" → Quick add `VQuickAdd`

## Setup when it matters

### Meet the check-ins  `NSetupCheckins`

![Meet the check-ins](../design/screenshots/light/NSetupCheckins.png)

- "Turn on check-ins" → Full-screen alerts `NSetupFullScreen`
- "Not now" → Today `VToday`
- "Morning" → Check-in time `NTimePicker`
- "Afternoon" → Check-in time `NTimePicker`

### Full-screen alerts  `NSetupFullScreen`

![Full-screen alerts](../design/screenshots/light/NSetupFullScreen.png)

- "Open settings" → Android setting (system) `NAndroidFullScreen`
- "Keep the banner" → Check-ins on `NCheckinsOn`

### Android setting (system)  `NAndroidFullScreen`

![Android setting (system)](../design/screenshots/light/NAndroidFullScreen.png)

- "Back to Loop" → Check-ins on `NCheckinsOn`

### Check-ins on  `NCheckinsOn`

![Check-ins on](../design/screenshots/light/NCheckinsOn.png)

- "Back to Today" → Today `VToday`
- "Close" → Today `VToday`

### Show Google events?  `NSetupGoogle`

![Show Google events?](../design/screenshots/light/NSetupGoogle.png)

- "Connect Google" → Google consent (system) `NGoogleConsent`
- "Not now" → Calendar `VCalendar`
- "Open menu" → Side menu with Notes `NSideMenu2`
- "Week" → Calendar · week `NCalWeek`
- "Day" → Calendar · day `NCalDay`

### Google consent (system)  `NGoogleConsent`

![Google consent (system)](../design/screenshots/light/NGoogleConsent.png)

- "Allow" → Calendar with events `NCalendarConnected`
- "Cancel" → Show Google events? `NSetupGoogle`

### Calendar with events  `NCalendarConnected`

![Calendar with events](../design/screenshots/light/NCalendarConnected.png)

- "Choose" → Account and Google `NAccount`
- "Open menu" → Side menu with Notes `NSideMenu2`
- "Week" → Calendar · week `NCalWeek`
- "Day" → Calendar · day `NCalDay`
- "Add task" → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`
- Review row → Task details `VTaskDetail`
- Team sync row → Google event `NEventDetail`

### Sort reminder  `NSetupSort`

![Sort reminder](../design/screenshots/light/NSetupSort.png)

- "Remind me at 18:00" → Sort reminder set `NSortReminderOn`
- "No thanks" → Inbox (notes dump) `VInbox`
- "Open menu" → Side menu with Notes `NSideMenu2`

### Sort reminder set  `NSortReminderOn`

![Sort reminder set](../design/screenshots/light/NSortReminderOn.png)

- "Undo" → Sort reminder `NSetupSort`
- "Sort now" → Sort one note `NSortNote`
- "Sort" → Sort one note `NSortNote`
- "Open menu" → Side menu with Notes `NSideMenu2`

## Task actions

### Done, with undo  `NDoneUndo`

![Done, with undo](../design/screenshots/light/NDoneUndo.png)

- "Undo" → Project (Work) `VProject`
- "Open menu" → Side menu with Notes `NSideMenu2`
- "Add task" → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`

### Long press · quick actions  `NQuickActions`

![Long press · quick actions](../design/screenshots/light/NQuickActions.png)

- (backdrop) → Project (Work) `VProject`
- "Today" → Project (Work) `VProject`
- "Tomorrow" → Project (Work) `VProject`
- "Next week" → Project (Work) `VProject`
- "Pick date" → Date and reminder `NDatePicker`
- "Move to list" → Move to list `NMoveList`
- "Priority" → Priority `NPriority`
- "# Tags" → Tags `NTags`
- "Duplicate" → Project (Work) `VProject`
- "Delete" → Delete, with undo `NDeleteUndo`

### Date and reminder  `NDatePicker`

![Date and reminder](../design/screenshots/light/NDatePicker.png)

- (backdrop) → Task details `VTaskDetail`
- "Done" → Task details `VTaskDetail`
- "Repeat" → Repeat `NRepeat`

### Repeat  `NRepeat`

![Repeat](../design/screenshots/light/NRepeat.png)

- (backdrop) → Date and reminder `NDatePicker`
- "Done" → Date and reminder `NDatePicker`

### Move to list  `NMoveList`

![Move to list](../design/screenshots/light/NMoveList.png)

- (backdrop) → Task details `VTaskDetail`
- "Inbox" → Task details `VTaskDetail`
- "Work" → Task details `VTaskDetail`
- "Personal" → Task details `VTaskDetail`
- "Learning" → Task details `VTaskDetail`
- "New list" → Add a list `NListNew`

### Priority  `NPriority`

![Priority](../design/screenshots/light/NPriority.png)

- (backdrop) → Task details `VTaskDetail`
- "High" → Task details `VTaskDetail`
- "Medium" → Task details `VTaskDetail`
- "Low" → Task details `VTaskDetail`
- "None" → Task details `VTaskDetail`

### Tags  `NTags`

![Tags](../design/screenshots/light/NTags.png)

- (backdrop) → Task details `VTaskDetail`
- "Done" → Task details `VTaskDetail`

### Delete, with undo  `NDeleteUndo`

![Delete, with undo](../design/screenshots/light/NDeleteUndo.png)

- "Undo" → Project (Work) `VProject`
- "Open menu" → Side menu with Notes `NSideMenu2`
- "Add task" → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`

### Task details › ⋯ options  `NTaskMore`

![Task details › ⋯ options](../design/screenshots/light/NTaskMore.png)

- (backdrop) → Task details `VTaskDetail`
- "Turn into a note" → Write a note `NNoteEditor`
- "Back to Inbox" → Inbox (notes dump) `VInbox`
- "Duplicate" → Task details `VTaskDetail`
- "Delete" → Delete, with undo `NDeleteUndo`

## Capture and sort

### Quick add, no date  `NQuickAddInbox`

![Quick add, no date](../design/screenshots/light/NQuickAddInbox.png)

- (backdrop) → Today `VToday`
- "Save to Inbox" → Saved to Inbox `NAddedInbox`
- "Date" → Date and reminder `NDatePicker`
- "Priority" → Priority `NPriority`
- "# Tag" → Tags `NTags`
- "List" → Move to list `NMoveList`

### Saved to Inbox  `NAddedInbox`

![Saved to Inbox](../design/screenshots/light/NAddedInbox.png)

- "Open" → Inbox (notes dump) `VInbox`
- "Undo" → Today `VToday`
- "Open menu" → Side menu with Notes `NSideMenu2`
- "Search" → Search `VSearch`
- "Add task" → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`

### Saved with a date  `NAdded`

![Saved with a date](../design/screenshots/light/NAdded.png)

- "View" → Task details `VTaskDetail`
- "Undo" → Today `VToday`
- "Open menu" → Side menu with Notes `NSideMenu2`
- "Search" → Search `VSearch`
- "Add task" → Quick add, no date `NQuickAddInbox`
- "Mark done" → Done, with undo `NDoneUndo`

### 18:00 sort reminder  `NSortNotif`

![18:00 sort reminder](../design/screenshots/light/NSortNotif.png)

- "Sort now" → Sort one note `NSortNote`
- "Not today" → Today `VToday`
- notification title → Inbox (notes dump) `VInbox`

### Sort one note  `NSortNote`

![Sort one note](../design/screenshots/light/NSortNote.png)

- "Stop sorting" → Inbox (notes dump) `VInbox`
- "Today" → Sort · choices made `NSortNoteSet`
- "Tomorrow" → Sort · choices made `NSortNoteSet`
- "This week" → Sort · choices made `NSortNoteSet`
- "Pick date" → Sort · choices made `NSortNoteSet`
- "Work" → Sort · choices made `NSortNoteSet`
- "Personal" → Sort · choices made `NSortNoteSet`
- "Learning" → Sort · choices made `NSortNoteSet`
- "Keep as note" → Keep as note › moved `NMovedToNotes`
- "Delete" → All sorted `NAllSorted`
- "Skip for now" → All sorted `NAllSorted`

### Sort · choices made  `NSortNoteSet`

![Sort · choices made](../design/screenshots/light/NSortNoteSet.png)

- "Stop sorting" → Inbox (notes dump) `VInbox`
- "Add to Tomorrow" → All sorted `NAllSorted`
- "Keep as note" → Keep as note › moved `NMovedToNotes`
- "Delete" → All sorted `NAllSorted`
- "Skip for now" → All sorted `NAllSorted`
- "Today" → Sort · choices made `NSortNoteSet`
- "Work" → Sort · choices made `NSortNoteSet`

### Keep as note › moved  `NMovedToNotes`

![Keep as note › moved](../design/screenshots/light/NMovedToNotes.png)

- "Stop sorting" → Inbox (notes dump) `VInbox`
- "Open" → Write a note `NNoteEditor`
- "Undo" → Sort one note `NSortNote`
- "Today" → Sort · choices made `NSortNoteSet`
- "Tomorrow" → Sort · choices made `NSortNoteSet`
- "This week" → Sort · choices made `NSortNoteSet`
- "Pick date" → Sort · choices made `NSortNoteSet`
- "Work" → Sort · choices made `NSortNoteSet`
- "Personal" → Sort · choices made `NSortNoteSet`
- "Learning" → Sort · choices made `NSortNoteSet`
- "Keep as note" → All sorted `NAllSorted`
- "Delete" → All sorted `NAllSorted`
- "Skip for now" → All sorted `NAllSorted`

### All sorted  `NAllSorted`

![All sorted](../design/screenshots/light/NAllSorted.png)

- "Go to Today" → Today `VToday`
- "Undo sorting" → Undo sorting `NUndoSorting`
- "Open menu" → Side menu with Notes `NSideMenu2`

### Undo sorting  `NUndoSorting`

![Undo sorting](../design/screenshots/light/NUndoSorting.png)

- (backdrop) → All sorted `NAllSorted`
- "Undo" → Inbox (notes dump) `VInbox`
- "Put all 5" → Inbox (notes dump) `VInbox`

## Daily check-ins

### 08:30 · no leftovers  `NMorningPlain`

![08:30 · no leftovers](../design/screenshots/light/NMorningPlain.png)

- "Open Today" → Today `VToday`
- notification title → Today `VToday`

### After a notification button  `NNotifActed`

![After a notification button](../design/screenshots/light/NNotifActed.png)

- "Undo" → Check-in · 1 Notification `VCheckInNotification`
- "Open Today" → Today after the check-in `NAfterCheckin`

### 14:00 · still open  `NAfternoon`

![14:00 · still open](../design/screenshots/light/NAfternoon.png)

- "Open Today" → Today `VToday`
- "Move to tomorrow" → Today `VToday`
- notification title → Today `VToday`

### Today after the check-in  `NAfterCheckin`

![Today after the check-in](../design/screenshots/light/NAfterCheckin.png)

- "Undo" → Check-in · 2 Full screen `VCheckIn`
- "Open menu" → Side menu with Notes `NSideMenu2`
- "Search" → Search `VSearch`
- "Add task" → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`
- Draft Q4 row → Task details `VTaskDetail`
- Renew row → Task details `VTaskDetail`
- Review row → Task details `VTaskDetail`
- Send row → Task details `VTaskDetail`
- Read row → Task details `VTaskDetail`

## Navigation: menu, notes, lists

### Side menu with Notes  `NSideMenu2`

![Side menu with Notes](../design/screenshots/light/NSideMenu2.png)

- "Today" → Today `VToday`
- "Next 7 Days" → Next 7 Days `NNext7`
- "Inbox" → Inbox (notes dump) `VInbox`
- "Notes" → Notes `NNotes`
- "Calendar" → Show Google events? `NSetupGoogle`
- "All tasks" → All tasks `NAllTasks`
- "Work" → Project (Work) `VProject`
- "Personal" → Project (Work) `VProject`
- "Learning" → Project (Work) `VProject`
- "Add list" → Add a list `NListNew`
- "#design" → Tag view `NTagView`
- "#waiting" → Tag view `NTagView`
- "#errands" → Tag view `NTagView`
- "Completed" → Completed `NCompleted`
- "Trash" → Trash `NTrash`
- "Settings" → Settings `NSettings2`

### Next 7 Days  `NNext7`

![Next 7 Days](../design/screenshots/light/NNext7.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "Search" → Search `VSearch`
- "Add task" → Quick add `VQuickAdd`
- "+ Add" → Quick add `VQuickAdd`
- "Show 4 more" → Today `VToday`
- "Mark done" → Done, with undo `NDoneUndo`
- "Hide from list" → Next 7 Days `NNext7`
- Review row → Task details `VTaskDetail`
- Send row → Task details `VTaskDetail`
- Call bank row → Task details `VTaskDetail`
- Design crit row → Google event `NEventDetail`
- Draft row → Task details `VTaskDetail`

### Notes  `NNotes`

![Notes](../design/screenshots/light/NNotes.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "Search notes" → Search `VSearch`
- "New note" → Write a note `NNoteEditor`
- "Packing" → Write a note `NNoteEditor`
- "Idea" → Write a note `NNoteEditor`
- "Interview" → Write a note `NNoteEditor`
- "Book" → Write a note `NNoteEditor`

### Write a note  `NNoteEditor`

![Write a note](../design/screenshots/light/NNoteEditor.png)

- "Back to Notes" → Notes `NNotes`
- "Note options" → Note › ⋯ options `NNoteMenu`
- "Done" → Notes `NNotes`

### Note › ⋯ options  `NNoteMenu`

![Note › ⋯ options](../design/screenshots/light/NNoteMenu.png)

- (backdrop) → Write a note `NNoteEditor`
- "Make a task" → Task details `VTaskDetail`
- "Pin to top" → Notes `NNotes`
- "Duplicate" → Notes `NNotes`
- "Delete" → Notes `NNotes`

### All tasks  `NAllTasks`

![All tasks](../design/screenshots/light/NAllTasks.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "Search" → Search `VSearch`
- "Add task" → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`
- "Show 3 more" → Project (Work) `VProject`
- "Show 1 more" → Project (Work) `VProject`
- Draft row → Task details `VTaskDetail`
- Review row → Task details `VTaskDetail`
- Call bank row → Task details `VTaskDetail`
- Renew row → Task details `VTaskDetail`
- Read row → Task details `VTaskDetail`

### Add a list  `NListNew`

![Add a list](../design/screenshots/light/NListNew.png)

- (backdrop) → Side menu with Notes `NSideMenu2`
- "Cancel" → Side menu with Notes `NSideMenu2`
- "Create list" → Project (Work) `VProject`

### List › ⋯ options  `NListMenu`

![List › ⋯ options](../design/screenshots/light/NListMenu.png)

- (backdrop) → Project (Work) `VProject`
- "Rename and colour" → Add a list `NListNew`
- "Archive list" → Side menu with Notes `NSideMenu2`
- "Delete list" → Delete list? `NListDelete`

### Delete list?  `NListDelete`

![Delete list?](../design/screenshots/light/NListDelete.png)

- "Cancel" → List › ⋯ options `NListMenu`
- "Delete list" → Side menu with Notes `NSideMenu2`
- "Archive instead" → Side menu with Notes `NSideMenu2`

### Tag view  `NTagView`

![Tag view](../design/screenshots/light/NTagView.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "Tag options" → Tags `NTags`
- "Add task with #design" → Quick add `VQuickAdd`
- "Mark done" → Done, with undo `NDoneUndo`
- Review row → Task details `VTaskDetail`
- Prepare row → Task details `VTaskDetail`
- Redo row → Task details `VTaskDetail`
- Collect row → Task details `VTaskDetail`

## Navigation: completed, trash, calendar, settings

### Completed  `NCompleted`

![Completed](../design/screenshots/light/NCompleted.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "Mark not done" → Project (Work) `VProject`
- "Show 1 more" → Completed `NCompleted`

### Trash  `NTrash`

![Trash](../design/screenshots/light/NTrash.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "Restore" → Trash `NTrash`
- "Empty Trash now" → Empty Trash? `NEmptyTrash`
- Update row → Trash › item `NTrashItem`
- Old wifi row → Trash › item `NTrashItem`
- Gym row → Trash › item `NTrashItem`
- Order row → Trash › item `NTrashItem`

### Trash › item  `NTrashItem`

![Trash › item](../design/screenshots/light/NTrashItem.png)

- (backdrop) → Trash `NTrash`
- "Restore to Work" → Project (Work) `VProject`
- "Delete for good" → Trash `NTrash`

### Empty Trash?  `NEmptyTrash`

![Empty Trash?](../design/screenshots/light/NEmptyTrash.png)

- "Cancel" → Trash `NTrash`
- "Delete 4 items" → Trash `NTrash`

### Calendar · week  `NCalWeek`

![Calendar · week](../design/screenshots/light/NCalWeek.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "Month" → Calendar `VCalendar`
- "Day" → Calendar · day `NCalDay`
- "Add task" → Quick add `VQuickAdd`
- "Review" → Task details `VTaskDetail`
- "Test script" → Task details `VTaskDetail`
- "Q4 plan" → Task details `VTaskDetail`
- "Invoice" → Task details `VTaskDetail`
- "Call bank" → Task details `VTaskDetail`
- "Design crit" → Google event `NEventDetail`
- "1:1" → Google event `NEventDetail`
- "Sync" → Google event `NEventDetail`
- "Dentist" → Google event `NEventDetail`
- "F 16" → Calendar · day `NCalDay`

### Calendar · day  `NCalDay`

![Calendar · day](../design/screenshots/light/NCalDay.png)

- "Open menu" → Side menu with Notes `NSideMenu2`
- "Month" → Calendar `VCalendar`
- "Week" → Calendar · week `NCalWeek`
- "Add task" → Quick add `VQuickAdd`
- "Review" → Task details `VTaskDetail`
- "Team sync" → Google event `NEventDetail`
- "Send invoice" → Task details `VTaskDetail`

### Google event  `NEventDetail`

![Google event](../design/screenshots/light/NEventDetail.png)

- (backdrop) → Calendar `VCalendar`
- "Add a prep task before it" → Quick add `VQuickAdd`
- "Hide from my list" → Calendar `VCalendar`

### Settings  `NSettings2`

![Settings](../design/screenshots/light/NSettings2.png)

- "Back" → Today `VToday`
- "N Account" → Account and Google `NAccount`
- "Morning" → Check-in time `NTimePicker`
- "Afternoon" → Check-in time `NTimePicker`
- "Sort reminder" → Check-in time `NTimePicker`
- "Replay the tutorial" → Tutorial 1 · Add a task `NTut1`
- "Lists" → Side menu with Notes `NSideMenu2`

### Check-in time  `NTimePicker`

![Check-in time](../design/screenshots/light/NTimePicker.png)

- (backdrop) → Settings `NSettings2`
- "Turn off" → Settings `NSettings2`
- "Save 08:30" → Settings `NSettings2`

### Account and Google  `NAccount`

![Account and Google](../design/screenshots/light/NAccount.png)

- "Back to Settings" → Settings `NSettings2`
- "Disconnect" → Settings `NSettings2`
- "Sign out" → Sign out? `NSignOut`

### Sign out?  `NSignOut`

![Sign out?](../design/screenshots/light/NSignOut.png)

- "Cancel" → Account and Google `NAccount`
- "Sign out" → Sign in `NSignIn`
