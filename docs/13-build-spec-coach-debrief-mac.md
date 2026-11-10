# Build spec: seasons, coach, morning debrief, Mac app

_v2 · 10 Nov 2026 · updated after the Mac designs · builds on `12-coach-debrief-mac.md`_

This is the engineering spec for the November additions. It sits next to `02-behaviour-spec.md` and `06-technical-plan.md`, and everything in those still applies unless this doc says otherwise. Screens and components are listed in `14-ui-list-coach-debrief-mac.md`. Screen names here (`C…` for phone, `WC…` for computer) match that list. The drawn screens live on the "Loop · Coach & Seasons" canvas: the **Mac app** page is the computer reference, and the **Phone drafts** page is the phone reference. Colours, icons and the coach's system instruction are in `15-handoff-coach-debrief-mac.md`.

Items marked **[assumed]** are calls Claude made that the owner hasn't confirmed yet. §13 lists each one with the answer used, so the build can go ahead. Change any of them and the screens follow.

**What changed in v2:** see §14 at the end.

---

## 1. Scope

**In**
1. **Seasons and tiers.** One active season at a time. For that season, each list is marked Core, Secondary or Support.
2. **Morning debrief.** One page that replaces the full-screen morning check-in on the phone and the check-in card on the computer.
3. **Coach, part A: plan my day.** It suggests times for today's tasks inside the debrief. Suggest only.
4. **Coach, part B: season setup chat.** A brain dump, then follow-up questions, then a proposal of tiers, new lists and first tasks. Suggest only.
5. **Mac app.** Loop's web build made installable (Safari "Add to Dock", Chrome "Install").

**Out** (still)
Focus mode, timers, app blocking, screen tracking, focus scores, energy ratings, drift reports, a free chat with the coach, writing to Google Calendar, a native Mac app, iPhone. The coach never acts without a tap.

## 2. Product rules

### 2.1 Seasons
- A season has a name (optional; default "Season 1", "Season 2"…), a start date (default today), an end date (default start + 12 weeks − 1 day) and tiers for lists.
- **Only one season can be active.** A season is active when today is between its start and end dates and it hasn't been ended early.
- A new season can't start while another is active. The owner must end the current one first, which needs a confirm dialog.
- **Tiers:** `core`, `secondary`, `support`. A list without a tier counts as Support. Archived and deleted lists are ignored.
- **End date example:** a season starting Tue 27 Oct ends Mon 18 Jan (12 weeks, counting both the start and end days). Week numbers count from the start date: 10 Nov is in week 3. With a custom length, N is the number of days divided by 7, rounded up.
- Ending a season, either early or by reaching its end date, keeps its record (read-only, for history) and stops tiers showing anywhere. The next season starts with no tiers. If the previous season's tiers exist, the setup offers them as a starting point.
- **Season-ended card:** shows in the debrief from the day after the end date until you tap **Start a new season** or **Not now**. Not now hides it for good for that season.
- Deleting a list removes its tier row. Restoring the list from Trash restores the tier only if that season is still active.
- Seasons never block anything. With no active season, Loop behaves exactly as it does today.

### 2.2 Morning debrief
- **Which day:** the debrief belongs to a date, today.
- **Opened from:**
  - the morning notification (tap, or **Review**)
  - the plain "today's plan" notification on quiet mornings
  - the lock-screen full-screen alert **[assumed]**
  - the side-menu item **Debrief**, which shows only until the debrief is answered or until 12:00 **[assumed]**
  - on the computer, the debrief card at the top of Today (replaces `WTodayCheckin`)
- **Sections, in order:**
  1. **Yesterday:** "You finished N tasks" plus the first three titles. "Yesterday" means the last day the check-ins ran: Monday covers Saturday and Sunday if weekends are off, and the line reads "Since Friday". With 0 done, the line reads "Nothing ticked off yesterday. That's fine." **[assumed copy]**
  2. **Left over:** shows only if there are leftovers. It uses the same list and actions as `VCheckIn`: Move all to today, Reschedule (opens `VCheckInReschedule`, unchanged), Mark all done, Archive all, Not now. Same Undo snackbars, same `carried_over_count` and `carried_at` updates.
  3. **Today's plan, from the coach:** shows only when the coach is on (§5). See §2.3.
  4. **Season line:** shows only while a season is active. It reads "Week W of N" plus at most one note, for example "Core: Learning had nothing done last week". It shows no note if every core list had a task done in the last 7 days. The season-ended card replaces this section from the day after the end date (§2.1).
  5. **Season offer:** the one-time card from §2.4, at the bottom, when it's due.
