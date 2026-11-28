# Tier C League: progress log

Last updated 2026-11-25, after Rumble: group play is built.

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
  - Anyone's day is one tap from League, with "Receipts?" on what they claimed (added after the demo league).
  - Not yet: the push alerts for a request and its last hour, which come with notifications.
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
- **A demo league for trying every screen** (2026-11-25), for Checkpoint C:
  - A new GitHub button, Actions, "Demo league", makes a league of its own: the commish and five made-up players, a season in its third week, two weeks of logs, goals, the schedule, dares, wall posts, power-ups, and a receipt waiting on the commish. The weekly job then settles it, so the standings fill in and the commish, last both weeks, spins the Wheel.
  - The same button, with "delete" and the league id, removes it. It refuses any league that isn't a demo.
  - Like "Create a league", it never prints the code or the key; both are in the Firebase console.
  - 5 job tests, and 2 flow tests that run the real jobs and tap through the result.
- **Anyone's day, and a keepalive** (2026-11-25).
  - In League, each name in the standings opens that player's day: what they claimed today, and yesterday until noon, with "Receipts?" on each square. Before the standings start, everyone is listed instead. 1 flow test.
  - A monthly job, "Keep the schedules running", records the date and pushes it, because GitHub pauses scheduled jobs in a public repo after 60 days with no activity, which a quiet season could reach.
- **Starter dares off the Wheel** (2026-11-25). Commish tools lists the 8 starter dares, each with Remove or Put back and a reason for the league log. The next draw leaves removed ones out. New rule: 2 rule tests, 250 in all. Weakening it 4 ways was caught 2 times; the other 2 are still refused, by the audit entry only the commish can write and by the check on each place in the list. 1 engine test and 1 flow test.
- **Approve joins** (2026-11-25). Commish tools' joining switch has a third setting, With my approval. A new player types the code and a name as usual, and the phone asks instead of joining. It waits on "Asked to join", which it remembers when the app is closed, and it joins on its own once the commish taps Let in. Commish tools lists who is waiting, with Let in and Turn away, and each answer goes in the league log.
  - New rules: 8 rule tests. Weakening them 16 ways was caught 15 times; the other is still refused by the audit entry only the commish can write. 2 app tests and 4 flow tests.
- **Settle a week from the app** (2026-11-25). If the weekly job runs late, Commish tools lists each finished week it hasn't counted, under "Waiting on the weekly job". Settle now counts the week on the commish's phone with the engine code the job uses, and posts the results as provisional, with a reason in the league log. The job checks them when it runs and makes the week final. The settlement code moved from the jobs into the engine, so both use one copy.
  - New rule: 5 rule tests, 263 in all. Weakening it 13 ways was caught 12 times; the other is still refused by the audit entry only the commish can write. 1 flow test, which also runs the real job after.
- **The fast test league** (2026-11-25, PHASE1.md Step 4, for Checkpoint D). A button on GitHub, "Fast test week", makes a demo league whose days last 8 minutes, with the commish and three made-up players, then runs it for about 100 minutes. The made-up players log at their own times, set a Demolition on the commish, use Aerial and Full Boost, taunt, ask the commish for receipts, and spin, prove and vote on the Wheel. The weekly job settles the league every 2 minutes as it goes.
  - The engine has a fast clock: the same calendar with each day squeezed into a few minutes. The app follows it on every screen, and Today says the league is fast. The calendar and weekly jobs honor it only in a demo league.
  - 7 engine tests, 16 job tests, 1 app test and 1 flow test, which runs the real job against the local database and opens the league in the app.
- **Backups and restores** (2026-11-25, PHASE1.md Step 4). Early every morning, "Back up the league" writes every document as JSON, one file per collection, and commits it to the private backups repo, so its history holds every morning's copy. Proof photos are left out. "Restore from a backup" takes a date and puts the database back as that backup found it, for one league or all of it, once "restore" is typed in. Both skip until the backups repo and its token are in GitHub Secrets.
  - 6 job tests, and 2 flow tests: a demo league is backed up, deleted and restored, and a second backup matches the first file for file.
- **Alerts, part 1: on the phone** (2026-11-25). Profile has an Alerts panel: turn them on with a tap, switch each of the 7 kinds on or off, and set quiet hours. A new player is offered alerts right under their recovery key. A service worker shows the alerts, opens the app at the right screen when one is tapped, and keeps the app's files on the phone so it opens with no signal. The push token is fetched again on every open.
  - New rules for devices: a phone signs up only as the player its claim holds. 4 new rule tests and 1 rewritten. Weakening the rule 14 ways was caught 13 times; the other is still refused by the checks on each field. 3 engine tests and 5 flow tests.
  - Sending them is next: the tick job, every 10 minutes. Alerts also wait on the Cloud Messaging web push key from the commish.
