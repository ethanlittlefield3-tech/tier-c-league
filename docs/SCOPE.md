# Tier C League Full Scope

Nov 24, 2026. This is the public copy of the full scope. Personal details and build-cost notes are left out, and every game rule is unchanged.

## At a glance

Tier C League is a free phone app where friends compete on daily habits in weekly 1v1 matchups, with Season Points deciding the standings. It has a rocket-car soccer theme, original art, and opens with "A Nunchucks Production".

- **Who:** 2 to 12 players per league, run by one commish.
- **What you track:** screen time for everyone, one goal each in Mind, Body and Wildcard, and beers, with one rest day a week.
- **Devices:** iPhone and iPad as a Home Screen app, Android as an installed app, any computer browser.
- **Accounts:** none; you join with a league code and keep a recovery key.
- **Live:** scores, feed and trash talk update for everyone at once, with no copy and paste.
- **Running cost:** $0 a month on Firebase's free plan plus GitHub's free hosting and jobs.
- **Build:** three phases in Claude Code over about 5 weeks; Phase 1 alone can run a season.

**A week in the league**

1. Monday 12:00 am: every player's power-up kit refills with Aerial, Demolition and Full Boost.
2. Every day: tap the goals you hit, set your screen time, add any beers; the scoreboard moves live. Your rest day, Sunday unless you move it, skips the goals.
3. All week: talk trash, play power-ups, request receipts and post brags.
4. Next Monday 12:00 pm: Sunday locks and provisional results post.
5. Next Tuesday 12:00 am: results go final, the recap names MVP and Bust, and the low scorer spins the Wheel of Shame live.

Group-play weeks swap the 1v1 for a mode the league voted on at the draft. Each season ends with short playoffs and a trophy case.

## Decisions log

The table is locked unless the commish changes it; the numbered list is calls I made to close gaps, each open to veto.

| Area | Locked decision |
| --- | --- |
| Name | Tier C League, "A Nunchucks Production" |
| Platform | Free web app on Firebase and GitHub, for iPhone, Android and computers |
| Art | 2.5D; customizable cars as profile icons; 15 starter paints |
| Squares | Screen Time for everyone, plus one goal each in Mind, Body and Wildcard |
| Fairness | Exactly 3 goals, approved by group vote at the draft |
| Scoring | +1 per goal; screen time on a par scale; −1 per beer; −3 screen time not logged; −5 no-show |
| Standings | Season Points: every point scored plus win bonuses |
| Weekly kit | Aerial, Demolition (hidden) and Full Boost, all three every week |
| Rule One | One grace day per 4 weeks of season, rounded up |
| Rest day | One per player per week, Sunday by default, movable each week |
| Group play | Commish schedules the weeks, the draft votes the modes, and the mode replaces that week's 1v1 |
| Modes | Rumble, Team Week, 2v2, Bounty Week, Drop Shot, Alley |
| Rumble items | Tornado, Punch, Boot, Spike, Swap, Freeze and Magnet replace the weekly kit |
| Seasons | Commish sets season and playoff lengths; players stay or leave between seasons |
| Draft day | Goal approval, group-play vote, rival pick, dare pick; captains if Team Week wins a slot |
| Progression | Achievements unlock car parts; rank-up animations; season trophy case |
| Rivalry | Live feed, wall, brags, rivalry record, win meter, nemesis, poke, rematch, highlight reel |
| Recaps | MVP and Bust of the Week, season storylines, predictions |
| Wheel | Live spin, dare proof votes, sealed results |
| Safety | Commish recovery keys, nightly backups, security rules, scheduled jobs |
| Extras | Push notifications, suggestion box, updates between seasons |

**Calls I made to close gaps (veto any)**

1. **Regular-season ties are draws.** After the fewer-beers tiebreak, each player gets +2; overtime lives only in the playoffs, so weeks finalize on time.
2. **A failed receipt voids the square, then costs 1.** A −1 dock alone makes lying pay: claim +3 screen time instead of −2, lose 1, still 4 ahead.
3. **"Beer" means any alcoholic drink,** one standard drink each, so seltzers and shots count.
4. **A perfect day** is all 3 goals hit, screen time scored 0 or better, and 0 beers.
5. **One league time zone** (default Eastern) sets every day, deadline and reset.
6. **Weeks lock Monday at noon and go final Tuesday at 12:00 am,** once the receipt windows close.
7. **Bust of the Week** is the biggest drop below your own average; the lowest score already spins the Wheel.
8. **Alley penalties are race-only:** a 0-goal day costs 2 race points, never Season Points.
9. **Rule One works in every regular-season week, group play included,** but never in the playoffs.
10. **Rule One is issued over time:** one at the start of Weeks 1, 5 and 9, as far as the season runs.
11. **Skipping a dare costs 3 Season Points** and puts a "Dare Dodger" sticker on your car for a week.
12. **Dare videos need Firebase's pay-as-you-go plan** (card on file, $0 expected at this size); photo proof works on the free plan. Decide in Phase 3.
13. **Goal approval, rival pick and dare pick move into Phase 1** as a mini draft, because fairness needs them from Week 1.
14. **Draft order** is random in Season 1, then the reverse of the final standings.
15. **Playoff rounds run on a tighter clock** with a reset day between rounds, so each round's matchups are set before it starts.
16. **Leagues cap at 12 players** to keep group play and art manageable.
17. **Rest days are goals-only.** Screen time and beers still count, so nobody can park a rest day on a party night and drink for free.
18. **A rest day can't move once either day has started,** so it can't rescue a bad day the way Rule One does.

## Look and feel

The app looks like a night-arena match broadcast: you in team blue, your opponent in team orange, and every score on a slanted scoreboard.

**Name and credit**

- App name: Tier C League. Home Screen label: "Tier C", because iPhone cuts long labels; players can rename it when adding.
- Credit: "A Nunchucks Production" on the intro and the About screen.

**Intro animation**

1. **Nunchucks card, about 2 seconds:** black screen; cartoon nunchucks spin in with the chain whipping, slam to a stop and flash white. "A Nunchucks Production" stamps in under them.
2. **Boost scene, about 2.5 seconds:** stadium lights clunk on over the arena. A car rockets across with a long blue-to-orange boost trail and sparks, then smashes the ball into the camera.
3. **Title:** TIER C LEAGUE slams in with a screen shake and a glow, then "Tap to enter".

- The full version plays on the first open each day; after that, a 1-second title slam.
- A tap anywhere skips it.
- Sound starts on "Tap to enter", because iPhone blocks sound until the first tap.
- With Reduce Motion on, it becomes a simple fade.

