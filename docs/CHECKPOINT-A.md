# Checkpoint A: the scoring engine

Generated 2026-11-28 by `npm run checkpoint:a`. Do not edit by hand: the rule list comes from the test results and the worked weeks are run through the engine.

- **Tests:** 423 of 423 passing.
- **Rulings and calls behind these rules:** `docs/DECISIONS.md`.

## Worked example weeks

### Example 1: a tie on points, settled by beers

Week 1, par 3. A perfect day, an Aerial, a Full Boost blocking a Demolition, a Demolition that lands, a moved rest day, and the fewer-beers tiebreak.

**Alex**

| Day | Logged | Working | Points |
| --- | --- | --- | --- |
| Mon | Mind ✓, Body ✓, Wildcard ✓, screen 0:45, 0 beers | 3 goals +3, screen 0:45 +3 = 6. *Perfect day.* | 6 |
| Tue | Mind ✓, Body ✗, Wildcard ✓, screen 2:30, 1 beer | 2 goals +2, screen 2:30 +1, 1 beer −1 = 2. | 2 |
| Wed | Mind ✓, Body ✓, Wildcard ✓, screen 1:15, 0 beers | 3 goals +3, screen 1:15 +2 = 5, Aerial ×2 = 10. *Aerial, set Tuesday night: the day doubles.* | 10 |
| Thu | Mind ✓ (Full Boost), Body ✓, Wildcard ✗, screen 3:30, 2 beers | 2 goals +2, screen 3:30 +0, 2 beers −2 = 0. *Full Boost on Mind. Maya's hidden Demolition was on Mind too, so it is blocked.* | 0 |
| Fri | Mind ✓, Body ✓, Wildcard ✗, screen 4:15, 3 beers | 2 goals +2, screen 4:15 −1, 3 beers −3 = −2. | −2 |
| Sat | Mind ✗, Body ✓, Wildcard ✓, screen 2:00, 4 beers | 2 goals +2, screen 2:00 +1, 4 beers −4 = −1. | −1 |
| Sun (rest) | goals off, screen 1:30, 1 beer | screen 1:30 +2, 1 beer −1 = 1. *Rest day (Sunday, the default): goals are off.* | 1 |

**Maya**

| Day | Logged | Working | Points |
| --- | --- | --- | --- |
| Mon | Mind ✓, Body ✓, Wildcard ✗, screen 1:45, 0 beers | 2 goals +2, screen 1:45 +2 = 4. | 4 |
| Tue | Mind ✓, Body ✓, Wildcard ✓, screen 0:30, 0 beers | 3 goals +3, screen 0:30 +3 = 6. *Perfect day.* | 6 |
| Wed (rest) | goals off, screen 3:15, 0 beers | screen 3:15 +0 = 0. *Rest day, moved from Sunday to Wednesday on Monday.* | 0 |
| Thu | Mind ✓, Body ✗, Wildcard ✓, screen 2:15, 0 beers | 2 goals +2, screen 2:15 +1 = 3. | 3 |
| Fri | Mind ✗, Body ✓, Wildcard ✓, screen 1:00, 2 beers | 2 goals +2, screen 1:00 +2, 2 beers −2 = 2, Demolition −2 = 0. *Alex's Demolition on Mind lands: she missed it and had no Full Boost on it.* | 0 |
| Sat | Mind ✓, Body ✓, Wildcard ✓, screen 5:30, 1 beer | 3 goals +3, screen 5:30 −2, 1 beer −1 = 0. | 0 |
| Sun | Mind ✓, Body ✓, Wildcard ✗, screen 2:45, 0 beers | 2 goals +2, screen 2:45 +1 = 3. *Sunday is a normal goal day for her this week.* | 3 |

**Result**

- Alex 16 (11 beers) against Maya 16 (3 beers). Level on points, so Maya wins on fewer beers (3 against 11).
  - Alex: 16 points +0 bonus = 16 Season Points.
  - Maya: 16 points +5 bonus = 21 Season Points.
- MVP: Maya. Bust: Alex. Wheel: Alex and Maya.

### Example 2: a rough week against The House

Week 2, par 3. A no-show, a failed receipt, Rule One with a penalty that survives it, an Aerial on a bad day, a blank rest day, and The House scoring the league average.

**Riley** (earlier weeks: 11)

| Day | Logged | Working | Points |
| --- | --- | --- | --- |
| Mon | Mind ✓, Body ✓, Wildcard ✓, screen 0:45, 0 beers | 3 goals +3, screen 0:45 +3 = 6. *Perfect day.* | 6 |
| Tue | Mind ✗, Body ✗, Wildcard ✗, screen 0:30, 6 beers | Rule One: the play scores 0, penalty −1 still counts = −1. *Jordan asked for receipts on screen time at 4 pm. No proof by 11:59 pm, so the square is voided and Riley loses 1. Riley declares Rule One the next morning: the play is 0, but the lost point stays.* | −1 |
| Wed | Mind ✓, Body ✗, Wildcard ✓, screen 2:00, 1 beer | 2 goals +2, screen 2:00 +1, 1 beer −1 = 2. | 2 |
| Thu | Mind ✗, Body ✓, Wildcard ✗, screen 4:30, 2 beers | 1 goal +1, screen 4:30 −1, 2 beers −2 = −2, Aerial ×2 = −4. *Aerial, set Wednesday: a bad day doubles too.* | −4 |
| Fri | nothing | No-show −5. *No-show: nothing logged.* | −5 |
| Sat | Mind ✓, Body ✓, Wildcard ✗, screen 1:30, 0 beers | 2 goals +2, screen 1:30 +2 = 4. | 4 |
| Sun (rest) | nothing | Nothing logged on a rest day −3. *Rest day left blank: counts as screen time not logged.* | −3 |