- **Group play on Game Day, upgraded** (2026-11-27, ruling R29). Team Week, 2v2, Bounty Week and the Alley each get one card at the top, in the scoreboard's style: cars, averages, today's dial and week points for every player, a who's-favored bar, Bounty adds as bars, Alley medals and the Wheel for last, and the week's power-ups as icons. Rumble and Drop Shot keep the scoreboard, with Rumble's items on the cars and its items card and Drop Shot's floors attached under it. Every power-up and Rumble item has an icon (the tray, the items, your opponent's day, Today's line).
- **Pre-release spot check** (2026-11-27, ruling R30). The group play preview is out of Commish tools. Code nothing used is gone (the old mode banner, the "coming soon" tab, the Match tab icon, unused screen-time and car helpers). A tap through every screen of a test league shows no errors or warnings in the browser.
- **Game Day touch-ups** (2026-11-27, ruling R31). The House gets the scoreboard, with its live average. Receipts? is a slim bar that opens on a tap. Your opponent's day is checklist rows. The breakdown and "Saved" share one line. Group-play cards lose the repeated rule line at the top.
- **Practice week** (2026-11-28, ruling R32). Commish tools schedules one before the season: day length and start. The alerts job starts a new "Practice week" workflow, which sets it up as its own season on a fast clock, sends its alerts every half minute and settles it every two. Game Day, Feed and League play it under a "Practice week" strip. The weekly job's practice mode writes nothing past the season, and a test proves no profile, feed post or trophy changes. It clears itself 30 minutes after its results.
- **Telemetry tab** (2026-11-28, ruling R33). A fifth tab: Form out of 100 on a 40-segment boost gauge with rank notches and a pace marker, then where your points go, lanes, screen time by week, your week's shape, consistency, and you against the league with your place. The weekly job now keeps each player's habits on the week (`stats`), and the engine's `telemetry.ts` does the math for the phone and the job alike.
- **Scoring floors** (2026-11-28, ruling R34). Logged screen time never below −3; a logged day never below a blank day (−5, −3 on a rest day, 0 on a Holiday Pass). The day's breakdown shows the floor. The intro deck's screen-time slide is updated to match.
- **Holiday events announced** (2026-11-28, ruling R35). The feed posts each change from the league log, and Game Day shows a "Coming up" banner for the next seven days. No push.
- **Restore drill and usage check** (2026-11-28). A monthly "Restore drill" workflow restores the newest backup into an emulator on GitHub and checks every document came back exactly; tried locally on the demo league (198 of 198). The README now has the week-1 usage check and a reminder about the backup token's expiry.
- **Practice week in any mode** (2026-11-28, ruling R36). Commish tools picks 1v1 or any of the six group-play modes; the week, its matchups and its power-ups follow the mode.
- **Profile and Commish tools tidied** (2026-11-28, ruling R37). Same features, shorter pages: Profile about a quarter shorter, with the suggestion box beside Commish tools under the car; Commish tools grouped into League, Season, and Scores and weeks.
- **Season Wrapped** (2026-11-28, ruling R38). A season-end card on Game Day in the offseason and at the top of Telemetry: place, record, goals, screen time under par, best week, streak, nemesis and trophies, shared as a picture with your car. `app/src/telemetry/wrapped.ts` works it out and is tested on its own.
- **Season reset** (2026-11-28, ruling R39). At the bottom of Commish tools: type the season's name to reset it. The alerts job starts a new "Reset a season" workflow, which backs up, then runs `jobs/reset.ts`: the league goes back to the season before, the season is deleted, and its ranks, badges (and their car parts), decal, stickers, rivalry records, trophies, banner and feed news come off. `jobs/lib/reset.ts` has the rules, tested on their own; a flow test runs the whole reset against the emulator. Also fixed: a season started during a practice week took the number 2.
- **Faster pickup for resets and practice weeks** (2026-11-28, ruling R40). GitHub was running the alerts job about hourly, so the first reset waited about 40 minutes. The hourly Settle the weeks and Keep the season calendar jobs now look for them too, and the panel says how to start one now.
- **Practice job starts early** (2026-11-28, ruling R41). The first run that sees a practice request starts the job, up to an hour ahead, and Commish tools says how to start it by hand if GitHub is late.
- **Game Day works its week out once** (2026-11-28). Today, the scoreboard extras, your opponent's day, the group boards and The House's board all read one shared matchup (`useMatchup`), which now also counts Demolitions revealed on you in group play. Today lost its second copy of the opponent's listeners and the week's scoring.
  - The group flow tests check the new cards, and one checks the Alley's power-up icons.