- **Answered:** the debrief counts as answered once any leftover action is taken (including the **Not now** button), or the page is closed after being open for 2 seconds or more when there were no leftovers. **Closing the debrief while leftovers are untouched does not answer it**: the reminders keep going, so a quick look doesn't silence them. Answering:
  - stops "Remind until I act" repeats
  - clears the morning notification on every device
  - marks the side-menu item hidden for the day
  - on the computer, collapses the Today card to its done state
- **Notification action buttons** (Move to today, All done) still work from the lock screen without opening the app, and also count as answering.
- **Afternoon (14:00) and Inbox (18:00) notifications are unchanged [assumed].**
- **Weekends:** if check-ins are off at weekends, there is no notification, but the debrief can still be opened from the menu.

### 2.3 Coach: plan my day
- **When it runs:** the first time the debrief opens each day, if the coach is on and the device is online. The result is saved for the day and synced, so phone and computer show the same plan. **Plan again** runs it fresh, up to 5 times a day. Automatic re-runs (after leftovers are handled; see "Order of work" below) don't count toward the 5; they do count toward the 20-a-day limit in §6.2.
- **What it reads:** see §6.3. It does not read task notes or the Notes section **[assumed]**.
- **What it returns** (validated, §6.4): a one-line summary, then suggestions. Each suggestion is one of:
  - `schedule`: put a task at a time today (start and end).
  - `today`: do it today, with no fixed time.
  - `later`: move it to another date (usually tomorrow) because it won't fit.
- **Rules it must follow (checked in code, not trusted):**
  - Only tasks that exist, aren't done or deleted, and are due today, left over, or undated in a core list.
  - Times fall inside the planning window (§5, default 09:00–18:00).
  - No overlaps with Google events or timed tasks already on today.
  - At most 8 suggestions **[assumed]**.
  - Each reason is 80 characters or fewer.
  - Any suggestion that breaks a rule is dropped silently. If all are dropped, the section shows the "couldn't plan" state.
- **Accepting:**
  - Tapping a suggestion's check applies it. Accept all applies every suggestion not yet handled.
  - `schedule` sets `due_date = today`, `start_time` and `end_time`.
  - `today` sets `due_date = today` and keeps any existing time.
  - `later` sets `due_date` to the suggested date.
  - Each apply shows the standard Undo snackbar. Accept all is one undo step.
- **Changing before accepting:** tapping the time opens the existing time sheet. The changed time is applied when you accept.
- **Dismissing:** "Not today" hides the section for the day (stored).
- **Order of work:** leftovers come first. If there are leftovers, the plan section waits until they're handled, then (re)runs, because the inputs changed. While it waits it shows "Sort the leftovers first, then I'll plan your day." **[assumed]**

### 2.4 Coach: season setup chat
- **Entry points:**
  - **Start a season** on the Season page (side menu → Season)
  - the debrief season-ended card
  - a one-time offer in the debrief after 7 days of use, if no season was ever started ("setup when it matters"). It can be skipped, and is never shown again after Not now **[assumed]**. Its copy depends on the coach setting: coach on, "The coach helps you choose a few core lists. Everything else stays as it is."; coach off, "Mark a few core lists. Everything else stays as it is." Start a season then opens the chat or the manual form to match.
- **Without the coach** (coach off), Start a season opens a plain form (`CSeasonManual`): dates plus a tier for each list.
- **Chat flow:**
  1. The coach opens with the fixed prompt: "Imagine it's 12 weeks from now. What do you want to have happened, at work and in life?" (The length follows the season dates. These can be changed in the header first.)
  2. You type. Dictation is the phone keyboard's microphone; there is no custom speech feature.
  3. The coach asks a follow-up question, at most 4 rounds. At any point you can tap **Make the plan**.
  4. The coach returns a **proposal**: a tier for each existing list, new lists to create (name and tier), and up to 3 first tasks for each core list (title and optional date).
  5. The proposal screen lets you:
     - change any tier
     - untick any new list or task
     - rename items inline
  6. **Save season** creates, in one undoable step: the season, the tier rows, the new lists and the tasks. Snackbar: "Season saved · Undo".