**Theme**

| Element | Choice |
| --- | --- |
| Ground | Night-arena navy with a faint hex-pattern pitch |
| You | Team blue |
| Your opponent | Team orange |
| Lost points | Red |
| Wins and trophies | Gold |
| Scores and titles | Exo 2, heavy italic |
| Body text | The phone's own system font |

**Icon and launch screen**

- Option A: a bronze-to-gold "C" tier badge with a blue-to-orange boost streak, on navy.
- Option B: the same badge with crossed cartoon nunchucks behind it.
- I'll draw 2 or 3 options in Phase 1, and the launch screen matches the pick.
- iPhone keeps the icon from the day the app was added, so a new icon means re-adding it. Scores are not affected.

**2.5D art**

- Cars, badges and scenes are layered vector art with shading and highlights, so they read as 3D but load instantly.
- Cars are built from parts, so a new paint or decal is a small addition, not a new drawing.
- In the garage you drag to spin the car; motion-sensor tilt is optional, since iPhone asks permission for it.
- Original art only: no official game logos, cars, item names or sounds.

## League, seasons and players

One league runs season after season: your car, badges and history follow you, while standings and power-ups reset each season.

**Joining, about 2 minutes**

1. Open the link in Safari, tap Share, then Add to Home Screen, and open the new icon.
2. Enter the league code, pick a display name and build your starter car.
3. Save your recovery key; it also stays in your Profile, and the commish can see it too.
4. Tap Allow notifications; iPhone only offers this inside the Home Screen app.

**Recovery keys**

- Every player gets a key like TCL-7Q4M-X2K9.
- On a new phone or a cleared browser, tap "I'm already in a league", enter the code and key, and the full profile is back at once.
- After a recovery the key changes automatically, and every other device is signed out.
- The commish can view every key, reissue one, or sign out a lost phone.
- Trade-off: the commish could sign in as anyone, so every commish action is logged where the league can see it.

**The commish**

- One commish per league, with an optional co-commish; the role can be handed over.
- The commish plays like everyone else and cannot see hidden Demolitions or Rumble items early.

**Seasons**

- Seasons run back to back, with an offseason between them.
- In the offseason, everyone taps Stay or Leave by a deadline, new players join with the code, and updates ship.
- Leaving keeps your profile and history, and you can return in a later season.

| Carries over | Resets each season |
| --- | --- |
| Car and unlocked parts | Standings and Season Points |
| Badges and rank history | Weekly kits and Rule One |
| Trophy case | Season stats |
| All-time rivalry records | Goals, re-approved at each draft |

**Updates**

- Big features ship in the offseason; fixes can ship any time.
- Everyone gets an update on their next open, and all data carries over.

**Suggestion box**

- A small "Suggest an idea" link sits on the Profile screen.
- Anyone posts, others upvote, and the commish tags each idea Planned, Maybe or No.
- The top ideas get reviewed each offseason.

## Season setup and draft day

The commish sets the season's shape first; then a live draft of about 15 minutes settles goals, group-play modes, Week 1 rivals and dares.

**Season settings (commish)**

| Setting | Options | Default |
| --- | --- | --- |
| Regular season | 3 to 12 weeks | 6 weeks |
| Playoffs | None, 1 week or 2 weeks | 1 week |
| Playoff size | Top 2 or top 4 | Top 4 |
| Screen time par | 1 to 6 hours | 3 hours |
| Group-play weeks | Any weeks after Week 1 | Weeks 3 and 5 |
| League time zone | Any | Eastern |
| Kickoff | Any Monday | The Monday after the draft |
| Draft day | A date and start time | The Sunday before kickoff, 7 pm |
| Joining mid-season | Off, or with commish approval | Off |
| Holiday events | On or off | On |

**Draft day agenda (live in the app)**

1. **Draft order:** a random draw on screen in Season 1; the reverse of the final standings after that.
2. **Goal approval:** each player's Mind, Body and Wildcard goals appear one at a time. Everyone else votes Approve or Veto; a majority veto means a new goal, re-voted within 12 hours.
3. **Group-play vote:** everyone ranks the six modes. The top-ranked modes fill the scheduled group-play weeks, and the commish breaks ties.
4. **Rival pick:** in draft order, each unpicked player chooses a Week 1 opponent. With an odd count, the last player faces The House.
5. **Dare pick:** each player adds one dare to the Wheel. A majority veto removes it, and nobody votes on their own.
6. **Team captains, only if Team Week won a slot:** last season's top 2 snake-draft the blue and orange squads. In Season 1 the captains are drawn at random, and teams hold for the season.
7. **Reveal:** the full schedule, the group-play weeks and a shareable season hype card.

- Live picks run on a 2-minute clock, and a missed pick is made at random.
- Votes stay open 24 hours for anyone who missed the live draft.

## Daily play and scoring

Each day scores four squares plus beers: at the default par, the best normal day is +6 and a day with nothing logged is −5.

**The four squares**

| Square | What counts | Examples |
| --- | --- | --- |
| Screen Time (everyone) | Unproductive minutes: Social, Entertainment and Games in iPhone Screen Time, or Digital Wellbeing on Android | Set with a slider in 15-minute steps |
| Mind | Learning or studying | Study 1 hour, read 20 pages, a course lesson, cert prep |
| Body | Anything physical | Gym, 10k steps, a run, sport practice |
| Wildcard | Your own pick | Meal prep, no vaping, call family, cook dinner |

**Goal rules (fairness)**

- Exactly one goal per lane, so everyone has the same maximum.
- Each goal is a daily yes or no you can prove with a photo or screenshot.
- No freebies you'd do anyway, and nothing that can't happen most days.
- The group approves goals at the draft; they lock for the season, and a mid-season swap needs a majority vote.

**Daily points**

| Item | Points |
| --- | --- |
| Each goal hit | +1 |
| Screen time | Par minus each full hour, per the scale below |
| Each beer (any alcoholic drink) | −1 |
| Screen time not logged | −3, in place of the scale |
| Nothing logged all day (no-show) | −5 for the whole day; −3 on a rest day |

**Screen time scale at par 3**

| Unproductive time | Points |
| --- | --- |
| Under 1 hour | +3 |
| 1 to 2 hours | +2 |
| 2 to 3 hours | +1 |
| 3 to 4 hours | 0 |
| 4 to 5 hours | −1 |
| 5 to 6 hours | −2 |
| Each hour after that | −1 more |