- **Group play preview** (2026-11-27, ruling R28). Commish tools has "Open the preview": all six group-play modes in a made-up league of six, on the real boards (Team Week, 2v2, Bounty Week and the Alley boards, Drop Shot's floors, Rumble's items), scored and settled by the real engine. Pick a day or Final, log your own day and watch the board move, shuffle everyone else's week, and see the Season Points it would give. Nothing is saved. Fixed on the way: the mode banner and the Schedule still said "Match shows how it stands"; they name Game Day now.
  - 4 app tests and 2 flow tests.
- **The dial, the Garage build sheet and new backdrops** (2026-11-27, ruling R27).
  - The scoreboard's dial has a fourth, gold slice for screen time; filling it, all three goals in and screen time logged, plays your goal explosion.
  - The power-up icons sit in the middle of their rings, and Rule One's days are the same day tiles as the others.
  - The Garage is one build sheet: each slot shows what is on it now, tapping one opens its parts under it, the car stays pinned at the top while you scroll, and Undo takes back your last change. Part tiles off screen aren't drawn until you scroll to them.
  - Four new backdrops, everyone's from the start (City rooftop, Desert canyon, Snowfield, Arcade), and the four old ones redrawn with much more detail, as drawn scenes in the Garage and the showroom.
  - 3 new flow tests; the dial, explosion and Garage tests follow the changes.
- **Game Day, and odds** (2026-11-27, ruling R26).
  - Today and Match are one tab, Game Day, so there are four tabs: Game Day, Feed, League, Garage. An alert that opened Match opens Game Day.
  - From the top: the scoreboard, with each car's boost gauge (a slice for every goal in today) and a flame that grows with it; a tap on your opponent's car opens their day (goals, screen time, beers, their week). Then your day as a checklist: a goal you get in lights up from the left, its check pops in and a +1 slides in. Then the power-ups as glowing round icons, a slim Poke bar, receipts from your opponent, a rematch, Drop Shot's floors and your Demolition when there are any, and the picks banner last.
  - Group-play weeks show the mode's board in place of the scoreboard.
  - Each 1v1 shows its odds on the Schedule and the picks card: the win meter at kickoff, from each player's last 4 final weeks before the week just played, so they never move during the week. The feed's picks summary now gives the upset winner's chance and how many matchups the odds called.
  - 5 engine tests, 1 app test, and 2 new flow tests; the Match tests are rewritten for Game Day, and the other flow tests follow the new tab names and checklist.
- **Monday picks and an official-looking Schedule** (2026-11-27, ruling R25).
  - Picks left League. The first time the app opens on a week's Monday, a card pops up with that week's 1v1s, each two cars facing off; a tap picks one. Picks close at 11:59 pm that night, and nobody sees them until then. Closed, the card comes back from a slim banner on Today until 11:59 pm. Week 1 has picks now too.
  - When the week is final, the feed's picks post sums it up: the best record, the biggest upset (the win picked by the fewest) and how many picked.
  - The Schedule panel is the same size, restyled inside like a fixtures card: a strip with the week's dates, ruled rows with the names either side of the score or "vs", gold for the winner, and the awards as tags.
  - New rule: picks lock as the week's Monday ends. 2 new rule tests, 3 rewritten. 2 engine tests, 2 app tests, and the 3 picks flow tests rewritten. Flow tests about anything else now close the picks card if it pops up, so a test run on a real Monday goes the same as any other day.
  - Fixed on the way: 5 alert flow tests failed when run between 9 pm and midnight in New York, because the "Log your day" reminder joined in. Their test phone now has the daily reminders off.