**Alex** (earlier weeks: 16)

| Day | Logged | Working | Points |
| --- | --- | --- | --- |
| Mon | Mind ✓, Body ✓, Wildcard ✓, screen 1:30, 0 beers | 3 goals +3, screen 1:30 +2 = 5. *Perfect day.* | 5 |
| Tue | Mind ✓, Body ✓, Wildcard ✗, screen 2:15, 0 beers | 2 goals +2, screen 2:15 +1 = 3. | 3 |
| Wed | Mind ✓, Body ✓, Wildcard ✓, screen 2:30, 0 beers | 3 goals +3, screen 2:30 +1 = 4. *Perfect day.* | 4 |
| Thu | Mind ✓, Body ✗, Wildcard ✗, screen 2:00, 0 beers | 1 goal +1, screen 2:00 +1 = 2. | 2 |
| Fri | Mind ✓, Body ✓, Wildcard ✗, screen 2:45, 0 beers | 2 goals +2, screen 2:45 +1 = 3. | 3 |
| Sat | Mind ✓, Body ✗, Wildcard ✗, screen 3:15, 2 beers | 1 goal +1, screen 3:15 +0, 2 beers −2 = −1. | −1 |
| Sun (rest) | goals off, screen 1:00, 0 beers | screen 1:00 +2 = 2. *Rest day.* | 2 |

**Jordan** (earlier weeks: 14)

| Day | Logged | Working | Points |
| --- | --- | --- | --- |
| Mon | Mind ✓, Body ✗, Wildcard ✓, screen 2:00, 0 beers | 2 goals +2, screen 2:00 +1 = 3. | 3 |
| Tue | Mind ✓, Body ✓, Wildcard ✓, screen 3:30, 1 beer | 3 goals +3, screen 3:30 +0, 1 beer −1 = 2. | 2 |
| Wed | Mind ✗, Body ✓, Wildcard ✓, screen 1:15, 0 beers | 2 goals +2, screen 1:15 +2 = 4. | 4 |
| Thu | Mind ✓, Body ✓, Wildcard ✗, screen 4:00, 0 beers | 2 goals +2, screen 4:00 −1 = 1. | 1 |
| Fri | Mind ✗, Body ✗, Wildcard ✓, screen 2:30, 3 beers | 1 goal +1, screen 2:30 +1, 3 beers −3 = −1. | −1 |
| Sat | Mind ✓, Body ✓, Wildcard ✓, screen 1:45, 2 beers | 3 goals +3, screen 1:45 +2, 2 beers −2 = 3. | 3 |
| Sun (rest) | goals off, screen 2:15, 0 beers | screen 2:15 +1 = 1. *Rest day.* | 1 |

**Result**

- Alex 18 (2 beers) against Jordan 13 (6 beers). Alex wins on points.
  - Alex: 18 points +5 bonus = 23 Season Points.
  - Jordan: 13 points +0 bonus = 13 Season Points.
- Riley −1 (9 beers) against The House 15.5 (4 beers). The House wins on points.
  - Riley: −1 points +0 bonus = −1 Season Points.
- MVP: Alex. Bust: Riley. Wheel: Riley.

### Example 3: a draw, and the Bust goes to the biggest drop

Week 5, par 3. A draw worth +2 each, a Demolition that misses, one that fizzles on a moved rest day, a commish void and dock for fake proof, and MVP, Bust and Wheel in Week 5.

**Alex** (earlier weeks: 16, 18, 14, 17)

| Day | Logged | Working | Points |
| --- | --- | --- | --- |
| Mon | Mind ✓, Body ✓, Wildcard ✗, screen 1:30, 0 beers | 2 goals +2, screen 1:30 +2 = 4. | 4 |
| Tue | Mind ✓, Body ✓, Wildcard ✓, screen 2:15, 1 beer | 3 goals +3, screen 2:15 +1, 1 beer −1 = 3. | 3 |
| Wed | Mind ✗, Body ✓, Wildcard ✓, screen 3:00, 0 beers | 2 goals +2, screen 3:00 +0 = 2. *Sam's Demolition on Body misses: Alex hit it.* | 2 |
| Thu | Mind ✓, Body ✓, Wildcard ✓, screen 0:45, 0 beers | 3 goals +3, screen 0:45 +3 = 6. *Perfect day.* | 6 |
| Fri | Mind ✓, Body ✗, Wildcard ✓, screen 2:00, 2 beers | 2 goals +2, screen 2:00 +1, 2 beers −2 = 1. | 1 |
| Sat | Mind ✗, Body ✗, Wildcard ✓, screen 4:15, 3 beers | 1 goal +1, screen 4:15 −1, 3 beers −3 = −3. | −3 |
| Sun (rest) | goals off, screen 1:15, 0 beers | screen 1:15 +2 = 2. *Rest day.* | 2 |

**Sam** (earlier weeks: 10, 12, 14, 16)

