# Tier C League: data model

Where everything lives in Firestore, who can write it and who can read it. It covers all three phases, so Phases 2 and 3 add documents and fields without changing anything that already holds data.

- **Rules today** means `firebase/firestore.rules` already allows it and an emulator test proves it. Anything else is refused until its screen is built.
- **Jobs** means the GitHub Actions scripts, which use the Admin SDK and skip the rules.
- **Members** means every device whose claim holds its player's current recovery key.
- Times are Firestore timestamps written by the server. Dates are league-time days written `YYYY-MM-DD`.

## How the pieces fit

| Idea | How the data makes it true |
| --- | --- |
| A device is a player | `claims/{device}` holds a player and a key. It counts only while that key equals `keys/{player}.key`. |
| Recovery signs out old devices | Recovery rewrites `keys/{player}.key`, so every other claim stops matching. |
| A new phone can find its profile | `lookup/{key}` says which player a key belongs to. A phone that knows the league code and the key can fetch that one entry. The rules keep it in step with the keys. |
| The server's clock decides | Rules compare `request.time` with `calendar/{date}`, which only the jobs write. |
| One Aerial a week | The week has one document, `kit/w02_{player}_aerial`, and a used one can't be moved or deleted. |
| Demolition is hidden | It lives in `sealed/`, readable only by its author until the day's lock. |
| Commish actions are logged | A commish write is accepted only in the same save as a new `audit/{id}` entry that names it. |
| The commish can't fake a score | The commish never edits a `days/` document. Score changes are separate `adjustments/` documents. |

**Periods.** A period is one stretch of play with its own kit. Regular-season Week 2 is `w02`. Each playoff round gets its own tag in Phase 3, because two rounds can share one calendar week. Kit, sealed and week documents are all named by period.

## Top level

| Path | Written by | Read by | Phase | Fields |
| --- | --- | --- | --- | --- |
| `codes/{code}` | Setup script | Anyone signed in, one at a time, never listed | 1, rules today | `league`, `name` |
| `jobs/{job}` | The jobs | Nobody else | 1 | The alerts job's memory, one document per league as `tick_{league}`: `since` (its last run), `held` (alerts held through each phone's quiet hours), `revealed` (Demolitions already alerted), `leads` (who led each matchup at its last look), `closeSent`, `activitySince` and `seen` (reactions already counted on each post), `updatedAt` |
| `devices/{device}` | That device, only as the player its claim holds | That device, jobs; never listed | 1, rules today | `token`, `platform` (ios, android, desktop), `league`, `player`, `settings` (the 7 alert categories, each on or off), `quiet` (`start` and `end`, hours 0 to 23 in league time), `updatedAt` |
| `leagues/{league}` | Setup script creates it. Joining adds one member. The commish edits it with an audit entry. | Members | 1, rules today | `name`, `code`, `commish`, `coCommish`, `joining` (open, approval, closed), `members` (map of player ids, 12 at most), `season` (the current one), `audit`, `demo` (true only for a demo league, the one kind the delete job may remove). Phase 3: `banner` (the reigning champion) |

## In a league: `leagues/{league}/...`

