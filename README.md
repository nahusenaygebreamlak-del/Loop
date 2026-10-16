# Loop: build hand-off

Loop is a personal task and planning app: Android phone app plus a web app for the computer, sharing one account. Its point: **nothing slips through.** Anything you don't finish comes back to you in a short morning check-in instead of piling up in a list you stop opening.

This folder contains everything needed to build it: the product brief, behaviour rules, design system, every phone screen (light and dark, with a clickable-prototype link map), the user flows, a technical plan and a build plan.

## Start here

1. `CLAUDE.md`: how to work with the owner and the ground rules.
2. `docs/01-product-brief.md`: what Loop is and isn't.
3. `docs/02-behaviour-spec.md`: the rules every screen follows.
4. `docs/03-design-system.md`: the look, with `design/tokens.json`.
5. `docs/04-screens-and-interactions.md`: all 69 phone screens with screenshots and what every tap does.
6. `docs/05-user-flows.md`: the six flows.
7. `docs/06-technical-plan.md` and `docs/07-build-plan.md`: how and in what order to build.
8. `docs/08-open-questions.md`: decisions still open.

## Folder map

```
CLAUDE.md                     instructions for Claude Code
README.md                     this file
docs/                         product, behaviour, design, screens, flows, tech, plan
  reference/ticktick.md       notes on TickTick, the layout reference
design/
  tokens.json                 colours (light + dark), type, radii, spacing, motion
  screenshots/light/*.png     every phone screen, 390 × 844
  screenshots/dark/D*.png     the same screens in dark mode
  screenshots/flows/*.png     the six user-flow diagrams + key
  screenshots/desktop-v1/     early desktop direction (not final; desktop comes later)
  source/light|dark/*.dc.html the design source for each screen
  source/flows, desktop-v1    sources for the flows and desktop drafts
```

## About the `.dc.html` design sources

They come from a design canvas. Each file is one screen: plain HTML with **inline styles**, so you can read exact values (px, hex, radii, copy) straight from the markup.

- They are not runnable as-is: they reference a `support.js` runtime that isn't included, and a few use `{{holes}}` and `<sc-for>` loops filled by the small `renderVals()` script at the bottom of the file. The screenshots show the rendered result.
- `<a href="X.dc.html">` marks a prototype link (tap target → screen X). The same map is written out in `docs/04-screens-and-interactions.md`.
- Each file also carries the prototype's animation CSS (`@keyframes lp…`), which is the motion spec in `docs/03-design-system.md`.
- Treat them as the visual spec, not as code to port. Build real components.

## Status (16 Oct 2026)

- Product brief, flows, phone screens (light + dark), animations, clickable prototype: **done**, reviewed by the owner.
- Desktop/web layout: early drafts only (`desktop-v1`). Design it properly after the phone app is built.
- Build: **Milestone 0 (setup) done**: Expo app, light/dark theme from tokens, font, Supabase schema, Google sign-in screen.

## Running the app

```bash
npm install
npx expo start --web     # web, at http://localhost:8081
```

Sign-in needs a one-time setup: see `docs/setup.md`.
