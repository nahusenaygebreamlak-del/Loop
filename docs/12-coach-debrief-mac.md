# Coach, morning debrief and Mac app — proposal, 10 Nov 2026

_Status: approved 10 Nov 2026. Nothing here is built yet. Full detail: `13-build-spec-coach-debrief-mac.md` (engineering) and `14-ui-list-coach-debrief-mac.md` (every screen, component, state and line of copy)._

This adds three things to Loop. It changes the brief: "AI features" and "Coaching" move from **Out** to **In**, but only in the narrow form below. The rest of the Out list stays out.

Inspiration: the Superfocus walkthrough, which we read together on 10 Nov. Loop takes two ideas from it: seasons with goal tiers, and a coach that plans the day. It does **not** take focus mode, app blocking, screen tracking or the drift reports.

## Decisions made with the owner (10 Nov)

- The coach does two jobs: **plan my day**, and **goals and seasons**.
- The **morning debrief replaces the morning check-in**. It becomes one page.
- The **Mac app** is Loop's web app with its own Dock icon and window. It has no native Mac features for now.
- Claude drafts the new screens using the existing tokens and styles. The owner reviews and corrects them.

## 1. Seasons and goals

- **Goals are your existing lists.** No new object: for the active season, each list can be marked Core, Secondary or Support. Unmarked lists count as Support.
- A **season** is a stretch of time with a start and end date (default 12 weeks). Only one season is active at a time.
- The tiers:
  - **Core:** must happen this season.
  - **Secondary:** nice to have.
  - **Support:** upkeep and admin, not a focus.
- Tiers can change between seasons. A list's tasks behave exactly as they do today.
- **Setting up a season with the coach:** it asks "Imagine it's 12 weeks from now. What do you want to have happened?" You type or dictate a brain dump. It asks a few follow-up questions, then proposes which lists are core, secondary and support, any new lists to create, and some first tasks. You edit, then accept. Nothing is saved until you accept.
- In keeping with "setup when it matters", seasons are never forced. Loop works fully without one.

## 2. Morning debrief (replaces the morning check-in)

The morning notification keeps its time and buttons. **Review** (or a tap) opens the debrief page instead of the full-screen check-in. On days with no leftovers, the plain "today's plan" notification opens the debrief too, with section 2 left out. The page has, top to bottom:

1. **Yesterday:** what got done, in one line plus a count.
2. **Left over:** the existing check-in list and actions (Move all to today, Reschedule, Mark all done, Archive all). These are unchanged, including Undo.
3. **Today's plan, suggested by the coach:** it reads today's tasks, the leftovers, Google events and your core goals. It suggests what realistically fits and when, with one short reason each. You can **accept all**, accept one by one, or ignore it.
4. **Season line:** for example "Week 3 of 12 · 2 core goals had no work last week". This shows only when a season is active.

The coach **only suggests**. It never moves, adds or deletes anything without your tap.

## 3. Mac app

- Loop's web address becomes an installable web app, with an icon, a name, its own window and offline start.
- On a Mac, open Loop in Safari and choose **File → Add to Dock**. It then opens from the Dock like any app. Chrome's "Install app" works too.
- The desktop layout we already built is what you see. No new screens.

## How the coach works (engineering, for the record)

- It runs on **Google Gemini** (the owner's choice) through a Supabase Edge Function, so the API key never sits in the app. The model and library get checked against Google's current docs at slice 4.
- The owner creates the Gemini API key in Google AI Studio and pastes it into Supabase. Cost depends on the plan; the free tier may cover one person.
- Your tasks and lists are sent to Google when the coach runs. If the coach is off, nothing is sent.
- The coach can be switched off in Settings. When it's off, the debrief shows sections 1, 2 and 4 only.

## Build order (small slices, each one shown before the next)

1. **Mac app.** Icon, web app manifest, install check on a Mac. This is the smallest piece and a quick win.
2. **Seasons and tiers without AI.** Data and sync, creating a season, marking lists with a tier, and a sidebar grouped by tier.
3. **Morning debrief without AI.** The new page replaces the check-in screen, with sections 1, 2 and 4.
4. **Coach backend.** The Edge Function, the key, the Settings switch and the privacy note.
5. **Coach: plan my day.** Section 3 of the debrief.
6. **Coach: season setup chat.**
7. Desktop versions of the new screens.

## Also decided (10 Nov)

- Goals are lists with a tier. No separate Goal object.
- On quiet mornings the notification still opens the debrief.
- The AI provider is Gemini, not Claude.
