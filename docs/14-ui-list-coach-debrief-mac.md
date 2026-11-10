# UI list: seasons, coach, morning debrief, Mac app

_v2 · 10 Nov 2026 · updated after the Mac designs · goes with `13-build-spec-coach-debrief-mac.md` (v2)_

**The drawn screens are the reference.** They're on the "Loop · Coach & Seasons" canvas: the **Mac app** page (computer) and the **Phone drafts** page. Section D maps every computer screen here to its board on the canvas. Colour values, light and dark, are in `15-handoff-coach-debrief-mac.md` and `tokens/loop-tokens.css`.

This lists every new or changed screen, component, state, tap target and line of copy. Claude drafts the screens from it in the existing style. The owner reviews them and corrects anything. Rules from `03-design-system.md` still hold:
- no shadows and no dashed outlines
- white cards on the grey-blue ground
- a round check on the right
- time goes under the title
- 24 px side margins
- 44 px tap targets
- light and dark versions of everything

**Naming:**
- `C…` is a new phone screen, and `DC…` is its dark twin.
- `WC…` is a new computer screen, and `DWC…` is its dark twin.
- `*` marks a change to an existing screen.

**[assumed]** marks copy or behaviour still waiting for the owner's yes (see the build spec §13).

---

## A. New components

Each component is listed with its anatomy, sizes, states and interactions.

### A1. Section header (debrief)
- **Anatomy:** a group label (14 px bold, secondary text), for example "Yesterday", "Left over", "Today's plan", "Season", with an optional right-side text button (accent text, 14 px bold).
- **States:** default only.
- **Spacing:** 24 px above the first section and 28 px between sections.

### A2. Yesterday card
- **Anatomy:** a card (20 px corners) with a big number (28 px extra bold) and "tasks finished" beside it. Under that, up to 3 done titles in secondary text with small filled checks (16 px). Then "+N more" if there are more.
- **States:**
  - **some done**
  - **none done:** "Nothing ticked off yesterday. That's fine." [assumed]
  - **after a weekend:** the label reads "Since Friday"
- **Tap:** "+N more" opens Completed (`NCompleted`), filtered to that range.

### A3. Leftover card
- Reuse the `VCheckIn` list card and action buttons as they are, placed inside the debrief.
- **Anatomy:** a card with task rows (priority ring check, title, "From Mon · Work"). Below it, a primary button **Move all to today** and secondary buttons **Reschedule**, **Mark all done** and **Archive all**. Then the text button **Not now**.
- **States:**
  - **leftovers:** the full card
  - **handled:** the card collapses to one line, for example "Moved 3 to today · Undo" (tint background, 56 px)
  - **none:** the whole section is hidden

### A4. Coach mark
- A small new icon for anything the coach wrote: a simple loop-and-spark glyph, 16 px, in accent text colour. Drawn as `icons/coach-mark.svg` in the handoff pack. It must read without colour, so it also gets a label.
- It goes before the "Today's plan" label and the chat messages. Its screen-reader label is "Coach".

### A5. Plan card (Today's plan)
- **Anatomy:**
  - Top: the coach summary line, 16 px regular, for example "A full morning, so I kept the afternoon light."
  - Then the suggestion rows (A6).
  - Footer row: the primary button **Accept all** (56 px, 18 px corners) and the text buttons **Plan again** and **Not today**.
- **States:**
  1. **Loading:** the summary line reads "Planning your day…", with the spinner and no rows. The buttons are hidden.
  2. **Plan ready:** rows and buttons are shown.
  3. **Partly accepted:** accepted rows show a filled check and a tinted background. Accept all becomes **Accept the rest (N)**.
  4. **All accepted:** the card collapses to one line, for example "Plan added to Today · Undo", with a small **See Today** link.
  5. **Dismissed (Not today):** the card collapses to "No plan today", with a small **Show plan** link.
  6. **Waiting for leftovers:** "Sort the leftovers first, then I'll plan your day." [assumed], with no buttons.
  7. **Nothing to plan:** "Nothing on for today. Enjoy the space." [assumed], with no buttons.
  8. **Offline:** "Offline · the coach will plan when you're back online". If a plan from earlier today exists, it shows instead.
  9. **Failed:** "Couldn't plan right now." with the text button **Try again**.
  10. **Limit reached:** "The coach has done enough for today." Plan again is hidden.
  11. **Coach off:** the whole section is hidden.