| Day | Logged | Working | Points |
| --- | --- | --- | --- |
| Mon | Mind ✓, Body ✓, Wildcard ✓, screen 1:00, 0 beers | 3 goals +3, screen 1:00 +2 = 5. *Perfect day.* | 5 |
| Tue | Mind ✗, Body ✓, Wildcard ✓, screen 2:30, 0 beers | 2 goals +2, screen 2:30 +1 = 3. | 3 |
| Wed | Mind ✓, Body ✓, Wildcard ✗, screen 3:45, 2 beers | 2 goals +2, screen 3:45 +0, 2 beers −2 = 0. | 0 |
| Thu (rest) | goals off, screen 1:30, 0 beers | screen 1:30 +2 = 2. *Rest day, moved here on Tuesday. Alex's Demolition, set on Monday, fizzles.* | 2 |
| Fri | Mind ✓, Body ✓, Wildcard ✓, screen 2:00, 4 beers | 3 goals +3, screen 2:00 +1, 4 beers −4 = 0. | 0 |
| Sat | Mind ✓, Body voided, Wildcard ✓, screen 1:45, 0 beers | 2 goals +2, screen 1:45 +2 = 4, penalty −1 = 3. *The gym photo was fake: the commish voids Body and docks 1.* | 3 |
| Sun | Mind ✓, Body ✗, Wildcard ✗, screen 2:15, 0 beers | 1 goal +1, screen 2:15 +1 = 2. *Sunday is a normal goal day for him this week.* | 2 |

**Maya** (earlier weeks: 16, 20, 22, 19)

| Day | Logged | Working | Points |
| --- | --- | --- | --- |
| Mon | Mind ✓, Body ✓, Wildcard ✓, screen 0:45, 0 beers | 3 goals +3, screen 0:45 +3 = 6. *Perfect day.* | 6 |
| Tue | Mind ✓, Body ✓, Wildcard ✗, screen 1:30, 0 beers | 2 goals +2, screen 1:30 +2 = 4. | 4 |
| Wed | Mind ✓, Body ✓, Wildcard ✓, screen 2:00, 0 beers | 3 goals +3, screen 2:00 +1 = 4. *Perfect day.* | 4 |
| Thu | Mind ✗, Body ✓, Wildcard ✓, screen 1:15, 0 beers | 2 goals +2, screen 1:15 +2 = 4. | 4 |
| Fri | Mind ✓, Body ✗, Wildcard ✓, screen 3:00, 0 beers | 2 goals +2, screen 3:00 +0 = 2. | 2 |
| Sat | Mind ✓, Body ✗, Wildcard ✗, screen 3:15, 1 beer | 1 goal +1, screen 3:15 +0, 1 beer −1 = 0. | 0 |
| Sun (rest) | goals off, screen 2:30, 0 beers | screen 2:30 +1 = 1. *Rest day.* | 1 |

**Jordan** (earlier weeks: 14, 16, 15, 19)

| Day | Logged | Working | Points |
| --- | --- | --- | --- |
| Mon | Mind ✓, Body ✗, Wildcard ✗, screen 2:00, 0 beers | 1 goal +1, screen 2:00 +1 = 2. | 2 |
| Tue | nothing | No-show −5. *No-show.* | −5 |
| Wed | Mind ✓, Body ✓, Wildcard ✓, screen 1:00, 0 beers | 3 goals +3, screen 1:00 +2 = 5. *Perfect day.* | 5 |
| Thu | Mind ✗, Body ✓, Wildcard ✓, screen 2:30, 1 beer | 2 goals +2, screen 2:30 +1, 1 beer −1 = 2. | 2 |
| Fri | Mind ✓, Body ✓, Wildcard ✗, screen 3:30, 2 beers | 2 goals +2, screen 3:30 +0, 2 beers −2 = 0. | 0 |
| Sat | Mind ✓, Body ✓, Wildcard ✓, screen 1:30, 3 beers | 3 goals +3, screen 1:30 +2, 3 beers −3 = 2. | 2 |
| Sun (rest) | goals off, screen 0:30, 0 beers | screen 0:30 +3 = 3. *Rest day.* | 3 |

**Result**

- Alex 15 (6 beers) against Sam 15 (6 beers). Draw: level on points and on beers.
  - Alex: 15 points +2 bonus = 17 Season Points.
  - Sam: 15 points +2 bonus = 17 Season Points.
- Maya 21 (1 beer) against Jordan 9 (6 beers). Maya wins on points.
  - Maya: 21 points +5 bonus = 26 Season Points.
  - Jordan: 9 points +0 bonus = 9 Season Points.
- MVP: Maya. Bust: Jordan (7 below their average). Wheel: Jordan.

## Every rule the tests prove

### 1. Daily points

- Each goal hit is worth +1
- Screen time scores par minus one point for each full hour (the par 3 scale)
- Par can be set from 1 to 6, and it shifts the whole scale
- Each beer costs 1 point
- Screen time not logged costs 3 in place of the scale, at any par
- Nothing logged all day is a no-show worth -5
- Logging anything is showing up: one beer and nothing else is -4, not -5
- The best normal day at par 3 is +6
- Entries outside the allowed ranges are invalid: beers 0 to 30, screen time 0 to 1,440 minutes in 15-minute steps, par 1 to 6

### 2. Rest day

- Goals take the day off and score 0, even if they are tapped
- Screen time and beers still count, so the best rest day is +3 at par 3
- Logging nothing on a rest day counts as screen time not logged: -3, not a -5 no-show
- Full Boost has nothing to fix on a rest day
- Aerial on a rest day doubles only screen time and beers
- Rule One still works on a rest day

### 2. Rest day: moving it