**Perfect day:** all 3 goals hit, screen time scored 0 or better, and 0 beers.

**Rest day**

- Every player gets one rest day a week, Sunday by default.
- Your three goals take the day off and score 0; screen time and beers still count, so the best rest day is +3 at par 3.
- Move it to another day of the same week while both days are still ahead; there's only one a week.
- You can set next week's rest day early.
- Rest days show on the scoreboard and schedule, so your opponent can plan around them.
- Logging nothing on a rest day counts as screen time not logged, −3, not a −5 no-show.
- A rest day never breaks a check-in streak, and receipts on it cover screen time only.

**Logging window**

- Log today any time, and fix yesterday until 12:00 pm; then the day locks.
- All times use the league time zone, and the server's clock decides, not your phone's.
- Logging works offline and syncs later; a sync after the lock is refused, and the app warns you first.

**Receipts on demand**

1. Anyone can tap Receipts? on any square of anyone's day, until that day locks at noon the next day; each player gets 3 requests a week.
2. The player gets a push and uploads a screenshot or photo.
3. Proof is due by 11:59 pm that day, or by 11:59 pm the next day if requested after 6 pm.
4. No proof in time: the square is voided (a goal counts as missed, screen time as not logged), and the player loses 1 more point.
5. Fake proof: the commish voids the square and docks 1 point.

- Every dock shows in the feed with its reason.
- Proof photos delete themselves after 14 days.

## Weekly matchups and standings

Every regular week is a 1v1, and the standings are Season Points: every point you score all season, plus bonuses for wins.

**The week (league time)**

1. Monday 12:00 am: the week starts and kits refill.
2. Monday to Sunday: daily logging and live scoring.
3. Next Monday 12:00 pm: Sunday locks and provisional results post.
4. Next Tuesday 12:00 am: receipt windows close; results go final, the recap posts and the Wheel unlocks.

**Schedule**

- Week 1 comes from the draft's rival pick; after that, a round-robin means you face everyone before any repeat.
- Group-play weeks pause the round-robin; Rumble and Drop Shot use the next 1v1 pairing.
- With an odd count, one player a week faces **The House**, which scores that week's league average.

**Winning a 1v1:** most points wins; a tie goes to fewer beers; still tied is a draw.

**Season Points**

| Result | Bonus on top of your own points |
| --- | --- |
| 1v1 win (regular week, Rumble, Drop Shot) | +5 |
| 1v1 draw | +2 |
| Team Week or 2v2, winning side | +3 each |
| Bounty Week, target hit | +3 for everyone |
| Alley, 1st, 2nd and 3rd place | +5, +3 and +1 |

- Your own points always count, so a bad teammate can cost you a bonus but never your points.
- Standings tiebreakers, in order: head-to-head, fewer beers, more perfect days, then a sealed coin flip.
- Playoff seeds come from Season Points.

**Weekly awards (in the recap)**

- **MVP:** most points that week; fewer beers breaks a tie.
- **Bust:** the biggest drop below your own 4-week average; in Weeks 1 and 2, the lowest score.
- **Wheel spinner:** the lowest points that week, and tied players all spin; group-play exceptions are under Group play.

## Power-ups

Every player gets Aerial, Demolition and Full Boost each regular week, plus one Rule One grace day for every 4 weeks of season.

**The weekly kit**

| Power-up | Effect | Deadline |
| --- | --- | --- |
| Aerial | Doubles your points for one day, negatives too | Set before that day starts |
| Demolition | Pick one of your opponent's goals for one day; if they miss it, they lose 2 | Set before that day starts |
| Full Boost | One goal you missed that day counts as hit | By 12:00 pm the next day |

- **Aerial** shows in the feed when set, and you can cancel it until the day starts.
- **Demolition** is hidden from everyone, commish included, until that day locks at noon the next day. Then the feed shows Landed, Missed or Blocked.
- **Full Boost** on the targeted goal blocks a Demolition, so saving it is insurance.
- Demolition targets a goal lane only, never screen time.
- One of each per week; unused ones expire with the week.

**Rest days and power-ups**

- Demolition can't target an opponent's rest day; if they move their rest day onto a day you demolished, it fizzles like a block.
- Full Boost has nothing to fix on a rest day.
- Aerial on a rest day doubles only screen time and beers.
- Rule One still works on a rest day.

**Rule One (grace day)**

- A season of 1 to 4 weeks gets 1, 5 to 8 weeks gets 2, and 9 to 12 weeks gets 3.
- They arrive over time, at the start of Weeks 1, 5 and 9, and unused ones carry to the end of the season.
- The chosen day scores 0 no matter what happened, cancelling a no-show, an Aerial and a Demolition.
- Declare it by 12:00 pm the next day.
- Regular season only, never in the playoffs.

**Daily order of operations**

1. Rule One used: the day is 0, and nothing below applies.
2. No-show: the base is −5, or −3 on a rest day, and every goal counts as missed.
3. Otherwise the base is goals hit (after Full Boost; 0 on a rest day) plus screen time points minus beers. Rumble's Boot, Freeze, Magnet and Swap change these parts.
4. Aerial doubles the base.
5. Then come Demolition (−2) and Rumble's Tornado, Punch and Spike.
6. Docks come last and are never doubled.

**Kit by week type**

| Week | Power-ups |
| --- | --- |
| Regular 1v1 | Aerial, Demolition, Full Boost |
| Rumble | One random Rumble item a day instead |
| Team Week | Full kit; Demolition targets anyone on the other team |
| 2v2 | Full kit; Demolition targets either opponent |
| Bounty Week | Aerial and Full Boost only, since it's co-op |
| Drop Shot | Full kit |
| Alley | None |
| Playoffs | A fresh full kit each round |

Rule One works in every regular-season week, group play included.

## Group play

Group-play weeks replace the 1v1 with a mode the league voted on; your own points still count, and winning adds a bonus.

**How it's set**

1. At season setup, the commish picks which weeks are group play.
2. On draft day, the league's ranked vote assigns a mode to each of those weeks.
3. At 7 pm the Sunday before, everyone gets a push explaining that week's mode.

**The six modes**

| Mode | Format | Bonus |
| --- | --- | --- |
| Rumble | 1v1 with a random item each day | Win +5, draw +2 |
| Team Week | League split in half, blue vs orange | +3 each on the winning team |
| 2v2 | Duos face duos | +3 each on the winning duo |
| Bounty Week | Whole league chases one shared target | +3 for everyone if hit |
| Drop Shot | 1v1 scored by floor tiles broken | Win +5, draw +2 |
| Alley | Whole league races single file | 1st +5, 2nd +3, 3rd +1 |