- **Plan again:** shows the loading state, then replaces any rows not yet accepted. If 5 runs are used, it's disabled with the hint "Plan again tomorrow".

### A6. Suggestion row
- **Anatomy (72 px min height):**
  - left: a small kind icon (clock = schedule, sun = today, arrow = later)
  - centre:
    - line 1: the task title (16 px bold)
    - line 2: the time or date, for example "10:00 – 11:00", "Today, any time" or "Move to Thu", then " · " and the list name
    - line 3: the reason, in 14 px secondary text, up to 2 lines, for example "Due today and it's high priority."
  - right: a round check (28 px in a 44 px target)
- **Interactions:**
  - **Tap the check:** accepts it. The check pops, the row tints, and the snackbar reads "Added at 10:00 · Undo", "Kept for today · Undo" or "Moved to Thu · Undo".
  - **Tap the time line:** opens the time sheet (schedule) or date sheet (later). The new value shows on the row. Accepting still needs the check.
  - **Tap the title:** opens task details (`VTaskDetail`). Coming back returns to the debrief.
  - **Long press:** quick actions are not offered here.
- **States:** default, pressed (98.5 %), accepted, edited (the time shows in accent text with a small "changed" note), and disabled (when the task was done or deleted meanwhile: greyed out, with "Already done" or "Deleted").
- **Screen reader:** "Write intro. Suggested 10:00 to 11:00, Work. Due today and it's high priority. Accept button."

### A7. Season line card
- **Anatomy:** a card. Line 1: "Week 3 of 12" (16 px bold), followed by a thin progress bar (4 px, accent on a lines-colour track, rounded). Line 2 is optional: one note in secondary text, for example "Core: Learning had nothing done last week".
- **Tap:** opens the Season page (`CSeason`).
- **States:** active with a note, active without a note, and the **ended** state (replaced by A8).

### A8. Season ended card
- **Anatomy:** a tinted card reading "Your season ended on 18 Jan." and one line naming the core lists, with the primary button **Start a new season** and the text button **Not now**.
- Shows from the day after the end date until one of the buttons is used. **Not now** hides it for good for that season.

### A9. Season offer card (once, after 7 days)
- Built from the existing inline offer card (`NSetupGoogle` / `NSetupSort` style), placed at the bottom of the debrief.
- **Copy:** title "Pick what matters for the next 12 weeks?", body "The coach helps you choose a few core lists. Everything else stays as it is." [assumed]. With the coach off, the body reads "Mark a few core lists. Everything else stays as it is." and Start a season opens the manual form.
- **Buttons:** **Start a season** and **Not now**.

### A10. Tier chip
- **Anatomy:** a small chip (12 px corners, tint background, accent text, 13 px bold) reading "Core", "Secondary" or "Support".
- **Where:** list headers (`VProject`), proposal rows and the Season page. Not on task rows, to keep them clean [assumed].

### A11. Tier picker (radio list)
- Uses the existing radio option list (`NPriority` style).
- **Options:**
  - **Core:** "Must happen this season"
  - **Secondary:** "Nice to have"
  - **Support:** "Upkeep, not a focus"

### A12. Chat bubble
- **Coach message:** no bubble. Plain text on the ground, with the coach mark on the first line, 16 px. Max width 100 %.
- **Your message:** a card-coloured bubble, right-aligned, 20 px corners, 16 px text. Max width 85 %.
- **Thinking:** three dots with no bounce, which fade. With reduced motion, the static text "Thinking…".
- **Error:** inline, in secondary text: "That didn't go through." followed by the text button **Try again**.

### A13. Chat composer
- **Anatomy:** a growing input (the existing `GrowingInput`, 1–6 lines) on a card, with a round accent send button (44 px) on the right. Above it is the text button **Make the plan**, shown from the first answer on.
- **States:** empty (send disabled), typing, sending (send shows the spinner), and offline ("You're offline. The coach needs a connection.", input disabled).
- **Keyboard:** it stays above the keyboard (the existing `KeyboardLift`). Dictation uses the phone keyboard's microphone. There's no microphone button of our own.

### A14. Proposal card
- **Anatomy:**
  - an intro line from the coach
  - three groups, **Core**, **Secondary** and **Support**, each holding list rows (list colour square, name, tier chip)
  - new lists marked with a "New" chip and a check to keep them (on by default)
  - under each core list, the suggested first tasks as task rows, each with a keep-check (on by default) and an optional date line
