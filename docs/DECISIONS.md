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

**Feed, part 1: the wall** (new on 2026-11-25, not yet reviewed by the commish)

84. **Reactions sit on the post itself,** one set per player, instead of a document for each reaction. The wall's one live listener then carries every count, which keeps reads low on the free plan.
85. **A taunt keeps `{name}` as written,** and each phone fills in the opponent's current name, so a renamed player still reads right.
86. **Taunts go to this week's opponent, and a quick-chat line sends on one tap.** Before kickoff that is your Week 1 rival. In a bye week against The House, taunts wait.
87. **Taking a post down blanks its words for good,** and it leaves the wall. The commish's take-downs go in the league log.
88. **Posts and comments are up to 280 characters.** Up to 10 saved taunts of up to 120 characters each, kept on your profile so they follow you to a new phone.
89. **Comments go on brags; taunts and quick chat take reactions only,** as SCOPE.md's table lists them.
90. **The wall shows the newest 50 posts,** live. Older posts stay in the database, and paging back through them can come later.

**Feed, part 2: the live feed** (new on 2026-11-25, not yet reviewed by the commish)

91. **Each phone builds the live feed from the league's own data,** rather than a job writing feed entries: the newest 20 check-ins, 20 power-ups and 10 commish fixes, and each week's results. It moves the moment anything happens, as SCOPE.md asks, and costs about 50 reads to open. Badges, rank-ups and recaps join it in Phase 2.
92. **Revealed Demolitions come from the hourly weekly job.** It already loads every player's week for settlement, so it keeps each Demolition's outcome on the week at no extra cost, and a reveal shows in the feed within the hour after noon. The target still sees it on Today at noon. Working it out on every phone instead would cost each one dozens of reads.
93. **A check-in is the first log of a day;** changing it later doesn't post again. A moved rest day doesn't post.
94. **The feed calls every fix "the commish",** even when the co-commish made it. The league log has who.

**Receipts** (new on 2026-11-25, not yet reviewed by the commish)

95. **A receipt's outcome is worked out from the clock, not written by a job.** It is proven, backed down from, still open, or failed once the deadline passes. Every phone and the weekly job count a failed one (voided, −1) the moment the deadline passes, with nothing to run.
96. **Backed-down and failed receipts count like the commish's fixes** in every score. Today words them as receipts, not as the commish.
97. **The deadline comes from the calendar of the day asked about.** Asked before 6 pm that day, proof is due by its end. Asked after 6 pm, or the next morning before the noon lock, it is due by the end of the next day.
98. **The 3 requests a week count by the week of the day asked about.**
99. **Receipts are offered on Match for your opponent, and on anyone's day from League:** tap a name in the standings, or in the list of everyone before the standings start. Today and yesterday until noon, as SCOPE.md says.
100. **Proof photos are shrunk on the phone** to a JPEG of up to 300 KB: at most 1600 pixels on the long side, smaller if it still doesn't fit.
101. **Ruling R6 on the phone:** while a screen-time receipt is open, Today keeps that day reachable and its screen time editable, even after the lock. Only the number can change.
102. **Receipts show in the live feed** when asked, and again when proven, backed down from, or left past the deadline.

**The Wheel of Shame, part 1** (new on 2026-11-25, not yet reviewed by the commish)

103. **The weekly job draws each Wheel spin when the week goes final,** with real randomness, and seals the result. Nobody can read it before the spinner taps Spin, the commish and the spinner included. Then every phone shows the wheel landing on it.
104. **Tied lowest scorers each get their own draw** (SCOPE.md: "tied players all spin").
105. **The spinner's Today has a card for the spin,** and Feed has a banner for everyone while the dares are due.
106. **The wheel is drawn for this app:** one slice per dare in team blue and orange, a gold pointer, and a 5-second spin that turns the whole disc. With Reduce Motion on, it lands at once.