- The rest day is Sunday unless you move it
- It can move to another day of the same week while both days are still ahead
- It can't move onto a day that has already started
- It can't move once the rest day itself has started, so it can't rescue a bad day
- There is no limit on how many times it moves, while both days are still ahead
- It stays inside its own week
- Next week's rest day can be set early, including onto next Monday
- Only this week and next week can be set, nothing further ahead
- Week 1's rest day can be set any time before kickoff
- There are no rest days outside the regular season

### 3. Order of operations

- Rule One makes the day score 0 no matter what happened
- Rule One cancels an Aerial and a Demolition played on that day
- Penalties survive Rule One: a failed receipt and a commish dock still cost their points
- On a no-show every goal counts as missed, so a Demolition lands: -5 and -2
- Aerial doubles the base, negatives too
- Demolition comes after Aerial and is never doubled
- Docks come last and are never doubled
- A commish correction can add points back, also after the doubling
- Everything at once: an Aerial no-show (-10), a Demolition (-2) and a dock (-1) make -13

### 4. Weekly kit: Demolition

- Landed: the targeted goal was missed, so they lose 2
- Missed: the targeted goal was hit, so nothing happens
- Blocked: Full Boost on the targeted goal
- A Full Boost on a different goal does not block it
- Fizzled: the target moved their rest day onto that day
- It only ever costs the 2 points: screen time and beers are untouched
- Two Demolitions on one day each cost 2 when both land (Team Week and 2v2)

### 4. Weekly kit: Full Boost

- One goal you missed that day counts as hit
- It fixes one goal only
- On a goal you hit anyway it changes nothing
- In the playoffs the #1 seed's extra Full Boost counts too, even on the same day as the first
- Using it counts as showing up, so the day is not a no-show

### 4. Weekly kit: timing

- Aerial must be set before the target day starts
- Aerial can be cancelled until the target day starts, and not after
- Demolition must be set before the target day starts
- Demolition can't be aimed at the opponent's rest day
- Demolition needs a real opponent: nothing to aim at in a bye week against The House
- Kits refill Monday at 12:00 am, so Monday can never be an Aerial or Demolition day
- Tuesday is the first day either one can hit, set on Monday
- Full Boost can be used from the start of the day until 12:00 pm the next day
- Sunday's Full Boost can still be used on Monday morning, until Sunday locks at noon
- Full Boost has nothing to fix on a rest day
- The kit works on regular-season days only (playoff kits arrive with the playoffs build)

### 5. Rule One

- A season gets one Rule One per 4 weeks, rounded up
- They are issued at the start of Weeks 1, 5 and 9, as far as the season runs
- You hold nothing before kickoff, 1 from Week 1 and 2 from Week 5 in a 6-week season
- Unused Rule Ones carry to the end of the season
- Declare it by 12:00 pm the next day
- It can't be declared before the day starts
- You can't declare one you don't hold
- The Rule One that arrives at the start of Week 5 can cover Week 4's Sunday until Monday noon
- Rule One works in the regular season only

### 6. Receipts: asking for them

- Anyone can ask for receipts on a square someone else logged
- A request is allowed until that day locks at noon the next day
- With the day's own start and lock from its calendar, as in the fast test league, those times decide instead
- Each player gets 3 requests a week
- Only a claim can be challenged: a goal marked hit, or logged screen time
- On a rest day, receipts cover screen time only
- One request per square per day is enough: a second one is refused
- You can't ask yourself for receipts

### 6. Receipts: how a request ends

- Proof uploaded before the deadline settles it
- Until the deadline, a request with no answer is still pending and costs nothing
- No proof by the deadline: the square is voided and the player loses 1 more point
- Backing down before the deadline is free: the square stops counting and no point is lost
- Proof or a back-down that arrives after the deadline is too late
- A player's receipts become fixes to their days, the same shape as the commish's: free when backed down, 1 point when failed, nothing while open or proven

### 6. Receipts: the proof deadline

- Proof is due by 11:59 pm the day of the request
- A request at 6 pm or later gets until 11:59 pm the next day
- Every receipt window for a week has closed by the time results go final on Tuesday 12:00 am

### 6. Receipts: what a voided square does to the day

- A voided goal counts as missed
- Voided screen time counts as not logged: -3
- A failed receipt voids the square and costs 1 more point
- Lying does not pay: a false "under 1 hour" ends lower than honestly logging 5 hours
- Backing down is free: the square stops counting, with no extra point lost
- A voided goal counts as missed for a Demolition too, so it lands
- A Full Boost can still cover a voided goal, but the lost point stays lost

### 7. Matchups and Season Points

- A week's points are the sum of its seven days
- Beers logged on a Rule One day still count toward the beers tiebreak
- Most points wins the 1v1
- A tie on points goes to the player with fewer beers
- Still tied after beers is a draw
- Season Points are your own points plus 5 for a win, 2 for a draw and 0 for a loss
- Your own points always count: a losing week adds them, and a negative week subtracts
- The House scores that week's league average, without the bye player
- The House average is never rounded
- Beating The House earns the +5, like any other 1v1
- Level with The House on points, fewer beers than the league average wins, and the same is a draw
- With an even count nobody plays The House

### 8. Schedule

- Week 1 is exactly the rival picks from the draft
- Everyone plays exactly once every week, for 2 to 12 players
- Everyone meets everyone else once before any repeat
- After a full round-robin the cycle starts over from the Week 1 matchups
- Two players face each other every week
- With an odd count, the last player picked faces The House in Week 1
- With an odd count, one player a week faces The House, and everyone gets that bye once per cycle
- Group-play weeks are reserved: Team Week, 2v2, Bounty Week and Alley pause the round-robin
- Rumble and Drop Shot are 1v1 modes, so they use the next round-robin pairing
- Week 1 can never be a group-play week
- Rival picks that leave someone out, use someone twice or misuse The House are refused

