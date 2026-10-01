# M&K Workout

A private gym-tracker PWA for two people who share one program. You can log a set in two taps,
it suggests progressive overload, it tracks cardio and body measurements, and it works fully
offline in the gym.

Built with Next.js 16, TypeScript, Tailwind CSS 4 and Zustand. The backend is Firebase on the
free Spark plan (Auth + Firestore with offline persistence), and it deploys to Vercel Hobby.
Everything runs client-side, so there are no Cloud Functions and nothing to pay for.

> Working notes for contributors (and Claude) live in [`CLAUDE.md`](CLAUDE.md). The manual
> device checklist is in [`docs/TESTING.md`](docs/TESTING.md).

## Status

| Phase         | Scope                                                                          | State |
| ------------- | ------------------------------------------------------------------------------ | ----- |
| 1. Foundation | Tooling, auth + allowlist, security rules + tests, PWA shell, exercise library | ✅    |
| 2. Core       | Program editor, live logging, rest timer, drafts, pre-fill                     | ✅    |
| 3. Overload   | Suggestions, e1RM, PRs, stall detection, muscle volume                         | ✅    |
| 4. Tracking   | Cardio, measurements, charts, history                                          | ✅    |
| 5. Extras     | Compare, CSV import/export                                                     | ✅    |
| 6. Hardening  | Offline E2E, performance, Sentry, Lighthouse, deployment guide                 | ✅    |

## Features

- **Workout logging** – start the suggested day (rotation), any program day or an empty workout.
  Sets are pre-filled from last time; completing one is a single tap. Add, remove, swap, reorder
  (drag or buttons) exercises; warm-up/drop/failure sets, RPE and notes; cardio finishers.
- **Rest timer** – starts automatically, ±15 s / skip, survives the app being backgrounded,
  chimes + vibrates, optional background notification.
- **Progressive overload** – suggestion chips (add weight, +1 rep, repeat, deload after a stall),
  never applied automatically. PRs (weight, reps at a weight, est. 1RM, volume) on the finish screen.
- **Shared program** – both of you edit one weekly split; edits never change past workouts, and a
  simultaneous edit asks before overwriting.
- **Tracking** – History with search and filters, per-exercise charts, weekly sets per muscle vs
  target bands, consistency (streak, sessions/week, average duration and rest), cardio with weekly
  totals, bodyweight with a 7-day average, body fat and tape measurements.
- **Compare** – your key lifts side by side, with an opt-out (enforced by the security rules).
- **Your data** – CSV export of everything; CSV import of old logs (Strong-style exports work) with
  a dry-run preview and per-line errors. Re-importing the same file never duplicates.
- **Offline-first** – log a whole workout in airplane mode; it syncs when you're back online.

## Prerequisites

- **Node.js 24** (see `.nvmrc`; 22+ works)
- **JDK 21+**, needed only for the Firebase emulators (rules tests and E2E).
  On Windows: `winget install EclipseAdoptium.Temurin.21.JDK`, then open a new terminal.
- A Google account (Firebase), a GitHub account and a Vercel account (free Hobby plan)

## 1. Create the Firebase project (one-time, ~10 minutes)

1. Go to <https://console.firebase.google.com> → **Create a project** → name it (e.g. `mk-workout`).
   Google Analytics is optional; you can switch it off. New projects start on the free **Spark** plan.
   Don't upgrade.
2. **Authentication**: go to **Build → Authentication → Get started → Sign-in method** →
   **Email/Password** → enable the first toggle only → **Save**.
3. **Create both accounts**: go to **Authentication → Users → Add user**. Do this twice, once for
   each of you (email + a strong password). The app has no sign-up screen on purpose.
4. **Copy both User UIDs** from the Users table. You'll need them in step 7.
5. **Firestore**: go to **Build → Firestore Database → Create database** → pick a location close to
   you (e.g. `eur3` for Europe; you can't change it later) → **Start in production mode**.
6. **Register the web app**: go to **Project settings (⚙) → General → Your apps → Web (`</>`)** →
   nickname `mk-workout-web` → leave Hosting unticked → **Register app**. Copy the values from the
   `firebaseConfig` snippet.
7. **Local env file**:

   ```bash
   cp .env.example .env.local
   ```

   Fill in the six `NEXT_PUBLIC_FIREBASE_*` values from step 6. Set `ALLOWED_UIDS` to the two UIDs
   from step 4, comma-separated with no spaces.

8. **Deploy the security rules and indexes.** `firestore.rules` is generated from
   `firestore.rules.template` with your two UIDs, so only those accounts can read or write anything.

   ```bash
   npx firebase login
   npx firebase use --add        # pick your project, alias "default"
   npm run deploy:rules
   ```

   **Re-run `npm run deploy:rules` whenever you pull changes that touch `firestore.rules.template`
   or `firestore.indexes.json`** — otherwise the live rules may reject new fields. New indexes take a
   few minutes to build; the app doesn't depend on them for logging.

> **About sign-ups.** The Spark plan can't fully switch off the Firebase sign-up API (that needs an
> Identity Platform upgrade). That's fine here. The app has no sign-up UI, and the rules deny every
> account that isn't one of your two UIDs, so a stray account can't read or write anything.

## 2. Run locally

```bash
npm install
npm run dev            # http://localhost:3000
```

On the first sign-in, the shared exercise library (~165 exercises) and the default program
(Upper / Lower / Upper / Lower / Full Body) are seeded automatically. Both of you can edit the program
under **More → Program**.

To develop without touching your real project, use the emulators:

```bash
npm run rules:build:test
npm run emulators      # Auth :9099, Firestore :8080, UI :4000
# in another terminal, with NEXT_PUBLIC_USE_EMULATORS=true in .env.local:
npm run dev
```

The service worker (offline support) only runs in production builds: `npm run build && npm start`.

## 3. Deploy to Vercel (free Hobby plan)

1. **Push the code to GitHub** (a private repository is fine):

   ```bash
   git remote add origin https://github.com/<you>/mk-workout.git
   ```

   ```bash
   git push -u origin main
   ```

2. Go to <https://vercel.com/new> → **Import** the repository. Vercel detects Next.js; leave the
   build settings as they are.
3. Before clicking **Deploy**, open **Environment Variables** and add (all environments):

   | Name                                                           | Value                                   |
   | -------------------------------------------------------------- | --------------------------------------- |
   | `NEXT_PUBLIC_FIREBASE_API_KEY` … `NEXT_PUBLIC_FIREBASE_APP_ID` | the six values from your `.env.local`   |
   | `NEXT_PUBLIC_SENTRY_DSN`                                       | optional — see _Error monitoring_ below |

   Don't add `ALLOWED_UIDS` or `NEXT_PUBLIC_USE_EMULATORS` — they're only for your machine.

4. Click **Deploy**. After ~2 minutes you get a URL like `https://mk-workout-xyz.vercel.app`.
5. **Allow the domain in Firebase**: Firebase console → **Authentication → Settings → Authorized
   domains → Add domain** → paste the Vercel domain (without `https://`). Sign-in fails until you do.
6. Open the URL and sign in. Every push to `main` deploys automatically.

### Optional hardening (recommended)

- **Restrict the API key**: Google Cloud console → _APIs & Services → Credentials_ → the _Browser
  key_ Firebase created → **Website restrictions** → add `https://<your-vercel-domain>/*` and
  `http://localhost:3000/*`. (The key isn't a secret, but this stops other sites from using it.)
- **Budget alert**: you're on Spark (free) so you can't be charged, but Firebase → _Usage and
  billing_ shows reads/writes if you're curious. Normal use is a tiny fraction of the free quota.

## 4. Install on your phones

The app must be installed from the deployed HTTPS URL, while online, once.

- **iPhone (Safari)**: open the URL in **Safari** → tap **Share** → **Add to Home Screen** → **Add**.
  Open it from the home screen and sign in. (Chrome/Firefox on iOS can't install web apps.)
- **Android (Chrome)**: open the URL → tap **Install** on the card on Home, or Chrome menu ⋮ →
  **Install app**. Open it from the home screen and sign in.

Then, once: open the app online, browse to Workout and Program so they're cached, and (optionally)
enable **Settings → Rest timer → Background notifications**. After that it works in airplane mode.
When an update is deployed, the app shows _A new version is available_ — tap **Update** when you're
not mid-set.

## 5. Error monitoring (optional, free)

1. Create a free account at <https://sentry.io> → **Create project** → platform **Browser
   JavaScript** → copy the **DSN**.
2. Add it as `NEXT_PUBLIC_SENTRY_DSN` in Vercel (and `.env.local` if you want it locally), then
   redeploy.

Sentry loads lazily after the app is idle, only when the DSN is set, and sends errors only — no
performance tracing, no session replay, no user identity. Without a DSN, errors still go to the
browser console.

## Scripts

| Script                                  | Purpose                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| `npm run dev` / `build` / `start`       | Next.js dev server / production build / serve the build      |
| `npm run lint` / `typecheck` / `format` | ESLint, TypeScript (app + service worker), Prettier          |
| `npm test`                              | Unit tests (Vitest)                                          |
| `npm run test:rules`                    | Security rules tests in the Firestore emulator (JDK 21+)     |
| `npm run test:e2e`                      | Playwright E2E (core, extras, offline) against the emulators |
| `npm run deploy:rules`                  | Generate rules with real UIDs, then deploy rules + indexes   |
| `npm run icons`                         | Regenerate favicon + PWA/Apple icons from the brand logo     |

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, unit tests, build, the rules
suite and all E2E projects on every push and PR. See [`docs/TESTING.md`](docs/TESTING.md) for what
each layer covers and the manual phone checklist.

## Security model

- Only the two UIDs in `ALLOWED_UIDS` can read or write anything. This is enforced by
  `firestore.rules` and proven by `tests/rules`.
- `exercises` and `program` are shared, and both of you can edit them. Exercises are never
  deleted, only archived.
- Private data lives under `users/{uid}/…`. Your partner can read your sessions but never write
  them. Cardio and body measurements are visible only to you. Compare data respects the opt-out
  toggle in Settings.
- No secrets are committed. Firebase web config values are public identifiers, and the rules are
  the security boundary.

## Troubleshooting

| Symptom                                            | Fix                                                                                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| "This account isn't allowed"                       | The UID isn't in `ALLOWED_UIDS` when you ran `npm run deploy:rules`. Check the UID in Firebase → Authentication → Users and redeploy the rules. |
| Sign-in fails on the deployed site only            | Add the Vercel domain under Authentication → Settings → Authorized domains.                                                                     |
| "The server rejected a change (permission denied)" | Your deployed rules are older than the app — run `npm run deploy:rules`.                                                                        |
| "The query requires an index" in the console       | A new index is still building (a few minutes after `deploy:rules`). Logging still works.                                                        |
| Weird old content in development                   | The app removes stale service workers automatically in dev; if it persists, clear site data for `localhost`.                                    |
| Notifications never arrive on iPhone               | iOS only allows them for apps added to the Home Screen (iOS 16.4+). The in-app alert always works.                                              |
