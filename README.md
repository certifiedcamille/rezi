# REZI: Pocket Superbug

Art for Health Initiative's AMR behaviour-change game for Microbe Madness 2.0 (18 Nov 2026, Lekki).
One static page plus one tiny serverless function for the shared leaderboard. No AI calls, no accounts, no build step.

```
index.html      the whole game
api/scores.js   leaderboard (GET list, POST entry, DELETE reset)
vercel.json     headers
```

## Deploy to Vercel (about 5 minutes)

1. Push this folder to a GitHub repo (e.g. `certifiedcamille/rezi`).
2. In Vercel: **Add New → Project → Import** that repo. Framework preset: **Other**. Leave build settings empty. Deploy.
3. Shared leaderboard (so phones and the big screen see one board):
   - In the Vercel project, open **Storage → Marketplace → Upstash (Redis)** → create the free database and connect it to the project. This adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically.
   - **Settings → Environment Variables**: add `ADMIN_KEY` = any long random string (used only to wipe the board).
   - **Deployments → Redeploy** so the function picks up the variables.
4. Optional custom domain: **Settings → Domains** → add `rezi.artforhealthinitiative.org` and create the CNAME Vercel shows you.

Without step 3 the game still works fully; the leaderboard just lives on each device alone (the sub-line on the board says "offline: this screen only").

## At the event

- Open the URL on the 32" screen in Chrome, press `F11` for full screen. Tap targets and the 1 / 2 / 3 keys both work.
- It returns to the attract screen by itself after 2 minutes idle.
- Put the same URL in the QR code; phones get the stacked layout.
- Sound is on by default; the button top-right turns it off.

## Reset the board before doors open

```
curl -X DELETE -H "X-Admin-Key: YOUR_ADMIN_KEY" https://YOUR-SITE.vercel.app/api/scores
```

## Scoring

`score = (100 − Rezi's final power) + 10 × best streak of smart moves`. Max 170.

## Content

21 scenarios across 7 spaces (home, pharmacy, clinic, market & farm, water, travel, street & school), drawn from Nigerian everyday situations plus the CDC "Everything is Connected", "How Drug-resistant Germs Spread" and "How Germs Fight Back" sheets. Scenario text still needs a clinician's read before launch. Edit the `Q` array in `index.html` to change questions; each needs exactly one answer with a negative `d`.
