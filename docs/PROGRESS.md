# Tier C League: progress log

Last updated 2026-11-25, after the app went live on GitHub Pages with its install flow.

## Plan change (commish ruling, 2026-11-25)

- The timeline in SCOPE.md and PHASE1.md is off.
- The goal is every feature in SCOPE.md, all three phases, before Season 1, however long it takes.
- Phase 1 is still built first, in PHASE1.md's order, because Phases 2 and 3 sit on top of it. Draft Day and kickoff get new dates when the build is close.

## Done

- **Readiness check** (2026-11-24). Results are at the bottom of this file.
- **Where the build runs:** a cloud workspace, with this GitHub repo as the code's home. Package downloads and the Firestore emulator both work there.
- **Step 1, the scoring engine** (2026-11-25):
  - `engine/` covers the calendar, daily scoring, matchups and The House, the schedule, standings, awards, streaks, kit and rest-day timing, receipts, recovery keys and the calendar the rules read.
  - 196 rule tests pass and TypeScript strict mode is clean (TypeScript 7.0.2, Vitest 5.1.1).
  - Breaking 4 rules on purpose made 18 tests fail, so the tests catch real mistakes.
  - Three worked example weeks match totals worked out by hand.
  - Process note: the rule list was drafted from SCOPE.md before any code, but in Step 1 each module was written just before its test file. From Step 2 on, the tests are written first.
- **Checkpoint A, closed 2026-11-25:** `docs/CHECKPOINT-A.md`. The commish confirmed the three worked weeks, answered the receipts follow-up (ruling R6) and vetoed none of the 25 calls.
- **Step 2, data model and security rules** (2026-11-25):
  - `docs/DATA-MODEL.md` lists every collection for all three phases.
  - `firebase/firestore.rules` covers league codes, joining, recovery keys, device claims, season settings, daily logs, Aerial, Full Boost, rest days, Rule One, sealed Demolitions, docks and the audit log.
  - 123 emulator tests pass (firebase-tools 15.37, Firestore emulator 1.22, Java 21). They prove everything on PHASE1.md's Step 2 list.
  - Weakening the rules 13 different ways: 12 were caught by a test. The 13th, letting a non-commish save settings, is still refused because the save also needs an audit entry only the commish can write.
  - Engine tests confirm the calendar numbers the rules compare give the same answers as the engine's own deadlines.
- **Checkpoint B:** `docs/CHECKPOINT-B.md`, rebuilt by `npm run checkpoint:b`.
- **Six rulings from the commish** (R1 to R6) and 25 smaller calls reviewed without a veto: `docs/DECISIONS.md`.
- **On GitHub** (2026-11-25). The repo is public, so before the first push every personal detail, private link and build-cost note was taken out of the files, example players got made-up names, and the saved history was rebuilt from the clean copy.
- **CI** (2026-11-25): `.github/workflows/ci.yml` runs the type checks, the engine tests and the security-rule tests on GitHub for every push. The first run passed.
- **Step 3 has started** (2026-11-25): `app/` is a Vite and Preact app with the theme colors and the title screen. The scene is layered vector art drawn by `scripts/art/title-scene.mjs`: about 340 shapes and 25 gradients, against about 40 shapes in the first concept.
- **Art level approved** (2026-11-25, ruling R7). The new title screen is the standard for every screen.
- **Intro animation** (2026-11-25): the Nunchucks card (2 s), the boost scene (2.5 s) and the title slam, exactly as SCOPE.md lists them. The full version plays on the first open each day and a 1-second version after that. A tap or a key skips it, sound starts only with Tap to enter, and Reduce Motion gets a fade. The scene is nine layers, and only whole layers move, which is what keeps it smooth on a phone.
- **Phone-size flow tests** (2026-11-25): `tests/e2e/` runs the built app in a browser at iPhone size. 11 tests cover the intro. CI runs them on every push.
- **The intro is approved, and GitHub Pages is on** (2026-11-25). `.github/workflows/deploy-pages.yml` publishes the app after the CI tests pass on main, so the commish can open every change on a phone.
- **The app is live** (2026-11-25). The first deploy passed. The address is on the repo's Settings, Pages screen.
- **Three icon options** (2026-11-25), drawn by `scripts/art/icons.mjs` at the approved art level:
  - A: the gold C badge with a blue-to-orange boost streak, on navy.
  - B: the same badge with crossed nunchucks behind it.
  - C: a big C on a blue and orange split.
  - A is in place until the commish picks. Switching is one line in that script and `npm run icons`.