- The conversation is kept on the device only until it's saved or discarded. It isn't synced or stored on the server. Leaving and coming back resumes it. **Discard** asks for confirmation.
- The coach sees only what you type, plus your list names (§6.3).

### 2.5 Mac app
- Loop's existing web build, made installable: a manifest, icons and offline start.
- On a Mac:
  - Safari → File → Add to Dock (needs macOS Sonoma 14 or later), or Chrome/Edge → Install Loop.
  - It opens in its own window with the desktop layout. Nothing else changes.
  - Firefox and older Safari can't install; the install dialog says so and suggests Chrome.
- A **"Use Loop as an app"** row in desktop Settings shows how to install. It's hidden when Loop is already running installed (`display-mode: standalone`).
- Sign-in, sync, browser notifications and the keyboard shortcuts must all work in the installed window. §9 has the checks.
- **Shortcuts use ⌘ on a Mac** and Ctrl elsewhere. Shown labels follow the platform.
- **Notification buttons:** Chrome shows action buttons on web notifications. As far as we know, Safari (including Dock web apps) ignores them and only opens the app on click. Check this in slice 1. If Safari has no buttons, a click on the morning notification opens the debrief, and that's the whole flow there.

## 3. Data model (Supabase migrations)

New migration `20261110000000_seasons_coach.sql`. RLS on every table: `user_id = auth.uid()` for select, insert, update and delete.

```
seasons        id uuid pk, user_id, name text null, start_date date, end_date date,
               ended_at timestamptz null,            -- set when ended early
               created_at, updated_at, deleted_at null
               -- check: end_date >= start_date
               -- at most one row per user where ended_at is null and deleted_at is null
               --   and current_date between start_date and end_date (enforced in app + trigger)

season_lists   season_id fk seasons, list_id fk lists, user_id,
               tier text check (tier in ('core','secondary','support')),
               updated_at, pk (season_id, list_id)

debriefs       id uuid pk, user_id, day date, unique (user_id, day),
               opened_at timestamptz null, answered_at timestamptz null,
               leftovers_action text null   -- 'today'|'done'|'archive'|'reschedule'|'not_now'|'notif_today'|'notif_done'
               plan jsonb null,               -- validated coach output, §6.4
               plan_inputs_hash text null,    -- re-run when inputs change
               plan_runs smallint default 0,
               plan_state jsonb default '{}', -- per suggestion: 'accepted'|'skipped', plus dismissed flag
               season_offer_seen bool default false,
               updated_at

coach_usage    user_id, day date, calls smallint, pk (user_id, day)   -- server-written only

profiles       + coach_enabled bool default false
               + coach_consent_at timestamptz null
               + plan_window_start time default '09:00'
               + plan_window_end   time default '18:00'
               + first_seen_at timestamptz   -- for the 7-day season offer
```

- **Local store** (`src/store/types.ts`, `local.ts`) gets `Season`, `SeasonList` and `Debrief` types in camelCase, plus their mapping in `src/sync/mapping.ts`. Sync uses the existing engine and offline queue. `coach_usage` is not synced.
- **Trash:** seasons aren't trashable. Ending a season is the only way out, and deleting a season isn't offered in v1 **[assumed]**.
- **Purge:** `debriefs` rows older than 90 days are deleted by the existing daily job.

## 4. App structure (where code goes)

| Area | Files |
|---|---|
| Pure rules (unit-tested) | `src/lib/seasons.ts` (active season, tier of a list, week W of N, core-list note), `src/lib/debrief.ts` (yesterday range and summary, answered rules, section visibility), `src/lib/coachPlan.ts` (input building, output validation, applying suggestions) |
| Phone routes | `src/app/(app)/debrief/index.tsx` (replaces the `checkin/index.tsx` entry; `checkin/reschedule.tsx` stays and is linked from it), `src/app/(app)/season/index.tsx`, `season/setup.tsx` (chat), `season/proposal.tsx`, `season/manual.tsx` |
| Components | `src/features/debrief/*`, `src/features/season/*`, `src/features/coach/*` |
| Sheets | `TierSheet`, `SeasonDatesSheet`, `CoachPrivacySheet`, `PlanWindowSheet` in `src/features/sheets/` |
| Desktop | `src/desktop/views/DebriefDesk.tsx`, `SeasonDesk.tsx`, `SeasonSetupDesk.tsx`; sidebar tier groups in `Sidebar.tsx`; the tier submenu in `Menu.tsx` |
| Server | `supabase/functions/coach/index.ts` (§6) |
| Notifications | `src/lib/checkins.ts` and `src/notifications/*`: tap targets point to `/debrief`; content rules unchanged |
| Web app | `public/manifest.webmanifest`, icons in `public/icons/`, and the existing `public/loop-sw.js` extended for offline start |