- **The commish's third round of changes** (2026-11-27, ruling R24).
  - League's standings panel has three tabs: Standings, Badges and Rank. Rank ends with every rank and the share of the most a week can score where each starts. Profile no longer shows badges or rank.
  - Feed's post box starts folded to two buttons, "Trash talk" with your opponent's name and "Brag"; a tap opens that one. Posts are smaller, so more of the feed fits on a screen.
  - The Garage marks parts unlocked since your last visit as New, with a dot on their slot, lists your parts first and the locked ones after, and says how many of each slot's parts are yours.
  - Getting all three goals in plays your goal explosion over Today.
  - A dot on Feed, Match, League and Garage marks something new since you last opened that tab: a post by someone else, your opponent logging today, a week going final, a part unlocked. Opening the tab clears it. When you last looked is kept on the phone.
  - Scrolling down shrinks the header to a slim bar.
  - 3 app tests and 6 new flow tests; the rank, badges, Feed and frame flow tests follow the moves.
- **Joke parts** (2026-11-26, ruling R23). 39 new parts, each from an existing badge: 6 bodies, 11 decals, 6 toppers, 4 wheels, 4 boost trails, 4 goal explosions and 4 paints. Locked ones can be tried on in the Garage.
- **Garage detail and accent places** (2026-11-26, ruling R22). Every car has more detail, and the accent can go on any of 5 places, alone or together.
- **The commish's second round of layout changes** (2026-11-26).
  - A double tap no longer zooms the page.
  - The Garage scrolls up and down only.
  - Match has This week right under the score, shorter tiles, and a small Poke beside the beers.
  - Feed has a slim Wheel banner and post box, day headings, and a player's badges from the same moment on one line.
- **Garage upgrades** (2026-11-26, ruling R21).
  - Four new slots: accent, finish, trail style and backdrop. Champion adds a gold finish and a podium.
  - A season decal for every season finished, written by the weekly job when the champion is crowned, and a rank-emblem decal.
  - Locked parts can be tried on.
  - Slot icons over a swipeable parts carousel.
  - A showroom on each player's card in League.
- **The commish's layout changes** (2026-11-26, rulings R19 and R20).
  - The full intro plays on every open.
  - The screen-time card opens over the squares, smaller and without the points table. It now opens on the screen itself, so it can't be stuck down the page.
  - Feed has one place to post, with a Talk / Brag switch.
  - League shows everyone's rank emblem in the standings, and a tap on a name opens a card with their rank, place, Season Points, record, perfect days, beers, badges and your record against them. The Schedule panel below the standings opens on this week, and its arrows go back through each week's results and awards and on to the weeks to come.
- **Mark as left, and the Sunday spin** (2026-11-26, rulings R14 and R15). In Commish tools, "Mark as left" signs a player's phones out and lists them under Former players. Their matchups stay and score as if they did nothing, and they're kept out of MVP, the Bust, the Wheel and the playoffs. A Wheel spin nobody tapped now spins itself as its deadline's Sunday starts, and the spinner hears the dare (DECISIONS.md, calls 269 and 270).
- **The fast test season ends properly** (2026-11-26). It was set to have playoffs that its fast calendar couldn't hold, so the bracket would have been seeded and stuck. It now has none: the Season Points leader is crowned when Week 3 goes final, and the offseason follows (DECISIONS.md, call 268).
- **Every alert in SCOPE.md's table is sent** (2026-11-26). A check of the table against the jobs found one gap: the playoffs sent no round results or Demolition reveals, because the alerts job only read regular weeks. It now reads the rounds too, and everyone hears who won the season, the finalist, and who does the Season Dare (DECISIONS.md, call 267).
- **The offseason** (2026-11-26). When the champion is crowned, the season is over. Today shows the champion, and Stay or Leave by the commish's deadline, set in Commish tools, where the answers come in. Everyone is alerted, and anyone who hasn't answered is reminded a day before. At the deadline the leavers come off the roster, keeping their car, badges and history, and the commish can bring one back with a new key. The next season can be set up once the deadline has passed and the season's last dares are done; it can no longer be started mid-season by mistake. The feed now shows the champion and anyone who left (DECISIONS.md, calls 260 to 266).
- **Holiday events and the video decision** (2026-11-25, Phase 3). This finishes Phase 3. In Commish tools, the commish puts Double Points Day, Dry Day or Holiday Pass on a regular-season day before it starts, or takes it off, each in the audit log. Today names the day's event and scores it live, and the jobs score it the same way. Dare videos stay in the group chat, per the free-to-run ruling: a video dare asks for a still from it as the proof, and the vote stays in the app (DECISIONS.md, calls 253 to 259, and rulings R11 to R13).
- **Playoffs, part 3: the rules and the screens** (2026-11-25, Phase 3). League shows the bracket as it stands: the champion's banner, each game's score with the winner first, sudden death, and the Whiff Bowl with its loser and the Season Dare. Today names your round and opponent, and the #1 seed gets a second Full Boost in the semifinal, counted live. The rules close the reset day, give playoff receipts until 6 pm the day a day locks, and let only the #1 seed play the second Full Boost. The commish picks the Season Dare in Commish tools until the playoffs are seeded, and the Whiff Bowl's loser spins a Wheel that holds only it (DECISIONS.md, calls 248 to 252).
- **Playoffs, part 2: the weekly job plays them** (2026-11-25, Phase 3). Once the last regular week posts, the job seeds the bracket from the standings and writes each round's matchups, the Whiff Bowl's games included, so Today and Match show them as 1v1s. Each round settles at 6 pm the day after its last day locks, then the final, sudden death if it's level, and the champion: the league banner, the Champion, Finalist and Whiff Bowl trophies, and the Champion and Finalist badges. Playoff points never become Season Points (DECISIONS.md, calls 242 to 247, and "Still open" item 8).
  - 2 rule tests (everyone in the league reads the bracket; only the job writes it), 7 engine tests, 4 job tests, and 1 flow test that runs the real weekly job through a whole playoff.
