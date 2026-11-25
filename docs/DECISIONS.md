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
| R8 | 2026-11-25 | **The app icon is option A:** the gold C badge with a blue-to-orange boost streak, on navy. | Three options were drawn, as PHASE1.md asks. The launch pictures match it. |
| R9 | 2026-11-25 | **The Firebase project is set up now, not at Step 5.** | PHASE1.md saved the accounts for last and planned for the commish to try screens from a computer on Wi-Fi. This build runs in a cloud workspace a phone cannot reach, so without a database the commish could only review screens as pictures. |
| R10 | 2026-11-25 | **Today's layout follows the commish's mockup.** All four squares sit on one screen, with no scrolling. Tapping screen time opens a big sheet with the slider, step buttons and the scale. Beers and power-ups sit a scroll below. | The commish sent two pictures from the concept work after the first phone check. |

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
34. *(Settled by ruling R8: the icon is option A.)*

**Joining and getting back in** (new on 2026-11-25, not yet reviewed by the commish)

35. **A refused join gives the likely reasons, not the exact one:** "It may be full (12 players) or closed to new players." A phone that is not in the league yet is not allowed to read which it is.
36. **A phone that was signed out says why,** and opens on "get back in" with the league code already filled in. Only the key has to be typed.
37. **There is no going back from the recovery key screen.** "I've saved it" is the only way on, so nobody skips past their key by accident.
38. **Names are tidied before they are saved:** spaces at the ends go, and a run of spaces becomes one. An emoji counts as two of the 24 characters, because that is how the security rules count.
39. **Codes and keys can be typed in any case, with or without dashes.** A 0, O, 1 or I gets a hint about look-alikes, since neither codes nor keys ever use them.

**Setting up a league** (new on 2026-11-25, not yet reviewed by the commish)

40. **A league is made with a button on GitHub: Actions, "Create a league".** It starts open to new players, with one player in it: the commish, named "Commish" until they change it.
41. **The league code and the commish's first key are read in the Firebase console,** which only the commish can open. They are never shown on GitHub, because this repo's logs are public.
42. **The commish gets in with "I'm already in a league",** the same way anyone gets back in. Their key changes the moment they do, like any recovery.

**The frame and Profile** (new on 2026-11-25, not yet reviewed by the commish)

43. **The app opens on Today.** It does not remember the last tab, because Today is where the day's logging happens.
44. **All five tabs are there from the start, Garage included,** as SCOPE.md lists them, even though the garage is built in Phase 2. A tab that is not built yet says what it will hold.
45. **Your recovery key stays hidden in Profile until you tap "Show my key",** so someone glancing at your phone can't read it.
46. **"Sign out of this phone" asks first, and signs out only this phone.** Your profile, your key and your other phones are untouched. Getting back in takes the recovery key.
47. **Profile starts small:** your name, your key, signing out and the credit. Badges, rank history, stats, notification settings and "Suggest an idea" arrive with the features they belong to.

**Today** (new on 2026-11-25, not yet reviewed by the commish)

48. **The screen-time slider covers 0 to 8 hours,** where nearly every day falls, so each 15-minute step is wide enough to hit. The + button goes on to 24 hours.
49. **"Clear" sets screen time back to not logged.** While the day is open that counts 0 so far; the −3 lands at the lock, as call 6 says.
50. **A save shows on screen at once,** marked "Saving" until the server accepts it. With no signal it waits on the phone and goes through later. A save that arrives after the lock is refused.
51. **A goal that isn't set yet can't be tapped.** It says "Set at the draft".

**The power-up tray** (new on 2026-11-25, not yet reviewed by the commish)

52. **Full Boost offers only the goals you haven't marked hit** that day.
53. **Setting a Demolition asks once more,** "This is final", because it can't be changed or taken back.
54. **Rule One uses the lowest-numbered grace day that has arrived and isn't used.** Taking it back frees that number again.
55. **The tray plays into the week of today's date.** Yesterday's Full Boost, Aerial and rest day come from yesterday's own week, so Sunday's Full Boost still works on Monday morning (call 7).
56. **A bye week against The House has no Demolition.** The tile says "Bye week". Before the schedule exists, it says "No opponent yet".

