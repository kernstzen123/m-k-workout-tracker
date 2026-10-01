# Testing guide

What's automated, and the short manual checklist for the things only real phones can prove.

## Automated (run before every deploy — CI does this on every push)

| Layer                       | Command              | What it proves                                                                                                                                                                                                                                                       |
| --------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)               | `npm test`           | Overload engine, e1RM, PR detection, stall detection, rest-timer math, volume aggregation, consistency/trends, CSV parsing + import planning, compare logic                                                                                                          |
| Security rules              | `npm run test:rules` | A third account is denied everything; neither user can write the other's private data; partners can read (not write) each other's sessions; compare opt-out; program version rules                                                                                   |
| E2E (Playwright, emulators) | `npm run test:e2e`   | Login + allowlist, program sharing + edit conflicts, live logging (pre-fill, rest timer, draft recovery, finish → PRs → History), tracking screens, Compare, CSV import/export, **offline workout that syncs afterwards** (production build with the service worker) |

The E2E suite runs in three Playwright projects: `core` (clean emulator), `extras` (builds on core's
data) and `offline` (production build on port 3200, so the service worker is real).

## Manual device checklist

Do this once after the first deploy, and again after big changes. Use the real Vercel URL.

### Install

- [ ] **Android / Chrome**: open the URL → an _Install app_ card appears on Home (or Chrome menu →
      _Install app_). The icon on the home screen is the M&K logo; it opens full-screen, dark.
- [ ] **iPhone / Safari**: Share → _Add to Home Screen_. The icon is the M&K logo; it opens without
      Safari's address bar. (Must be Safari — other iOS browsers can't install.)
- [ ] Both of you sign in once **while online** on each phone.

### Offline in the gym

- [ ] Open the installed app once online (this caches it), then turn on **airplane mode**.
- [ ] Force-close the app and reopen it: it loads, shows the _Offline_ banner, and you're still
      signed in.
- [ ] Start a workout, log several sets, change a weight, finish it. Everything works.
- [ ] Turn airplane mode off. Within a minute, the workout shows in History on the **other** phone
      (partner view) and in the Firebase console.

### Crash / close recovery

- [ ] Mid-workout, swipe the app away. Reopen: the workout resumes with every logged set.
- [ ] Finish a workout and immediately swipe the app away. Reopen: it is _not_ back "in progress".

### Rest timer

- [ ] Complete a set → the timer starts with the exercise's rest time; ±15 s and skip work.
- [ ] Lock the phone during a rest. Unlock after it should have ended → the timer shows _Rest over_,
      chimes and vibrates (iPhone: sound plays once the app is in front).
- [ ] **Android**: enable _Settings → Rest timer → Background notifications_, start a rest, switch to
      another app → a "Rest over" notification arrives (best effort; can be delayed by battery saving).
- [ ] **iPhone** (installed app, iOS 16.4+): the same toggle; notifications are best effort and may
      only appear once you return to the app.

### Two people, one program

- [ ] One of you edits the program and saves → the other sees the change on the Program screen.
- [ ] Both open the editor, one saves, the other saves → the second gets the _Program changed_ prompt.
- [ ] A workout done _before_ the edit still shows its original exercises in History.

### Accessibility spot-checks

- [ ] Phone text size at maximum: screens stay usable, nothing overlaps the bottom navigation.
- [ ] Light theme (_Settings → Appearance_): everything stays readable.
- [ ] VoiceOver / TalkBack: set rows read as "Set 1 weight in kg", "Complete set 1", etc.