- **Playoffs, part 1: the calendar and the bracket's rules** (2026-11-25, Phase 3). A season with playoffs now gets its playoff days in the calendar: each round its own period with a fresh kit, the reset day before the final, and sudden death after it, for each format. The engine knows the seeds, the semifinal and final tie rules, sudden death, and the Whiff Bowl's games, and the #1 seed's extra Full Boost counts (DECISIONS.md, calls 238 to 241).
  - 13 engine tests and 2 job tests; the calendar flow tests now count the playoff days.
- **Group play, part 5: Rumble** (2026-11-25, Phase 3). A week before a Rumble week, the weekly job draws and seals one item a day for each player; each opens to the league when its day starts. Today shows your item and your opponent's, and when yours is Boot you pick one of their goals by noon, sealed until the day locks. Every item is played in the order of operations, live on Today and Match and when the week settles, and an alert at 8 am names your item. All six modes are now built (DECISIONS.md, calls 228 to 236, and "Still open" item 7).
  - 6 rule tests. Weakening the rules 10 ways was caught every time. 16 engine tests, 7 job and app tests, and 4 flow tests.
  - Then the live "passed you" and "close finish" alerts count Rumble's items too, and Picks says when next week has no 1v1s to pick (call 237). 1 job test.
- **Group play, part 4: badges, the commish's settings and the Sunday alert** (2026-11-25, Phase 3). The six group-play badges are earned from settled weeks. In Commish tools the commish sets each Bounty Week's target, with the most the league can reach shown, and switches a 2v2 week to frenemies, until the week starts. At 7 pm the Sunday before a group-play week everyone hears the mode and their part in it (DECISIONS.md, calls 225 to 227).
  - 4 rule tests. Weakening the rule 12 ways was caught 11 times; the other, letting any member save, is still refused because the save also needs an audit entry only the commish can write. 6 engine tests, 3 job tests and 1 flow test.
- **Group play, part 3: the screens** (2026-11-25, Phase 3). Match shows a group-play week as its mode's live board: both squads' averages in Team Week, your duo first in 2v2, the Bounty's target and a live bar, the Alley's lane with everyone single file, and the two Drop Shot floors under the 1v1. Today names the mode and what it means for you, and Demolition can aim at anyone on the other side. League, the feed and the highlight reel word each settled mode its own way, and the schedule names each group-play week's mode (DECISIONS.md, calls 222 to 224).
  - 7 app tests, 1 engine test, and 6 flow tests at iPhone size.
- **Group play, part 2: the jobs** (2026-11-25, Phase 3). The schedule job gives the season each group-play week's mode, with the whole league on the 2v2, Bounty and Alley weeks and Team Week's squads able to demolish each other; the calendar job then gives those days their power-ups. The weekly job draws the 2v2 duos once the week starts on Monday, settles every mode, and keeps each week's summary for League and the feed, and the commish's phone can do the same if the job runs late. Result alerts say how each mode went (DECISIONS.md, calls 220 and 221).
  - 1 rule test (weakening it 2 ways was caught both times), 13 job tests, 1 engine test, and 3 flow tests that run the real weekly job on a Team Week, an Alley week and a 2v2 draw; the group-play vote's flow test now runs the calendar job too.
