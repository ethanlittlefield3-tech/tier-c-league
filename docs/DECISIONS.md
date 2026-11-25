# Tier C League: decisions log

Every rule that had to be interpreted, and who decided it. SCOPE.md is still the source of truth; this file records what was settled after it was written. Every entry below is built into `engine/` and proven by a test.

## Rulings from the commish

| # | Date | Ruling | Why it came up |
| --- | --- | --- | --- |
| R1 | 2026-11-25 | **The timeline is off.** Every feature in SCOPE.md, all three phases, ships before Season 1, however long it takes. | The commish's note at the start of the build. Kickoff and Draft Day get new dates later. |
| R2 | 2026-11-25 | **A rest day can move any number of times,** as long as neither the old day nor the new day has started. | PHASE1.md said "once a week"; SCOPE.md only limited when. |
| R3 | 2026-11-25 | **Monday is safe.** Kits refill Monday at 12:00 am and Aerial and Demolition must be set before the target day starts, so neither can ever hit a Monday. Tuesday is the first day. | SCOPE.md never said whether next week's kit could be set early. |
| R4 | 2026-11-25 | **Backing down on a receipt is free.** If you take the claim back before the proof deadline, the square stops counting and you lose no extra point. Only ignoring the request costs the extra 1. | SCOPE.md did not say whether a challenged square could still be changed. R6 settles the detail for screen time. |
| R5 | 2026-11-25 | **Penalties survive Rule One.** Rule One zeroes the day's play (goals, screen time, beers, Aerial, Demolition), but a failed receipt's −1 and commish docks still count. | SCOPE.md's order of operations read as if Rule One wiped everything, which would let a player caught lying burn Rule One to erase it. |
| R6 | 2026-11-25 | **Receipts on screen time: prove it, or back down to "not logged".** The player can upload the screenshot, fixing the number first for free. Or they can back down, which makes screen time not logged (−3) with no extra point. A new number with no screenshot does not close the request. | Follow-up to R4. A number that could change without proof could be nudged by 15 minutes every time it was challenged, and never proven. |
| R7 | 2026-11-25 | **The new title screen sets the level of art for the whole app,** including the gold C badge in the logo. | The commish asked for more complex graphics on 2026-11-24. A higher-detail title screen was built, and the commish approved it. |

## Calls I made to close gaps (veto any)

The commish reviewed all 25 on 2026-11-25 and vetoed none. Say the number to change one later.

**Daily scoring**

1. **"Nothing logged" is judged by what the day holds when it locks:** no goal hit, no screen time, 0 beers and no Full Boost. Tapping a goal and un-tapping it is not logging.
2. **Using Full Boost counts as showing up,** so that day is not a −5 no-show.
3. **A goal covered by Full Boost counts as hit everywhere,** including for a perfect day.
4. **"Voided" means exactly "counts as missed"** (or "not logged" for screen time). So a Demolition on a voided goal lands, even if the void comes after the noon reveal, and a Full Boost can still cover a voided goal. The lost point from a failed receipt always stays.
5. **Beers logged on a Rule One day still count** toward the fewer-beers tiebreaks.
6. **Live scores:** while a day is still open, missing entries show 0 so far. The −5 and −3 land when the day locks.

**Power-ups and rest days**

7. **A kit item belongs to the week of the day it is played on.** Sunday's Full Boost can be used on Monday morning until Sunday locks.
8. **Full Boost and Rule One can be changed or taken back until that day locks.** Nothing is revealed before the lock, so this gives no advantage. Aerial can be cancelled until its day starts, as SCOPE.md says. Demolition is final once set.
9. **Rule One is declared from the start of that day until it locks,** not in advance.
10. **The Rule One that arrives at the start of Week 5 (or 9) can cover the Sunday before,** because that Sunday is still open until Monday noon.
11. **Rest days: only this week's and next week's can be set.** Week 1's can be set any time before kickoff.
12. **Kit, Rule One and rest-day timing cover regular-season days only for now.** Playoff rounds get their own rules when the playoffs are built.

**Receipts**

13. **"After 6 pm" means 6:00 pm or later, and "by 11:59 pm" means before the next day starts.**
14. **The 3 requests a week are counted by when you ask,** in the Monday-to-Sunday week. A request is spent when it is made, whatever the outcome.
15. **One request per square per day.** Only a claim can be challenged (a goal marked hit, or logged screen time), and never your own.

**Matchups, schedule and standings**

16. **The House's score is the exact league average, never rounded,** shown to one decimal. Its beers are the average beers, so a tie with The House still goes to fewer beers, then a draw.
17. **After a full round-robin the cycle starts over** from the Week 1 matchups.
18. **Draft picks to schedule:** the k-th rival pick sits in seats k and (last − k) of the circle, which makes the picks round 1.
19. **Ties among three or more players** use results among the tied players (2 for a win, 1 for a draw). When a tiebreaker separates some of them, whoever is still level starts again from head-to-head.

**Awards and streaks**