| Path | Written by | Read by | Phase | Fields |
| --- | --- | --- | --- | --- |
| `players/{player}` | Created on joining, with the starter car picked then. The player edits `displayName`, `car` and `taunts` (up to 10 saved custom taunts). Jobs write the rest. | Members | 1, rules today | `displayName`, `joinedAt`, `car` (body, paint, decal, wheels, boost, explosion, topper: each a part from the engine's catalog for its slot, and a badge's part only once that badge is in `badges`, checked by the rules today). Jobs: `rank` (bronze to grandChamp, once a week is final) and `rankHistory` (each final week's `season`, `period`, `points`, `max`, the `rank` after it, and the matchup's `outcome` and the other side's points, `against`), written today. `badges` (each earned badge's id, with `at` and `season`), written today. `rivals` (for each player met in a 1v1 week, all-time `win`, `draw`, `loss` and `lastMet` with `season` and `week`), written today. `stickers` (`dodger` and `L`, each with `until`, the time it comes off), written today for a dodge. Jobs, Phase 2 to come: `stats`, `streaks`, `trophies`. The parts a player can use are worked out from their badges, so they aren't stored |
| `keys/{player}` | Created on joining. Rotated by anyone who proves the old key. Reissued by the commish with an audit entry. | That player, the commish | 1, rules today | `key`, `prev`, `rotatedAt`, `audit` |
| `lookup/{key}` | Filed in the same save that sets a key, and taken off file in the same save that replaces it | Anyone signed in who already knows the key, one at a time, never listed | 1, rules today | `player` |
| `claims/{device}` | That device, with the player's key | That device, the commish | 1, rules today | `player`, `key`, `code` (when joining), `at` |
| `joinRequests/{device}` | That device, while joining is "with my approval". The commish answers it with an audit entry. The device deletes it once in, or to take it back. | That device, the commish | 1, rules today | `displayName`, `code`, `at`, `approved`, `declined`, `audit` |
| `audit/{entry}` | The commish, never edited or deleted | Members | 1, rules today | `by`, `at`, `action`, `target`, `reason` |
| `feed/{event}` | The weekly job: news the phones can't work out themselves, a badge earned or a rank changed. Everything else in the live feed is built on each phone from the league's own data (DECISIONS.md, call 91). | Members | 2, rules today | `at`, `kind` (badge, rank), `player`, `data` (`badge`; or `rank` and `from`) |
| `wall/{post}` | The author. Taken down by the author, or by the commish with an audit entry, which blanks its words. Each player writes only their own reactions. | Members | 1, rules today | `by`, `kind` (quick, taunt, brag), `text` (1 to 280 characters; a taunt keeps `{name}` as written), `to` (the player aimed at, or null for a brag), `at`, `deleted`, `audit`, `reactions` (each player's `fire`, `skull` and `beer`, each on or off), `activityAt` (stamped by a reaction or a comment, for the alerts job) |
| `wall/{post}/comments/{id}` | The writer, on brags only. Taken down like a post. | Members | 1, rules today | `by`, `text` (1 to 280 characters), `at`, `deleted`, `audit` |
| `taunts/{player}` | That player | That player | 1 | `saved` (custom taunts, with `{name}`) |
| `suggestions/{idea}` | Any member, in their own name. Everyone else sets only their own vote; the commish sets only the tag. Taken down by its author, or by the commish with an audit entry, which blanks its words. | Members | 2, rules today | `by`, `text` (1 to 280 characters), `at`, `tag` (planned, maybe, no, or null), `votes` (each voter's `true`), `deleted`, `audit` |
| `trophies/{season}` | The weekly job, once the season's last regular week is final | Members | 2, rules today | `season`, `name`, `at`, `trophies` (by trophy: `winners` and the `value` that won it; a trophy nobody won is left out) |

## In a season: `leagues/{league}/seasons/{season}/...`

| Path | Written by | Read by | Phase | Fields |
| --- | --- | --- | --- | --- |
| The season document | The commish while it is in setup, with an audit entry. Jobs after that. | Members | 1, rules today | Settings: `name`, `status`, `regularWeeks` (3 to 12), `playoffs`, `playoffSize`, `par` (1 to 6), `groupWeeks`, `timeZone`, `kickoff`, `draftAt`, `joinMidSeason`, `holidayEvents`, `updatedAt`, `audit`. Jobs: `ruleOneIssue` (when each Rule One arrives); `modes` (each group-play week's mode, by week number, from the draft's vote); `status` goes to active, with `scheduledAt`, when the schedule is built. Only in a demo league's fast test season: `fast` (`startsAt`, `dayMinutes`, and the made-up players in `bots`), which runs its calendar on a fast clock. Phase 3: `modes` (the draft's vote), `teams`, `captains`, `bounty`, `events`, `seasonDare`, `bracket` |
| `calendar/{date}` | Jobs | Members | 1, rules today | `date`, `period`, `week`, `dayIndex`, `phase` (regular, playoff), `kind` (play, reset), `mode`, `kit`, `start`, `noon` (a Rumble Boot's deadline), `sixPm`, `end`, `lock`, `nextEnd`, `periodStart`, `sundayStart`, `restOpens` |
| `roster/{player}` | That player, while the draft's votes are open | Members | 1, rules today | `goals` (mind, body, wildcard: each `text`, 1 to 60 characters, and `version`, which goes up by 1 when the words change). Whether a goal stands is worked out from `votes/`. Still to come: `joinedPeriod`, `seed`. Phase 3: `team` |
| `days/{player}_{date}` | That player, while the day is open; after the lock, only the screen time, while a receipt on it is open (ruling R6). Never deleted. | Members | 1, rules today | `player`, `date`, `goals` (mind, body, wildcard), `screenMinutes` (0 to 1,440 in 15s, or null), `beers` (0 to 30), `firstAt`, `updatedAt` |
| `kit/{period}_{player}_aerial` | That player, before the day starts | Members | 1, rules today | `player`, `item`, `period`, `date`, `at` |
| `kit/{period}_{player}_fullBoost` | That player, while the day is open | Members | 1, rules today | The same, plus `lane` |
| `kit/{period}_{player}_rest` | That player, while both days are still ahead | Members | 1, rules today | `player`, `item`, `period`, `date`, `at`. No document means Sunday. |
| `kit/ruleOne_{player}_{n}` | That player, while the day is open, once that Rule One has been issued | Members | 1, rules today | `player`, `item`, `number` (1 to 3), `date`, `at` |
| `sealed/{period}_{player}_demolition` | That player, before the day starts. Never changed. | Its author; everyone after `revealAt` | 1, rules today | `kind`, `player`, `period`, `target`, `date`, `lane`, `revealAt`, `at` |
| `sealed/boot_{date}_{player}` | That player, while the day is open and before noon, if their Rumble item that day is Boot. Never changed. | Its author; everyone after `revealAt` (the day's lock) | 1, rules today | `kind` (boot), `player`, `period`, `target`, `date`, `lane`, `revealAt`, `at` |
| `rumble/{date}_{player}` | The weekly job, a week before a Rumble week starts | Everyone in the league from `revealAt` (the day's start); nobody before, not even its player; never listed | 1, rules today | `player`, `period`, `date`, `item` (tornado, punch, boot, spike, swap, freeze, magnet), `revealAt` |
| `sealed/wheel_{period}_{player}_{n}` | The weekly job, when the week goes final, and again after a dare's proof is voted down | Nobody until its spin exists; then everyone in the league | 1, rules today | `kind` (wheel), `draw`, `slice`, `dare` |
| Other `sealed/` items | Jobs, or the player for a Boot target | Nobody until revealed | 1 and 3 | Phase 1: coin flips (`coin_{player}`), seen by nobody. Phase 3: Rumble items and Boot targets, with `kind` and `revealAt`. |
| `weeks/{period}` | Jobs: the schedule job writes each week's matchups once the draft is done, and the weekly job settles it. The commish can unlock a final week with an audit entry, so the job counts it again. If the job runs late, the commish's phone can post a finished week's results as provisional, with an audit entry. | Members | 1, rules today | `period`, `week`, `mode`, `pairs`, `targets` (who each player may demolish), `status`, `results` (per player), `house`, `awards` (MVP, Bust, Wheel), `settledAt`, `finalAt`, `sunday` (the date whose lock ended the week, when the commish settled it), `reveals` (each Demolition whose day has locked: who, at whom, the day, the lane, how it went, and when), `wheel` (each Wheel draw: `player`, `n`, `pool` of slices, `drawnAt`, `dueAt`). Phase 2: `recap`. Phase 3: `teams` (Team Week's squads, `blue` and `orange`), `roster` (everyone in a 2v2, Bounty or Alley week), `duos` (2v2's matchups, each `a` and `b`, `[HOUSE]` for a House duo) and `drawnAt`, `monday` (the week's Monday: the commish's group-play settings close when it starts), `pairing` (2v2: `frenemies`, or a random draw; the commish, until the week starts, with an audit entry), `bounty` (the target: `kind` hits with `lane` and `count`, dry with `date`, or screen with `date` and `minutes`; the commish, until the week starts, with an audit entry), `group` (once settled, the mode's summary: the sides' averages, the Bounty's progress, the race, or the floors' daily hits) |
| `standings/current` | Jobs | Members | 1 | `rows`, `asOf` |
| `adjustments/{id}` | The commish, with a reason and an audit entry. Never edited or deleted. | Members | 1, rules today | `player`, `date`, `amount` (−20 to 20), `void` (a square, or null), `reason`, `by`, `at`, `audit` |
| `receipts/{player}_{date}_{square}` | The asker creates it, with one of their slots, before that day locks. The player backs down or proves it before the deadline. Nothing else changes it: its outcome is worked out from the clock. | Members | 1, rules today | `target`, `date`, `square`, `by`, `slot`, `requestedAt`, `deadline` (the end of that day, or of the next day when asked after 6 pm), `proofAt`, `backedDownAt` |
| `receiptSlots/{period}_{player}_{n}` | The asker, in the same save as the receipt. Never given back. | Members | 1, rules today | `receipt`. Three slots a week is the limit of 3 requests. |
| `proofs/{receipt}` | The player who owes the proof, before the deadline, in the same save that marks the receipt proven | Members | 1, rules today | `photo` (a JPEG of 300 KB or less, as text), `at`. The weekly job deletes it after 14 days. |
| `spins/{draw}` | The spinner, by tapping Spin, once; then once more to mark the dare proven, with its photo, before the deadline | Members | 1, rules today | `player`, `period`, `at`, `proofAt`. Its existence is what unseals the Wheel draw. |
| `dareProofs/{draw}` | The spinner, in the same save that marks the spin proven, before the Sunday deadline | Members | 1, rules today | `photo` (a JPEG of 300 KB or less, as text), `at`. The weekly job deletes it after 14 days. |
| `config/wheel` | The commish, with an audit entry | Members | 1, rules today | `removedStarters` (the places, 0 to 7, of starter dares taken off the Wheel), `audit` |
| `config/calendar` | The calendar job | Members | 1, rules today | `for` (the kickoff, length and time zone the calendar was last written from), `at` |
| `dares/{player}` | That player, from the draft's dares step until its votes close. The commish can take it off the Wheel, with an audit entry. | Members | 1, rules today | `text` (1 to 80 characters), `version`, `removed`. Whether it stands is worked out from `votes/`. The Wheel's pool is these plus the 8 starter dares, which are kept in the engine (`engine/src/dares.ts`). |
| `votes/{voter}_goal_{player}_{lane}_{version}` and `votes/{voter}_dare_{player}_{version}` | That voter, while the draft's votes are open. One vote each, which can be changed. | Members | 1, rules today | `voter`, `kind` (goal or dare), `player`, `lane` (goals only), `version`, `choice` (approve or veto), `at`. Nobody votes on their own, and a vote is for the current words. Phase 3: the group-play ranking. |
| `votes/{voter}_proof_{draw}` | That voter, for 24 hours from the dare's proof. One vote each, which can be changed. | Members | 1, rules today | `voter`, `kind` (proof), `player` (the spinner), `draw`, `choice` (counts or doesntCount), `at`. The spinner does not vote. |
| `draft/state` | The commish, with an audit entry. Each player makes their own rival pick when it is their turn. | Members | 1 and 3, rules today | `step` (goals, modes, rivals, dares, captains, done), `order` (drawn at random when the draft starts), `left` (who is still unpicked, in draft order), `picks` (each picker's rival), `turnStartedAt` (when the current pick's 2-minute clock started), `startedAt`, `votesCloseAt`, `audit`. Phase 3: captains' picks. |
| `predictions/{period}_{player}` | That player, until the week starts (the Sunday before it at 11:59 pm), and changeable until then. The weekly job scores it when the week is final. | That player; everyone in the league from `lockAt` | 2, rules today | `player`, `period`, `date` (the week's Monday), `picks` (the players picked to win), `lockAt` (the week's start), `at`. The job: `made`, `right`, `scoredAt` |
| `pokes/{date}_{player}` | That player, once a day, dated today, to this week's opponent (not The House). Never changed. | Members | 2, rules today | `player`, `to`, `date`, `at` |
| `rematches/{lost}_{player}` | The loser of that final week, against the player who beat them (never The House), on the race week's Monday to Wednesday. The weekly job settles it when the race week is final. | Members | 2, rules today | `from`, `to`, `lost`, `period` (the race week), `date`, `at`. The job: `winner` (or null on level points), `points`, `settledAt` |

## Choices worth knowing

1. **Leagues are created by a setup script, not from the app.** The app's web settings are public, so if the app could create leagues, anyone on the internet could fill the database.
2. **The member list is a map on the league document.** That is how "12 players at most" is enforced in one atomic save when someone joins.
3. **Sealed items sit under the season,** not the league as SCOPE.md sketched, so their names stay short and each season's are separate.
4. **A Demolition unseals by time.** Its `revealAt` is copied from the calendar's lock when it is set, and the rules check that the copy is honest. The jobs still post the "Landed, Missed or Blocked" feed event, but if a job runs late nothing stays hidden past the lock, and the commish can settle the week from the app.
5. **Removing a player blanks their key** and takes them off the member list. No claim can match a blank key, so they are out at once.
6. **Proof photos are in their own collection,** so listing receipts never downloads photos.
7. **Goal votes are filed under the version of the goal they are about.** New words make a new version, so old votes stop counting without anything being deleted, and the rules can check that a vote is for the current words.
8. **The draft's votes close by the clock** (`votesCloseAt`), not by its step, because SCOPE.md keeps them open for 24 hours while the live draft moves on.
9. **Rival picks keep who is still unpicked as a list, `left`,** so the rules can check a pick without counting: the picker is first in the list, the rival must be in it, and both come out with the rest left in order.
10. **Reactions sit on the post itself,** one set per player, not in a document each, so the wall's one live listener carries every count with no extra reads per post.
