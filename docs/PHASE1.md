# Tier C League: Phase 1 build brief

For Claude Code. Read this file first, then `docs/SCOPE.md`.

- `SCOPE.md` is the full spec and the source of truth for every game rule.
- This brief says what to build now, in what order, and how to hand over the steps the commish does by hand.
- The "Calls I made to close gaps" in SCOPE.md's Decisions log are approved unless the commish says otherwise.
- Target: Phase 1 done by Sunday, December 13, 2026, so a no-stakes preseason can start December 14 and Season 1 can kick off Monday, January 4, 2027.

## Working with the commish

- The commish runs the league and does the hands-on steps: accounts, installs and phone checks.
- Give those one step at a time, with the exact clicks or command, and one sentence on why. Wait for a confirmation before moving on.
- When you make an architecture choice, explain it in a sentence or two. Give the reasoning, not jargon.
- GitHub and Firebase are set up later. Build everything that works offline first and don't ask for accounts before Step 5.

## Non-negotiables

1. **Free to run.** Firebase Spark plan only: Firestore, Anonymous Auth and Cloud Messaging. No Cloud Functions and no Cloud Storage, because both need the paid plan. Timed work runs in GitHub Actions. Hosting is GitHub Pages from a public repo.
2. **No secrets in the repo or in chat.** The Firebase web config is public by design and safe to share. The service account key goes only into GitHub Secrets, which the commish adds on the GitHub website.
3. **The server's clock decides.** Security rules compare `request.time` with calendar docs the jobs write. Never trust a phone's clock for a deadline.
4. **One scoring engine.** All game math lives in one pure TypeScript package. The app uses it for live scores and the jobs use it for official results, so they can never disagree.
5. **Original art only.** No Rocket League logos, car models, item names, sounds or fonts.
6. **Model the data for all three phases now, build only Phase 1.** Phases 2 and 3 should not need data migrations.
7. **Small, tested steps.** Write the rule tests first. Commit after each step with a clear message.
8. **Keep two logs.** `docs/PROGRESS.md` lists what's done, what's next, what's blocked and questions for the commish. `docs/DECISIONS.md` records any rule you had to interpret.
9. **Ask, don't guess, on scoring.** If SCOPE.md is unclear or contradicts itself, ask the commish before building it.

## Phase 1 features

These come from SCOPE.md's build plan. The section names in parentheses point to the details.

- Intro animation ("Look and feel"), the install flow, the app icon and the launch screen. Draw 3 icon options for the commish to pick.
- Join with a league code, recovery keys, and commish season setup ("League, seasons and players", "Season setup and draft day").
- Mini draft: goal approval vote, rival pick and dare pick. The rest of the draft room is Phase 3.
- Today screen: the four squares (Screen Time plus Mind, Body and Wildcard), beers, rest day, the logging window and the power-up tray ("Daily play and scoring").
- Receipts with auto-voiding.
- Scoring engine, 1v1 schedule, The House and Season Points standings ("Weekly matchups and standings").
- Weekly kit (Aerial, Demolition, Full Boost) and Rule One ("Power-ups").
- Live feed and wall: quick chat, custom taunts with `{name}`, brags with comments, fire, skull and beer reactions, and moderation ("Live rivalry and social", Phase 1 rows only).
- Wheel of Shame: sealed draw, live synchronized spin, photo proof and vote, re-spin, and the Dare Dodger penalty ("Wheel of Shame").
- Weekly settlement, recap, MVP and Bust.
- Core push alerts (list below) with per-category settings and quiet hours, default 11 pm to 8 am.
- Commish tools from SCOPE.md's table that apply to Phase 1, plus the audit log.
- Nightly backup and restore.
- Until Phase 3 ships, scheduled group-play weeks run as normal 1v1 weeks.
- Until the Phase 2 garage ships, each player's car icon is a simple team-colored badge with their initial.

**Phase 1 alerts:** log your day, last call, Full Boost available, Rule One available, this week's rest day, opponent passed you, close finish, won or lost, Demolition landed, missed or blocked, you got demo'd, Aerial last chance, taunt aimed at you, reactions and comments (bundled), receipts requested and their deadline, docked, draft day, recap posted, live Wheel spin, dare proof vote.