**The Wheel of Shame, part 2** (new on 2026-11-25, not yet reviewed by the commish)

107. **Dare proof works like receipts:** a photo of up to 300 KB, in the same save that marks the spin proven, before the Sunday deadline. Dare photos are deleted after 14 days too.
108. **The proof vote uses the draft's majority** (provisional, "Still open" item 1): "Doesn't count" needs more than half of everyone but the spinner. A vote is settled as soon as the outcome can't change, or else when the 24 hours close.
109. **A new spin after "doesn't count" comes from the hourly weekly job,** within the hour, sealed like the first, with its own deadline: the Sunday after that draw.
110. **Each dodged dare takes 3 Season Points off in the standings.** It is worked out from the clock, like a receipt, and shows within the hour after the deadline. The "Dare Dodger" sticker goes on the car with it (call 188).
111. **Tiebreak coins are sealed from their own player too.** Before this, the sealed-item rule let a player read their own coin's number.

**Commish tools, part 3** (new on 2026-11-25, not yet reviewed by the commish)

112. **Unlocking a final week hands it back to the weekly job,** which counts it again with any late fixes within the hour and makes it final again. The commish's phone doesn't recount it.
113. **A dare taken off the Wheel stays out of future draws;** a wheel already drawn keeps its slices. The draft's results say it was taken off.

**The demo league** (new on 2026-11-25, not yet reviewed by the commish)

114. **The demo league is a league of its own, marked as a demo,** made and deleted with a button on GitHub ("Demo league"). The delete job refuses any league not marked as a demo, so it can never remove a real one.
115. **Open the demo on a computer,** so the phone stays in the real league. A phone holds one league at a time.
116. **The made-up players don't play on.** After it's made, the hourly jobs keep its calendar, results and Wheel going, but nobody logs for them.

**Keeping the schedules running** (new on 2026-11-25, not yet reviewed by the commish)

117. **A monthly keepalive keeps the schedules running.** GitHub pauses scheduled jobs in a public repo after 60 days with no activity, which a quiet season could reach. Once a month a job records the date in `.github/keepalive` and pushes it with its own token, which starts no other workflow.
**Commish tools, part 4** (new on 2026-11-25, not yet reviewed by the commish)

118. **Starter dares come off the Wheel by their place in the list,** and can be put back. The next draw leaves them out; a wheel already drawn keeps its slices.
119. **"With my approval" is a third joining setting,** beside Open and Closed. A new player types the code and a name as usual. Instead of joining, the phone asks the commish and waits.
120. **The waiting phone remembers it asked,** so the app can be closed. Once the commish lets them in, the phone joins on its own and shows the recovery key, as a normal join does. A player turned away is told so and can start over.
121. **Only the commish and the asking phone can see a request,** and each answer goes in the league log. The request is deleted once the player is in, or when they take it back.
122. **Letting someone in still needs room:** a full league (12 players) or a closed one lets nobody in, and Let in stays off while the league is closed.
123. **Settling a week from the app posts provisional results.** The commish's phone reads what the weekly job reads and counts the week with the same engine code. Only the job makes a week final: when it runs, it counts the week again, and its numbers replace the phone's.
124. **The standings and the Wheel still wait for the job.** The standings' last tiebreaker is a sealed coin nobody can read, and a Wheel draw needs the job's own randomness, so both follow when the job next runs.
125. **A week shows as "Waiting on the weekly job" once its Sunday locks with no results,** by the calendar the security rules read. The job runs every hour, so this is for when GitHub is late or down.

**The fast test league** (new on 2026-11-25, not yet reviewed by the commish)