- **Interactions:**
  - tap a list row's tier chip to open the tier sheet
  - tap a "New" list name or a task title to edit it inline
  - tap a keep-check to untick or retick
- **Footer:** the primary button **Save season** and the text button **Keep talking** (back to the chat).

### A15. Install steps card (computer)
- **Anatomy:** a card with numbered steps for the current browser. Safari: "File → Add to Dock". Chrome/Edge: the install icon in the address bar, then "Install". Includes a small illustration of the menu item and the button **Got it**.

---

## B. Phone screens

### `CDebrief`: Morning debrief (replaces `VCheckIn` as the entry point)
**Header:** a back/close button "Close debrief" (top-left, 44 px), the date line ("Tuesday 10 November", secondary) and the title "Good morning" (36 px extra bold) [assumed].

**Body, scrolling, top to bottom:**
1. Yesterday (A1 + A2)
2. Left over (A1 + A3), if there are any
3. Today's plan (A1 with the coach mark + A5), if the coach is on
4. Season (A1 + A7, or A8), if a season is active or just ended
5. Season offer (A9), if it's due

**Footer:** the primary button **See today**, pinned (it opens Today).

**Tap targets:**
- **Close debrief:** goes to Today. If there are leftovers and none was handled, the debrief stays unanswered and the reminders continue (build spec §2.2).
- **"+N more":** opens Completed.
- **Leftover buttons:**
  - **Move all to today**, **Mark all done** and **Archive all** stay on the page and collapse the card (A3), with a snackbar and Undo.
  - **Reschedule** opens `VCheckInReschedule`. **Save and see today** there returns to the debrief instead of Today.
  - **Not now** collapses the card to "Left for tomorrow".
- **Leftover task row:** opens task details.
- **Plan card:** see A5 and A6.
- **Season card:** opens `CSeason`.
- **Start a new season** and **Start a season** open `CSeasonSetup` (coach on) or `CSeasonManual` (coach off).
- **See today:** opens Today.

