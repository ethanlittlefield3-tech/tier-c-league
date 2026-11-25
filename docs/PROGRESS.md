# Tier C League: progress log

Last updated 2026-11-25, after Commish tools, part 3.

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
  - The commish picked A (ruling R8). Switching later is one line in that script and `npm run icons`.
- **Install flow** (2026-11-25):
  - The app has a name ("Tier C League"), a Home Screen label ("Tier C"), icons for iPhone, Android and browsers, and a launch picture for 21 iPhone and iPad screen sizes (30 pictures, because iPads also start on their side).
  - Opened in Safari on an iPhone or iPad, it shows the three taps that add it to the Home Screen, and nothing else. The steps cover newer iPhones, where Share sits behind the three dots.
  - Another iPhone browser, or a page opened inside another app, is sent to Safari with a copy-the-link button.
  - Android gets install steps and a "Not now". A computer goes straight in.
  - The fonts now come from the app itself, so the first screen waits on no other website and works offline later.
  - 20 logic tests and 19 flow tests cover it. Breaking the install rules 11 different ways on purpose made a test fail every time.

- **Finding a profile from its recovery key** (2026-11-25). Step 2 left a gap: a new phone had no way to learn which player a recovery key belonged to. Each key is now on file under its own name (`lookup/{key}`), written and replaced in the same save as the key. 15 new rule tests, 138 in all. Weakening the new rules 11 ways was caught 11 times.

- **Join or recover** (2026-11-25), the first screens that use the database:
  - Joining: the league code, a display name with a live badge, then the recovery key to save. It is one save that the rules accept or refuse whole.
  - Getting back in: the league code and the recovery key. The key changes, and every other device is signed out.
  - A phone that was signed out says why, and opens on "get back in" with the league code filled in.
  - The next open goes straight in. A wrong code, a mistyped key, a look-alike character, a full league and a closed league each get their own plain message.
  - The live site has no database yet, so its way in says "The league is not open yet."
  - 13 logic tests and 14 flow tests. The flow tests run against a local copy of the database and sign-in, so nothing real is touched.
  - Not covered by a test: the "not open yet" notice, because the tests always have a database. It was checked by eye.
  - Two things only GitHub's machines showed, both fixed: the switch that points the test build at the local database sat in a file git ignores, and on a slow machine a test could tap the title before it was ready.

- **The league's Firebase project exists** (2026-11-25, ruling R9), and the live app points at it. Its web settings are in `app/src/data/backend.ts`. They are public by design.
- **The first two jobs** (2026-11-25), in `jobs/`, each with a button on GitHub's Actions tab:
  - **Create a league** makes a league with one player, the commish. It never prints the league code or the key.
  - **Publish the security rules** runs by itself after the tests pass on main. Until the service account key is in GitHub Secrets it skips itself.
  - 10 logic tests cover what a new league starts with. 3 flow tests run the real setup job against the local database, then get in through the app.
- **Firebase setup finished** (2026-11-25). The commish turned on anonymous sign-in, created the database (Standard edition, production mode) and put the service account key into GitHub Secrets.
- **The security rules are live** (2026-11-25). The job published them, and Firebase's own service account needed no extra role. Checked from outside as a nameless phone:
  - Looking up a code or a key that nobody holds answers "not found", which is allowed.
  - Reading a league you are not in, and listing every code, are both refused.
  - A visitor who is not signed in can't look up a code.
  - These checks signed in 3 nameless test users. They can see nothing and do no harm.
- **The first league exists** (2026-11-25), named "Tier C League", made with the Create a league button. It has one player, the commish.
- **The app's frame and a first Profile** (2026-11-25). These came before Today because the join screens already promise that the key "stays in your Profile" and that a name can be changed later.
  - The frame: the tab's name and the league's name at the top, your badge top right, and five tabs along the bottom (Today, Match, Feed, League, Garage). A tab that is not built yet says what it will hold.
  - Profile: change your display name, show or hide your recovery key and copy it, and sign this phone out (it asks first). It also carries the "A Nunchucks Production" credit.
  - No new security rules were needed: renaming, reading your own key and signing out were already allowed and tested.
  - 16 new flow tests, 60 in all. They caught one real problem on the way: the name card and its text box both answered to "Display name" for a screen reader.