**Not in Phase 1:** the garage and 2.5D cars, achievements, ranks and rank-up animations, the trophy case, rivalry record, nemesis, win meter, poke, rematch, highlight reel, predictions, storylines, suggestion box, the full draft room (group-play vote and captains), the six group-play modes, playoffs, the Whiff Bowl, holiday events and video proof.

## Stack and repo

The stack is decided in SCOPE.md's "Technical design".

```
tier-c-league/
  docs/               SCOPE.md, PHASE1.md, PROGRESS.md, DECISIONS.md, README.md
  engine/             pure TypeScript: scoring, calendar, schedule (no Firebase imports)
  app/                Vite + Preact + TypeScript installable web app
  jobs/               Node scripts: tick, daily, weekly, backup, restore, seed-test-league
  firebase/           firestore.rules, firestore.indexes.json, firebase.json (emulators)
  tests/              security-rule tests (emulator), end-to-end tests (Playwright, iPhone size)
  .github/workflows/  ci, deploy-pages, tick, daily, weekly, backup, keepalive
```

- npm workspaces, Node LTS, TypeScript in strict mode.
- Vitest for the engine and jobs, `@firebase/rules-unit-testing` on the Firestore emulator for rules, Playwright at iPhone size for flows.
- CI runs every test on every push.

## Build order

### Step 0: set up the build computer (with the commish)

- Check for Git, Node.js LTS and Java, which the Firestore emulator needs. If one is missing, walk the commish through installing it, one at a time.
- Run `git init` locally. GitHub comes in Step 5.

### Step 1: scoring engine, no UI

Build `engine/` and prove every rule with table-driven tests, each named in plain English.

1. **Daily points:** +1 per goal hit. Screen time scores par minus each full hour, with par 1 to 6 (default 3), or −3 if not logged. −1 per beer. A no-show is −5.
2. **Rest day:** Sunday by default. Goals score 0, while screen time and beers still count. Logging nothing is −3, not −5. It moves only while both days are still ahead, once a week, and next week's can be set early. It never breaks a streak, and there are none in the playoffs.
3. **Order of operations:** Rule One, then no-show or the base, then Aerial ×2, then Demolition and transfers, then docks, which are never doubled.
4. **Weekly kit:** Aerial and Demolition must be set before the target day starts, and Aerial can be cancelled until then. Demolition targets a goal lane, never screen time or a rest day, and stays hidden until the day locks. Full Boost on that goal blocks it, and a rest day moved onto it makes it fizzle. Full Boost is due by noon the next day. One of each per week.
5. **Rule One:** ceil(weeks ÷ 4) per season, issued at the start of Weeks 1, 5 and 9. Declared by noon the next day. It zeroes the day, and works in the regular season only.
6. **Receipts:** a request is allowed until the day locks, and each requester gets 3 a week. Proof is due by 11:59 pm that day, or the next day if requested after 6 pm. A failure voids the square and costs 1 more point. The commish can void and dock for fake proof.
7. **Matchups:** most points wins; a tie goes to fewer beers, then it's a draw. Season Points are all points plus +5 for a win and +2 for a draw. The House scores that week's league average, without the bye player.
8. **Schedule:** Week 1 comes from the rival picks, then a round-robin so everyone meets before any repeat. Relabel players so the drafted Week 1 pairs are round 1 of the circle method. Odd counts give one player a week a bye against The House. Group-play weeks are reserved in the schedule.
9. **Standings tiebreakers:** head-to-head, then fewer beers, then more perfect days, then a sealed coin flip.
10. **Weekly awards:** MVP has the most points, with fewer beers breaking ties. Bust is the biggest drop below a player's own 4-week average, or the lowest score in Weeks 1 and 2. The Wheel spinner has the lowest points, and ties all spin.
11. **Perfect days and check-in streaks.**
12. **Calendar:** league time zone, default America/New_York, with daylight saving handled. A day starts at 12:00 am and locks at 12:00 pm the next day. Weeks run Monday to Sunday. Results are provisional Monday at 12:00 pm and final Tuesday at 12:00 am.

**Checkpoint A:** send the commish a plain-English list of every rule the tests prove, plus three worked example weeks.

### Step 2: data model and security rules