- **Group play, part 1: the engine settles every mode** (2026-11-25, Phase 3). A week's results now follow its mode: Team Week and 2v2 sides compare averages, the Bounty counts its target and the Alley its race, and Drop Shot breaks floors day by day. Your own points always count, the bonus depends on the mode, and a missed Bounty or the Alley's last place takes the Wheel. Rivalry records, headlines and the 1v1 badges skip weeks with no single opponent (DECISIONS.md, calls 211 to 219, and "Still open" items 5 and 6).
  - 34 engine tests, plus 2 engine and 2 job tests for the results that read them. The jobs and screens come next.
- **The draft's reveal, with the season hype card** (2026-11-25, Phase 3). Once the draft is done and the schedule built, the Draft screen offers a season hype card: the kickoff, everyone's car, the group-play weeks and Week 1, as a picture to share with the group chat (DECISIONS.md, call 210). The draft room is complete.
  - 1 app test; the rival-pick flow test opens the card.
- **The captains' draft** (2026-11-25, Phase 3). When Team Week won a slot, the commish moves the live draft from dares to team captains: last season's top two, or two drawn at random in Season 1, snake-draft the blue and orange squads on the 2-minute clock, and the squads hold for every Team Week of the season (DECISIONS.md, calls 207 to 209).
  - New rules: 4 rule tests. Weakening them 8 ways was caught every time. 5 engine tests, 1 job test, and 1 flow test that runs the real schedule job; the rival-pick flow test now uses a season without group play.
- **Phase 3 has started: the group-play vote** (2026-11-25). With group-play weeks in the season, the commish moves the live draft from goals to the group-play vote: everyone ranks the six modes, most wanted first, and sees the leading modes live. When the commish closes it, the schedule job counts it and the top modes fill the group-play weeks, the commish's ranking breaking any tie (DECISIONS.md, calls 204 to 206). The modes' own rules are next.
  - New rules: 4 rule tests. Weakening them 7 ways was caught every time. 4 engine tests, 1 job test, and 1 flow test that runs the real schedule job; the live-draft flow test now steps through the vote.
- **The trophy case** (2026-11-25, Phase 2). Once a season's last regular week is final, the weekly job awards its trophies: Regular-Season Leader, Screen Time King, Iron Streak, Demolition Derby, Brewmaster, Prophet and MVP of the Season. League shows every season's, kept for good; Champion, Finalist and the Whiff Bowl say they come with the playoffs (DECISIONS.md, calls 202 and 203).
  - 2 rule tests, 5 engine tests, and 1 flow test that runs the real weekly job on a one-week season.
- **Predictions** (2026-11-25, Phase 2). In League, each player picks next week's winners until the Sunday before it at 11:59 pm; nobody else sees the picks until the week starts. When the week goes final, the weekly job scores them, the top picker gets a shoutout in the feed, and once the season is over its best record earns Prophet and the crystal-ball topper. Built provisionally: the readings are DECISIONS.md, calls 199 to 201, and "Still open".
  - New rules: 4 rule tests. Weakening them 12 ways was caught every time. 5 engine tests and 1 more badge check, 1 app test and 2 flow tests, one of which runs the real weekly job.
- **The highlight reel** (2026-11-25, Phase 2). Each week's results in the feed have a Highlight reel button: a picture card of the week's best moments, with the MVP's car, the storylines and every result, and Share, which hands it to the phone's share sheet for the group chat (DECISIONS.md, calls 197 and 198).
  - 2 app tests and 1 flow test, which checks the picture and what the share sheet is handed.
- **Season storylines** (2026-11-25, Phase 2). Each week's results in the feed carry up to 3 headlines, like "Alex's 4-game win streak snapped by Maya", "You took down the leader, Jordan" or "Maya crushed Sam by 22" (DECISIONS.md, call 196).
  - 6 engine tests, 2 app tests, and the feed flow test checks a week with none.
- **The suggestion box** (2026-11-25, Phase 2). A small "Suggest an idea" link on Profile opens it: anyone posts an idea, the others upvote it, most upvoted first, and the commish tags each one Planned, Maybe or No. Its author can take it down, and so can the commish, which goes in the league log (DECISIONS.md, calls 193 to 195).
  - New rules: 5 rule tests. Weakening them 12 ways was caught every time. The wall's take-down rule now takes the log entry's name. 1 flow test.
- **Rematch challenges** (2026-11-25, Phase 2). After a final week's loss to a player, Match offers a rematch: a side race the next week, by its Wednesday. The challenged player hears about it at once. When the race week goes final, the weekly job settles it: most points wins the Payback badge and its decal, and the loser's car wears an L for a week. The feed shows the challenge and the result (DECISIONS.md, calls 189 to 192).
  - New rules: 5 rule tests. Weakening them 14 ways was caught every time. 3 engine tests and 1 more badge check, 1 job test, 1 app test, and 2 flow tests, one of which runs the real weekly job.
