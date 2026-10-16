# Loop: instructions for Claude Code

You are building **Loop**, a personal task app (Android + web) for one person. The design phase is finished; this folder is the full hand-off. Read `README.md` first, then the docs in order.

## Who you're working with

- The owner is a **UX researcher and designer who does not code**. You write all the code; they review the result as a designer.
- Talk in plain, direct language. No jargon walls, no long thought process in replies. Ask instead of assuming when a decision is theirs (product behaviour, look, wording). Make the engineering calls yourself and say what you chose in one line.
- They want a proper process, not speed for its own sake: plan → build in small slices → show working screens → adjust.

## Ground rules for the build

1. **The designs are the spec.** Match `design/screenshots/` and the `.dc.html` sources (exact colours, sizes, radii, copy). Where a doc and a screen disagree, ask.
2. **Behaviour comes from `docs/02-behaviour-spec.md`.** Don't invent features. Things listed as "Out" in the brief stay out.
3. **Tokens, not hard-coded colours.** Build a theme from `design/tokens.json` (light + dark). Every screen must work in both.
4. **Accessibility:** 44 px minimum tap targets, real buttons with labels, text contrast 4.5:1, honour reduced motion.
5. **One codebase:** React Native with Expo for Android and web (see `docs/06-technical-plan.md`). Phone first; desktop layout after the phone build is approved.
6. **Show progress visually.** After each milestone, give the owner something they can open (an APK, an Expo preview, or a web URL) plus screenshots, and list anything that differs from the design.
7. **Verify library details yourself.** Package names and versions in the docs are suggestions as of Oct 2026; check current docs before installing.

## Where things are

| Need | File |
|---|---|
| What Loop is, scope, decisions | `docs/01-product-brief.md` |
| Exact rules (check-ins, Inbox, undo, Trash…) | `docs/02-behaviour-spec.md` |
| Colours, type, spacing, motion | `docs/03-design-system.md`, `design/tokens.json` |
| Every screen + every tap target | `docs/04-screens-and-interactions.md` |
| User flows | `docs/05-user-flows.md`, `design/screenshots/flows/` |
| Stack, data model, notifications, widgets | `docs/06-technical-plan.md` |
| Milestones | `docs/07-build-plan.md` |
| Still undecided | `docs/08-open-questions.md` |


## Expo notes

@AGENTS.md