### 9. Standings

- Standings rank by Season Points, most first
- Tied on Season Points: head-to-head decides first
- Head-to-head counts every meeting between the tied players
- Head-to-head level or never played: fewer beers decides
- Still tied: more perfect days decides
- Still tied: the sealed coin flip decides
- A game against a player outside the tie never counts as head-to-head
- A three-way tie uses the results among the three
- When a tiebreaker separates some of a group, whoever is still level starts again from head-to-head
- Ranks always run 1, 2, 3 with no shared places

### 10. Weekly awards

- MVP is the most points that week
- An MVP tie goes to fewer beers
- Level on points and beers, the MVP is shared
- In Weeks 1 and 2 the Bust is the lowest score
- From Week 3 the Bust is the biggest drop below your own average
- The Bust is not always the lowest score: a strong player having an off week can take it
- The average covers your last 4 weeks only
- Until 4 weeks exist, the average uses the weeks you have
- If nobody dropped below their own average, there is no Bust that week
- Equal drops share the Bust, even when the averages are awkward fractions
- A Bust tie goes to more beers, the mirror of the MVP tiebreak
- The Wheel spinner is the lowest points that week
- Players tied for the lowest points all spin

### 11. Check-in streaks

- A check-in streak counts days in a row with something logged
- A no-show breaks the streak
- A rest day never breaks a streak: left blank, it is simply skipped
- Logging on a rest day adds to the streak
- A no-show covered by Rule One does not break the streak
- A streak carries over from earlier weeks

### 11. Perfect days

- A perfect day is all 3 goals hit, screen time scored 0 or better, and 0 beers
- Screen time scored below 0 is not perfect
- Screen time not logged is not perfect
- One beer breaks it
- One missed goal breaks it
- A goal covered by Full Boost counts as hit, so the day can still be perfect
- A voided square breaks it
- A rest day is never a perfect day
- A Rule One day is never a perfect day

### 11. Perfect-day streaks

- Perfect days in a row count up, and rest days are skipped
- Any other day that is not perfect ends the run

### 12. Calendar

- A day starts at 12:00 am league time
- A day locks at 12:00 pm the next day
- An instant belongs to the league day it falls in, whatever the phone says
- Weeks run Monday to Sunday, counted from the kickoff Monday
- A kickoff that is not a Monday is refused
- The week starts and kits refill on Monday at 12:00 am
- Results are provisional at 12:00 pm on the Monday after, when Sunday locks
- Results are final at 12:00 am on the Tuesday after
- Spring forward: the day is 23 hours long, and it still starts at midnight and locks at noon
- Fall back: the day is 25 hours long, and it still starts at midnight and locks at noon
- A time the clocks skip lands just past the jump, and a time that happens twice means the first one
- The league time zone can be any zone, and each league keeps its own clock
- Every day of 2027 and 2028 starts on its own date, right after the previous one ends, in 12 very different zones
- Date arithmetic crosses months, years and leap days correctly
- A normal league day is exactly 24 hours from start to start

### A league's clock

- A real league goes by its time zone: 9 pm on a date, and the date and hour at any moment
- Across a daylight saving change, 9 pm is still 9 pm on the wall
- The fast test league's hours are slices of its short days

### A player's week, day by day

- Days that have not started have no score yet; open days score live; locked days are final
- Each logged day scores as the engine scores it, and the week adds them up with the beers
- Aerial, Full Boost, Rule One and a moved rest day count on their own days
- The #1 seed's extra Full Boost in the semifinal is its own play, and counts on its day
- A Demolition counts only once its day has locked
- Commish docks and voids land on their day
- Marks today
- Marks the day it is told is today, as the fast test league tells it

### A Rumble week

- Each day plays both players' items against each other
- A Boot counts once its day locks: until then nobody's score shows it
- The week settles as a 1v1 with the items played, and the player facing The House plays no items

### A season's dares, before the next season starts

- A dare still waiting for its spin, its proof or its vote is open; one counted or dodged is settled
- A dare voted down is open until its new spin is settled; the old one doesn't count again

### A spin nobody taps (ruling R15)

- The Wheel spins itself at midnight when its deadline's Sunday starts; proof is still due by the end of that Sunday

### A week's odds

- A week's odds come from each player's final weeks before the one just played, since that one is final only on the Tuesday
- They are the win meter at kickoff: nothing scored yet, a whole week left, each side's recent daily average
- With nothing final to go on, a week is even

### Alert settings

- Every category is on to start with, and quiet hours run from 11 pm to 8 am
- Quiet hours can run past midnight: 11 pm to 8 am holds alerts from 11:00 pm until 8:00 am
- Quiet hours inside one day work too, and the same start and end means none

### Badges: beers

- Dry Week: 0 beers in a week, with every day logged; Dry Month: 4 such weeks running
- Designated Driver: 0 beers on the Friday and Saturday of one weekend
- Happy Hour (shame): 10 or more beers in one week; Brewmaster (shame): most beers in a finished season

### Badges: group play

- Rumble Royale: the most points in the league in a Rumble week, every tied player
- Team Player and Dynamic Duo: on the winning side of a Team Week or a 2v2
- Bounty Hunter: the top contributor to a count target, hit or missed; a day target has no top contributor
- Floor Breaker: the most tiles broken in a Drop Shot week, at least one; Alley Cat: 1st in the Alley
- A week's group-play feats earn their badges