- **Today, part 1: logging your day** (2026-11-25). The day's total on a slanted scoreboard, the three goals, screen time in 15-minute steps, beers, and yesterday until it locks at noon. Scores come from the engine, so the phone shows what the official result will be. A rest day takes the goals off. A locked day shows its final score and can't be changed.
  - The commish confirmed on a real iPhone that installing, joining and Profile work.
  - New rule: everyone in the league can read every player's goals (3 tests, 141 rule tests in all). Goals are still written only by jobs until the draft is built.
  - The flow tests start a season with its whole calendar from the same code the season job will use, and can open or lock any day, so they pass at any hour. 15 new flow tests, 75 in all. 13 new logic tests.
  - Still to come on Today: the scoreboard against your opponent, the power-up tray, the rest-day picker and the week bars.

- **iPhone layout fix** (2026-11-25), from the commish's first phone check. On the Home Screen app, the title and the main page sat a little too high, and a touch that missed the button moved the whole screen. Other developers report the same thing on iOS 26 with the status bar set to "black-translucent", which this app used: iOS adds the status bar's height at the bottom as well, and can leave the page scrolled up after the keyboard closes. Three fixes:
  - The status bar is now solid navy, above the page (Apple's own advice for this bug).
  - The page itself can no longer scroll or bounce. Only the app's own content scrolls, and the title doesn't move at all.
  - When the keyboard closes, the page goes back to the top.
  - 5 flow tests guard the fixes, but the bug only shows on a real iPhone, so the commish's next phone check is the real test. iOS may only pick up the new status bar after the app is removed from the Home Screen and added again.
- **Today, part 2: the power-up tray and the rest-day picker** (2026-11-25).
  - Aerial: set on a day that hasn't started, move it, or cancel it until then. On the day, the score shows it doubled.
  - Demolition: pick a day and one of your opponent's goals. It asks once more, because it's final, and it's sealed until noon the next day. It never offers the opponent's rest day, and says so in a bye week against The House.
  - Full Boost: count a missed goal as hit, on today or yesterday until noon. It offers only the goals you missed, and can be taken back until the day locks.
  - Rule One: shows how many have arrived; use one on an open day, or take it back until the day locks.
  - Rest day: move it this week or set next week's, while both days are still ahead.
  - Every choice comes from the same calendar times the security rules use, so what the phone offers is what the server accepts. No new rules were needed.
  - Fixed on the way: on a Monday morning, yesterday belongs to last week, and so do its power-ups (call 7). A test now reproduces Monday morning on any day.
  - 13 logic tests and 15 flow tests. 93 flow tests in all.
- **Season setup and the season calendar** (2026-11-25).
  - Commish tools, opened from Profile and shown only to the commish and co-commish. They show the league code to share, and season setup with every setting from SCOPE.md and its defaults. Kickoff must be a future Monday, and the draft must come before kickoff. The draft defaults to 7 pm league time on the Sunday before.
  - Starting a season is one save: the season, and the league pointing at it, each with an audit entry. The settings can change until the draft starts, and every change is logged.
  - "Keep the season calendar" runs on GitHub every hour (`jobs/season-calendar.ts`). It writes each day of the current season from its settings, and when each Rule One arrives. It writes only what changed, and removes days a moved kickoff left behind.
  - 5 logic tests for the calendar sync, 14 for season setup, 3 new rule tests (144 in all), and 6 flow tests. The flow tests run the real job against the local database.
  - On the way, a test caught that the "season is set up" message vanished as the form reloaded. Fixed.
- **Today's new layout, from the commish's mockup** (2026-11-25, ruling R10).
  - At the top, with no scrolling: the day pills ("Today · Nov 25", "Yesterday · Nov 24" until noon), then screen time and the three goals in a 2-by-2 grid. A hit goal fills with team blue and a white check. Full Boost turns it orange, and a rest day says "Rest".
  - Tapping screen time opens a big sheet with the time and its points, a blue-to-orange slider, buttons for 1 hour and 15 minutes either way, and the scale at the season's par with your bracket lit. It also has "Save screen time", "Clear it" and "Close". Nothing changes until Save.
  - Below, a scroll away: beers, the day total with its breakdown ("Goals +2 · screen +1 · beers −1"), and the power-ups.
  - New flow tests check that all four squares fit without scrolling on an iPhone 13 and a small iPhone SE, at the Home Screen app's own size. 9 new logic tests and 6 new flow tests, 103 flow tests in all.
- **Today, part 3: the week strip and the scoreboard** (2026-11-25).
  - Below the day total: "Week 2", then "You +14 vs Maya +9" with who leads, using the tiebreak on fewer beers. It moves live as either player logs.
  - Seven day cells, M to S, each with its score (blue up, red down). Days that haven't started are dashed, today is underlined, and rest days are outlined in gold.
  - The beers card shows beers this week.
  - Each day is scored by the engine with everything on it: power-ups, commish docks and voids, and Demolitions once their day locks. A Demolition aimed at you is sealed until noon, so the phone looks for it once after each noon: about 7 reads a week.
  - Against The House, the scoreboard says so; The House's number comes with the weekly settlement job.
  - 7 logic tests and 4 flow tests.
- **Match** (2026-11-25): this week's matchup.
  - The score with both badges, you in blue and your opponent in orange, and who leads.
  - Their day, live, as four read-only cards in team orange: screen time with its points, their goals, beers, and their day total. Rest day, Aerial and Rule One show when they apply.
  - Both weeks side by side, day by day.
  - Your own sealed Demolition on them shows here, to you alone.
  - In a bye week, Match says you face The House. Before the schedule exists, it says the opponent comes after the draft.
  - 6 flow tests.
- **Commish tools, part 2** (2026-11-25). No new rules were needed: all of these were written and tested in Step 2.
  - Joining: open or closed.
  - Players and keys: see any player's recovery key, reissue it, name or remove a co-commish, hand over the role, and remove a player. Each one that matters asks first. Reissuing a key signs out every phone that player is on, which is how a lost phone is signed out. Removing a player signs them out at once, and their old key no longer works.
  - Fix a score: dock 1 point, void a square (it counts as missed, and 1 more point comes off), or enter a correction from −20 to +20. A reason is required, and a fix can't be changed afterwards.
  - The league log, for everyone, from Profile: every commish action with who, when and why.
  - Today's day total now includes the commish's fixes, and shows them ("Commish: −1").
  - 5 flow tests with two phones: what the commish does is checked on the other player's phone.
  - Still to come with their features: approving joins, the draft controls, settling a week from the app, and moderation.
- **Offline mode** (2026-11-25, from PHASE1.md's Step 3).
  - The phone keeps its own copy of the league's data and of saves it hasn't sent, so the app opens and logging works with no signal. Everything goes through when the signal is back.
  - With no signal, a strip under the header says so. Today's save line says the log is kept on this phone.
  - If an unsent save could miss the noon lock (offline, something waiting, the lock within 3 hours), Today warns: "This day locks at 12:00 pm. Get a signal before then…"
  - Fixed on the way, a real bug: two quick taps could lose one, and a quick second tap on a brand-new day could be refused. Each tap now builds on the phone's last save, not on what the screen last showed. A test reproduces it, and fails with the old behavior.
  - 3 logic tests and 3 flow tests that cut the browser's connection.
- **Weekly settlement and the League tab** (2026-11-25).
  - "Settle the weeks" runs on GitHub every hour (`jobs/weekly.ts`). Once a week's Sunday locks (noon on Monday) its results post as provisional, and at midnight on Tuesday they are final. It decides each 1v1, The House for a bye, the bonuses, MVP, Bust and who spins the Wheel. Then it rebuilds the standings. It works everything out again from the logs each time, so it is safe to run any number of times.
  - Each player gets a coin for the last tiebreak. It is drawn once, on the server, with real randomness, and kept sealed.
  - A player's week is now scored by the engine (`engine/src/days.ts`), shared by the phone and the job, so the live score and the official one can't disagree. 6 engine tests.
  - League: the standings (place, Season Points, win-draw-loss, beers, and which tiebreak set a place), this week's matchups, results with the awards, and the schedule.
  - New rule: everyone in the league can read the standings, and no phone can write them (4 rule tests, 148 in all).
  - 9 job tests and 2 flow tests. One runs the real job against a finished week, and checks League and a second run.
  - Not yet: the weeks' pairings come from the schedule, which the draft builds. Until the draft exists, nothing has a pairing to settle.
- **The draft, part 1: goals and votes** (2026-11-25).
  - Commish tools: "Start the draft" draws the order at random from everyone in the league, opens goals and votes for 24 hours, and fixes the season's settings. Then: move the live draft on (rival picks, dares, done), give 12 more hours, or close the votes (it asks first). Every change is logged.
  - Today shows "The draft is on" while it runs, with a button to the Draft screen.
  - The Draft screen: set your Mind, Body and Wildcard goals, and approve or veto everyone else's. Each goal shows its tally live ("Vetoed: 0 approve, 1 veto"). A vetoed goal gets new words, which start a fresh vote. When the votes close, everyone sees the season's goals and how each vote ended.
  - New rules: the draft, goals and votes (17 rule tests, 165 in all). Weakening them 13 ways was caught 12 times. The 13th, letting anyone write the draft, is still refused because the save also needs an audit entry only the commish can write.
  - The vote count is in the engine (`engine/src/votes.ts`, 5 tests). The "majority" in a majority veto is built provisionally: see DECISIONS.md, "Still open".
  - 4 logic tests and 3 flow tests with two phones. They caught one real problem: tapping "Close" while "more time" was still saving undid the close. Both buttons now wait for each other.
- **The draft, part 2: rival picks and the schedule** (2026-11-25).
  - Commish tools moves the live draft on to rival picks. In draft order, each unpicked player picks a Week 1 rival on a 2-minute clock, with the countdown on every phone. With an odd count, the last player faces The House.
  - When a clock runs out, the commish's phone makes the pick at random and logs it. Commish tools also has a button for it.
  - Week 1 fills in live on every phone. Dares wait until every pick is in.
  - Once the commish finishes the draft, the hourly season job builds the schedule: Week 1 from the picks, then a round-robin so everyone meets before anyone repeats, with The House for byes. The season goes active, and the schedule shows in League.
  - New rules for the picks: 12 rule tests, 177 in all. Weakening them 10 ways was caught 9 times. The 10th, allowing a pick with one player left, is still refused because nobody is left to pick. The check also found a missing test, now added: someone who has already picked can never pick again.
  - The pick rules are in the engine (`engine/src/draft.ts`, 8 tests), shared by the phones and the job. 6 job tests, 2 logic tests and 2 flow tests. One flow test runs the real schedule job, and a second run changes nothing.
- **The draft, part 3: dares** (2026-11-25). This completes the mini draft.
  - At the dares step, each player adds one dare for the Wheel (up to 80 characters) and approves or vetoes everyone else's, with live tallies. A vetoed dare gets new words and a fresh vote. When the votes close, everyone sees which dares stand.
  - SCOPE.md's 8 starter dares are in the engine (`engine/src/dares.ts`), so the Wheel's pool needs nothing loaded.
  - New rules: 12 rule tests, 189 in all. Weakening them 9 ways was caught 9 times, after one missing test was added: votes on dares wait for the dares step.
  - 2 engine tests and 1 flow test.
  - One older flow test failed once in a full run ("What you logged is still there the next time the app opens") and passed in every rerun. It reloaded the app as soon as the screen said "Saved", without checking the beer tap had landed. It now checks the count and the server before reloading, so if it ever fails again it will show which step went wrong.
- **Feed, part 1: the wall** (2026-11-25).
  - "Talk to Maya": this week's opponent is one tap from a taunt. SCOPE.md's 10 quick-chat lines sit in one row you swipe sideways, with `{name}` filled in, and each sends on one tap. Write your own taunt with `{name}`, and save up to 10 for later.
  - Brags: share a win from outside the game. Everyone can comment on it.
  - Every post takes fire, skull and beer reactions, and the counts move live on every phone.
  - Take down your own post, or as the commish anyone's, which goes in the league log. Its words are blanked for good.
  - The wall shows the newest 50 posts, live.
  - New rules: 20 rule tests, 209 in all. Weakening them 21 ways was caught 20 times, after one test was fixed to catch a post of an unknown kind. The 21st, a reaction missing a part, is still refused, because a missing part can't be checked as on or off.
  - 5 logic tests and 5 flow tests with two phones.
- **Feed, part 2: the live feed** (2026-11-25). Mixed into the wall, newest first, live:
  - Check-ins ("Maya logged Tue"), power-ups ("Maya set an Aerial for Thu", Full Boost, Rule One), and every commish fix with its reason (SCOPE.md: "Every dock shows in the feed with its reason").
  - Revealed Demolitions: "Maya's Demolition on Jordan's Body goal, Tue: Landed", or Missed, or Blocked with the reason. The hourly weekly job works these out with the same engine as the score and keeps them on the week, so they show within the hour after noon.
  - Each week's results with every matchup and the awards, and again when the week goes final.
  - 7 logic tests, 5 job tests, and 1 flow test that runs the real weekly job and checks both phones.
- **Receipts** (2026-11-25), SCOPE.md's "Receipts on demand":
  - Match has "Receipts?" on each square your opponent claimed, today and yesterday until noon, with how many of your 3 requests are left this week.
  - The player sees the request at the top of Today, with who asked and the time left. They upload a photo, which the phone shrinks to 300 KB or less, or back down for free (ruling R4). With no answer by the deadline the square is voided and costs 1 more point, on every phone at once.
  - Ruling R6: with a screen-time receipt open, the number can still be fixed, even after the day locks.
  - The asker sees each receipt's outcome and can open the proof photo. Receipts show in the live feed too.
  - The weekly job deletes proof photos after 14 days, reading only their times.
  - New rules: 17 rule tests, 226 in all. Weakening them 22 ways was caught 20 times, after 5 missing tests were added. The other 2, proof from someone else and proof after the deadline, are still refused, because the same save must mark the receipt proven, which only its player can do before the deadline.
  - 1 engine test, 6 logic tests, 2 job tests and 5 flow tests.
  - Not yet: asking on a player other than your opponent (the rules allow it; the screen for another player's day comes later), and the push alerts for a request and its last hour, which come with notifications.
- **The Wheel of Shame, part 1: the sealed draw and the live spin** (2026-11-25).
  - When a week goes final, the hourly weekly job draws a dare for each of its lowest scorers, with real randomness, and seals it. The wheel's slices are the draft's dares that stand, then starter dares to fill it to 16.
  - The spinner gets a card on Today. Everyone gets a banner on Feed. The Wheel screen shows the wheel, drawn for this app, with "Spin the Wheel" for the spinner and "Waiting for Riley to spin" for everyone else.
  - Tapping Spin reveals the sealed result to everyone at once: the wheel turns for 5 seconds on every phone watching and lands on the dare. Proof is due by 11:59 pm that Sunday.
  - New rules: 6 rule tests, 232 in all. Weakening them 7 ways was caught 7 times.
  - 5 engine tests, 4 job tests, 4 logic tests, and 1 flow test that runs the real weekly job, spins on one phone and watches on another.
- **The Wheel of Shame, part 2: dare proof, the vote, and dodges** (2026-11-25).
  - After the spin, the spinner uploads a photo before the Sunday deadline. Everyone else sees it and votes "Counts" or "Doesn't count" for 24 hours, with live tallies.
  - More than half saying "Doesn't count" means a new sealed spin, which the hourly job draws, and the spinner spins again.
  - No proof by the deadline is a dodge: 3 Season Points off in the standings.
  - The feed shows each spin, each proof, how its vote ended, and each dodge.
  - The weekly job deletes dare photos after 14 days, like receipt photos.
  - Fixed on the way: a tiebreak coin could be read by its own player. Now nobody can.
  - Fixed on the way, found by a flow test: the job stored each draw's deadline as a plain number, which the rules could not compare with the clock. It is a timestamp now.
  - New rules: 11 rule tests, 243 in all. Weakening them 16 ways was caught 10 times, after 2 missing tests were added. The other 6 are still refused because the proof and the spin's "proven" mark must arrive in one save, and each rule checks the other.
  - 1 job test, 1 logic test, and 2 flow tests: a vote that sends the spinner back to the wheel, and a dodge that comes off the standings.
- **Commish tools, part 3: weeks and dares** (2026-11-25).
  - Unlock a final week, with a reason: the weekly job counts it again with any late fixes, such as a dock after the week ended, then it goes final again.
  - Take a dare off the Wheel, with a reason: future draws leave it out, and the draft's results say so.
  - Both go in the league log. New rules: 5 rule tests, 248 in all. Weakening them 8 ways was caught 6 times. The other 2, letting anyone unlock a week or remove a dare, are still refused because the save also needs an audit entry only the commish can write.
  - 1 job test and 2 flow tests that run the real weekly job.
- **The shorter intro on reopening is on purpose:** the full intro plays on the first open each day, and a 1-second title after that (SCOPE.md, "Intro animation").

## Waiting on the commish

1. **Phone check of the layout fix.** Open Tier C. If the area behind the clock is not solid navy, remove Tier C from the Home Screen and add it again from Safari. Have the recovery key ready first (Profile, Show my key), because a re-added app starts signed out. Then check that the title and the main page sit right, and that a touch doesn't move the whole screen.

## Next

1. **Step 3, continued.** Every Phase 1 screen now exists. Still to come in Commish tools: approve joins (a waiting list for new players), mark a player as left (waits on the mid-season question below), settle a week from the app when the job runs late, and taking a starter dare off the Wheel. Then the commish's phone check of every screen (Checkpoint C).
   - **Push alerts** wait on one thing from the commish: a Cloud Messaging web push key, made in the Firebase console. The app will ask for it one step at a time when that feature is next.
   - **Still to add to joining:** the notifications step (with push alerts), a commish's "approve joins" switch, and a way to make a league. Leagues are made by a setup script, which is built with the jobs in Step 4.
   - **Offline start** comes with the offline step: a service worker that keeps the app's files on the phone, so it opens with no signal. Chrome on Android only offers its one-tap Install button once that exists. Until then Android installs from the browser menu, which the guide explains.
2. **Before real players join:** limit the app's web key to the app's own address in the Google Cloud console, and look at App Check, which stops other programs from using the database's free daily allowance.
   - **Step 5 items still to come, each with the feature that needs it:** the Cloud Messaging web push key (notifications), and the private backups repo with its token (the backup job).
3. **Rules still to write, each with its screen and its tests:** the remaining commish tools (approve joins, settle or unlock a week, moderation). They are in DATA-MODEL.md and refused until then.

## Questions for the commish, asked when each feature is built

- **Votes:** is a "majority" more than half of everyone eligible, or more than half of the votes cast? This decides goal vetoes, dare vetoes and dare-proof votes. **Built provisionally as more than half of everyone eligible** (DECISIONS.md, "Still open").
- **A goal still vetoed when the votes close:** the commish settles it for now. Should something happen on its own?
- **Wheel:** what happens if the spinner never taps Spin? **Built provisionally:** the proof deadline runs from the draw, when the week goes final, not from the tap (DECISIONS.md, "Still open").
- **Dare pool:** 8 starter dares plus one per player is up to 20, but the wheel holds 8 to 16 slices. **Built provisionally:** every draft dare that stands, then starters at random to fill 16 (DECISIONS.md, "Still open").
- **Joining or leaving mid-season:** how the schedule and the missed days are handled.

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
