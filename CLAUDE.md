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
| `npm run icons`                                                     | Regenerate favicon + PWA/Apple icons from `assets/brand/logo-source.webp`.              |

## Conventions

- **Feature-based folders.** `src/app/**` holds thin route files only. UI + hooks + stores live in
  `src/features/<feature>/`. Shared primitives live in `src/components/ui/`.
- **No Firestore calls in components.** Only `src/lib/data/**` may import `firebase/firestore`
  (enforced by ESLint `no-restricted-imports`). Components use hooks or stores that call repositories.
- **Every write is Zod-validated** (`src/lib/schemas/**`) inside the repository before it reaches Firestore.
  Types are inferred from schemas (`z.infer`), never hand-duplicated.
- **Never `await` a Firestore write in a UI flow.** Write promises only resolve on server ack, so offline
  they hang. The local cache updates synchronously. Fire the write, `.catch(reportError)`, and move on.
- **But wait for local durability before leaving a screen after a critical write** (finish/discard a
  workout): writes are queued asynchronously, so an instant reload/app close can drop them. `finishSession` /
  `discardSession` return a promise that resolves when a local snapshot reflects the change (the SDK commits to
  IndexedDB before raising snapshots) — milliseconds, works offline. Navigate after it.
- **Listeners whose logic depends on server confirmation** (e.g. "is it really empty?") must pass
  `{ includeMetadataChanges: true }` — a server confirming an unchanged cached result emits no event otherwise.
- **Emulators always use project `demo-mk-workout`**; test UIDs are `alice`/`bob` (allowlisted) and
  `mallory` (not). E2E creates them with fixed UIDs in `tests/e2e/global-setup.ts`.
- **Firebase SDK instances live on `globalThis`** (`src/lib/firebase/client.ts`) so a re-evaluated
  module (dev Fast Refresh) reuses them instead of calling `initializeFirestore` twice.
- **Rest timer** state is `{startedAt, endsAt}` persisted in localStorage; the display and the alert are
  always recomputed from `endsAt` (`src/lib/timer.ts`). Supersets only rest after the group's last exercise.
- **Overload engine** (`src/lib/overload`, all pure + tested): `suggest` (top of range on all working
  sets at RPE ≤ 8 → +increment; in range → +1 rep on weakest set; below → repeat; stall over 3 sessions →
  deload −10% / variation), `detectPrs` (weight, reps-at-weight, e1RM, session volume; first session is a
  baseline, not a PR), `tallyMuscles` + `TARGET_BANDS` (weekly sets per muscle). Suggestions render as
  dismissible chips; "Apply" only fills un-logged rows.
- **Zustand selectors must return stable values.** Never `?? []` / `.filter()` / `.map()` inside a
  selector — that is a new snapshot every call and React loops forever ("getSnapshot should be cached").
  Use `?? EMPTY` (`src/lib/cn.ts`) and derive lists with `useMemo` over the raw store value.
- **Charts** follow the dataviz skill: series colors are the validated `--chart-1`/`--chart-2` tokens (one set
  per theme, checked with `validate_palette.js`), read via `useChartColors()` because SVG attributes can't
  resolve CSS variables. 2px lines, ringed ≥8px dots, ≤24px bars with 4px rounded ends, hairline solid grid,
  one y-axis, a legend only for ≥2 series, sparse direct labels, crosshair/bar tooltips, and a "Show as table"
  view on every chart (`components/charts/ChartFrame`).
- **Firestore can't scan document ids descending** — for id-ordered collections like `weeklyStats` use an
  ascending id range (`where(documentId(), ">=", …)`) and reverse on the client.
- **Drag-and-drop** (`components/ui/SortableList`) always has a non-drag alternative (move up/down).
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

## Design system (brand)

Derived from the logo (`assets/brand/logo-source.webp`) with the ui-ux-pro-max skill. Tokens live in
`src/app/globals.css` — **never hard-code hex values in components**; use the Tailwind token classes.

- **Palette:** forest `#0A1612` (bg), cream `#EEE1CB` (text), sage (actions/accent). Dark is default;
  light = "cream paper" (`#F5EFE3` bg, forest text, deep sage `#2E6650` actions). Contrast is checked
  in both themes (text ≥ 4.5:1; `border-strong` for form controls ≥ 3:1).