### Badges: lanes and screen time

- Scholar, Gym Rat and Wild One: that lane hit on all 6 goal days of a week
- Triple Threat: every lane hit on at least 5 days, 3 weeks running
- Ghost: under an hour for 7 straight days; Touch Grass: under 30 minutes in a day; Monk Mode: 0 minutes
- Recovering Addict: the weekly average down 3 weeks in a row

### Badges: matchups

- First Blood: the first 1v1 win; a win over The House is not a 1v1
- Win Streak: 4 1v1 wins in a row; a week against The House neither counts nor breaks it
- Sweep: every 1v1 week of a finished season won
- Comeback, Blowout, Photo Finish and Giant Killer go with a win
- Rivalry King: 5 all-time wins over the same player

### Badges: power-ups, social and career

- Demolisher: 3 landed; Untouchable: one blocked with Full Boost; Air Mail: an Aerial day of +10
- Clutch: won a week in which you used Rule One
- Trash Talker: 50 taunts; Show-Off: 10 brags with 3 reactions each; Fan Favorite: 100 reactions
- Founding Member, Veteran, MVP Magnet, Bust Collector, Wheel Survivor, Grand Champ and Commish
- Finalist: reached a final; Champion: won the season, which a finalist who wins earns too
- Badges from features still to come are never earned yet

### Badges: streaks

- Hat Trick: 3 perfect days in a row, with a rest day in between skipped
- Perfect Week: a perfect day on all 6 goal days of a week
- Iron Streak and Century: 30 and 100 days of check-ins, with skipped days neither growing nor breaking it
- Early Bird: logged before 9 am, 7 days straight
- Clean Sheet: a week with no no-shows, and screen time logged every day

### Dares done on video

- A dare that says "video" is done on video: the video goes in the group chat, and a still from it is the proof the league votes on

### Dares for the Wheel

- The league starts with SCOPE.md's 8 starter dares
- A dare is up to 80 characters, and a goal up to 60

### Document IDs: one fixed ID per thing, so the rules can allow exactly one

- A player's day has one document
- A regular-season week is a period tagged w01, w02 and so on
- Each kit item has one document per player per period, so a playoff round can have its own
- A player's rest day has one document per week
- Each Rule One has its own numbered document, so a season can never hold more than it issued
- A square can be asked for receipts once

### Group play and the standings

- Team Week, 2v2, Bounty and Alley aren't head-to-head games: a tie in Season Points skips to the next tiebreak
- Bounty and Alley weeks count toward nobody’s wins, draws or losses
- Everyone in the week: the 1v1 pairs, the squads, the duos, or the whole roster

### Group play: 2v2

- The random draw pairs players off in the drawn order, and with an odd count the last three are a trio
- Duos are matched in order, and an odd duo out faces a House duo, never the trio
- Frenemies pairs each player with their Week 1 rival; whoever faced The House joins the last duo drawn as its third
- Players whose rival has left pair up with each other, in the drawn order
- Duos compare average points: the winners get 3 each on top of their own points
- The House duo scores the average of everyone outside the odd duo

### Group play: Alley

- Race points are your daily points, and a day with no goals hits the wall for 2 more, except your rest day
- 1st, 2nd and 3rd earn 5, 3 and 1, and Season Points still count real points, not race points
- Last place in the race spins the Wheel, even when someone else has fewer points
- A tie in the race goes to fewer beers; still level shares the place and its bonus
- A Rule One day never hits the wall

### Group play: Bounty Week

- A hits target counts every hit in its lane across the league, Full Boost included, and hitting it gives everyone 3
- When the target is hit, the Wheel is the usual one: the lowest points
- Missed: nobody gets the bonus, and the lowest contributor spins instead of the lowest points, every tied one
- A zero-beer day is broken by anyone who logs a beer that day, and whoever broke it spins
- A screen-time day is broken by anyone at or over the limit, or who logs no screen time that day
- Rule One changes points, not what was logged: a Rule One day can still break a Bounty
- The bar fills live, from what is logged so far
- Targets assume one rest day per player: 60 Body hits is the most 10 players can reach
- With no target set by the start of the week, the Bounty is 2 goals a day each, any lane, with one rest day
- A target reads as plain words: what, how many, and which day
- A target names a lane and a count, or a day of the week and, for screen time, a limit

### Group play: Drop Shot

- Each day the higher score lands hits on the other floor equal to the margin, up to 4
- Each of the 20 tiles takes 2 hits: cracked, then broken
- Most tiles broken wins, then most hits landed, then fewer beers; still level is a draw
- Winning more days beats one blowout: the winner gets 5, and both keep their own points
- Against The House, the House's day is everyone else's average, and a margin under a whole point lands nothing

### Group play: Team Week

- The squads compare average points per player, so a bigger squad has no edge
- Your own points always count: the losing squad keeps its points and gets no bonus
- Level on average points goes to the squad with fewer beers per player
- Still level is a draw, which adds no bonus (provisional, still open)
- Averages are compared exactly: 31 points across 3 players is level with 62 across 6

### Holiday events: Double Points Day

- Doubles the day's base, negatives too
- Stacks with an Aerial: the base counts four times
- Demolitions and docks are never doubled
- Rule One still makes the day 0

### Holiday events: Dry Day

- A logged day with 0 beers gets +2
- Any beer loses the +2, and a no-show never gets it
- The +2 is part of the base, so an Aerial doubles it, and a logged rest day gets it too

### Holiday events: Holiday Pass