The old `checkin/index.tsx` redirects to `/debrief`, so old notifications still land correctly.

## 5. Settings additions

Phone `NSettings2` and computer `WSettings` get a new **Coach** group, placed after Daily check-ins:

- **Coach**: on/off. Turning it on the first time opens the privacy sheet (`CCoachPrivacy`), and you must accept before it turns on. This sets `coach_consent_at`.
- **Plan my day between**: a time window that opens `PlanWindowSheet`. It is shown only when the coach is on.
- **What the coach sees**: opens the privacy sheet again (read-only, with a Turn off button).

A new **Season** group, after the Coach group:
- **Current season**: "Week 3 of 12 · ends 18 Jan" opens the Season page. With no season it reads "None · Start a season".
- On the computer, the Season section also lists each list with its tier chip.

On the computer only, in the Account group:
- **Use Loop as an app**: opens install steps for this browser. Hidden when Loop is already installed, so it never appears in the Mac app itself.

On the computer, **Appearance → Theme** offers Light, Dark and **Match Mac** (the default). Match Mac follows `prefers-color-scheme`.

## 6. Coach service (Supabase Edge Function `coach`)

### 6.1 Provider
- **Google Gemini** (the owner's choice). The API key is stored as the Supabase secret `GEMINI_API_KEY` and never ships in the app.
- Use Google's official Gen AI SDK for JavaScript/Deno. **At slice 4, check against Google's current docs:** the package name, the current fast model (a "Flash" tier is the likely fit), and structured JSON output (response schema). Record what was chosen in one line here.
- **Data use:** the coach runs on Gemini's **free tier** (owner's decision, 10 Nov 2026). On the free tier Google may use what Loop sends to improve its products, and people at Google may review it. The owner accepts this because Loop is for personal use only. Revisit if anyone else ever uses Loop.

### 6.2 Endpoints
The function is called through `supabase.functions.invoke('coach', …)` with the user's session. It rejects calls without a valid user.

| Action | Input (built on the device) | Output |
|---|---|---|
| `plan_day` | §6.3 payload | §6.4 plan |
| `season_turn` | the chat so far (≤ 4 rounds) plus list names | `{ type: 'question', text }` or `{ type: 'proposal', … }` |
| `season_proposal` | the same, when you tap **Make the plan** | `{ type: 'proposal', … }` |

- **Limits:** 20 calls per user per day (`coach_usage`). After that, it returns `429` and the app shows "The coach has done enough for today".
- **Timeout:** 25 s. On timeout the app shows the failed state with Try again.
- **Logging:** log only the action, duration, status and token counts. Never log content.

### 6.3 What is sent
- **`plan_day`:**
  - today's date and weekday
  - the planning window
  - Google event times with titles **[assumed: titles sent; they could be replaced with "Busy"]**
  - for each candidate task: id, title, list name, tier, priority, due date, start/end time, `carried_over_count`, and the subtask count
- **Never sent:** task notes, the Notes section, Inbox items, tags, your email or name.
- **`season_*`:** only what you typed in the chat, plus list names and current tiers.
- The privacy sheet (`CCoachPrivacy`, Mac `MacPrivacy`) must list both: what `plan_day` sends **and** that chat text is sent during season setup.

### 6.4 Output shape and validation
Ask the model for JSON matching this schema, then validate with the same schema in `src/lib/coachPlan.ts` before saving:

```
plan_day →
{ summary: string ≤ 140,
  suggestions: [ { taskId: string, kind: 'schedule'|'today'|'later',
                   start?: 'HH:MM', end?: 'HH:MM', date?: 'YYYY-MM-DD',
                   reason: string ≤ 80 } ] ≤ 8 }

proposal →
{ intro: string ≤ 200,
  tiers: [ { listId: string, tier: 'core'|'secondary'|'support' } ],
  newLists: [ { tempId, name ≤ 40, tier } ] ≤ 5,
  tasks: [ { listRef: listId | tempId, title ≤ 120, date?: 'YYYY-MM-DD' } ] ≤ 15 }
```

The §2.3 rules are applied in code after validation.

### 6.5 Prompting notes
- Use a fixed system instruction (kept in the function, versioned) that covers:
  - Loop's tone: plain, kind, brief, no hype, no "productivity" talk
  - suggest, never command
  - respect the window and the events
  - fewer suggestions are better than too many
- The chat asks one question at a time, each under 30 words. It never asks for personal data.

## 7. Notifications
- Morning content logic is unchanged (`morningContent`). Only the destinations change: the tap, **Review** and the full-screen intent open `/debrief`.
- On quiet mornings, the plain "today's plan" notification's **Open Today** button is renamed **Open debrief** **[assumed]**, and the tap opens `/debrief`.
- The computer's browser notification (`WBrowserNotif`): **Decide in Loop** opens the debrief view. **Move to today** acts without opening Loop. On the quiet morning the single button is **Open debrief**. Where the browser shows no buttons (see §2.5), the click opens the debrief.
- The coach never sends notifications.