126. **The fast test league is a demo league of its own,** made by the "Fast test week" button on GitHub, with the commish and three made-up players. Its days last 8 minutes unless set otherwise, so Week 1 plays out in about an hour. The run goes on until the Wheel's dare can be proven and voted on, about 100 minutes in all.
127. **Only a demo league can run fast.** The fast clock is kept on the season, and the calendar job, the weekly job and the run itself ignore it in any league not marked as a demo. The commish's season settings can't set it, so it can never be switched on for a real league.
128. **Every time keeps its place within the day:** 6 pm is three quarters through a fast day, and the noon lock comes half a day after it ends. The security rules read times only from the calendar, so they needed no change.
129. **The made-up players play to a pattern.** Each logs at their own time of day. One sets a Demolition on the commish's Wednesday, one sets Aerial on Thursday, and one uses Full Boost on Friday. The commish's opponent taunts once, and asks for receipts on a goal the commish claims on Wednesday. A made-up spinner spins and proves their dare, and the made-up players vote that any proof counts.
130. **During a fast test week, the weekly job runs every 2 minutes for that league,** and the made-up players take a turn every 30 seconds. A whole run reads about 15,000 documents, well inside the free 50,000 a day.
131. **Watch it on a computer, like the demo.** Today says it is a fast test league. Proof votes still stay open 24 real hours, but the made-up players vote at once, so a vote is settled in minutes.

**Backups** (new on 2026-11-25, not yet reviewed by the commish)

132. **Backups run every night from the public repo,** and commit to the private backups repo with a token kept in GitHub Secrets, so they use no private-repo minutes. The private repo's name is a secret too, because it names the account.
133. **Each collection is one file, one document per line,** so a night's commit holds only what changed, and the repo's history is the list of dates to restore from. A night with no changes makes no commit.
134. **Proof photos are left out of backups.** They are deleted after 14 days anyway, and would make every backup large.
135. **A restore puts the database back as that morning's backup found it:** everything in the backup is written back, and anything it doesn't have is deleted, except proof photos. It can be limited to one league, and it needs the word "restore" typed in.
136. **Timestamps keep every nanosecond,** so a restored day still compares equal with itself in the security rules (for example `firstAt`, which a day keeps for good).

**Alerts, part 1: on the phone** (new on 2026-11-25, not yet reviewed by the commish)

137. **Alerts are turned on with a tap,** as an iPhone requires: in Profile, or right after saving the recovery key. Each of the 7 kinds can be switched off (Daily, Matchup, Power-ups, Social, Receipts, Progress and League), and quiet hours default to 11 pm to 8 am in league time.
138. **A phone signs up for alerts only as the player its claim holds,** so alerts never follow someone else, and a signed-out phone can't sign up again until it's back in.
139. **The push token is fetched again on every open,** and saved if it changed, so a lapsed one is replaced (SCOPE.md, "Push notifications").
140. **One service worker does two jobs:** it keeps the app's files on the phone, so the app opens with no signal once it has been opened before, and it shows alerts. A tap on an alert opens the app at its screen.
141. **Alerts wait on one thing from the commish: the Cloud Messaging web push key.** Until it's in the app, Profile says alerts aren't switched on yet. The key is public by design, like the rest of the app's Firebase settings, so it can be pasted into the chat.

**Alerts, part 2: sending them** (new on 2026-11-25, not yet reviewed by the commish)

142. **A job works out and sends alerts every 10 minutes,** from what happened or came round since its last run, so alerts arrive within about 10 minutes, as SCOPE.md says. A quiet run reads about a dozen documents.
143. **The alerts built so far:** log your day (9 pm); last call, Full Boost still unused and Rule One in hand (11 am, about yesterday); this week's rest day (Monday 9 am); last chance for Aerial (Saturday 8 pm); a taunt or quick-chat line aimed at you; receipts asked of you, and again an hour before they're due; docks; Demolitions as their day locks; the week's result; draft day; a Wheel spin to watch, and a dare proof to vote on.
144. **Badges, rank, Rumble items, group play and the offseason alerts come with Phases 2 and 3.** "Your opponent passed you", "close finish" and bundled reactions and comments were added right after (calls 149 to 152).
145. **Quiet hours hold alerts, and they arrive as one push when quiet hours end,** leaving out any that are no use by then, like "log your day" once the day has locked.
146. **A week's result carries the recap:** "Week 3: you won. 14–9 against Maya. MVP: Maya." One push, not two, under Matchup.
147. **A phone signed out by a new key gets nothing, and is taken off alerts;** so is a phone whose push token no longer works.
148. **The job's memory between runs,** when it last ran and the alerts it is holding, is kept where no phone can read it.

