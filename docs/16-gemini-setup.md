# Connecting the coach to Gemini

_10 Nov 2026 · goes with `13-build-spec-coach-debrief-mac.md` §6 and `15-handoff-coach-debrief-mac.md` §5_

This is everything needed to connect Loop's coach to Google's Gemini API. Part A is what you (the owner) do on your own accounts. Part B is how the code is built. Part C is how we check it works.

Checked against Google's docs on 10 Nov 2026. Three details couldn't be confirmed from the docs and are marked **[check at build]**.

---

## Part A. What you do (about 5 minutes, one time)

Claude can't do these steps, because they involve your Google account and a secret key.

### A1. Create the API key
1. Go to **https://aistudio.google.com/api-keys** and sign in with the Google account you want to use.
2. If asked, accept the terms. Google creates a default project for you.
   - If you'd rather use the existing Google Cloud project **Loop** (`loop-511820`): open **Dashboard → Projects → Import projects**, pick it, and click **Import**.
3. Click **Create API key**, and choose the project.
4. Copy the key and keep it somewhere safe, like a password manager. Treat it like a password.
5. On the same page, if the key is marked **Unrestricted**: hover over the label, click **Add restrictions**, pick **Restrict to Gemini API only**, then **Restrict key**.

### A2. Stay on the free tier
Decided 10 Nov 2026: Loop uses Gemini's free tier, so there is nothing to pay and no billing to set up.

- What this means: Google may use what Loop sends (task titles, list names, calendar event titles, and what you type in the season chat) to improve its products, and people at Google may review it. You've accepted this because Loop is only for you.
- Check: on **https://aistudio.google.com/projects**, the project's **Billing Tier** should say Free. Don't click **Set up billing**.
- The free tier has lower request limits than the paid one. Loop's own limit of 20 coach calls a day should sit well inside them. If the coach starts failing with "Couldn't plan right now", the free limit is the first thing to check, on **https://aistudio.google.com/usage**.
- To change your mind later, click **Set up billing** on the Projects page. Nothing in Loop's code changes.

### A3. Spending limit
Not needed on the free tier: with no billing account, a leaked key can't cost you money. It could still use up your daily free requests, so keep the key private.

### A4. Give the key to Supabase
1. Open your Supabase project **loop** → **Edge Functions** → **Secrets**.
2. Add a secret named `GEMINI_API_KEY` and paste the key as its value. You type it; Claude never sees it.
3. Tell Claude it's done. Claude then deploys the `coach` function (you click Allow once in the browser for `npx supabase login`).

### A5. If the key ever leaks
1. Create a new key in AI Studio.
2. Replace the `GEMINI_API_KEY` secret in Supabase.
3. Once the coach works again, disable the old key.
4. Look at **https://aistudio.google.com/usage** for anything you don't recognise.

---

## Part B. How it's built

### B1. Shape
```
Loop app  ──►  Supabase Edge Function "coach"  ──►  Gemini API
(phone, web)    checks who you are, counts calls,     returns JSON
                holds the key, validates the answer
```
- The key lives only in the Supabase secret. It is never in the app, the repo or a `.env` file that ships.
- The app calls `supabase.functions.invoke('coach', { body })`, the same way `src/calendar/google.ts` calls `google-calendar`.
- The function follows the pattern of `supabase/functions/google-calendar/index.ts`: CORS headers, read the user from the `Authorization` header, return `401` when signed out.

> **As built (10 Nov):** the function calls the REST endpoint with `fetch` instead of the SDK described in B2 and B3 below. The request fields are the same. See `docs/13` §16.

