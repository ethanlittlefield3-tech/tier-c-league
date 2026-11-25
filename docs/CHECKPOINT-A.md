# Checkpoint A: the scoring engine

Generated 2026-11-25 by `npm run checkpoint:a`. Do not edit by hand: the rule list comes from the test results and the worked weeks are run through the engine.

- **Tests:** 202 of 202 passing.
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

### A player's week, day by day

- Days that have not started have no score yet; open days score live; locked days are final
- Each logged day scores as the engine scores it, and the week adds them up with the beers
- Aerial, Full Boost, Rule One and a moved rest day count on their own days
- A Demolition counts only once its day has locked
- Commish docks and voids land on their day
- Marks today

### Document IDs: one fixed ID per thing, so the rules can allow exactly one

- A player's day has one document
- A regular-season week is a period tagged w01, w02 and so on
- Each kit item has one document per player per period, so a playoff round can have its own
- A player's rest day has one document per week
- Each Rule One has its own numbered document, so a season can never hold more than it issued
- A square can be asked for receipts once

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

### The calendar the security rules read

- Every regular-season day gets one entry, Monday of Week 1 to Sunday of the last week
- An entry holds the day start, the 6 pm receipt cutoff, the day end and the noon lock, in real time
- An entry also holds its week's kit refill, its Sunday, and when its rest day can first be set
- Entries stay right across a daylight saving change
- A date outside the regular season has no regular-season entry
- The kit on offer depends on the kind of week

### The rules and the engine agree on every deadline

- Aerial and Demolition: after the kit refills and before the day starts
- Full Boost and logging: from the start of the day until it locks
- First rest-day move: the new day and the default Sunday both still ahead
- Receipt proof: due at the end of the day, or the end of the next day when asked at 6 pm or later