**Commish tools** (new on 2026-11-25, not yet reviewed by the commish)

65. **"Sign out a lost device" is the same button as "Reissue key".** This was one of the open questions; this is the proposal from PROGRESS.md, built. A new key signs out every phone that player is on, and they get back in with the new key. Signing out one phone at a time would need the commish to tell the phones apart.
66. **Handing over the commish role makes the old commish the co-commish,** so nobody is locked out by a slip. The new commish can remove the co-commish afterwards.
67. **A void also takes 1 point off,** as SCOPE.md says for fake proof. A plain dock is −1, and a correction is anything from −20 to +20 except 0.
68. **The league log names people by their current display name,** and a removed player shows as "a former player".

**Today's layout** (new on 2026-11-25, not yet reviewed by the commish)

61. **The day total moved below the beers,** as in the mockup, so the four squares get the top of the screen. It now shows its parts: "Goals +2 · screen +1 · beers −1".
62. **The screen-time sheet's slider runs 0 to 10 hours,** and its buttons go on to 24. A day of more than 7 hours lights "Each hour more".
63. **The sheet changes nothing until "Save screen time".** "Close", the Escape key and a tap on the dimmed page all leave it as it was. "Clear it" appears once screen time is logged.
64. **A locked day's sheet still opens,** to show the scale, but nothing in it can change.

**Season setup** (new on 2026-11-25, not yet reviewed by the commish)

57. **Kickoff defaults to the first Monday at least a week away.** SCOPE.md's default, "the Monday after the draft", depends on the draft date, which depends on kickoff, so one of them had to come first.
58. **Commish tools are reached from Profile,** with a gold button only the commish and co-commish see. All five bottom tabs stay the same for everyone.
59. **The season calendar is written by a job that runs every hour,** so a change in season setup is in place within the hour. Until kickoff, Today shows "Kickoff is coming" with the date, which needs no calendar.
60. **Seasons are numbered s1, s2 and so on.** The name the commish types is only for show.

**The draft, part 1: goals and votes** (new on 2026-11-25, not yet reviewed by the commish)

69. **The draft order is drawn on the commish's phone** when "Start the draft" is tapped, with the phone's secure random numbers, and logged. The on-screen draw for the live show comes with the draft's reveal.
70. **Goals and votes stay open 24 hours from the start of the draft** (SCOPE.md: "Votes stay open 24 hours for anyone who missed the live draft"). Meanwhile the live draft moves on to rival picks and dares. The commish can close them sooner, give 12 more hours, or reopen them for 12 hours, and each change is logged. The 12 hours cover SCOPE.md's "re-voted within 12 hours" when a late veto leaves too little time.
71. **All the goals are on one screen,** not one at a time as SCOPE.md describes the live draft. With votes open for a day, one screen lets everyone vote at their own pace. A one-at-a-time view for the live show can come with the reveal.
72. **New words make a new version of a goal,** and only votes on the current words count. A player can re-word any goal until the votes close.
73. **A vote can be changed until the votes close.** Nobody votes on their own goal, the commish included.
74. **A player who joins after the draft starts is not in the draft order.** Commish tools says so before the draft starts, while joining is open.

**The draft, part 2: rival picks and the schedule** (new on 2026-11-25, not yet reviewed by the commish)

75. **A missed pick is made at random by the commish's phone** once the 2-minute clock runs out, and it goes in the league log. GitHub's jobs can't run every 2 minutes, and letting the next player's phone make it would let that player steer it. Until it is made, the late player can still pick. Commish tools also has "Pick at random for…" for when the commish's phone is not on the draft.
76. **Each pick's clock starts on the server's time,** and every phone counts down from it.
77. **Anyone removed from the league after the order was drawn is skipped** when the rival picks start.
78. **Dares wait until every rival pick is in.**
79. **The schedule is built by the hourly season job once the commish finishes the draft,** and the season goes active then. The Draft screen shows Week 1 as soon as the picks are in, worked out by the same engine.
80. **Until Phase 3, the scheduled group-play weeks are normal 1v1 weeks,** as PHASE1.md says, so they don't change the schedule yet.