**Alerts, part 3: the matchup and the wall** (new on 2026-11-25, not yet reviewed by the commish)

149. **"Your opponent passed you" means an overtake:** you led, and now you trail. Going from level to behind doesn't count, or the first log of every week would set it off. The job works out live scores only for matchups something touched since its last run: a log, a dock or a Demolition.
150. **"Close finish" is checked at 6 pm on Saturday and again on Sunday,** within 3 points, and goes to both players at most once a week.
151. **Reactions and comments are bundled once an hour:** each author hears one count of what others added to their posts, like "3 reactions and 1 comment", and a newer count replaces the last one on the phone.
152. **A reaction or a comment stamps its post with the server time,** so the job finds new activity with one look instead of reading every post. A stamp can't say anything but "now", and a reaction has to change something.

**Phase 2: ranks** (new on 2026-11-25, not yet reviewed by the commish)

153. **Each week counts as its share of the most its season's par allowed,** so rank history carries across seasons fairly even if the par changes. Within one par, this is exactly SCOPE.md's average of weekly points.
154. **A week that is unlocked and counted again replaces its old entry** in each player's rank history, and the ranks after it are worked out again.
155. **The rank-up scene plays as the app opens, for a change from a rank this phone has shown before.** A phone's first rank arrives quietly in Profile, so a new phone never replays old changes, and a rank that changes while the app is open waits for the next open. The phone waits for the server's answer, not its own older copy, before it decides.
156. **In a rank up, your car boosts through the old badge, which shatters into the new one** (SCOPE.md, "Rank-up animation"). A rank down sinks the old badge instead, with no car.
157. **The rank badges are drawn for this app:** a rounded hexagon in each tier's metal, with one to three chevrons, a gem or a star that grows with the tier.

**Phase 2: badges** (new on 2026-11-25, not yet reviewed by the commish). Badges don't change any score; these are the readings that needed a call.

158. **Badges are checked whenever a week goes final,** from the whole season so far, and kept for good: a badge is never taken away, even if a week is unlocked and counted again.
159. **Rest days:** a rest day neither counts nor breaks Hat Trick, and Perfect Week and the lane badges (Scholar, Gym Rat, Wild One) need all 6 goal days.
160. **Dry Week needs every day of the week logged,** or a week nobody logged would count. Dry Month is 4 such weeks running, and Designated Driver needs Friday and Saturday both logged with 0 beers.
161. **Clean Sheet: a no-show covered by Rule One is still a no-show.**
162. **"1v1" leaves out weeks against The House:** they neither count nor break Win Streak, and they don't count for First Blood, Sweep or Rivalry King. Clutch counts any week won, The House's included.
163. **Early Bird: the day's first log saved before 9 am that same day,** in league time, 7 days straight.
164. **Giant Killer: beating whoever had the most Season Points going into the week.** Nobody leads before Week 1.
165. **Trash Talker counts taunts and quick-chat lines aimed at someone.** Show-Off and Fan Favorite count each reaction from others (a fire, a skull and a beer are three).
166. **Recovering Addict: the week's average logged screen time lower than the week before, 3 weeks in a row.**
167. **Commish: whoever is the commish (not the co-commish) when a week of a season goes final.** Brewmaster and Sweep are decided once every regular week of the season is final.
168. **Badges from features still to come** (group play, predictions and the playoffs) are listed in Profile with "Comes with…", and earned once those features ship. Payback is earned since rematches shipped (call 191).
169. **Each new badge, and each rank change, is news in the league feed,** made by the weekly job. The alerts job sends it to its player under Progress.
170. **Profile lists the part each badge unlocks, and the Garage puts it on your car** (calls 171 to 175).

