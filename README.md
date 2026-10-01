# M&K Workout

A private gym-tracker PWA for two people who share one program. You can log a set in two taps,
it suggests progressive overload, it tracks cardio and body measurements, and it works fully
offline in the gym.

Built with Next.js 16, TypeScript, Tailwind CSS 4 and Zustand. The backend is Firebase on the
free Spark plan (Auth + Firestore with offline persistence), and it deploys to Vercel Hobby.
Everything runs client-side, so there are no Cloud Functions and nothing to pay for.

> Working notes for contributors (and Claude) live in [`CLAUDE.md`](CLAUDE.md).

## Status

| Phase         | Scope                                                                          | State |
| ------------- | ------------------------------------------------------------------------------ | ----- |
| 1. Foundation | Tooling, auth + allowlist, security rules + tests, PWA shell, exercise library | ✅    |
| 2. Core       | Program editor, live logging, rest timer, drafts, pre-fill                     | ⏳    |
| 3. Overload   | Suggestions, e1RM, PRs, stall detection, muscle volume                         | ⏳    |
| 4. Tracking   | Cardio, measurements, charts, history                                          | ⏳    |
| 5. Extras     | Compare, CSV import/export                                                     | ⏳    |
| 6. Hardening  | Offline E2E, performance, Sentry, Lighthouse, deployment guide                 | ⏳    |

## Prerequisites

- **Node.js 24** (see `.nvmrc`; 22+ works)
- **JDK 21+**, needed only for the Firebase emulators (rules tests and E2E).
  On Windows: `winget install EclipseAdoptium.Temurin.21.JDK`, then open a new terminal.
- A Google account for Firebase

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

   Re-run `npm run deploy:rules` whenever the rules template or indexes change.

> **About sign-ups.** The Spark plan can't fully switch off the Firebase sign-up API (that needs an
> Identity Platform upgrade). That's fine here. The app has no sign-up UI, and the rules deny every
> account that isn't one of your two UIDs, so a stray account can't read or write anything.

## 2. Run locally

```bash
npm install
npm run dev            # http://localhost:3000
```

On the first sign-in, the shared exercise library (~165 exercises) is seeded automatically.

To develop without touching your real project, use the emulators:

```bash
npm run rules:build:test
npm run emulators      # Auth :9099, Firestore :8080, UI :4000
# in another terminal, with NEXT_PUBLIC_USE_EMULATORS=true in .env.local:
npm run dev
```

The service worker only runs in production builds (`npm run build && npm start`).

## Scripts

| Script                                  | Purpose                                                       |
| --------------------------------------- | ------------------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Next.js dev server / production build / serve the build       |
| `npm run lint` / `typecheck` / `format` | ESLint, TypeScript (app + service worker), Prettier           |
| `npm test`                              | Unit tests (Vitest)                                           |
| `npm run test:rules`                    | Security rules tests in the Firestore emulator (JDK 21+)      |
| `npm run test:e2e`                      | Playwright smoke tests against the Auth + Firestore emulators |
| `npm run deploy:rules`                  | Generate rules with real UIDs, then deploy rules + indexes    |
| `npm run icons`                         | Regenerate favicon + PWA/Apple icons from the brand logo      |

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, unit tests, build, the rules
suite and the E2E smoke tests on every push and PR.

## Deploying to Vercel

The full step-by-step guide comes in Phase 6. In short: import the GitHub repo into Vercel
(Hobby), add the six `NEXT_PUBLIC_FIREBASE_*` env vars, deploy, then add the Vercel domain under
**Firebase → Authentication → Settings → Authorized domains**.

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