- **Install flow** (2026-11-25):
  - The app has a name ("Tier C League"), a Home Screen label ("Tier C"), icons for iPhone, Android and browsers, and a launch picture for 21 iPhone and iPad screen sizes (30 pictures, because iPads also start on their side).
  - Opened in Safari on an iPhone or iPad, it shows the three taps that add it to the Home Screen, and nothing else. The steps cover newer iPhones, where Share sits behind the three dots.
  - Another iPhone browser, or a page opened inside another app, is sent to Safari with a copy-the-link button.
  - Android gets install steps and a "Not now". A computer goes straight in.
  - The fonts now come from the app itself, so the first screen waits on no other website and works offline later.
  - 20 logic tests and 19 flow tests cover it. Breaking the install rules 11 different ways on purpose made a test fail every time.

- **Finding a profile from its recovery key** (2026-11-25). Step 2 left a gap: a new phone had no way to learn which player a recovery key belonged to. Each key is now on file under its own name (`lookup/{key}`), written and replaced in the same save as the key. 14 new rule tests, 137 in all. Weakening the new rules 11 ways was caught 11 times.

## Waiting on the commish

Neither of these blocks the build.

1. **Pick an icon: A, B or C.** A is in place. The sooner the better, because an iPhone keeps the icon from the day the app was added.
2. **Phone check of the install.** On an iPhone: open the live address in Safari, follow the three taps, then open Tier C from the Home Screen. Things only a real phone can show: the icon and its label, the launch picture, whether the intro is smooth, and the sound on Tap to enter.

## Next

1. **Step 3, continued.** The screens: join or recover, Today, Match, Feed, League, Profile, Wheel, Commish and the mini draft. The join screen is next.
   - **A decision is coming with the join screen.** The screens after it need a database. PHASE1.md planned for the commish to try them on a phone over Wi-Fi from a computer, but this build runs in a cloud workspace a phone cannot reach. So either the free Firebase project (Step 5, items 1 to 3) moves up, or the commish reviews those screens as pictures and clips until Step 5.
   - **Offline start** comes with the offline step: a service worker that keeps the app's files on the phone, so it opens with no signal. Chrome on Android only offers its one-tap Install button once that exists. Until then Android installs from the browser menu, which the guide explains.
2. **Rules still to write, each with its screen and its tests:** receipts and proofs, roster and goal votes, the wall, dares, the Wheel, the draft, and the remaining commish tools (approve joins, settle or unlock a week, moderation). They are in DATA-MODEL.md and refused until then.

## Questions for the commish, asked when each feature is built

- **Votes:** is a "majority" more than half of everyone eligible, or more than half of the votes cast? This decides goal vetoes, dare vetoes and dare-proof votes.
- **Wheel:** what happens if the spinner never taps Spin? Proposal: the proof deadline runs from when the week goes final, not from the tap.
- **Dare pool:** 8 starter dares plus one per player is up to 20, but the wheel holds 8 to 16 slices.
- **Joining or leaving mid-season:** how the schedule and the missed days are handled.
- **"Sign out a lost device":** proposal: this is the same button as "reissue key", which signs out every device that player has. Signing out one device at a time would need the commish to know which device is which.

## What was verified on 2026-11-24

