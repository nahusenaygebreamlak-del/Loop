# Setting up sign-in (one time, about 15 minutes)

Loop needs two accounts connected before "Continue with Google" works: a **Supabase** project (stores your tasks and handles sign-in) and a **Google Cloud** OAuth client (lets Google sign you in). Both are free for personal use. Claude can't create these for you, because they're on your accounts.

## 1. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Name it `loop` and pick the region closest to you. Save the database password somewhere safe.
2. When it's ready, open **SQL Editor** → **New query**, paste everything from `supabase/migrations/20261016000000_init.sql`, then press **Run**. This creates the tables, the privacy rules, and the default Work / Personal / Learning lists for each new account.
3. Open **Project Settings → API**. Copy the **Project URL** and the **anon / publishable key**.
4. In the Loop folder, copy `.env.example` to a new file called `.env` and paste the two values in.

## 2. Create the Google sign-in client

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project called `Loop`.
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name (Loop) and your email, and add yourself as a **test user**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**.
   - Under **Authorized redirect URIs**, add the callback URL shown in Supabase (step 3 below). It looks like `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
4. Copy the **Client ID** and **Client secret**.

## 3. Connect Google to Supabase

1. In Supabase: **Authentication → Sign In / Providers → Google** → turn it on and paste the Client ID and secret. The callback URL for step 2.3 is shown on this page.
2. **Authentication → URL Configuration → Redirect URLs**: add these
   - `http://localhost:8081` (the web app while developing)
   - `loop://**` (the Android app)

## 4. Try it

Tell Claude it's done. Claude restarts the app, and "Continue with Google" will take you through Google and land you on the "You're in" screen.

## Current setup (done 16 Oct 2026)

- Supabase project: `loop` (West EU, Ireland), `https://hjyfivfgasdpkpgctmcd.supabase.co`. Schema applied; Google provider on; Site URL `http://localhost:8081`; redirect URLs `http://localhost:8081/**` and `loop://**`.
- Google Cloud project: `Loop` (`loop-511820`), app in Testing with the owner as a test user; web OAuth client "Loop (Supabase)".
- Keys live in `.env` (not committed).
- Migrations applied: `20261016000000_init.sql` (16 Oct), `20261017000000_sync.sql` (17 Oct). New ones are pasted into the SQL editor the same way.

## 5. Google Calendar (Milestone 7, one time)

Loop reads your calendar through a small Supabase server function, because Google's access expires every hour and renewing it needs the client secret, which must never live in the app.

1. **Supabase → SQL Editor:** run `supabase/migrations/20261018000000_checkins_off_by_default.sql` and `supabase/migrations/20261018010000_google_tokens.sql`.
2. **Google Cloud → APIs & Services → Library:** search "Google Calendar API" → **Enable**.
3. **Google Cloud → OAuth consent screen → Data access → Add or remove scopes:** add `.../auth/calendar.readonly` → Save. (The app stays in Testing; you're already a test user.)
4. **Supabase → Edge Functions → Secrets:** add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (the same values as in Authentication → Providers → Google). You type the secret; Claude never does.
5. **Deploy the function:** Claude runs `npx supabase login` (you click Allow in the browser), then `npx supabase functions deploy google-calendar --project-ref hjyfivfgasdpkpgctmcd`.
6. In Loop: **Calendar → Connect Google**.

## 6. Loop on the computer (web address)

- Live at https://nahu0024-loop.expo.app (Expo web hosting, project nahu0024/loop).
- Supabase → Authentication → URL Configuration → Redirect URLs: add `https://nahu0024-loop.expo.app/**` so Google sign-in returns there.
- To publish a new version: `npx expo export -p web`, then `npx eas-cli@latest deploy --prod`.

## 7. Loop on Cloudflare (10 Nov 2026)

- Live at https://loop.nahusenaygebreamlak.workers.dev (Cloudflare Workers static assets, worker name `loop`, config in `wrangler.jsonc`). This is the address to install as the Mac app. The Expo address in section 6 still works.
- Supabase → Authentication → URL Configuration → Redirect URLs: add `https://loop.nahusenaygebreamlak.workers.dev/**` so Google sign-in returns there.
- To publish a new version: `npx expo export -p web`, then `npx wrangler@latest deploy`. The build needs the Supabase keys in `.env`.
- Signing this computer in to Cloudflare is one time: `npx wrangler@latest login`, then click Allow in the browser.

## 8. Gemini key for the coach (10 Nov 2026)

- Done by the owner: a Gemini API key created in Google AI Studio (free tier) and saved in Supabase → Edge Functions → Secrets as `GEMINI_API_KEY`.
- Not done yet: the `coach` function itself (build slice 4). Full steps and the build notes are in `16-gemini-setup.md`.

## 9. Seasons (build slice 2, 10 Nov 2026)

- Done by the owner on 10 Nov 2026: `supabase/migrations/20261110000000_seasons.sql` run in the Supabase SQL editor. New setups paste it the same way; it's safe to run twice.
- If the table is ever missing, seasons still work on each device but don't sync between them. Everything else keeps syncing, and the seasons catch up once the table exists.

## 10. The coach (build slice 4, 10 Nov 2026)

Done on 10 Nov 2026:

- The owner ran `supabase/migrations/20261110130000_coach.sql` and `supabase/migrations/20261110120000_debriefs.sql` in the Supabase SQL editor.
- The `GEMINI_API_KEY` secret is set (section 8).
- The `coach` function is deployed to the `loop` project. It answers, and refuses calls without a signed-in user.

To deploy a new version of the function:

1. The Supabase command-line tool must be signed in to the account that owns `loop` (not the one with the Kash projects). Sign-in only works in a real terminal: `npx supabase login --no-browser`, open the printed link in a browser signed in to that account, and type the code back into the terminal.
2. `npx supabase functions deploy coach --remote=hjyfivfgasdpkpgctmcd --use-api --yes`

Not tested yet: a real plan from Gemini. No screen calls the coach until the debrief's "Today's plan" section is built.