- **Type:** Barlow (body, 16px base) + Barlow Condensed (`font-display`: titles, big numbers), self-hosted
  via `next/font`. Page titles are condensed uppercase; section labels use the `.eyebrow` utility
  (letter-spaced caps, echoing "GYM TRACKER"). Numbers use `.tabular`.
- **Interaction:** ≥ 48px targets; pressed state = colour change only (no transforms → no layout shift);
  150ms transitions; reduced motion respected. Selected state never relies on colour alone (chips show
  a check, nav shows a pill).
- **Icons:** lucide-react only, stroke 2, `aria-hidden` when beside text. App icons/favicon are generated
  from the logo by `npm run icons` (don't edit the PNGs by hand).

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
                                  supersetGroup?, durationMin? (cardio)}]}], version, updatedBy,
                                  updatedAt   (id: "main")
users/{uid}/sessions/{id}         date, dayId, dayName, programVersion, exercises[] (slot snapshot:
                                  key, exerciseId, targetSets, repMin, repMax, restSec?, supersetGroup?,
                                  durationMin?), startedAt, finishedAt?, durationSec, totalVolume, setCount,
                                  avgRestSec, prCount, notes, status(draft|done)
users/{uid}/sessions/{id}/sets/{setId}
                                  exerciseId, slotKey, order (within slot), type(warmup|working|drop|
                                  failure), weightKg, reps, rpe, restSec (actual rest taken), note, isPR,
                                  completedAt
users/{uid}/cardio/{id}           date, type, durationMin, distanceKm, avgHr, intensity, sessionId?
users/{uid}/measurements/{id}     date, weightKg, bodyFatPct, tape{chest,waist,hips,arms,thighs,calves,neck}
users/{uid}/prs/{exerciseId}      bestWeight, bestReps (at bestWeight), bestE1RM, bestVolume,
                                  repsAtWeight{kg→reps} (heaviest 40), dates{weight,reps,e1rm,volume}
users/{uid}/lastSets/{exerciseId} (added) sessionId, date, sets[] (last session, for pre-fill),
                                  history[≤400] {sessionId, date, topWeightKg, topReps, e1rm, volume}
                                  (oldest first; feeds stall detection AND progress charts — 1 read)
users/{uid}/weeklyStats/{yyyy-Www}(added) sessions, muscles{muscle→{sets, volume}} — written with
                                  increment() on finish (secondary muscles at half credit)
```

- Sessions snapshot `programVersion` **and** the day's exercise slots; editing the program never
  changes history. Each completed set is its own doc, written the moment it's ticked (offline-safe).
- A workout in progress is a `status: "draft"` session; on app start `findDraftSession` resumes it.
- Default program (seeded once, transaction-guarded): Upper A / Lower A / Upper B / Lower B / Full Body,
  abs on lower days, low-intensity cardio finisher on upper + lower days (`src/lib/program/template.ts`).
- On **finish**, one batched write updates the session, `prs`, `lastSets`, and `weeklyStats`.
- Program saves use a version check: if the stored `version` moved since editing began, warn the
  user (last-write-wins after confirmation). Rules require `version` to increase by exactly 1.

## Known platform limits (agreed)

- Rest-timer alerts while backgrounded: Android → local notification via the service worker
  (best effort); iOS → in-app alert as soon as the app is foregrounded. No server Web Push in v1.
- Progress photos are out of scope for v1 — see the `EXTENSION POINT: progress photos` markers.

## Phase status

1. Foundation — done (rules suite 12 tests, unit tests, 5 Playwright smoke tests)
2. Core (program editor, live logging, rest timer, drafts, pre-fill) — done (50 unit, 12 rules, 9 E2E)
3. Overload engine — done (suggestions, PRs on finish, stall detection, weekly muscle volume)
4. Tracking (cardio, body, charts, history) — done (history + detail, progress charts, muscle bands, consistency, cardio, body)
5. Extras (Compare, CSV import/export) — todo
6. Hardening (offline E2E, perf, Sentry, Lighthouse, README deploy guide) — todo

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