**Rumble**

At midnight each day, every player gets one random item for that day only; the server draws them in advance and seals them.

- **Tornado:** take 2 points from your opponent's day and add them to yours.
- **Punch:** if your day beats theirs, they lose 3.
- **Boot:** pick one of their goals by 12:00 pm; it scores 0 that day, and they don't see which until the day locks.
- **Spike:** on a perfect day, take 1 point from them.
- **Swap:** if you missed a goal and they hit one, one of your misses becomes a hit and one of their hits a miss.
- **Freeze:** their screen time points count double, good or bad.
- **Magnet:** your beers count against them instead of you.

Items that touch goals (Boot, Spike and Swap) do nothing on a day the affected player is resting.

**Team Week**

- The captains' squads from the draft play blue vs orange; with an odd count, one team has an extra player.
- Teams compare average points per player, so team size doesn't matter.

**2v2**

- Duos are drawn at random on Monday; the commish can switch to "frenemies", which pairs rivals together.
- Duos compare average points per player; with an odd count, one team is a trio, and an odd duo out faces a House duo.

**Bounty Week**

- The commish sets one league-wide target, like "60 Body hits", "zero beers league-wide on Friday" or "everyone under 2 hours of screen time on Saturday".
- A live bar tracks progress all week, and targets assume one rest day per player.
- Hit it and everyone gets +3; miss it and the lowest contributor, or whoever broke it, spins the Wheel.

**Drop Shot**

- Each side has a floor of 20 hex tiles, and each tile takes 2 hits: cracked, then broken.
- Each day, the higher score lands hits on the other floor equal to the margin, up to 4 a day.
- Most tiles broken by Sunday wins, then most hits landed, then fewer beers; still level is a draw.
- The daily cap means one blowout can't win the week; winning more days does.

**Alley**

- The whole league lines up single file in one absurdly long, skinny lane: the inside joke.
- Each day your points move your car down the lane, and a day with 0 goals hits the wall for 2 race points, except on your rest day.
- No power-ups this week; Rule One still works.
- 1st, 2nd and 3rd earn +5, +3 and +1, and last place spins the Wheel.
- Race points only rank the race; Season Points still count your real daily points.

**Who spins the Wheel in group-play weeks**

- Default: the lowest points that week.
- Bounty Week missed: the lowest contributor instead.
- Alley: last place in the race.

## Playoffs

The top 4 in Season Points play short sprint rounds with a fresh kit each round, no Rule One, and sudden death if the final ties.

**Formats (commish picks at setup)**

- **1 week (default):** semifinals Monday to Wednesday, a reset day Thursday, the final Friday to Sunday, and sudden death Monday if tied.
- **2 weeks:** semifinals Monday to Saturday, reset Sunday, the final Monday to Saturday of week 2, and sudden death that Sunday if tied.
- **Top 2:** the final only, Monday to Saturday, with sudden death Sunday if tied.
- **None:** the Season Points leader is champion.

**Tighter clock**

- Playoff days still lock at noon the next day.
- Receipts for a playoff day must be requested before it locks, and proof is due by 6 pm that day.
- The reset day covers the locks, the receipts and the next round's power-up choices, so every round starts with its matchups set.

**Rest days pause in the playoffs:** every round day counts, and the reset day is everyone's day off.

**Rules**

- Seeds come from Season Points: 1 plays 4, and 2 plays 3.
- Every round, each player gets a fresh Aerial, Demolition and Full Boost.
- The #1 seed gets one extra Full Boost in the semifinal.
- No Rule One, and a no-show still costs 5.
- Playoff points don't add to Season Points, but they count for badges, streaks and rivalry records.

**Ties**

- Semifinal: fewer beers in the round, then the higher seed.
- Final: sudden death, where the first to miss any goal loses. If both hit everything or both miss, that day's points decide, then fewer beers in the round, then the higher seed.

**Whiff Bowl (consolation)**

- Everyone outside the playoffs plays a mini bracket on the same days, for "not last".
- Before the playoffs, the commish picks a Season Dare from the pool, and the Whiff Bowl loser does it.

**Champion:** a trophy topper, a golden goal explosion, and their name on the league banner until the next champion.

## Wheel of Shame

Each week's lowest scorer spins a sealed wheel live in front of the league, then proves the dare or spins again.

- **Who spins:** the lowest points that week, and tied players all spin; group-play exceptions are under Group play.
- **Sealed:** the server draws the result when the week goes final, and the spin only reveals it, so re-spins change nothing.
- **Live spin:** the spinner taps Spin, everyone gets a push, and the wheel lands on every phone at once.
- **Dare pool:** the commish's starter dares plus one approved dare per player from the draft, 8 to 16 slices.

**Dare proof**

1. The spinner posts a photo by 11:59 pm on the Sunday after the spin.
2. Everyone else votes Counts or Doesn't count for 24 hours.
3. A majority "Doesn't count" means a new sealed spin.
4. No proof by the deadline costs 3 Season Points and puts a "Dare Dodger" sticker on the car for a week.

- Video proof waits on a storage decision in Phase 3; until then videos go in the group chat, and the vote stays in the app.
- Three completed dares earn the Wheel Survivor badge.

**Starter dares**

1. Group picks your profile pic for 24 hours.
2. Post your worst camera-roll photo.
3. 50 push-ups, on video.
4. Only voice memos in the group chat for a day.
5. Group picks your lock screen for a week.
6. Cold shower, on video.
7. Post a childhood photo.
8. Sing happy birthday in a voice memo.

## Garage and achievements

Your car is your profile icon everywhere, and each of the 51 achievements unlocks a part for it.

**Car parts**

| Slot | Starter kit | More from |
| --- | --- | --- |
| Body | Brick (boxy), Dart (low and sleek), Bruiser (truck) | Achievements |
| Paint | 15 colors, listed below | Special finishes from achievements |
| Decal | None | Achievements |
| Wheels | Stock | Achievements |
| Boost trail | Your team color | Achievements |
| Goal explosion, played when you win a week | Stock burst | Achievements |
| Topper | None | Achievements and the championship |

**15 starter paints:** Midnight Black, Arctic White, Gunmetal, Racing Red, Blaze Orange, Sunburst Yellow, Lime, Forest Green, Teal, Sky Blue, Cobalt, Royal Purple, Hot Pink, Burgundy, Sand.