**States to draw:**
- `CDebrief`: leftovers, the plan waiting for them, and a season (the plan can't be ready while leftovers are open)
- `CDebriefQuiet`: no leftovers and a plan ready
- `CDebriefWaiting`: leftovers with the plan waiting
- `CDebriefAccepted`: leftovers handled and the plan fully accepted
- `CDebriefCoachOff`: sections 1, 2 and 4
- `CDebriefLoading`: the plan is loading
- `CDebriefOffline`
- `CDebriefFailed`
- `CDebriefEnded`: the season-ended card
- `CDebriefOffer`: the 7-day offer
- `CDebriefMonday`: "Since Friday"

**Motion:** content eases up section by section, with the title first. Ticks pop. Collapses animate height. Everything is off with reduced motion.

### `CSeason`: Season page (side menu → Season)
- **With an active season:**
  - Header: "Season", with the season name and "27 Oct – 18 Jan" underneath, and an "Edit season" ⋯ button.
  - The season line card (A7, without the note).
  - Three groups (Core, Secondary, Support), each listing its lists with open task counts. A list row opens that list. The tier chip on each row opens the tier sheet.
  - Bottom: the text button **End season**, in danger colour.
- **No season (`CSeasonEmpty`):**
  - An empty state with the coach mark: "Choose a few lists that matter most for the next 12 weeks."
  - The primary button **Start a season**.
  - Below it, a short list of past seasons with their dates, which open read-only.
- **⋯ menu:** **Change dates** (opens `CSeasonDatesSheet`), **Rename** (inline) and **End season** (opens `CEndSeasonDialog`).

### `CSeasonSetup`: Season setup chat
- **Header:**
  - close button "Close": if there's a conversation, it keeps the draft and goes back
  - title "New season"
  - a subtitle that opens `CSeasonDatesSheet`: "12 weeks · 19 Jan – 12 Apr ›"
- **Body:** the coach's opening question (fixed copy, §2.4 of the build spec), then the messages (A12).
- **Footer:** **Make the plan** (text button) and the composer (A13).
- **⋯ in the header:** **Discard**, which opens `CDiscardSeasonDialog`.

**States to draw:**
- `CSeasonSetup`: the opening question
- `CSeasonSetupChat`: two rounds
- `CSeasonSetupThinking`
- `CSeasonSetupError`
- `CSeasonSetupOffline`
- `CSeasonSetupResume`: shows "Picking up where you left off" as a small line at the top

### `CSeasonProposal`: The coach's proposal
- **Header:** a back button ("Keep talking"), the title "Your season" and the date line.
- **Body:** the proposal card (A14).
- **Footer:** **Save season** (primary).
- **After saving:** go to `CSeason`. The snackbar reads "Season saved · 2 new lists, 6 tasks · Undo".
- **States to draw:**
  - `CSeasonProposal`
  - `CSeasonProposalEdited`: one tier changed, one task unticked
  - `CSeasonProposalLoading`: "Putting it together…"

### `CSeasonManual`: Start a season without the coach
- **Header:** close, then "New season".
- **Body:**
  - a Dates row (opens the dates sheet) and a Name field (optional)
  - all lists, each with a tier picker row: tapping it opens `CTierSheet`, and the default is Support
- **Footer:** **Save season**.

### `*NSideMenu2`: Side menu (changed)
- **New items:**
  - **Debrief** under Today, shown only until the debrief is answered or until 12:00 [assumed]
  - **Season** after Calendar, with "Wk 3/12" as its count text
- **Lists section:** while a season is active, the "Lists" label is replaced by three small labels, **Core**, **Secondary** and **Support**, each followed by its lists. Empty tiers are hidden. **Add list** stays at the end.

### `*VProject`: List page (changed)
- The tier chip (A10) sits beside the list title while a season is active. Tapping it opens `CTierSheet`.

### `*NListMenu`: List ⋯ options (changed)
- A new row, **Season tier**, with the current tier as its value. It opens `CTierSheet` and is shown only while a season is active.

### `*NSettings2`: Settings (changed)
- **New Coach group:**
  - **Coach**: a switch
  - **Plan my day between**: shows "09:00 – 18:00" and opens `CPlanWindowSheet`
  - **What the coach sees**: opens `CCoachPrivacy`
- **New Season group:**
  - **Current season**: shows "Week 3 of 12" or "None" and opens `CSeason`

### `*NMorningPlain`, `*VCheckInNotification`, `*NNotifActed`: Notifications (changed)
- **Morning with leftovers:** the copy and buttons are unchanged. **Review** and a tap now open `CDebrief`.
- **Quiet morning:** the button reads **Open debrief** [assumed], and a tap opens `CDebrief`.
- **After a notification button:** **Open Today** becomes **Open debrief** [assumed].

---

## C. Sheets and dialogs (phone)

| Name | Type | Contents | Actions |
|---|---|---|---|
| `CTierSheet` | Bottom sheet | Title "Season tier · Work", then the tier picker (A11) | Tap an option: it saves and closes, and the snackbar reads "Work is now Core · Undo". Tap the backdrop to close. |
| `CSeasonDatesSheet` | Bottom sheet | Title "Season dates". Rows: Starts (date), Length (chips: 6 weeks, 8, 12, 16, Custom), Ends (date, calculated, editable) | **Save** or close |
| `CPlanWindowSheet` | Bottom sheet | Title "Plan my day between". Two time rows (From and To), using the existing time wheel | **Save 09:00 – 18:00**. An error shows if To isn't after From. |
| `CCoachPrivacy` | Full sheet | Title "Before you turn on the coach". Plain bullets: what's sent (task titles, dates, times, list names, priority, Google event times and titles [assumed]), what's never sent (notes, the Notes section, Inbox, email), that it goes to Google Gemini, and that it only suggests | First time: **Turn on coach** (primary) and **Not now**. Later: **Turn off coach** (danger text) and **Close**. |
| `CEndSeasonDialog` | Dialog | "End this season?" "Tiers will be cleared. Your lists and tasks stay as they are." | **Cancel** and **End season** (danger) |
| `CDiscardSeasonDialog` | Dialog | "Discard this conversation?" "Nothing has been saved yet." | **Cancel** and **Discard** (danger) |

---

## D. Computer screens (Mac app page of the canvas)

Each row names the board to build from. Shortcut labels show ⌘ on a Mac and Ctrl elsewhere.

| Name | Board on the canvas | What it is | Notes |
|---|---|---|---|
| `WBrowserNotif` (changed) | `MacNotif` | The 08:30 notification on the desktop, in both versions: leftovers (**Move to today**, **Decide in Loop**) and quiet morning (**Open debrief**). | Safari may not show the buttons (build spec §2.5); the click then opens the debrief. |
| `WToday` + `WCDebriefCard` | `MacToday`, `MacTodayDone` | The debrief card at the top of Today, and its collapsed done state. Planned tasks carry a "From the plan" chip. | `D` opens the debrief. |
| `WCDebrief` | `MacDebrief` (interactive), `MacDebriefPlan` | Debrief in the main column; the detail panel shows "Already on today", a selected suggestion, or a selected leftover. | Build spec §8 has the layout. Keyboard footer: ↑ ↓, A, ⇧A, ⌘Z. |
| `WCDebrief` states | `MacDebriefLoading`, `MacDebriefFailed`, `MacDebriefOffline`, `MacDebriefLimit`, `MacDebriefNothing`, `MacDebriefDismissed`, `MacDebriefAccepted`, `MacDebriefCoachOff`, `MacDebriefMonday`, `MacDebriefEnded`, `MacDebriefOffer` | One board per state from A5, plus Monday, season ended and the 7-day offer. | Same copy as the phone (section F). |
| Change time popover | `MacChangeTime` | Opens from **Change time…** on a selected suggestion: start and end time fields, a "Fits between your events" hint, **Use this time**. | The suggestion is still applied only by Accept. |
| `Sidebar` (changed) | `MacNav` (component) | Tier groups, **Season** "Wk 3/12", **Debrief** with `D` hint until answered or 12:00. | Used on every Mac board. |
| `WContext` / `WListMenu` (changed) | `MacTierMenu` | Right-click a list → **Season tier ›** → Core, Secondary, Support (current one ticked). Snackbar with Undo. | Only while a season is active. |
| `WCSeason` | `MacSeason` | Week bar, three tier columns with draggable list cards, selected list in the detail panel. | **End season…** opens `MacEndSeason`. |
| `WCSeasonEmpty` | `MacSeasonEmpty` | **Start with the coach**, **Set it up myself**, past seasons, "How a season works". | |
| `WCSeasonManual` | `MacSeasonManual` (interactive) | Dates with a length control, optional name, a tier control per list, live summary, **Save season ⌘S**. | |
| Season dates dialog | `MacSeasonDates` | Starts, length (6, 8, 12, 16 weeks, Custom), ends. | Opens from **Change dates…** and the chat's date subtitle. |
| `WCSeasonSetup` | `MacSeasonSetup`, `MacSetupError`, `MacSetupOffline`, `MacSetupResume` | Chat in the main column, proposal taking shape in the detail panel. | ↩ sends, ⇧↩ new line, ⌘↩ Make the plan. |
| Discard dialog | `MacDiscard` | "Discard this conversation?" · Nothing has been saved yet. · **Cancel**, **Discard**. | |
| `WCSeasonProposal` | `MacSeasonProposal` (interactive), `MacProposalLoading` | Tier groups with keep-checkboxes on first tasks; selected task editable in the panel. | **Save season ⌘S** with the live count. |
| `WSettings` (changed) | `MacSettings` (interactive) | New Coach and Season sections; Appearance offers Match Mac. | The install row is hidden in the installed app. |
| Plan window dialog | `MacPlanWindow` | "Plan my day between", From and To, error if To isn't after From. | |
| `CCoachPrivacy` on Mac | `MacPrivacy` | What's sent, what's never sent, "it only suggests", the data-use line. | The data-use line follows build spec §13 question 10. |
| `WShortcuts` (changed) | `MacShortcuts` | Everywhere, In the debrief, Season setup. New ones are marked. | |
| `WCInstall` | `WCInstall` | Install steps in the browser: Safari (File → Add to Dock) or Chrome/Edge. | Firefox: "Your browser can't install apps. Use Safari or Chrome." |
| `WCNarrow` | `MacNarrow` | An 880 px window: icon sidebar, detail panel sliding over the main column. | Under 600 px, use the phone layout (Phone drafts page). |
| Dark mode | `MacDarkDebrief`, `MacTokens` | The debrief with a plan in dark, and every colour token side by side in light and dark. | All other screens map one-to-one through the tokens. |

---

## E. Mac app pieces
- **App icon:** files in the handoff pack's `icons/` folder:
  - `loop-icon-macos-1024.png` and `-512.png`: rounded square with a transparent margin, for Safari's Dock
  - `loop-icon-maskable-512.png`: full-bleed square, mark inside the safe circle, for Chrome
  - `loop-icon-192.png`, `apple-touch-icon-180.png`, `favicon-32.png`
  - the SVG sources, so the mark can be swapped and re-exported
- **Window:** the title bar colour follows `theme_color` (accent) in Chrome. Safari uses the page colour. Check that both look right in light and dark.
- **Splash (Chrome):** `background_color` ground with the icon. Nothing to design beyond the icon.

---

## F. Copy deck (all new strings)

Lines marked [a] are assumed.

| Where | Copy |
|---|---|
| Debrief title | Good morning [a] |
| Yesterday, some | 4 tasks finished |
| Yesterday, none | Nothing ticked off yesterday. That's fine. [a] |
| Yesterday, after weekend | Since Friday |
| Leftovers handled | Moved 3 to today · Undo / Marked 3 done · Undo / Archived 3 · Undo / Left for tomorrow |
| Plan loading | Planning your day… |
| Plan waiting | Sort the leftovers first, then I'll plan your day. [a] |
| Plan nothing | Nothing on for today. Enjoy the space. [a] |
| Plan offline | Offline · the coach will plan when you're back online |
| Plan failed | Couldn't plan right now. · Try again |
| Plan limit | The coach has done enough for today. |
| Plan buttons | Accept all · Accept the rest (N) · Plan again · Not today · Show plan · See Today |
| Plan accepted | Plan added to Today · Undo |
| Suggestion snackbars | Added at 10:00 · Undo / Kept for today · Undo / Moved to Thu · Undo |
| Season line | Week 3 of 12 · Core: Learning had nothing done last week |
| Season ended | Your season ended on 18 Jan. · Start a new season · Not now |
| Season offer | Pick what matters for the next 12 weeks? · The coach helps you choose a few core lists. Everything else stays as it is. [a] · Coach off: Mark a few core lists. Everything else stays as it is. |
| Chat opener | Imagine it's 12 weeks from now. What do you want to have happened, at work and in life? |
| Chat buttons | Make the plan · Keep talking · Save season · Discard |
| Chat resume | Picking up where you left off |
| Chat offline | You're offline. The coach needs a connection. |
| Season saved | Season saved · 2 new lists, 6 tasks · Undo |
| Tier names and hints | Core: Must happen this season · Secondary: Nice to have · Support: Upkeep, not a focus |
| Tier changed | Work is now Core · Undo |
| End season dialog | End this season? · Tiers will be cleared. Your lists and tasks stay as they are. |
| Settings | Coach · Plan my day between · What the coach sees · Current season · Use Loop as an app |
| Privacy title | Before you turn on the coach |
| Install | Use Loop as an app · File → Add to Dock · Got it · Needs macOS Sonoma or later. · Your browser can't install apps. Use Safari or Chrome. |
| Mac debrief | See Today (esc) · Already on today · From Google Calendar. The coach plans around these and never moves them. · Click a task to see it here. · Suggested / Accepted · Change time… / Change day… · Task notes stay on your devices. The coach doesn't see them. |
| Mac Today | From the plan · Debrief done · Plan added · Open |
| Mac season | How a season works · Start with the coach · Set it up myself · Drag a list to another tier, or right-click it in the sidebar. · Nothing done here last week. |
| Mac chat | Question N of 4 at most · Taking shape · Nothing saved yet · The coach sees what you type here and your list names. The conversation stays on this Mac until you save or discard. |
| Mac proposal | Your season · Keep talking · First task · suggested · Edits here change the proposal only. Nothing is created until you save. · N new list, N tasks · one Undo |

Coach-written text (summaries, reasons, questions) is generated by Gemini. Its tone rules are in build spec §6.5.

---

## G. What's drawn

- **Mac app page:** every computer screen in section D, light, plus the dark debrief and the token sheet. Interactive boards: `MacDebrief`, `MacDebriefPlan`, `MacSeasonManual`, `MacSeasonProposal`, `MacSettings`, `WCInstall`.
- **Mac flow chart:** `MacFlow`, three lanes (morning debrief, season setup, install).
- **Phone drafts page:** `CDebrief` and its 13 states, `CSeason`, `CSeasonEmpty`, `CTierSheet`, `CSeasonManual`, `CSeasonDatesSheet`, `CEndSeasonDialog`, the changed side menu. The phone chat, proposal, settings and privacy sheet are not drawn yet; the Mac versions show their content.
- **Dark mode:** drawn for one representative Mac screen. Every other screen uses the same tokens, so the dark version is a token swap, not a redesign. The token sheet shows each pair.
- **Icons:** `icons/coach-mark.svg`, `suggestion-schedule.svg`, `suggestion-today.svg`, `suggestion-later.svg`. Check them against `Icon.tsx` for duplicates.