**The draft, part 3: dares** (new on 2026-11-25, not yet reviewed by the commish)

81. **A dare is up to 80 characters,** and a goal up to 60.
82. **Dares open at the live draft's dares step** and, like goals, can be added or re-worded until the votes close. A dare vetoed by more than half the league stays off the Wheel.
83. **The 8 starter dares are kept in the app's engine, not the database,** so every league has them from the start with nothing to load. A way for the commish to change them comes with moderation.

**Calendar**

25. **Daylight saving:** a wall-clock time that happens twice means the first one, and a time the clocks skip lands the same distance past the jump. In Eastern time neither midnight nor noon is ever affected.

## Still open

1. **What a "majority" veto means. Built provisionally, waiting on the commish.** The draft counts a goal as vetoed when more than half of the players who can vote veto it (everyone but the goal's owner). The other reading is more than half of the votes cast. Under the built reading, a goal stands when votes close unless a majority vetoed it, so nobody can sink a goal with one veto while the others stay quiet. The same rule will decide dare vetoes and dare proof. Changing it is one line in `engine/src/votes.ts`.
2. **A goal still vetoed when the votes close.** For now the results list it for the commish to settle, for example by reopening the votes for 12 hours so the player can re-word it. Should something happen on its own instead?

The receipts question that was here is now ruling R6.

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

- **The database library loads in the background while the intro plays.** It is the biggest piece of the app (about 165 kB zipped), so the first screen never waits on it.
- **The app waits 15 seconds for the database, then says there is no answer.** Without that, a save made with no signal would wait forever without a word.
- **The security rules publish themselves.** After every test has passed on main, a job publishes `firebase/firestore.rules` to the league's database. Nobody pastes rules into a console by hand, so the rules that are live are always the rules that were tested.
- **The service account key is handed to one step of one job at a time,** never to the whole workflow, and never to a step that installs packages.
- **The status bar is solid ("black"), not see-through ("black-translucent").** On iOS 26 the see-through one makes iOS add the status bar's height at the bottom too, so the whole app sits too high. Apple's advice in WebKit bug 317153 is to drop it. The status bar now shows the app's navy.
- **The page itself never scrolls.** `html` and `body` are locked, and `#app` is the one thing that scrolls. A drag can't leave the whole screen shifted, and full-screen pages like the title can't move.
- **After the keyboard closes, the page goes back to the top.** iOS can leave a Home Screen app scrolled up after typing.
- **The phone keeps its own copy of the league's data** (Firestore's offline cache), so the app opens and logs with no signal. The server still decides: a save that arrives after the lock is refused.
- **The late-sync warning starts 3 hours before the lock,** when the phone is offline with a save waiting.
- **A week's pairings are stored as a list of pairs, `{ a, b }`,** because the database can't hold a list of lists. `HOUSE` stands for The House.
- **Settlement runs every hour,** not at exactly 12:05 pm and 12:05 am, because GitHub's schedules can run late. Results post within the hour of noon on Monday, and go final within the hour of midnight on Tuesday.
- **The fonts are served by the app,** not fetched from a font website. The first screen waits on nobody else, the app can start with no signal once offline start is built, and no other company sees who opens the app. Both fonts are open (SIL Open Font License).
- **Launch pictures are drawn for a list of screen sizes** (`app/launch-screens.ts`), because iOS only uses a picture that matches the screen exactly. A new iPhone size needs one new row and `npm run icons`. Until then that phone starts on a plain screen and everything else works.
- **The installed app stays upright on Android.** iPhones and iPads decide for themselves and ignore the request.

- **One engine, no build step.** `engine/` is plain TypeScript that the app, the jobs and the tests import as source, so there is one copy of every rule.
- **Whole-number math.** Every score is an integer. Averages (The House, the Bust) are compared as fractions, so two equal values always compare as equal.
- **The engine never reads a clock.** Callers pass the time in. For anything that matters, the caller is the server.
