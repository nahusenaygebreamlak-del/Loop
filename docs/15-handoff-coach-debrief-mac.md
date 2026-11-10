# Handoff: colours, icons and the coach's instructions

_10 Nov 2026 · goes with `13-build-spec-coach-debrief-mac.md` (v2) and `14-ui-list-coach-debrief-mac.md` (v2)_

This is the last piece a developer needs beyond the two specs and the canvas: the colour tokens in light and dark, the icon files, and the exact text of the coach's system instructions.

## 1. What's in the pack

| Folder | Files | Use |
|---|---|---|
| `docs/` | `13-…` v2, `14-…` v2, this file | The specs. v2 replaces the 10 Nov drafts. |
| `tokens/` | `loop-tokens.css`, `loop-tokens.json` | Every colour, light and dark, plus type, radius and motion values. |
| `icons/` | app icon PNGs and SVG sources; `coach-mark.svg`, `suggestion-schedule.svg`, `suggestion-today.svg`, `suggestion-later.svg` | Manifest icons, favicon, and the four new UI icons. |

The screens themselves are on the "Loop · Coach & Seasons" canvas (Mac app page and Phone drafts page).

## 2. Colour tokens

- Use the token names in code, never raw hex. The canvas screens use raw hex only because they're mockups; every hex on them maps to one token.
- **Light** values are the ones Batch 2 already uses. **Dark** values are new.
- **Theme switching:** `prefers-color-scheme` drives dark by default ("Match Mac"). Setting `data-theme="light"` or `data-theme="dark"` on `<html>` overrides it.
- **Two accent tokens, on purpose:**
  - `--loop-accent` is for fills: filled buttons, checks, progress bars, the selected segment.
  - `--loop-accent-text` is for every piece of accent-coloured **text**: links, text buttons, text on a tint. In dark mode the fill colour is too dark to read as text, so keep them apart in both themes.
- **Contrast** (checked for both themes): body and secondary text on every surface pass 4.5:1, white on the accent fill passes 4.5:1, accent text on surfaces and tints passes 4.5:1. The accent fill on a dark surface is 3.2:1, which is fine for checks and bars (non-text, 3:1 needed) but not for text, which is why text uses `--loop-accent-text`.
- **List colours** are the same in both themes.
- **Materials:** menus and notifications use `--loop-material` with `backdrop-filter: blur(24px) saturate(180%)`. With reduced transparency, the token becomes the solid surface.

## 3. Motion

| What | Value |
|---|---|
| Press feedback on every button | scale 0.97, 100 ms ease-out, on press (not on release) |
| Sheets and drawers | slide along the same path in and out, `cubic-bezier(0.32, 0.72, 0, 1)`, about 320 ms |
| Dialogs | fade and scale from 0.96, 220 ms; dim the window behind |
| Menus | fade and scale from 0.98, 140 ms, growing from the click point |
| Ticks | pop from 0.85 to 1, 200 ms; no bounce |
| Collapses | animate height; the replacing line fades up 4 px |
| Reduced motion | all of the above off; the spinner becomes a static ring |

No element bounces: nothing in these flows is flicked or thrown.

## 4. Icons

- **App icon:** the Loop four-petal mark in white on accent blue, the same mark as the Android icon and splash. `loop-mark.svg` is redrawn from the brand board, so it's close but not the master vector. If you have the original SVG, drop its shapes into `loop-icon-macos.svg` and `loop-icon-square.svg` and re-export the same sizes.
- **Mac needs only two shapes:** the rounded square with a transparent margin (Safari's Dock) and the full-bleed square (Chrome's maskable icon, apple-touch, favicon). The Android themed and notification icons aren't used on the Mac.

| File | Size | Use |
|---|---|---|
| `loop-icon-macos-1024.png`, `-512.png` | 1024, 512 | macOS rounded square with a transparent margin, for Safari's Dock |
| `loop-icon-maskable-512.png` | 512 | Manifest icon with `"purpose": "maskable"` (Chrome) |
| `loop-icon-192.png` | 192 | Manifest icon, `"purpose": "any"` |
| `apple-touch-icon-180.png` | 180 | `<link rel="apple-touch-icon">` |
| `favicon-32.png`, `favicon.svg` | 32 | Browser tab |

- **UI icons:** 24 × 24 viewBox, `stroke="currentColor"`, drawn at 16–20 px. The coach mark always carries the label "Coach" for screen readers. Before adding the three suggestion icons, check `Icon.tsx`: clock and arrow may already exist.

## 5. The coach's system instructions

Keep these in the Edge Function, versioned (`COACH_PROMPT_VERSION = 1`). They follow build spec §6.5. The function adds the structured-output schema from §6.4; the model must return JSON only.

### 5.1 `plan_day`

```
You help one person plan today in a to-do app called Loop. You only suggest.
The person accepts or ignores each suggestion; you never act.

You get: today's date, a planning window, Google Calendar events (busy times),
and candidate tasks with their list, the list's season tier (core, secondary,
support), priority, due date, any fixed time, and how many times each was
carried over.

Make a realistic plan for today:
- Put a few tasks at specific times inside the window, in the gaps between
  events and fixed-time tasks. Never overlap them.
- Leave short tasks as "today, any time" rather than giving them a slot.
- If the day is full, move the least urgent tasks to another day ("later"),
  usually tomorrow. Prefer moving support tasks before core ones.
- Favour core lists, overdue tasks, high priority and tasks carried over
  more than once.
- Fewer suggestions are better than many. At most 8. Leave free time.

Write in Loop's voice: plain, kind and brief. No hype, no productivity talk,
no exclamation marks.
- summary: one sentence, at most 140 characters, on the shape of the day.
- reason: one short sentence per suggestion, at most 80 characters, giving the
  real reason (due today, carried over twice, fits after lunch).

Use only the task ids you were given. Return JSON that matches the schema.
```

### 5.2 `season_turn` and `season_proposal`

```
You help one person set up a "season" in a to-do app called Loop: a stretch of
weeks with a few lists marked core (must happen), secondary (nice to have) or
support (upkeep). You only suggest; the person edits and saves.

You get: what the person typed, their existing list names and current tiers,
and the season's length.

While asking (season_turn):
- Ask one short question at a time, under 30 words, to find out what matters
  most if time runs short. At most 4 questions in total.
- Never ask for personal details, health, money or anything private.
- If you already know enough, return the proposal instead of a question.

When proposing (season_proposal, or when ready):
- Give every existing list a tier. Keep core to two or three lists.
- Suggest a new list only when a goal doesn't fit any existing list. At most 5.
- Suggest up to 3 small first tasks for each core list, each something that
  could be done in a sitting. Give a date only when the person mentioned one or
  it clearly helps.
- intro: one or two sentences, at most 200 characters, saying why you chose
  these tiers.

Write in Loop's voice: plain, kind and brief. No hype, no productivity talk.
Use only the list ids you were given; new lists get a tempId. Return JSON that
matches the schema.
```

## 6. Still to check during the build

These can't be settled on paper. Each has a slice and a place to record the answer.

| Check | Slice | Write the answer in |
|---|---|---|
| Does Safari show web-notification action buttons in a Dock web app? | 1 | Build spec §2.5 |
| Gemini: current package name, fast model, structured output, and the free tier's request limits | 4 | Build spec §6.1 |
| Does the 20-calls-a-day limit hold up with real use? | 5 | Build spec §6.2 |
| `D`, `A`, `⌘S`, `⌘↩` not captured by Safari or Chrome in the installed window | 1 and 7 | Build spec §9 |