**Phase 2: the Garage** (new on 2026-11-25, not yet reviewed by the commish)

171. **The cars are side views that turn like a card,** drawn for this app in the title screen's style. The turntable shows one side, turns the car edge-on and shows the other, so the 2.5D look needs no 3D drawing. You drag across the stage to spin it (SCOPE.md, "2.5D art"); when you let go it rests on the nearer side, and a tap, or Enter, turns it round. A decal's letters read the right way round from either side. Motion-sensor tilt is left out: SCOPE.md makes it optional, and iPhone asks permission for it.
172. **A new player picks a starter body and paint while joining,** under their name (SCOPE.md, "Join or recover"), and gets the rest of the starter kit with it: no decal, stock wheels, a boost trail in their team color, the stock burst and no topper. A phone waiting for the commish's approval keeps the pick until it joins. The commish, and anyone who joined before the Garage, starts in a cobalt Dart. Your car takes the lettered badge's place on every step of joining and getting back in, since it is your icon now.
173. **The league checks every car, not just the app:** each slot holds a part from the catalog, a starter part for anyone, and a badge's part only once that badge is earned. A rule test tries every part in the engine's catalog, so the rules and the catalog can't drift apart.
174. **Your car in the header is drawn without its boost trail,** so it reads at icon size. Each part's tile in the Garage shows that part on your own car.
175. **The goal-explosion slot's button says "Explosion",** so the seven slots fit four to a row on an iPhone. An explosion plays when you pick it, or with Watch it, and when you win a week (call 177).
176. **Your car is your icon wherever a player shows:** Profile, the Match scoreboard, each post on the wall, the standings, and the week's results, which spotlight the MVP and the Bust with their cars (SCOPE.md, "MVP and Bust"). On Match your car faces your opponent's, which drives on team orange. Lists draw cars without boost trails, so they read at small sizes. The lettered badge from Phase 1 is gone.
177. **Your goal explosion plays the next time you open the app after a week you won goes final:** your car drives onto a stage, the explosion bursts over it, and the score shows. It plays once per week on each phone, before a rank change from the same week. A draw or a loss plays nothing. A phone that joins with weeks already final plays nothing old, but a phone in use before Week 1 does play a Week 1 win.
178. **Each week in a player's rank history also keeps how the matchup ended and the other side's points,** so the phone needs no extra read to know a week was won.

**Phase 2: rivalries** (new on 2026-11-25, not yet reviewed by the commish)

179. **Rivalry records are all-time and 1v1 only:** every final week two players met, across every season (the playoffs too, once they exist, as SCOPE.md says). Weeks against The House don't count. The weekly job works them out again from every final week whenever a week goes final, so a week the commish unlocks and counts again is reflected.
180. **Your nemesis is whoever has beaten you most.** A tie goes to whoever you have the worse record against, then to the one you met last. Nobody is your nemesis until someone has beaten you. The skull shows by their name in the standings and your rivalries in League, and on Match when you face them, with your all-time record against them.
181. **Each player's records are kept on their own profile** (`rivals`), which League and Match already read, instead of the separate `rivalries` collection DATA-MODEL.md first sketched: no extra reads.

**Phase 2: the win meter** (new on 2026-11-25, not yet reviewed by the commish). A forecast, never a score: no point depends on it.

182. **The win meter projects each side's finish:** points so far, plus a recent daily average for each day left, where the open day counts as half a day. The recent average is the last 4 final weeks' points over 7 days each; before a player has a final week, it is this week's average over the days that have locked.
183. **The bar splits on the gap between the projections, against how far the days left can swing it** (about 3 points a day for each player). While a day is left it stays between 3% and 97%, never a sure thing. It says who's favored and by how much, or "Too close to call" between 45% and 55%, and it leaves once no day is left, when the lead says it all.
184. **It sits under the scoreboard on Today,** as SCOPE.md's Today screen lists. Against The House there is no meter.