- A no-show scores 0, not -5, and a blank rest day 0, not -3
- A logged day scores as usual
- Every goal still counts as missed on a no-show, so a Demolition lands, and docks still count
- A no-show on a Holiday Pass neither grows nor breaks a check-in streak

### Holiday events: on the calendar

- Only the three events count: anything else on a calendar day is no event
- A player's week scores each day with its calendar day's event

### Identity: recovery keys and league codes

- A recovery key looks like TCL-XXXX-XXXX
- Keys and codes never use the look-alike characters 0, O, 1 or I
- Every character is equally likely, so no key is easier to guess than another
- Anything that is not exactly a key is refused
- A typed key is tidied first: lower case, spaces and missing dashes are fine
- A key needs 8 random bytes, and fewer is refused
- A league code is 8 characters, shown as XXXX-XXXX
- A typed league code is tidied the same way

### Live scores before a day locks

- While a day is open, nothing logged shows 0 so far, not -5
- While a day is open, missing screen time shows 0 so far, not -3
- Once the day locks, the same entries take the full penalties
- A fully logged day shows the same score open or locked

### Predictions

- A pick is one of the two players in a matchup; picking both, or neither, is no pick, and matchups with The House are not picked
- A pick is right when the player picked won; a draw makes every pick on it wrong
- The best record is the most right picks; a tie goes to fewer picks made, and players still level share it
- Nobody is top picker without a single right pick
- The week's biggest upset is the win the fewest pickers saw coming: picked by under half of those who picked that matchup
- There is no upset when every winner had half or more of the picks, when a matchup was drawn, or when nobody picked
- The odds called a matchup when the favorite won; an even matchup, a draw or The House is not counted
- A season's record adds up its weeks

### Ranks

- The most a week can score is 39 at par 3: six goal days of +6 and a rest day of +3
- Rank is the average of the last 4 weeks, as a share of that most, in the tiers SCOPE.md lists
- Only the last 4 weeks count, and until 4 exist the average uses the weeks there are
- A player with no final week yet is unranked
- Rank history carries across seasons: each week counts as a share of the most its own season allowed
- A rank change is up or down; a first rank counts as up

### Receipt deadlines from the calendar

- Asked before 6 pm, proof is due at the end of that day; at 6 pm or later, the end of the next day
- In the playoffs, proof is due by 6 pm the day after, when the day has locked, whenever it was asked

### Rematch challenges

- After a final week you lost to a player, you can challenge them
- Not after a win or a draw, not against The House or a squad, and not before the week is final
- Most points in the race week wins the side race; level points means nobody wins

### Rival picks at the draft

- The first player still unpicked, in draft order, picks next
- A pick takes both players out of the running, and the rest keep their draft order
- You pick someone still unpicked, never yourself
- With one player left there is no pick to make: they face The House
- Each pick has a 2-minute clock
- A missed pick is made at random from the players still unpicked, with a random number the caller supplies
- Week 1 is the picks in draft order, with The House for the odd one out
- A finished draft's picks make a schedule whose Week 1 is exactly those picks

### Rivalry records

- A rivalry record counts every 1v1 week two players met, across seasons, from each side
- Weeks against The House don't count
- Team Week, 2v2, Bounty and Alley weeks make no record; Rumble and Drop Shot are 1v1s, so they do
- Season 10 comes after season 9, so the last meeting is the latest week

### Rumble items

- There are seven items, one drawn for each player each day
- Tornado: take 2 points from your opponent and add them to yours; two Tornadoes cancel out
- Punch: if your day beats theirs, they lose 3; a tie or a loss does nothing
- Boot: the goal picked scores 0 that day, and their day is no longer perfect
- Spike: on your perfect day, they lose 1
- Swap: if you missed a goal and they hit one, your first miss becomes a hit and their first hit a miss
- Freeze: their screen time points count double, good or bad
- Magnet: your beers count against them instead of you; your beers still count for tiebreaks
- Boot, Spike and Swap do nothing on a day the player they touch is resting
- Rule One by either player cancels both items that day
- A no-show stays a flat −5: goal and screen items cannot change it, but points can still be taken
- Items go in order: goals first, then screen time and beers, then points, so Punch sees what Magnet did
- Docks still come last, and never count toward whose day beats whose

### Season storylines

- A win streak of 3 or more that ends is news: "Alex's 4-game win streak snapped by Maya"
- So is a streak that reaches 3, and every win after
- Beating the player with the most Season Points going in is news; with a tie at the top, nobody leads
- A first win after two or more losses is news
- So are a blowout of 20 or more, and a win by a single point
- A recap carries at most 3 headlines, the biggest news first, and weeks against The House make none
- Team Week, 2v2, Bounty and Alley weeks make no headlines, and neither count toward nor break a streak

### Stickers

- A sticker shows until the time it comes off, a week after it went on
- Both can show at once, and anything else is ignored

### The badge catalog

- There are 51 badges, each unlocking a part, and the starter kit has 3 bodies and 15 paints
- A badge adds its parts to the ones a player can use; Champion unlocks four, the gold finish and the podium backdrop among them
- The starter kit also has an accent in any of the 15 paints (or none), 4 finishes, 4 boost trail styles and 7 backdrops (ruling R27)
- An accent can go on any of 5 places, alone or together
- Every season a player finishes gives them a decal with its number and year; any ranked player can wear their rank emblem

### The bracket

- Seeds come from Season Points: 1 plays 4 and 2 plays 3; a missing seed is a bye
- A semifinal goes to more points, then fewer beers in the round, then the higher seed
- The final goes to more points; level points go to sudden death
- Sudden death: the first to miss any goal loses; if both hit everything or both miss, the day decides, then fewer beers in the round, then the higher seed