### B2. Library and model
- **Package:** `@google/genai` (Google's current official SDK). In the Deno function: `import { GoogleGenAI } from 'npm:@google/genai';`
- **API:** the **Interactions API**, `ai.interactions.create(…)`. This is what Google's current quickstart and structured-output guides use.
- **Model:** `gemini-3.8-flash`, the fast model in Google's current examples. Keep the name in one constant, `COACH_MODEL`, so it's a one-line change later.
- **Client:** Google's examples build the client with no arguments and read `GEMINI_API_KEY` from the environment. In the function, pass the key explicitly from `Deno.env.get('GEMINI_API_KEY')`. **[check at build]** the constructor option name (expected `new GoogleGenAI({ apiKey })`).

### B3. The call
```ts
const interaction = await ai.interactions.create({
  model: COACH_MODEL,
  system_instruction: PLAN_DAY_PROMPT,          // docs/15 §5.1, versioned
  input: JSON.stringify(payload),               // docs/13 §6.3
  response_format: { type: 'text', mime_type: 'application/json', schema: PLAN_SCHEMA },
  store: false,                                 // see B5
});
const plan = JSON.parse(interaction.output_text);
```
- `system_instruction` must be sent on every call. It isn't remembered between calls.
- The season chat sends the whole conversation each time as `input`. It does not use `previous_interaction_id`, because that needs stored interactions (B5).
- For `season_turn`, the schema is a single object with `type: 'question' | 'proposal'` and optional fields, to keep the schema shallow.

### B4. Schemas and validation
- Send the schemas from `docs/13` §6.4 as plain JSON Schema.
- Gemini supports only part of JSON Schema. What matters here:
  - `minItems` and `maxItems` **are** enforced, so "at most 8 suggestions" can go in the schema.
  - `maxLength` and `minLength` are **ignored**. The 140, 80, 120 and 40 character limits must be checked in our code.
  - Deep or very large schemas can be rejected with `400 INVALID_ARGUMENT`. Ours are shallow, so this shouldn't happen; if it does, flatten.
- So the function never trusts the answer. After `JSON.parse`, `src/lib/coachPlan.ts` validates the shape again and applies the rules in `docs/13` §2.3 (real task ids, inside the window, no overlaps). Over-long text is trimmed at a word boundary, not rejected.
- If parsing or validation fails completely, return `{ error: 'bad_answer' }` and the app shows "Couldn't plan right now."

### B5. Privacy settings
- **`store: false` on every call.** By default the Interactions API keeps each interaction on Google's side (1 day on the free tier, 55 on the paid tier). With `store: false` it doesn't. This is separate from Google using free-tier content to improve its products, which `store: false` doesn't stop. The only cost is that `previous_interaction_id` and background runs can't be used, and we need neither.
- **Free tier** (Part A2). Google may use the content to improve its products and people may review it. The owner accepted this on 10 Nov 2026.
- **What's sent** is exactly the list in `docs/13` §6.3. Never task notes, the Notes section, Inbox items, tags, your name or email. Don't pass the Supabase user id to Gemini either.
- The privacy sheet's last line should say: "Sent to Google Gemini on its free plan. Google may use it to improve its products, and people at Google may review it."

### B6. Limits, timeouts and errors
| Case | Function does | App shows |
|---|---|---|
| Signed out | `401 signed_out` | nothing (coach hidden) |
| Coach off or no consent on the profile | `403 coach_off` | nothing |
| 20 calls used today (`coach_usage`) | `429 limit` | "The coach has done enough for today." |
| Gemini rate limit or quota (HTTP 429 from Google) | `503 busy` | "Couldn't plan right now." · Try again |
| Free-tier daily quota used up | `503 busy`, plus a log line `quota` | the same, and Claude tells the owner when it shows in the logs |
| No answer within 25 s | abort, `504 timeout` | "Couldn't plan right now." · Try again |
| Answer isn't valid JSON or fails validation | `502 bad_answer` | "Couldn't plan right now." · Try again |
| `GEMINI_API_KEY` missing | `500 not_configured` | "Couldn't plan right now." |

- Count the call in `coach_usage` **before** calling Gemini, with the service-role client, so a failing loop can't run up cost.
- **[check at build]** how the SDK takes a timeout or an abort signal, and what its error object looks like for a 429. If the SDK has no timeout option, race the call against a 25-second timer.
- No automatic retries inside the function. Try again is the person's choice, and each try counts toward the 20.
- **Logging:** action, duration, status and token counts only. Never the payload or the answer.

### B7. Files
| File | What |
|---|---|
| `supabase/functions/coach/index.ts` | The function: auth, limit, the three actions, Gemini call, validation |
| `supabase/functions/coach/prompts.ts` | The two system instructions from `docs/15` §5, with `COACH_PROMPT_VERSION` |
| `supabase/functions/coach/schemas.ts` | JSON Schemas for `plan_day` and the season proposal |
| `src/lib/coachPlan.ts` | Shared validation and the §2.3 rules (pure, unit-tested) |
| `src/features/coach/api.ts` | `invoke('coach', …)` and mapping errors to the states above |
| `supabase/migrations/20261110000000_seasons_coach.sql` | `coach_usage` and the profile fields |

### B8. Deploying
```bash
npx supabase functions deploy coach --project-ref hjyfivfgasdpkpgctmcd
```
The migration is pasted into the Supabase SQL editor, like the earlier ones (`docs/setup.md`).

---

## Part C. Checking it works

1. **Without Gemini:** unit tests feed saved example answers (good, over-long, wrong ids, overlapping times, not JSON) through validation.
2. **Key works:** call the function once with a tiny `plan_day` payload and get a valid plan back.
3. **Limit:** the 21st call in a day returns `429 limit`.
4. **Timeout:** a forced slow call returns `504` at 25 s.
5. **Coach off:** returns `403` and nothing reaches Google (check **https://aistudio.google.com/usage**).
6. **Free tier:** the Projects page shows the project on Free, and the privacy sheet's last line says so.
7. **Not stored:** the request has `store: false`. Confirm in the SDK's request log during the first test.
8. **Limits:** after a week of real use, check the Usage page to see how close Loop gets to the free limits, and write it into `docs/13` §6.1.

## Part D. Cost

None. The free tier has no charge. The trade is the data use described in A2 and lower request limits.