Shame badges unlock silly parts that you can choose to wear proudly.

**Streaks**

| Badge | How to earn | Unlocks |
| --- | --- | --- |
| Hat Trick | 3 perfect days in a row, rest days skipped | Flame decal |
| Perfect Week | A perfect day on all 6 goal days of a week | Chrome finish |
| Iron Streak | 30-day check-in streak | Gold boost trail |
| Century | 100-day check-in streak | Inferno goal explosion |
| Early Bird | Logged before 9 am, 7 days straight | Sunrise paint |
| Clean Sheet | A week with no no-shows and screen time logged every day | Pinstripe decal |

**Lanes**

| Badge | How to earn | Unlocks |
| --- | --- | --- |
| Scholar | Mind hit on all 6 goal days of a week | Bookworm decal |
| Gym Rat | Body hit on all 6 goal days of a week | Muscle wheels |
| Wild One | Wildcard hit on all 6 goal days of a week | Joker decal |
| Triple Threat | Every lane hit at least 5 days, 3 weeks running | Tri-color paint |

**Screen time**

| Badge | How to earn | Unlocks |
| --- | --- | --- |
| Ghost | Under 1 hour for 7 straight days | Ghost boost trail |
| Touch Grass | Under 30 minutes in a day | Turf wheels |
| Monk Mode | 0 minutes in a day | Zen goal explosion |
| Recovering Addict | Weekly average down 3 weeks in a row | Phoenix boost trail |

**Beers**

| Badge | How to earn | Unlocks |
| --- | --- | --- |
| Dry Week | 0 beers in a week | Ice paint |
| Dry Month | 0 beers for 4 straight weeks | Frost wheels |
| Designated Driver | 0 beers on the Friday and Saturday of one weekend | Checkered decal |
| Brewmaster (shame) | Most beers in a season | Foam goal explosion |
| Happy Hour (shame) | 10 or more beers in one week | Party hat topper |

**Matchups**

| Badge | How to earn | Unlocks |
| --- | --- | --- |
| First Blood | First 1v1 win | Red stripe decal |
| Win Streak | 4 1v1 wins in a row | Hot streak boost trail |
| Sweep | Won every 1v1 week of a season | Broom topper |
| Comeback | Won after trailing at the end of Thursday | Lightning wheels |
| Blowout | Won by 20 or more | Shockwave goal explosion |
| Photo Finish | Won by exactly 1 | Camera-flash decal |
| Giant Killer | Beat the standings leader | Slingshot decal |
| Rivalry King | 5 all-time wins over the same player | Crown decal |

**Power-ups**

| Badge | How to earn | Unlocks |
| --- | --- | --- |
| Demolisher | 3 Demolitions landed | Spiked body |
| Untouchable | Blocked a Demolition with Full Boost | Force-field wheels |
| Air Mail | An Aerial day worth +10 or more | Jet boost trail |
| Clutch | Won a week in which you used Rule One | Four-leaf decal |

**Group play**

| Badge | How to earn | Unlocks |
| --- | --- | --- |
| Rumble Royale | Most points in the league in a Rumble week | Thunder goal explosion |
| Team Player | Won a Team Week | Squad decal |
| Dynamic Duo | Won a 2v2 | Twin-turbo boost trail |
| Bounty Hunter | Top contributor in a Bounty Week | Wanted-poster decal |
| Floor Breaker | Most tiles broken in a Drop Shot week | Shatter goal explosion |
| Alley Cat | Won the Alley | Noodle body, extra long and skinny |

**Social**

| Badge | How to earn | Unlocks |
| --- | --- | --- |
| Trash Talker | 50 taunts sent | Megaphone topper |
| Show-Off | 10 brags with 3 or more reactions each | Spotlight boost trail |
| Fan Favorite | 100 reactions received | Confetti goal explosion |
| Prophet | Best predictions record in a season | Crystal-ball topper |
| Payback | Won a rematch challenge | Payback decal |

**Season and career**

| Badge | How to earn | Unlocks |
| --- | --- | --- |
| Founding Member | Played Season 1 | OG decal |
| Veteran | Played 3 seasons | Retro body |
| Finalist | Reached a final | Silver finish |
| Champion | Won a season | Trophy topper and golden goal explosion |
| MVP Magnet | 3 MVPs in a season | MVP decal |
| Bust Collector (shame) | 3 Busts in a season | Dumpster-fire decal |
| Wheel Survivor | Completed 3 dares | Clown paint |
| Grand Champ | Reached the Grand Champ rank | Galaxy paint |
| Commish | Ran a season as commish | Whistle topper |

## Ranks and trophies

Your rank tracks your form over the last 4 weeks, and the trophy case keeps every season's awards forever.

**Rank tiers**

Rank compares your rolling 4-week average of weekly points, before bonuses, with the most you could score. At par 3 that maximum is 39 a week: 6 goal days of +6 plus a rest day of +3.

| Tier | Share of the maximum | Weekly points at par 3 |
| --- | --- | --- |
| Grand Champ | 80% or more | 31.2 or more |
| Champion | 65% to 80% | 25.4 to 31.2 |
| Diamond | 50% to 65% | 19.5 to 25.4 |
| Platinum | 35% to 50% | 13.7 to 19.5 |
| Gold | 20% to 35% | 7.8 to 13.7 |
| Silver | 0% to 20% | 0 to 7.8 |
| Bronze | Below 0% | Below 0 |

- Ranks update every Tuesday when results go final; new players stay unranked until their first week is final.
- Until 4 weeks exist, the average uses the weeks you have.
- Rank history carries across seasons.

**Rank-up animation**

- The next time you open the app after a rank change, a full-screen scene plays: your car boosts through the old badge, which shatters into the new one.
- A rank-down gets a short, sad version.

**Season trophy case**

| Trophy | Goes to |
| --- | --- |
| Champion | Playoff winner |
| Finalist | Playoff runner-up |
| Regular-Season Leader | Most Season Points |
| Screen Time King | Lowest average screen time |
| Iron Streak | Longest check-in streak |
| Demolition Derby | Most Demolitions landed |
| Brewmaster | Most beers |
| Prophet | Best predictions record |
| MVP of the Season | Most weekly MVPs |
| Whiff Bowl | Consolation bracket loser |

## Live rivalry and social

Everything happens in one live feed, and this week's opponent is always one tap from a taunt.