| Claim in SCOPE.md | Result | Source |
| --- | --- | --- |
| Firebase Spark plan needs no payment method | Confirmed | [Firebase pricing](https://firebase.google.com/pricing) |
| Firestore free quota: 50,000 reads, 20,000 writes and 20,000 deletes a day, 1 GiB stored | Confirmed, plus 10 GiB a month of outbound transfer. It applies to the Standard edition | [Firestore usage and limits](https://firebase.google.com/docs/firestore/quotas) |
| Cloud Messaging is no-cost | Confirmed | [Firebase pricing](https://firebase.google.com/pricing) |
| Cloud Functions and Cloud Storage need the Blaze plan | Confirmed; both show "Not applicable" on Spark | [Firebase pricing](https://firebase.google.com/pricing), [Storage FAQ](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024) |
| Anonymous sign-in is free on Spark | The pricing page lists "Other Authentication services" as available on Spark and does not name anonymous sign-in separately | [Firebase pricing](https://firebase.google.com/pricing) |
| A proof photo of 300 KB fits in one document | Confirmed; the document limit is 1 MiB | [Firestore usage and limits](https://firebase.google.com/docs/firestore/quotas) |
| GitHub Pages is free for public repos on GitHub Free | Confirmed. A site may be up to 1 GB, with a soft limit of 100 GB of bandwidth a month | [GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans), [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| GitHub Actions is free in public repos | Confirmed for standard GitHub-hosted runners | [Actions billing and usage](https://docs.github.com/en/actions/concepts/billing-and-usage) |
| Private repos get 2,000 free Actions minutes a month | **Wording changed.** GitHub Free now lists $12 of included compute usage a month | [GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans) |
| Schedules run at most every 5 minutes, can be delayed or dropped, and pause after 60 idle days in a public repo | Confirmed. **New:** a schedule can now name an IANA time zone | [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) |
| iPhone push needs iOS 16.4 or later and a Home Screen app | Confirmed | [Apple](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) |

## Design notes from the check

1. **Run every scheduled job from the public repo, the backup included.** The backup job pushes to the private repo with a deploy key or token kept in GitHub Secrets. Private-repo compute used is then zero. Record this in DECISIONS.md when the job is built, because SCOPE.md describes the backup as using private-repo minutes.
2. **Treat job logs as public.** The app repo is public, so jobs log counts and IDs only: never names, recovery keys, photos or other league data.
3. **Use the schedule time zone** for the daily and weekly jobs so they follow league time across daylight saving. Check the exact syntax in GitHub's docs when writing the workflows.
4. **Choose Firestore Standard edition in Native mode** at Step 5. The Enterprise edition's free tier is counted in different units.
5. **Security rules can look up at most 10 other documents per single-document request,** and 20 across a batch or transaction. Each lookup is also a billed read. Keep the claim, key and calendar checks within that. Source: [Transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions).
6. **Test iPhone push early.** Forum reports describe push tokens changing on iPhone Home Screen apps. Check token refresh on a real iPhone at Checkpoint C, not at Step 6.
7. **Cloud workspace network.** The "Trusted" level covers npm and `*.googleapis.com`, which the Firestore emulator download needs. A setup script with the environment cache can pre-install dependencies. Sources: [Cloud environments](https://code.claude.com/docs/en/cloud-environments), [Cloud quickstart](https://code.claude.com/docs/en/web-quickstart).

## Tools

- **Already in the cloud workspace:** Node 22, npm 10, Git, Java, Python 3.13, TypeScript, tsx, Playwright 1.63 with Chromium, sharp.

## Reference

- The full scope document, the concept-art canvas and the pitch deck are kept in the commish's private workspace. Their links are left out of this public repo on purpose.

**Art baseline.** The canvas has 11 artboards: Intro card, Title screen, Today, Feed, League, Alley, Rumble, Team Week, Nunchucks studio mark, Group chat icon and Group chat background. The art is flat vector: about 10 to 45 shapes a board, at most 4 gradients, no filters and no animation. On 2026-11-24 the commish asked for more complex graphics.