- Build the collections from SCOPE.md's data model, with fields for Phases 2 and 3 included now.
- **Identity:** each device has a claim holding the player and the current key. Rotating the key signs out every other device. Use keys like `TCL-XXXX-XXXX` without look-alike characters (0 and O, 1 and I). League codes are at least 8 characters, so nobody can guess one.
- **Emulator tests must prove** that nobody can:
  - write another player's day, or any day outside its window;
  - read a sealed item early, the commish included;
  - set Aerial or Demolition after the target day starts, or more than one of each a week;
  - move a rest day outside its limits, or aim a Demolition at a rest day;
  - change settings without being commish, or enter out-of-range fields (beers 0 to 30, screen time 0 to 1,440 minutes in 15-minute steps).
- They must also prove that every commish override lands in the audit log.

**Checkpoint B:** a plain-English summary of what the rules block.

### Step 3: the app, against the local emulator

- Theme and intro animation exactly as SCOPE.md describes. The full version plays once a day, a short one after that. A tap skips it, sound plays only after "Tap to enter", and Reduce Motion gets a fade.
- **iPhone install:** use a standalone manifest and an apple-touch-icon. Opened in Safari instead of from the Home Screen, the app shows an Add to Home Screen guide. The notifications button appears only inside the Home Screen app.
- **Phase 1 screens:** join or recover, Today, Match, Feed, League, Profile, Wheel, Commish and the mini draft.
- **Offline:** turn on Firestore offline persistence. Show a banner when offline, and warn when a late sync could miss the noon lock.
- **Photo proof:** compress on the phone to 300 KB or less, store it in Firestore, and delete it after 14 days.
- **Performance:** first load under 2 seconds on 4G; animations at 60 frames a second on an iPhone 11-class phone.
- The commish can review the app on a phone over Wi-Fi from the dev server before anything goes online.

**Checkpoint C:** the commish taps through every screen on a phone and picks an icon.

### Step 4: jobs and the fast test league

- Scripts in `jobs/` can run twice safely, log what they did, and run locally against the emulator.
  - **tick**, every 10 minutes off the top of the hour: reveals at day lock, receipt deadlines and auto-voids, batched pushes, timed reminders and quiet hours.
  - **daily:** calendar entries (safe across daylight saving), streaks and rest-day defaults.
  - **weekly:** provisional settlement Monday 12:05 pm, final settlement Tuesday 12:05 am, the recap, MVP and Bust, and the sealed Wheel draw using crypto randomness.
  - **backup:** a nightly JSON snapshot committed to a private repo. **restore** rebuilds from a chosen date.
- **Fast test league:** a seed script that builds a league with short days (for example 10 minutes each) and simulated players who log on a schedule. A whole week of locks, reveals, settlement, recap and the Wheel then plays out in about an hour. Make it impossible to switch on for a real league.

**Checkpoint D:** run a compressed test week while the commish watches on a phone.

### Step 5: go live (needs the commish's accounts)

Give the commish this checklist one step at a time:

1. Create a GitHub account, a public repo `tier-c-league` and a private repo `tier-c-backups`.
2. Create a Firebase project on the Spark plan and add a web app. The web config can be pasted into the chat, because it is public by design.
3. Turn on Firestore in production mode with a US location, Anonymous sign-in, and a Cloud Messaging web push key pair.
4. Add the service account key to GitHub Secrets on the website, never in chat or the repo. Add a token that lets the backup job push to the private repo.
5. Set GitHub Pages to deploy from GitHub Actions.

Then deploy the rules, indexes and app, turn on the workflows, and give every job a manual "Run workflow" button. Tell the commish that scheduled runs can be late, and that public-repo schedules pause after 60 days without activity, which the keepalive job prevents.

### Step 6: Phase 1 is done when

- [ ] Engine tests cover every Phase 1 rule in SCOPE.md and pass in CI.
- [ ] Security-rule tests pass in CI.
- [ ] Two real phones install from the link, join, log, and see each other's updates live.
- [ ] Push notifications arrive on an iPhone Home Screen app and on Android.
- [ ] A third device recovers a profile with its key, and the old device is signed out.
- [ ] A compressed test week runs end to end, including the Wheel spin and proof vote.
- [ ] A backup and restore round trip matches the original data.
- [ ] `docs/README.md` tells the commish, in plain steps, how to run, deploy, back up and restore.

## Pace and cost

- Keep the build cheap: don't re-read large files you've already read, don't regenerate unchanged files, and keep test output short.
- After each checkpoint, give the commish a short status: what's done, what to check, and what's next.