### The bracket, round by round

- Seeding: the top 4 by Season Points play; everyone else is in the Whiff Bowl, and with fewer than 2 outside there is none
- Semifinal winners meet in the final, the 1-4 winner first; the Whiff Bowl losers race on the final days
- A Whiff Bowl with one loser after its first round is settled then
- The final crowns a champion on points, and the Whiff Bowl racer with the fewest points is last; level points go to sudden death
- Top 2 is the final from the start, and everyone outside races for "not last" on its days

### The calendar the security rules read

- Every regular-season day gets one entry, Monday of Week 1 to Sunday of the last week
- An entry holds the day start, its noon, the 6 pm receipt cutoff, the day end and the noon lock, in real time
- An entry also holds its week's kit refill, its Sunday, and when its rest day can first be set
- Entries stay right across a daylight saving change
- A date outside the regular season has no regular-season entry
- The kit on offer depends on the kind of week

### The captains' draft

- The captains are last season's top two who are still here, the leader blue
- In Season 1, two are drawn at random from the draft order, the first drawn blue
- Each captain starts alone on their squad, and everyone else is in the pool
- The picks snake: blue, orange, orange, blue, blue, …
- Only players still in the pool can be picked, and a missed pick takes one of them at random

### The fast test league

- Each day lasts a few minutes, one after another from the start
- A moment's date follows the fast clock, not the wall clock
- Its calendar has the same days as a real season, with every deadline in the same place within the day
- The week's times move with it: the kit refills on Monday, and next week's rest day can be set from this Monday
- A Wheel dare is due by the end of the Sunday after it's drawn, on the fast clock

### The group-play vote

- A ranking names each of the six modes exactly once
- Each ranking gives its first choice 6 points, down to 1 for its last, and the most points tops the vote
- A tie goes to the commish's own ranking, then to SCOPE.md's order
- The top-ranked modes fill the group-play weeks in order, the top one first; with more weeks than modes, the order repeats

### The nemesis tag

- Your nemesis is whoever has beaten you most
- A tie goes to whoever you have the worse record against, then to the one you met last
- Nobody is your nemesis until someone has beaten you

### The playoff calendar

- One week, top 4: semifinals Monday to Wednesday, a reset Thursday, the final Friday to Sunday, and sudden death the Monday after
- Two weeks, top 4: semifinals Monday to Saturday, a reset Sunday, the final Monday to Saturday, and sudden death that Sunday
- Top 2: the final only, Monday to Saturday, with sudden death on Sunday; no playoffs means no playoff days
- Every playoff day still locks at noon the next day, and each round's kit opens with the round, or on the reset day before it
- A season knows its rounds: semifinal and final with four, the final alone with two

### The practice week

- Runs seven days, then its results go final at the end of an eighth: 32 minutes with 4-minute days
- Can run before any season exists, or while the season is in setup
- Can run after the draft, as long as it ends before the first day of the season starts
- Can't run during the draft, or run into a draft that is coming up
- Isn't for a season in its offseason
- Each practice day lasts 2 to 30 minutes, and it starts some time ahead
- Pairs everyone off in the order given, and the odd one out faces The House
- Has stand-in goals for anyone the draft has not set goals for: each one doable in a few minutes

### The rules and the engine agree on every deadline

- Aerial and Demolition: after the kit refills and before the day starts
- Full Boost and logging: from the start of the day until it locks
- First rest-day move: the new day and the default Sunday both still ahead
- Receipt proof: due at the end of the day, or the end of the next day when asked at 6 pm or later

### The season trophy case

- SCOPE.md's ten trophies, all awarded now that the playoffs are built
- Regular-Season Leader is the top of the final standings, and Prophet the best predictions record
- Screen Time King is the lowest average over the days logged, among players who logged at least half the days
- Iron Streak, Demolition Derby, Brewmaster and MVP of the Season go to the most of each, at least one, ties shared
- A trophy nobody qualifies for stays empty: no beers means no Brewmaster

### The Wheel of Shame

- The wheel holds every dare from the draft that stands, then starter dares, 16 slices at most
- Starters the commish took off are left out of the order, so they never reach the wheel
- With no dares from the draft, the wheel is the 8 starters
- Proof is due by 11:59 pm on the Sunday after the draw, league time
- A dare is waiting to be spun, then spun, then proven, voted on for 24 hours, and either counts or is spun again
- No proof by the deadline is a dodge: 3 Season Points off, spun or not

### The Whiff Bowl

- Everyone outside the playoffs is paired best against worst; an odd one out, the best seed, is safe
- The last round is a race for "not last": the fewest points loses, then the most beers, then the lower seed

### The win meter

- Level on points, with the same recent average, the bar is even
- A lead with days to go favors the leader, but never as a sure thing
- The same lead counts for more as the days run out
- A better recent average can favor the player who trails, with enough days left
- Once no day is left, the leader has it all, and a tie on points splits it
- Each day to come counts as a whole day left, and the open day as half of one
- A recent daily average is the last 4 final weeks' points over 7 days each; until then, this week's pace

### Votes on goals and dares (provisional: waiting on the commish)

- A veto needs more than half of the players who can vote, not just of the votes cast
- Enough vetoes vetoes it at once, however many have still to vote
- It is approved as soon as enough have approved that a veto can no longer win
- When voting closes without enough vetoes, it is approved
- With nobody else to vote, it is approved