**Phase 2: pokes** (new on 2026-11-25, not yet reviewed by the commish)

185. **A poke goes to this week's opponent, once a day, any time that day,** and never to The House. The league files it under the day and the poker, so a second one that day is refused, and nobody changes or deletes one.
186. **It arrives as "{name} poked you: You awake?" under Social, within about 10 minutes, and opens Today,** so they can log. It stays between the two of you: it isn't in the feed.
187. **The Poke button is on Match, under your opponent's day,** where you can see whether they have logged.

**Phase 2: stickers** (new on 2026-11-25, not yet reviewed by the commish)

188. **A sticker goes on high up behind the door, at a slight tilt,** and comes off by itself a week later: the time it comes off is kept with it. A dodge puts the Dare Dodger sticker on (a white feather on yellow) for a week from the dare's deadline (SCOPE.md, "Wheel of Shame"); the rematch's "L" is a white L on red. Profile says why your car wears one.

**Phase 2: rematch challenges** (new on 2026-11-25, not yet reviewed by the commish). A rematch never changes a score.

189. **After a final week's loss to a player, the loser can challenge them once,** to a side race in the week right after, by that week's Wednesday. Results go final early Tuesday, so that leaves at least a day and a half, and a late challenge can't wait to see who is ahead. Never against The House.
190. **The challenged player doesn't have to accept:** SCOPE.md has the loser challenge, and nothing to accept. They hear about it at once, under Social.
191. **Most points in the race week wins;** level points means nobody wins. The winner, whichever side, earns the Payback badge (and its decal), and the loser's car wears an L for a week from when the week goes final. A week unlocked and counted again settles its rematches again.
192. **Rematches show in the feed:** the challenge, and the result once the race week is final. Match shows the challenge offer, and the race while it is on.

**Calendar**

25. **Daylight saving:** a wall-clock time that happens twice means the first one, and a time the clocks skip lands the same distance past the jump. In Eastern time neither midnight nor noon is ever affected.

## Still open

1. **What a "majority" veto means. Built provisionally, waiting on the commish.** The draft counts a goal as vetoed when more than half of the players who can vote veto it (everyone but the goal's owner). The other reading is more than half of the votes cast. Under the built reading, a goal stands when votes close unless a majority vetoed it, so nobody can sink a goal with one veto while the others stay quiet. The same rule will decide dare vetoes and dare proof. Changing it is one line in `engine/src/votes.ts`.
2. **A goal still vetoed when the votes close.** For now the results list it for the commish to settle, for example by reopening the votes for 12 hours so the player can re-word it. Should something happen on its own instead?
3. **The Wheel's 16 slices. Built provisionally.** SCOPE.md's pool (8 starters plus one dare per player) can reach 20, but the wheel holds 16. The wheel takes every dare from the draft that stands, then starter dares picked at random each week to fill it to 16. Changing it is one function, `wheelPool` in `engine/src/wheel.ts`.
4. **A spinner who never taps Spin. Built provisionally.** Proof is due by 11:59 pm on the Sunday after the draw, whether or not they have spun, so not spinning is a dodge (−3 Season Points) once that Sunday ends. Changing it is one function, `dareDue`.

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

- **The hourly jobs read only what can have changed** (2026-11-25), to stay well inside the free 50,000 reads a day. The weekly job reads nothing for a week that hasn't started; mid-week, only the players whose Demolition day has locked; and everyone once Sunday locks. Before this it read every player's days for every unfinished week, every hour: about 30,000 reads a day in a 12-week season. The calendar job keeps a note of the settings it last wrote from, so an unchanged season costs one read an hour instead of one for each of its days.
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