| Feature | What it does |
| --- | --- |
| Live feed | Check-ins, power-ups, revealed Demolitions, badges, rank-ups, docks and recaps, instantly while the app is open |
| Trash-talk wall | Quick-chat lines aimed at your current opponent, saved custom taunts, and fire, skull and beer reactions |
| Custom taunts | Write your own; {name} becomes whoever you face that week |
| Brag posts | Share wins from outside the game, like a bench PR or a passed exam; others comment and react |
| Rivalry record | All-time head-to-head against every player |
| Win meter | A live bar of who's favored, from points so far and each player's recent daily average |
| Nemesis tag | A skull by the player who has beaten you most |
| Poke | One "you awake?" push to your opponent per day |
| Rematch challenge | After a loss, challenge that player to a side race next week; the winner gets the Payback decal, the loser an "L" sticker for a week |
| Highlight reel | An auto-made recap card of the week's best moments, with a Share button for the group chat |
| MVP and Bust | Spotlighted with their cars in each recap |
| Season storylines | Auto headlines in the recap, like "Alex's 4-game win streak snapped" |
| Predictions | Pick every matchup by Sunday 11:59 pm; the week's top picker gets a shoutout, and the season's best wins Prophet |
| Holiday events | Commish-scheduled specials: Double Points Day, Dry Day (+2 for 0 beers) or Holiday Pass (a no-show scores 0, not −5) |

**Quick-chat presets**

1. Your boost is running on empty.
2. I can see your screen time from here.
3. Warm up the Wheel of Shame, {name}.
4. Those beers are carrying me.
5. Calculated.
6. Kickoff was Monday. Where are you?
7. Demolished. Again.
8. Touch grass, {name}.
9. See you in the replay.
10. GG, no rematch.

**Moderation:** authors can delete their own posts, and the commish can delete any post.

## Notifications

Pushes cover deadlines, rivalry moments and league events; the app itself updates instantly, while pushes arrive within about 10 minutes.

**Settings**

