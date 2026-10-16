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