## 8. Computer layout (the Mac app page of the canvas is the reference)
- **Window:** sidebar (248 px), main column, and a 380 px detail panel on the right. The installed app has the system title bar above them.
- **Today:** the debrief card (`WCDebriefCard`) sits at the top: "Good morning", one summary line, **Open debrief** with the `D` hint. After the debrief is answered it collapses to "Debrief done · Plan added" with **Open**. Tasks that came from the plan carry a small "From the plan" chip for the rest of the day.
- **Debrief** (`WCDebrief`) opens in the main column:
  - Yesterday is one compact row: the count, the first three titles, "+N more".
  - Leftovers: two task rows, then one action row (**Move all to today**, **Reschedule…**, **Mark all done**, **Archive all**, **Not now** on the right).
  - Today's plan: the summary line, with **Not today** and **Accept all ⇧A** on the same row, then the suggestion rows (one line of title, one line of time · list · reason). **Plan again** sits in the section header.
  - The season line is one compact row at the bottom.
  - A footer shows the debrief shortcuts.
  - **Detail panel:** with nothing selected, it shows "Already on today" (the day's Google events) and the note that the coach never moves them. With a suggestion selected, it shows the task with a coach box on top (suggested time, reason, **Accept A**, **Change time…**) and the task's date, list and priority. With a leftover selected, it shows the task with **Today / Tomorrow / Pick day…**.
  - **See Today** (top right, `esc`) leaves the debrief.
- **Sidebar:** while a season is active, the Lists group splits into **Core**, **Secondary** and **Support** sub-groups. A **Season** item shows "Wk 3/12". A **Debrief** item with a `D` hint shows until the debrief is answered or 12:00.
- **Change a tier:** right-click a list in the sidebar → **Season tier ›** → Core, Secondary or Support (the current one ticked). A snackbar confirms with Undo. Or drag the list between the tier columns on the Season page.
- **Season page** (`WCSeason`): week bar with days left, then three columns (Core, Secondary, Support) of draggable list cards. Selecting a list shows its open tasks and any "nothing done last week" note in the detail panel. **Change dates…** and **Rename** top right; **End season…** at the bottom opens a dialog.
- **Season, none yet** (`WCSeasonEmpty`): **Start with the coach** and **Set it up myself**, past seasons below, and a short "How a season works" panel on the right.
- **Manual form** (`WCSeasonManual`): dates (start, a length segmented control, end), an optional name, and one Core / Secondary / Support segmented control per list. The detail panel shows a live summary with **Save season ⌘S**.
- **Setup chat** (`WCSeasonSetup`): the chat runs in the main column, with **Make the plan ⌘↩** above the composer and "Question N of 4 at most". The detail panel shows the proposal taking shape ("Nothing saved yet").
- **Proposal** (`WCSeasonProposal`): the tier groups with their first tasks in the main column; each task has a keep-checkbox. Selecting a task opens it in the detail panel to rename or re-date. **Save season ⌘S** in the panel shows the live count ("1 new list, 6 tasks · one Undo").
- **Keyboard** (labels show ⌘ on a Mac, Ctrl elsewhere):
  - `D` opens the debrief, `esc` goes back to Today.
  - In the debrief: `↑`/`↓` move focus, `A` accepts the focused suggestion, `⇧A` accepts all, `⌘Z` undoes.
  - Season setup: `↩` sends, `⇧↩` adds a new line, `⌘↩` makes the plan, `⌘S` saves the season. Intercept `⌘S` so the browser's own Save never opens.
  - Single-letter keys work only when focus isn't in a text field.

  Add these to the shortcuts list (`WShortcuts`).
- **Narrow windows:** under 900 px the detail panel slides over the main column from the right (dimmed behind, close with `esc`), and the sidebar shrinks to icons. Under 600 px the phone layout is used.

## 9. Mac app (installable web app)
- **Manifest:**
  - `name` "Loop", `short_name` "Loop"
  - `start_url` "/", `scope` "/", `display` "standalone"
  - `background_color` = ground #F2F4F9, `theme_color` = accent #2F6BE3
  - icons at 192, 512, 512 maskable, and a 180 apple-touch-icon
  - link the manifest from the web HTML template
- **Icon:** the Loop mark on accent blue. Files are in the handoff pack (`icons/`): the macOS rounded square (1024 and 512, transparent margin) for Safari, the full-bleed square for maskable 512, 192, the 180 apple-touch icon and the 32 favicon. The mark is the existing four-petal Loop mark, redrawn from the brand board; swap in the master vector if available and re-export.
- **Offline start:** extend `loop-sw.js` to cache the app shell and static assets (cache-first for hashed assets, network-first for the HTML). Bump the cache name on each deploy. The data already works offline through the local store.
- **Checks on a real Mac** (Safari and Chrome):
  1. installs
  2. opens in its own window
  3. Google sign-in completes and returns to the app window (Supabase redirect)
  4. sync works
  5. browser notifications are allowed and their buttons work
  6. shortcuts aren't swallowed by the browser (`⌘S`, `⌘↩` and `D` especially)
  7. it opens offline
  8. light and dark both work, and Match Mac follows the system setting
  9. whether the notification shows its action buttons in Safari (see §2.5), and the click opens the debrief either way
  10. Safari "Add to Dock" on macOS Sonoma or later; the install dialog's fallback message in Firefox
- **Hosting:** Cloudflare, https://loop.nahusenaygebreamlak.workers.dev (see `setup.md` §7). The Expo address still works.
- **Results on the owner's Mac, 10 Nov 2026 (Safari, Add to Dock):**
  - Checks 1, 2, 3, 4, 6 and 7 pass: it installs, opens in its own window, Google sign-in returns to the app, tasks sync, the shortcuts `Q`, `/` and `⌘Z` work, and it opens with Wi-Fi off.
  - The Dock icon shows Loop's real mark on blue.
  - Still to check: 5 and 9 (notification buttons in Safari), 8 (light, dark, Match Mac), and Chrome install. The season and debrief shortcuts (`D`, `A`, `⌘S`, `⌘↩`) get checked when those slices are built.

## 10. Accessibility, themes, motion
- Every new screen works in light and dark from tokens. No new hard-coded colours.
- Tiers are shown in words ("Core"), never by colour alone.
- Suggestion rows: the check is a 44 px button labelled "Accept: Write intro, 10:00 to 11:00". The row's label includes the reason.
- Chat:
  - Each message is announced when it arrives (`accessibilityLiveRegion` on Android, `aria-live="polite"` on web).
  - The composer and **Make the plan** stay reachable above the keyboard.
- Loading uses the existing spinner, with no shimmer. With reduced motion, no animation runs.
- All AI text is plain text, never rendered as HTML.

## 11. Tests
- **Unit tests** (`tests/`):
  - seasons: active season, overlaps, tier fallback, week W of N, core-list note
  - debrief: the yesterday range with and without weekends, section visibility, answered rules
  - coachPlan:
    - validation drops bad ids, out-of-window times and overlaps
    - apply and undo for each kind
    - Accept all is one undo step
  - proposal apply/undo
- **Function test:** a mocked Gemini response feeds the validation, plus the limit and timeout paths.
- **Check-in regression:** the existing `tests/checkins.test.ts` stays green, and notification targets point to `/debrief`.
- Lint and typecheck before every slice is shown.

## 12. Slices and "done when"

Each slice ends with something the owner can open: an APK, a web link, or the installed Mac app. It also comes with screenshots next to the drafted designs and a list of differences.

| # | Slice | Done when |
|---|---|---|
| 1 | **Mac app** | Installs from Safari and Chrome on a Mac. All §9 checks pass, including the notification-button check, with the result written into §2.5. The Settings install row works and is hidden in the installed app. |
| 2 | **Seasons and tiers** (no AI) | Migration live. You can create, edit and end a season (manual form). A tier sheet is in the list menu. The phone side menu and computer sidebar group lists by tier. The season page works. Synced on both devices. |
| 3 | **Debrief** (no AI) | Every morning entry point opens the debrief with sections 1, 2 and 4. The answered rules work across devices. The computer card and view work. Old check-in routes redirect. |
| 4 | **Coach service** | The owner has added the Gemini key. The function is deployed, with limits, timeout and logging. The Coach settings, privacy sheet and plan window work. The model choice is recorded. |
| 5 | **Plan my day** | Section 3 covers every state in the UI list: loading, plan, partly accepted, all accepted, dismissed, waiting for leftovers, offline, failed, limit reached, coach off. Undo works. Same plan on both devices. |
| 6 | **Season setup chat** | Chat, then proposal, then save, with undo. Resume and discard work. The 7-day offer and the season-ended card work. |
| 7 | **Computer polish** | Drag between tiers, keyboard shortcuts, detail panel for suggestions, narrow-window rules for the new views. |

## 13. Open questions: answers used for the build

None of these block the build. Each is built with the answer below and marked **[assumed]** where it appears. To change one, edit this table; the affected screens are named.

| # | Question | Answer used | Screens affected if changed |
|---|---|---|---|
| 1 | Does the afternoon check-in stay unchanged? | Yes | none |
| 2 | Does the lock-screen full-screen alert open the debrief? | Yes | phone notifications |
| 3 | Side-menu / sidebar "Debrief" item until answered or 12:00? | Yes, until answered or 12:00 | side menu, sidebar |
| 4 | Yesterday copy with 0 done | "Nothing ticked off yesterday. That's fine." | debrief Yesterday card |
| 5 | Leftovers before the plan? | Yes, the plan waits | debrief waiting state |
| 6 | Most suggestions a day | 8 | plan card |
| 7 | Google event titles sent to Gemini, or "Busy"? | Titles sent | privacy sheet, §6.3 |
| 8 | Task notes never sent? | Never sent | privacy sheet |
| 9 | Season offer after 7 days, once? | Yes | debrief offer card |
| 10 | Gemini free or paid tier? | **Free tier** (owner's decision, 10 Nov). Google may use the prompts to improve its products. | privacy sheet's last line, §6.1 |
| 11 | Quiet morning: Open Today → Open debrief? | Yes | notifications |
| 12 | Closing the debrief with untouched leftovers: does it count as Not now? | No, reminders continue (§2.2) | debrief, reminders |
| 13 | How long the season-ended card shows | Until Start a new season or Not now (§2.1) | debrief |
| 14 | Do automatic plan re-runs count toward the 5 a day? | No (§2.3) | plan card |

## 14. What changed in v2 (10 Nov, after the Mac designs)

- §2.1: end-date example (27 Oct → 18 Jan), week rounding for custom lengths, how long the season-ended card shows.
- §2.2: closing the debrief with untouched leftovers doesn't answer it; the season offer added as section 5.
- §2.3: automatic re-runs don't count toward Plan again's 5.
- §2.4: the season offer's copy for coach on and coach off.
- §2.5: macOS Sonoma requirement, Firefox fallback, ⌘ shortcuts, the Safari notification-button check.
- §5: Season dates fixed, Season section lists tiers, install row never shows in the installed app, Appearance → Match Mac.
- §6.1 and §6.3: free tier (owner's decision, 10 Nov, changed from the paid tier assumed earlier); the privacy sheet must mention chat text.
- §7: computer notification buttons, and what happens without them.
- §8: rewritten to match the drawn Mac screens, including narrow windows.
- §9: new checks 9 and 10; icon files now exist.
- §12: slice 1 includes the notification check.
- §13: every open question now has the answer used.

## 15. Slice 2 as built (10 Nov 2026)

What was built differs from the sections above in these ways:

- **Data:** tiers are stored on the season row as `tiers` (list id → tier), not in a separate `season_lists` table. One season is one synced object, which fits the existing sync. The migration is `20261110000000_seasons.sql`. The `debriefs`, `coach_usage` and profile columns from §3 come with their own slices.
- **Sync:** if the `seasons` table doesn't exist yet on the server, sync carries on without it and keeps season changes waiting.
- **Seasons that start later:** a season can be saved with a future start date. It shows as "Soon" and tiers appear once it starts.
- **Rename:** a small sheet (phone) or dialog (computer), not inline.
- **Computer:** tiers change through the "Move ›" button on a list card, or a right-click on the list (Season page and sidebar). Dragging between tier columns is left for slice 7.
- **Dates** are written month first ("Nov 10 – Feb 1"), like everywhere else in the app.
- **Start a season** always opens the manual form for now. The coach chat arrives in slice 6.

## 16. Slice 4 as built (10 Nov 2026)

- **Provider call:** the function calls Gemini's Interactions API directly over HTTPS (`POST /v1beta/interactions`, header `x-goog-api-key`), not through the `@google/genai` SDK. The SDK needs Node 22 and documents no timeout; a plain request gives a clean 25-second timeout and plain status codes. Model `gemini-3.8-flash`, `store: false`, JSON output with the §6.4 schemas.
- **Usage count:** one database function (`coach_count_call`) checks the 20-a-day limit and counts the call in a single step.
- **Validation:** the server whitelists what is sent and checks the shape of the answer. The §2.3 rules run on the device in `src/lib/coachPlan.ts` (tested).
- **Settings:** built on the computer only so far (Coach switch, privacy text, Plan my day between). The phone's Coach settings wait until phone work resumes.
- **Migrations:** `20261110130000_coach.sql` (profile columns, `coach_usage`) and `20261110120000_debriefs.sql`.
- **Not built yet:** anywhere the plan shows. That is the debrief's "Today's plan" section (slice 5).
- **Slice 3 is paused part-way:** the debrief rules, storage and migration exist and are tested; no debrief screen exists yet.

## 17. Computer debrief and plan my day as built (10 Nov 2026)

Slices 3 and 5, computer only. The phone keeps the full-screen check-in until the phone debrief is built; `/debrief` on the phone goes to it.

- **Debrief view** (`src/desktop/views/DebriefDesk.tsx`): Yesterday, Left over, Today's plan, the season line or the season-ended card, and the 7-day offer. Esc goes back to Today.
- **Today card:** "Good morning", one summary line and **Open debrief** (`D`). Once answered it collapses to "Debrief done", plus "· Plan added" when a suggestion was accepted. The old check-in card is gone.
- **Sidebar:** a **Debrief** item with the `D` hint, under Today, until the debrief is answered or until 12:00.
- **Keys:** `D` opens the debrief when no task is selected. With a task selected, `D` is still its date.
- **Plan:** runs once the first time the debrief opens each day, after the leftovers are handled. It is saved on the day's debrief and syncs. **Plan again** keeps accepted suggestions and replaces the rest; only Plan again counts toward the 5. There is no inputs hash: the plan simply waits for the leftovers, so the first run already sees them handled.
- **Changing before accepting:** **Change time…** and **Change day…** open small dialogs, not anchored pop-overs. The change is stored on the plan and applied on Accept.
- **Reschedule…** in Left over selects the first leftover; the panel then offers Today, Tomorrow, Pick day… and, for a task moved twice, Back to Inbox.
- **Accepting a suggestion for an overdue task** counts as carrying it over, the same as the check-in.
- **Season offer copy** uses the coach-off line for now, because Start a season opens the form until the chat exists (slice 6).
- **Browser notification:** the morning one now also goes out on quiet mornings, with **Open debrief**. A click opens the debrief; Move all to today answers it.
- **Phone:** "Remind until I act" stops once the day's debrief is answered on any device.
- **Not tested yet:** a real plan from Gemini. Everything up to the call is checked; the first real run happens when the owner opens the debrief signed in with the coach on.