- iPhone needs iOS 16.4 or later, the Home Screen app, and a tap on Allow inside it ([WebKit](https://webkit.org/?p=13878)).
- Each category can be turned off, and quiet hours default to 11 pm to 8 am; held alerts arrive in the morning.
- Social alerts bundle, so a busy evening sends one push, not twenty.

| When | Alert | Category |
| --- | --- | --- |
| 9:00 pm, if today isn't logged | Log your day | Daily |
| 11:00 am, if yesterday is incomplete | Last call: yesterday locks at noon | Daily |
| 11:00 am, if you missed a goal and hold Full Boost | Full Boost still available | Daily |
| 11:00 am, after a no-show, if you hold Rule One | Rule One available | Daily |
| Monday 9:00 am | This week's rest day, with a tap to move it | Daily |
| When it happens | Your opponent passed you | Matchup |
| Saturday or Sunday, within 3 points | Close finish | Matchup |
| Tuesday 12:00 am | You won or lost | Matchup |
| Noon, when the day locks | Your Demolition landed, missed or was blocked | Power-ups |
| Noon, when the day locks | You got demo'd | Power-ups |
| Saturday 8:00 pm, if unused | Last chance to set Aerial for Sunday | Power-ups |
| 8:00 am in Rumble week | Your Rumble item for today | Power-ups |
| When it happens | A taunt or poke aimed at you | Social |
| Bundled | Reactions and comments on your posts | Social |
| When it happens | Rematch challenge | Social |
| When requested, and 1 hour before the deadline | Receipts requested from you | Receipts |
| When applied | You were docked, with the reason | Receipts |
| When earned | Badge unlocked and new car part | Progress |
| Tuesday 12:00 am | Rank up or down | Progress |
| 1 hour before, and at the start | Draft day | League |
| Sunday 7:00 pm | Group-play mode starts Monday | League |
| Tuesday 12:00 am | Recap posted, with MVP and Bust | League |
| When it starts | Live Wheel spin, watch now | League |
| When posted | Dare proof is up, vote | League |
| Offseason | Stay or leave deadline | League |

## Commish tools

The commish runs the league from one screen, and every action lands in an audit log the whole league can read.

| Area | Tools |
| --- | --- |
| Season | Settings, schedule, group-play weeks, Bounty targets, holiday events, the Season Dare |
| Draft | Start, pause, skip an absent player, auto-pick |
| Players | Approve joins, remove a player, mark a player as left, name a co-commish, hand over the role |
| Recovery keys | View any key, reissue one, sign out a lost device |
| Scores | Dock a point, void a square, enter a correction; a reason is required |
| Weeks | Settle a week from the app if the server job runs late; unlock a final week |
| Moderation | Delete posts and dares |
| Suggestion box | Tag ideas Planned, Maybe or No |
| Audit log | Every commish action with its time and reason, visible to all |

## Screens

Five bottom tabs cover the whole game: Today, Match, Feed, League and Garage; your car icon at top right opens Profile.

| Screen | What's on it |
| --- | --- |
| Intro | Nunchucks card, boost scene, title, Tap to enter |
| Join or recover | League code, display name, starter car, recovery key, notifications |
| Today | Scoreboard and win meter, quick chat, the four squares, beers, power-up tray, rest-day picker, day total, week bars |
| Match | This week's matchup or mode: your opponent's live day, the Drop Shot floor, the Alley lane, team totals or the Bounty bar |
| Feed | Live feed and the wall: taunts, brags, comments and reactions |
| League | Standings, schedule, results, playoff bracket, trophy case, rivalry records |
| Garage | Car builder on a turntable; locked parts show the badge that unlocks them |
| Profile | Badges, rank history, stats, recovery key, notification settings, Suggest an idea |
| Draft room | The live draft, on draft day only |
| Wheel | Live spin, dare proof and votes |
| Commish | Commish tools, for the commish only |

## Technical design

The app runs with no server of its own: phones talk to Firebase directly, security rules enforce the game, and free GitHub jobs do the timed work.

**Architecture (text version of the drawing in the doc)**

| From | To | What flows |
| --- | --- | --- |
| GitHub Pages | Phones | The app files |
| Phones | Firestore | Reads and writes, checked by security rules; live updates |
| Phones | Anonymous Auth | Device sign-in |
| Cloud Messaging | Phones | Web push notifications |
| GitHub Actions jobs (tick, daily, weekly, backup) | Firestore | Settled results, reveals, awards (Admin SDK) |
| GitHub Actions jobs | Cloud Messaging | Alerts to send |
| GitHub Actions backup job | Private repo | Nightly JSON backups |

Arrows show who calls whom; only the jobs hold admin access, and they never run on a phone.

**Stack, and why**

| Part | Choice | Why |
| --- | --- | --- |
| App | TypeScript, Preact and Vite, as an installable web app | One small codebase for iPhone, Android and computers, fast on older phones |
| Hosting | GitHub Pages from a public repo | Free on GitHub Free, and deploys on every push |
| Data and live sync | Cloud Firestore | Live listeners and an offline cache are built in |
| Sign-in | Firebase Anonymous Auth plus recovery keys | No passwords or emails |
| Push | Firebase Cloud Messaging web push | No-cost, and works in iPhone Home Screen apps |
| Timed work | Node scripts in GitHub Actions, using the Firebase Admin SDK | The free Spark plan can't deploy Cloud Functions, and Actions are free in public repos |
| Scoring engine | One pure TypeScript package | The app and the jobs run the same code, so phones and results always agree |
| Tests | Vitest, the Firebase Emulator and Playwright | Scoring fixtures, security-rule tests and phone-size flow tests |

Sources: [Firebase plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) for Cloud Functions on Spark, [GitHub billing](https://docs.github.com/en/actions/reference/usage-limits-billing-and-administration) for free Actions.

**Repos**

- `tier-c-league`, public: the app, jobs, security rules and tests. Public is safe here: Firebase's web settings aren't secret, rules guard the data, and admin keys live in GitHub Secrets.
- `tier-c-backups`, private: nightly backups only.

**Data model (Firestore)**

- `leagues/{league}`: name, code, time zone, commish, settings.
  - `players/{player}`: display name, car, status, badges, rank history, stats.
  - `keys/{player}`: the current recovery key, readable by that player and the commish.
  - `claims/{device}`: one device's player and key, readable by that device and the commish.
  - `sealed/{item}`: Demolitions and Boot targets, readable only by the player who played them; Rumble draws, readable by no phone until the jobs publish them.
  - `feed/{event}`, `wall/{post}`, `suggestions/{idea}` and `audit/{entry}`.
  - `seasons/{season}`: settings, status, schedule, teams.
    - `calendar/{day}`: the day's start and lock times, written by the jobs.
    - `roster/{player}`: approved goals and Rule One count.
    - `days/{player_day}`: goals hit, screen minutes, beers, Full Boost.
    - `kit/{week_player_item}`: Aerial and Full Boost uses, plus each player's rest day.
    - `weeks/{week}`: mode, pairs or teams, status, results, bonuses, MVP, Bust, Wheel draw.
    - `receipts`, `proofs`, `votes`, `draft` and `predictions`.
- `devices/{device}`: push token and alert settings, readable only by that device.

**Security rules**

- A device reads league data only while its claim's key matches the player's current key.
- You write only your own day, and only between its start and its lock, by the server's clock.
- Aerial and Demolition must be set before the target day starts; fixed document IDs allow one of each per week, and a rest day moves only while both days are still ahead.
- Sealed items stay private until the jobs reveal them, so nobody can peek, the commish included.
- Results, badges, ranks and system feed events come only from the jobs, or from commish overrides that land in the audit log.
- Every field is checked: beers 0 to 30, screen time 0 to 1,440 minutes in 15-minute steps, lanes from the allowed list.

**Identity and recovery keys**

1. Each device signs in anonymously and gets a hidden ID.
2. Joining writes a claim: that device's ID, the player and the player's current key.
3. Rules accept the device only while its claim's key equals the player's current key.
4. Recovering on a new device writes a new claim with the key, then the app rotates the key. Every other device's claim stops matching, which signs it out.

**Time and deadlines**

- The jobs write a calendar entry for each day with its start and lock times in the league time zone, daylight saving included.
- Rules compare those times with the server's clock, so a phone's clock can't cheat.

**Scheduled jobs (GitHub Actions)**

| Job | When | What it does |
| --- | --- | --- |
| tick | Every 10 minutes, off the top of the hour | Reveals at day lock, batched pushes, receipt deadlines, timed reminders |
| daily | Just after midnight, league time | Calendar, Rumble items, streaks, badges |
| weekly | Monday 12:05 pm and Tuesday 12:05 am | Provisional, then final results; recap, MVP, Bust, storylines, ranks, Wheel draw |
| backup | 3:15 am | Full snapshot to the private repo |
| keepalive | Monthly | A small commit so GitHub keeps the schedules running |

- GitHub runs schedules at most every 5 minutes, may delay or drop runs when busy, and pauses idle public repos' schedules after 60 days ([GitHub schedule docs](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)).
- So nothing in scoring depends on a job running on the minute: rules lock the data by server time, and the jobs only publish it.
- If a job runs late, the commish can settle the week from the app.

**Push notifications**

- Cloud Messaging sends web push to Safari, including iPhone Home Screen apps; the app must be on the Home Screen, and permission follows a tap ([Firebase blog](https://firebase.blog/posts/2023/08/fcm-for-safari)).
- Each device's push token refreshes on every open, so a lapsed token gets replaced.

**Backups and restore**

- Every night the backup job writes the whole league as JSON and commits it to the private repo, so any past day can be restored.
- A Restore job rebuilds the league from a chosen date, and Phase 1 tests a full round trip.

**Photos and videos**

- Cloud Storage for Firebase now requires the pay-as-you-go plan, though no-cost usage still applies there ([Firebase](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)).
- So proof photos are shrunk on the phone to about 300 KB and saved inside the database, which the free plan covers; they delete after 14 days.
- Dare videos need that storage: in Phase 3, either switch to pay-as-you-go with a budget alert, or keep videos in the group chat.

**Free-plan limits**

- Firestore's free plan allows 50,000 reads, 20,000 writes and 20,000 deletes a day, plus 1 GiB stored ([Firebase pricing](https://firebase.google.com/pricing/?hl=en)).
- My estimate for 12 players is under a fifth of that, because the feed loads in pages and weekly totals are computed once.

**Performance, accessibility and privacy**

- Loads in under 2 seconds on 4G, with animations at 60 frames a second on an iPhone 11-class phone.
- Effects are capped, and Reduce Motion is respected.
- Text meets contrast standards and works with VoiceOver.
- Display names only: no emails, phone numbers or real names.
- "Delete my data" removes your posts and anonymizes your history.

**Not possible as a web app**

- Reading Screen Time or Apple Health automatically, so screen time stays self-reported, backed by receipts.
- Vibration on iPhone, so feedback is visual and sound.

## Costs

Running the league should cost $0 a month.

**Running cost**

| Item | Cost | Why |
| --- | --- | --- |
| Firebase Spark plan: database, sign-in, push | $0 | No payment details needed ([Firebase plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)); Cloud Messaging is no-cost ([Firebase pricing](https://firebase.google.com/pricing/?hl=en)) |
| GitHub Pages hosting | $0 | Included for public repos on GitHub Free ([GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)) |
| GitHub Actions jobs | $0 | Free for standard runners in public repos ([GitHub billing](https://docs.github.com/en/actions/reference/usage-limits-billing-and-administration)); the private backup job uses a sliver of the 2,000 free minutes a month |
| Dare videos, optional | $0 expected | Needs Firebase's pay-as-you-go plan, with a card on file |
| Custom web address, optional | About $10 to $15 a year | Not needed |
| Apple developer account | Not needed | There is no App Store listing |

## Build plan and timeline

Phase 1 alone can run a real season, and Phase 3 lands in three drops just before each part is needed, so a January 4 kickoff holds.

**Proposed timeline (text version of the drawing in the doc)**

| Milestone | Dates |
| --- | --- |
| Accounts and setup | Nov 24 to Nov 29, 2026 |
| Phase 1: core | Nov 30 to Dec 13 |
| Phase 2: identity | Dec 14 to Dec 27 |
| Preseason, no stakes | Dec 14 to Jan 2 |
| Phase 3: draft room | Dec 28 to Jan 2 |
| Draft Day | Sun Jan 3, 2027 |
| Season 1 kickoff | Mon Jan 4, 2027 |
| Regular season, 6 weeks | Jan 4 to Feb 14 |
| Phase 3: group play | Jan 4 to Jan 17 |
| Phase 3: playoffs | Jan 18 to Feb 7 |
| Playoffs | Feb 15 to Feb 21 |

The dates are a proposal: the preseason doubles as Phase 1's live test, and Draft Day needs only the draft room.

**Phase 1: core, about 2 weeks**

- Intro animation, install flow, app icon and launch screen.
- Join, recovery keys and commish season setup.
- Mini draft: goal approval, rival pick and dare pick.
- The four squares, beers, rest days, the logging window, and receipts with auto-voiding.
- Scoring engine, 1v1 schedule, The House and Season Points.
- Weekly kit and Rule One.
- Live feed, wall, quick chat, custom taunts, brags and reactions.
- Wheel of Shame: sealed draw, live spin, photo proof and votes.
- Core push alerts, plus weekly settlement, recap, MVP and Bust.
- Commish tools, nightly backup and restore.

**Phase 2: identity, 1 to 2 weeks**

- Garage with 2.5D cars: 3 bodies, 15 paints and every part slot.
- All 51 achievements and their unlocks.
- Ranks, rank-up animations and the trophy case.
- Rivalry record, nemesis, win meter, poke and rematch.
- Highlight reel with sharing, predictions, storylines and the suggestion box.

**Phase 3: events, about 2 weeks in three drops**

1. Draft room, with the group-play vote and captains' draft: by Draft Day.
2. Group play, all six modes: before the first group-play week.
3. Playoffs, the Whiff Bowl, holiday events and the video decision: before the playoffs.

**Done means tested**

- Engine: a fixture test for every scoring rule and power-up interaction in this scope.
- Rules: emulator tests prove nobody can edit after noon, read a sealed Demolition, or write someone else's day.
- Devices: two real phones log, sync and get pushes, and a third recovers a profile with a key.
- Backups: a restore round trip matches the original data.

**The commish's setup, one sitting of about 45 minutes**

1. Create a free GitHub account and connect it to Claude Code.
2. Create a Firebase project on the free Spark plan and add a web app.
3. Turn on Firestore in production mode with a US location, Anonymous sign-in, and a Cloud Messaging web push key.
4. Create a service account key and paste it into the repo's GitHub Secrets when Claude Code asks; never commit it.
5. Turn on GitHub Pages for the app repo.

Claude Code then writes the code, rules, jobs and tests, and deploys every change.

**Launch checklist**

- [ ] Everyone installs from the link and allows notifications.
- [ ] Everyone saves their recovery key.
- [ ] Commish settings and group-play weeks are set.
- [ ] Starter dares are loaded.
- [ ] A preseason week runs with no stakes.
- [ ] A backup restore is tested.
- [ ] Draft Day is scheduled and announced.

## Open items, glossary and sources

Four choices are still open, and none of them blocks Phase 1.

**Open items**

- [ ] Icon: pick from 2 or 3 drawn options in Phase 1.
- [ ] Dare videos: pay-as-you-go storage or the group chat, decided in Phase 3.
- [ ] Rumble balance: tune item odds after the first Rumble week.
- [ ] Badge list: adjust after Season 1, using the suggestion box.

**Future ideas**

- A full 3D garage as an offseason upgrade.
- More holiday events and group-play modes from the suggestion box.
- A custom web address.

**Glossary**

| Term | Meaning |
| --- | --- |
| Aerial | Doubles your points for one chosen day |
| Alley | Whole-league, single-file race mode |
| Bust | The biggest drop below your own average that week |
| Demolition | A hidden −2 on an opponent's goal, if they miss it |
| Dock | A point removed by the commish, with a reason |
| Drop Shot | 1v1 mode scored by floor tiles broken |
| Full Boost | Turns one missed goal into a hit |
| Kit | Your weekly Aerial, Demolition and Full Boost |
| Lane | Mind, Body or Wildcard, one goal each |
| No-show | A day with nothing logged, scored −5, or −3 on a rest day |
| Par | The screen time setting: under 1 hour earns +par, and each full hour costs 1 |
| Perfect day | All 3 goals, screen time scored 0 or better, and 0 beers |
| Receipts | Proof that another player requests |
| Rest day | Your one goals-off day a week, Sunday unless you move it |
| Rule One | A grace day that scores 0 no matter what |
| Rumble | 1v1 mode with a random item each day |
| Season Points | All your points plus bonuses; the standings |
| The House | The bye opponent, scoring the league average |
| Whiff Bowl | The consolation bracket for non-playoff players |

**Sources**

- [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Firebase pricing](https://firebase.google.com/pricing/?hl=en)
- [Cloud Storage for Firebase plan changes](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- [Firebase Cloud Messaging for Safari](https://firebase.blog/posts/2023/08/fcm-for-safari)
- [Web Push for iOS Home Screen web apps, WebKit](https://webkit.org/?p=13878)
- [GitHub Actions billing](https://docs.github.com/en/actions/reference/usage-limits-billing-and-administration)
- [Events that trigger workflows: schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