- **Stickers on cars** (2026-11-25, Phase 2). A dodged dare now puts the Dare Dodger sticker on the dodger's car for a week, wherever their car shows, and Profile says why. The "L" a lost rematch earns is drawn too, and comes with rematches next (DECISIONS.md, call 188).
  - 2 engine tests; the dodge flow test checks the sticker on the car and in Profile.
- **Pokes** (2026-11-25, Phase 2). On Match, under your opponent's day, Poke sends them one "you awake?" alert a day; the alerts job delivers it under Social within about 10 minutes, and it opens Today (DECISIONS.md, calls 185 to 187).
  - New rules: 4 rule tests. Weakening them 9 ways was caught every time. 1 job test and 2 flow tests, one of which runs the real alerts job.
- **The win meter** (2026-11-25, Phase 2). Under Today's scoreboard, a bar in team blue and orange shows who's favored and by how much, from points so far and each side's recent daily average, and moves live as either of you logs (DECISIONS.md, calls 182 to 184).
  - 7 engine tests and 1 flow test.
- **Rivalry records and the nemesis tag** (2026-11-25, Phase 2). Whenever a week goes final, the weekly job works out each player's all-time 1v1 record against everyone they have met, across seasons. League lists your rivalries, and the skull marks your nemesis, whoever has beaten you most, there and in the standings. Match shows your all-time record against this week's opponent, and the Nemesis tag when it's them (DECISIONS.md, calls 179 to 181).
  - 6 engine tests, 2 rule tests (they pass as written, because the profile rules already let a player change only their name, car and taunts), and 1 new flow test; the settle flow test checks the stored records and League.
- **Your goal explosion when you win a week, and your car in the rank-up scene** (2026-11-25, Phase 2). The next time you open the app after a week you won goes final, your car drives onto a stage, your goal explosion bursts over it, and the score shows. A rank up now has your car boosting through the old badge. Each week in a player's rank history also keeps how the matchup ended (DECISIONS.md, calls 177 and 178).
  - 1 job test, and 1 new flow test; the rank flow tests check the car and the stored result.
- **Your car across the app** (2026-11-25, Phase 2). Profile, the Match scoreboard, every post on the wall, the standings, and the week's results, which spotlight the MVP and the Bust with their cars. On Match your car faces your opponent's, which drives on team orange. The lettered badge from Phase 1 is gone (DECISIONS.md, call 176).
  - Fixed on the way: with an opponent set, the quick-chat row made every Feed panel about 2,000 points wide, cut off on the right. The row swipes inside its panel again, and a flow test checks the Feed fits the phone.
  - 2 new flow tests, and 4 more check the cars.
- **A starter car while joining** (2026-11-25, Phase 2). Under your name, pick a body, Brick, Dart or Bruiser, and one of the 15 paints, and the car is on your profile from the start. A phone waiting for the commish's approval keeps the pick until it joins. 1 rule test, 276 in all; 1 app test and 1 new flow test, and the approval test checks the car too.
- **The Garage** (2026-11-25, Phase 2). A new tab: your car on a turntable, and every part for it in 7 slots: 3 bodies, 15 paints and the special finishes, decals, wheels, boost trails, goal explosions and toppers. Drag the car to spin it, or tap it to turn it round. A tap on a part puts it on and saves it to your profile; a locked part says which badge unlocks it and how to earn it. A goal explosion plays on the turntable when you pick it. Your car is now your icon at the top right, which still opens Profile. All the art is drawn for this app.
  - The calls are DECISIONS.md, calls 171 to 175.
  - New rules: a car holds only the catalog's parts, each in its own slot, and a badge's part only once that badge is earned. 4 rule tests, 275 in all. Weakening them 6 ways was caught 4 times; the other 2, a made-up part and a missing slot, are still refused because each slot's part is looked up in the catalog.
  - 3 app tests and 4 flow tests.
- **Badges** (2026-11-25). All 51 achievements are in the engine, each with the part it unlocks. Whenever a week goes final, the weekly job checks each player's season so far and keeps anything newly earned for good. A new badge or a rank change is news in the live feed, and the alerts job sends it to its player under Progress. Profile lists your badges and what each unlocks, with the rest underneath and how to earn them. The 9 badges that need group play, predictions, rematches or the playoffs say they come with those.
  - The readings that needed a call are DECISIONS.md, calls 158 to 170.
  - 24 engine tests, 5 job tests, 2 rule tests (weakening the feed rule 2 ways was caught both times), 1 app test and 1 flow test.
