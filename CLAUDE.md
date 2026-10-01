# CLAUDE.md — M&K Workout (gym tracker PWA)

Private gym tracker PWA for exactly **two users** who share one program. Offline-first, mobile-first,
dark by default, kg only. This file is the working summary of the spec — keep it current.

## Product goals

1. Log a workout in as few taps as possible (completing a set ≤ 2 taps).
2. Progressive overload via **suggestions only** (dismissible chips, never auto-applied).
3. Strength, cardio and body measurements in one place.
4. Fully usable offline in the gym; syncs when back online.

## Stack

- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 (strict) · Tailwind CSS 4
- Zustand (client state) · Zod 4 (validation on every write) · Recharts 3 (charts)
- date-fns 4 (dates) · @dnd-kit (drag-and-drop reorder) · papaparse (CSV) · lucide-react (icons)
- Firebase **Spark (free)**: Auth (email/password) + Firestore with persistent offline cache
  (multi-tab). **No Cloud Functions, no Storage, nothing paid.** All logic is client-side.
- PWA: Serwist (Workbox successor) in Turbopack mode — `src/sw.ts`, served by
  `src/app/serwist/[path]/route.ts`.
- Hosting: Vercel Hobby. Monitoring: Sentry free tier (enabled only when `NEXT_PUBLIC_SENTRY_DSN` is set).
- Tests: Vitest (unit), `@firebase/rules-unit-testing` + Firestore emulator (rules), Playwright (E2E).

## Commands