20. **MVP:** still level after beers, it is shared.
21. **Bust:** the average is your previous 4 weeks (the ones you have), not counting this week. A tie goes to more beers, then it is shared. From Week 3, if nobody dropped below their own average there is no Bust.
22. **Wheel:** as written, everyone tied for the lowest points spins. That includes a player who won their matchup on the beers tiebreak (Example 1 in Checkpoint A).
23. **Check-in streaks:** a blank rest day and a no-show covered by Rule One are skipped: the streak neither grows nor breaks. Logging on a rest day adds to it.
24. **Perfect-day streaks** skip rest days. A Rule One day is not perfect, so it ends the run.

**Intro** (the commish saw the intro on 2026-11-25 and vetoed none of these)

26. **"The first open each day" goes by the phone's own calendar day.** The intro is decoration, so the phone's clock is fine. Nothing that affects a score reads it.
27. **Skipping the intro still counts as having seen it,** so the rest of that day gets the 1-second version.
28. **On the title, a tap anywhere enters.** The tap that skipped the intro is ignored for a third of a second, so one tap can't both skip and enter.
29. **Any key press skips the intro too,** for keyboards and switch controls.

**Installing** (new on 2026-11-25, not yet reviewed by the commish)

30. **On an iPhone or iPad the app only runs from the Home Screen.** Opened in Safari it shows the Add to Home Screen steps, with no "carry on in Safari" link. A Home Screen app keeps its own storage, so a profile made in Safari would not be there when the app is opened from its icon. Safari can also clear a website's saved data after a week without a visit, and it cannot send alerts.
31. **Other iPhone browsers are sent to Safari,** with a button that copies the link. So is a page opened inside another app, such as a chat app's built-in browser. One set of steps that always works beats a set for each browser.
32. **Android can skip the install with "Not now".** Its browser and its installed app share the same storage, so nothing is lost. The steps come back after 7 days.
33. **A computer browser goes straight in.** There is nothing to install.
34. **Icon A is the stand-in** until the commish picks from the three options.

**Calendar**

25. **Daylight saving:** a wall-clock time that happens twice means the first one, and a time the clocks skip lands the same distance past the jump. In Eastern time neither midnight nor noon is ever affected.

## Still open

Nothing is open. The receipts question that was here is now ruling R6.

## Things the commish should know (rules as written, working as written)

1. **The −5 no-show and the −3 "not logged" work as floors.** A very bad day scores better unlogged: 8 hours of screen time and 6 beers is −11 if logged honestly and −5 as a no-show. A blank rest day is −3 however many beers there were. This is in SCOPE.md's locked table, so it is built as written.
2. **A failed receipt on a demolished goal stacks:** the goal is lost, −1 for the receipt, and −2 for the Demolition.
3. **Not logging screen time (−3) beats honestly logging 7 hours or more at par 3** (−4 or worse).

## Build choices

- **Leagues are created by a setup script, not from the app.** The app's web settings are public by design, so an app that could create leagues would let anyone on the internet fill the database.
- **League codes are 8 characters and recovery keys are TCL-XXXX-XXXX,** both from 32 characters with no 0, O, 1 or I. That is 40 bits each. A code can be looked up only one at a time, never listed.
- **Joining is one atomic save:** the member list, the profile, the key and the device claim are all written together or not at all. The member list is capped at 12.
- **Recovery proves the old key and sets a new one in the same save,** so there is never a moment when both the old phone and the new phone are in.
- **Every key is on file under its own name,** so a new phone that knows only the league code and a recovery key can find which player it is. The entry can be fetched by someone who already knows the key and can never be listed, the same way league codes work. The rules refuse any save that sets a key without filing it, or replaces a key without taking the old one off file.
- **Kit slots are filed by period, not week number.** Week 2 is `w02`. Playoff rounds will get their own tags, so "a fresh kit each round" needs no data change.
- **A Demolition unseals by the clock.** Its reveal time is copied from the calendar's lock and checked by the rules. If a job runs late, nothing stays hidden past the lock.
- **Sealed items sit under the season,** not the league as SCOPE.md's sketch has them. Same protection, shorter names.
- **The commish never edits a player's day.** A dock, void or correction is its own document with a reason, and it cannot be edited or deleted. Undoing one means entering the opposite correction.
- **A day records when it was first logged,** so the Early Bird badge in Phase 2 needs no new data.

- **The fonts are served by the app,** not fetched from a font website. The first screen waits on nobody else, the app can start with no signal once offline start is built, and no other company sees who opens the app. Both fonts are open (SIL Open Font License).
- **Launch pictures are drawn for a list of screen sizes** (`app/launch-screens.ts`), because iOS only uses a picture that matches the screen exactly. A new iPhone size needs one new row and `npm run icons`. Until then that phone starts on a plain screen and everything else works.
- **The installed app stays upright on Android.** iPhones and iPads decide for themselves and ignore the request.

- **One engine, no build step.** `engine/` is plain TypeScript that the app, the jobs and the tests import as source, so there is one copy of every rule.
- **Whole-number math.** Every score is an integer. Averages (The House, the Bust) are compared as fractions, so two equal values always compare as equal.
- **The engine never reads a clock.** Callers pass the time in. For anything that matters, the caller is the server.