- **Phase 2 has started: ranks** (2026-11-25). When a week goes final, the weekly job adds it to each player's rank history and works out their rank from the last 4 weeks, as a share of the most a week can score. Profile shows your rank badge and your recent weeks. The next time you open the app after a change, a full-screen scene plays: Rank up shatters the old badge into the new one, and Rank down is a short, sad version. The seven badges are drawn for this app.
  - 6 engine tests, 3 job tests and 2 flow tests.
- **Alerts, part 3: the matchup and the wall** (2026-11-25). "Your opponent passed you" when they overtake you; "close finish" at 6 pm on Saturday and Sunday, within 3 points; and reactions and comments on your posts, bundled once an hour into one count. A reaction or comment now stamps its post, so the job finds new activity with one look.
  - New rules for the stamp: 2 rule tests. Weakening them 7 ways was caught every time. 7 job tests and 2 flow tests.
- **Alerts, part 2: sending them** (2026-11-25). "Send alerts" runs every 10 minutes, off the top of the hour. It works out what came due since its last run: log your day at 9 pm; last call, Full Boost and Rule One at 11 am; the rest day on Monday; last chance for Aerial on Saturday; taunts at you; receipts asked of you and an hour before they're due; docks; Demolitions at noon; the week's result with the recap; draft day; and a Wheel spin or dare proof to watch. Each phone gets the kinds it switched on, and quiet hours hold them for one push in the morning. A phone signed out by a new key, or whose token no longer works, is taken off alerts. During a fast test week, alerts go out on every turn.
  - 20 job tests, and 3 flow tests that run the real job against the local database.
  - Fixed a flow-test helper that never actually added its made-up players to the league's member list.
- **The hourly jobs read far less** (2026-11-25). The weekly job read every player's days for every unfinished week every hour, about 30,000 reads a day by the end of a 12-week season, against the free 50,000. Now it reads only what can have changed, and the calendar job leaves an unchanged season alone with one read. 5 job tests.
- **The README is current** (2026-11-25): what each folder holds, the demo league and the fast test week step by step, and what runs on its own.
- **The shorter intro on reopening is on purpose:** the full intro plays on the first open each day, and a 1-second title after that (SCOPE.md, "Intro animation").

## Waiting on the commish

The phone layout check, Checkpoint C (every screen, in the demo league) and Checkpoint D (the fast test week) all passed on 2026-11-26. The commish answered every open question (rulings R14 to R16). Left, each walked through one step at a time in the chat:

1. **Push alerts:** done on 2026-11-26. The web push key is in the app, and a test alert reached the commish's phone.
2. **Backups:** done on 2026-11-26. The private repo, the token (renew it before it expires) and both secrets are set, and a test backup saved.
3. **Locking down the web key:** done on 2026-11-26. The key only works from the app's own address, and the app still loads. App Check is left off (DECISIONS.md, call 271).

## Next

1. **Step 3, continued.** Every Phase 1 screen now exists, and the demo league lets the commish try them all. Still to come in Commish tools: mark a player as left (waits on the mid-season question below). Then the commish's phone check of every screen (Checkpoint C).
   - **Push alerts** wait on one thing from the commish: a Cloud Messaging web push key, made in the Firebase console. The app will ask for it one step at a time when that feature is next.
   - **Push alerts:** built, and waiting only on the Cloud Messaging web push key.
2. **Before real players join:** done. The web key is limited to the app's address; App Check is left off (call 271).
   - **Step 5 items still to come, each with the feature that needs it:** the Cloud Messaging web push key (notifications), and the private backups repo with its token (the backup job is built and waits on them).
3. **Rules still to write, each with its screen and its tests:** marking a player as left, once the mid-season question is answered. Phase 2 and 3 collections are in DATA-MODEL.md and refused until then.
4. **Phases 2 and 3 are built:** every feature in SCOPE.md, with the provisional readings in DECISIONS.md's "Still open" waiting on the commish. What's left is the commish's: the items above, the mid-season join and leave question, and the phone check.

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

1. **Run every scheduled job from the public repo, the backup included.** The backup job pushes to the private repo with a deploy key or token kept in GitHub Secrets. Private-repo compute used is then zero. Recorded in DECISIONS.md, call 132, now that the job is built.
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