| Command                                                             | What                                                                                    |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`                                                       | Dev server (http://localhost:3000). Service worker is only active in production builds. |
| `npm run lint` / `npm run typecheck` / `npm test` / `npm run build` | The CI gate — all must pass.                                                            |
| `npm run test:rules`                                                | Builds test rules and runs the rules suite in the Firestore emulator (needs JDK 21+).   |
| `npm run test:e2e`                                                  | Playwright smoke tests against Auth + Firestore emulators.                              |
| `npm run emulators`                                                 | Start Auth + Firestore emulators (UI on :4000).                                         |
| `npm run rules:build`                                               | Generate `firestore.rules` from the template using `ALLOWED_UIDS`.                      |
| `npm run deploy:rules`                                              | Generate rules with real UIDs, then deploy rules + indexes.                             |
| `npm run icons`                                                     | Regenerate PWA icons from `scripts/icon.svg`.                                           |

## Conventions

- **Feature-based folders.** `src/app/**` holds thin route files only. UI + hooks + stores live in
  `src/features/<feature>/`. Shared primitives live in `src/components/ui/`.
- **No Firestore calls in components.** Only `src/lib/data/**` may import `firebase/firestore`
  (enforced by ESLint `no-restricted-imports`). Components use hooks or stores that call repositories.
- **Every write is Zod-validated** (`src/lib/schemas/**`) inside the repository before it reaches Firestore.
  Types are inferred from schemas (`z.infer`), never hand-duplicated.
- **Never `await` a Firestore write in a UI flow.** Write promises only resolve on server ack, so offline
  they hang. The local cache updates synchronously. Fire the write, `.catch(reportError)`, and move on.
- **Listeners whose logic depends on server confirmation** (e.g. "is it really empty?") must pass
  `{ includeMetadataChanges: true }` — a server confirming an unchanged cached result emits no event otherwise.
- **Emulators always use project `demo-mk-workout`**; test UIDs are `alice`/`bob` (allowlisted) and
  `mallory` (not). E2E creates them with fixed UIDs in `tests/e2e/global-setup.ts`.
- **No silent failures.** Every caught error goes to `reportError()` (`src/lib/monitoring`) and the
  user gets a toast where it matters.
- **Timestamps are epoch milliseconds (number)**, from the client. Calendar days are local `YYYY-MM-DD`
  strings (`date` fields) — use helpers in `src/lib/dates.ts` (date-fns).
- **Pure logic lives in `src/lib/**` with unit tests next to it** (`*.test.ts`): overload engine, e1RM,
  PRs, rest-timer math, volume aggregation, CSV.
- **Routes are static** (no dynamic segments; use query params, e.g. `/history/session?id=…`) so every
  screen can be precached for offline use.
- **Free-tier budget:** paginate history (`limit` + cursor), no unbounded queries, read denormalised
  docs (`prs`, `lastSets`, `weeklyStats`) instead of scanning sets.
- Formatting: Prettier (with the Tailwind plugin). Strict TS with `noUncheckedIndexedAccess`.
- Small commits with clear messages. Update this file and the README as things change.
- Ask before adding heavy or paid dependencies, or deviating from the spec.

## Access & security

- Exactly two allowlisted UIDs. They are injected into `firestore.rules` at build time from the
  `ALLOWED_UIDS` env var (`scripts/build-rules.mts`, template `firestore.rules.template`) — zero extra
  reads. `firestore.rules` is generated and **gitignored**; tests generate it with test UIDs
  (`alice`, `bob`). If test rules were deployed by mistake, they deny everyone (safe failure).
- No sign-up UI; both accounts are created in the Firebase console. (Spark can't disable the sign-up
  API without Identity Platform, but non-allowlisted accounts can't read or write anything.)
- Shared, writable by both: `exercises`, `program`. Private: `users/{uid}/**`.
- Partner may **read** `users/{uid}` and `sessions` (+ `sets`); partner may read `prs`, `lastSets`, and
  `weeklyStats` only when `shareCompare != false`. `cardio` and `measurements` are owner-only.
- Exercises and the program are never deleted (archive only).

## Data model (Firestore)

```
users/{uid}                       name, defaultRestSec, shareCompare, createdAt
exercises/{exerciseId}            name, muscle, secondary[], equipment, type(strength|cardio),
                                  repMin, repMax, restSec, incrementKg, archived, createdAt, updatedAt
                                  (id = slug of the name for seeded exercises)
program/{programId}               name, days[{dayId, name, items[{exerciseId, sets, repMin, repMax,
                                  supersetGroup?}]}], version, updatedBy, updatedAt   (id: "main")
users/{uid}/sessions/{id}         date, dayId, programVersion, startedAt, finishedAt?, durationSec,
                                  totalVolume, notes, status(draft|done)
users/{uid}/sessions/{id}/sets/{setId}
                                  exerciseId, order, type(warmup|working|drop|failure), weightKg, reps,
                                  rpe, restSec, note, isPR
users/{uid}/cardio/{id}           date, type, durationMin, distanceKm, avgHr, intensity, sessionId?
users/{uid}/measurements/{id}     date, weightKg, bodyFatPct, tape{chest,waist,hips,arms,thighs,calves,neck}
users/{uid}/prs/{exerciseId}      bestWeight, bestReps, bestE1RM, bestVolume, dates
users/{uid}/lastSets/{exerciseId} (added) last session's sets for pre-fill + last ~6 session summaries
                                  (top set, e1RM, volume) for stall detection
users/{uid}/weeklyStats/{yyyy-Www}(added) working sets + volume per muscle group for that ISO week
```

- Sessions snapshot `programVersion`; editing the program never changes history.
- On **finish**, one batched write updates the session, `prs`, `lastSets`, and `weeklyStats`.
- Program saves use a version check: if the stored `version` moved since editing began, warn the
  user (last-write-wins after confirmation). Rules require `version` to increase by exactly 1.

## Known platform limits (agreed)

- Rest-timer alerts while backgrounded: Android → local notification via the service worker
  (best effort); iOS → in-app alert as soon as the app is foregrounded. No server Web Push in v1.
- Progress photos are out of scope for v1 — see the `EXTENSION POINT: progress photos` markers.

## Phase status

1. Foundation — done (rules suite 12 tests, unit tests, 5 Playwright smoke tests)
2. Core (program editor, live logging, rest timer, drafts, pre-fill) — todo
3. Overload engine — todo
4. Tracking (cardio, body, charts, history) — todo
5. Extras (Compare, CSV import/export) — todo
6. Hardening (offline E2E, perf, Sentry, Lighthouse, README deploy guide) — todo

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
