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
| `devices/{device}` | That device | That device, jobs | 1, rules today | `token`, `platform`, `league`, `player`, `settings` (alert categories on or off), `quiet` (start, end), `updatedAt` |
| `leagues/{league}` | Setup script creates it. Joining adds one member. The commish edits it with an audit entry. | Members | 1, rules today | `name`, `code`, `commish`, `coCommish`, `joining` (open, approval, closed), `members` (map of player ids, 12 at most), `season` (the current one), `audit`. Phase 3: `banner` (the reigning champion) |

## In a league: `leagues/{league}/...`

| Path | Written by | Read by | Phase | Fields |
| --- | --- | --- | --- | --- |
| `players/{player}` | Created on joining. The player edits `displayName` and `car`. Jobs write the rest. | Members | 1, rules today | `displayName`, `joinedAt`, `car` (body, paint, decal, wheels, boost, explosion, topper). Jobs, Phase 2: `badges`, `unlocked` (parts by slot), `rank`, `rankHistory`, `stats`, `streaks`, `stickers` (Dare Dodger, the "L"), `trophies` |
| `keys/{player}` | Created on joining. Rotated by anyone who proves the old key. Reissued by the commish with an audit entry. | That player, the commish | 1, rules today | `key`, `prev`, `rotatedAt`, `audit` |
| `lookup/{key}` | Filed in the same save that sets a key, and taken off file in the same save that replaces it | Anyone signed in who already knows the key, one at a time, never listed | 1, rules today | `player` |
| `claims/{device}` | That device, with the player's key | That device, the commish | 1, rules today | `player`, `key`, `code` (when joining), `at` |
| `audit/{entry}` | The commish, never edited or deleted | Members | 1, rules today | `by`, `at`, `action`, `target`, `reason` |
| `feed/{event}` | Jobs | Members | 1 | `at`, `kind`, `players`, `season`, `period`, `data` |
| `wall/{post}` | The author. Soft-deleted by the author, or by the commish with an audit entry. | Members | 1 | `by`, `kind` (quick, taunt, brag), `text`, `to`, `at`, `season`, `period`, `deleted`, `audit` |
| `wall/{post}/comments/{id}` | The author | Members | 1 | `by`, `text`, `at`, `deleted` |
| `wall/{post}/reactions/{player}` | That player | Members | 1 | `fire`, `skull`, `beer` |
| `taunts/{player}` | That player | That player | 1 | `saved` (custom taunts, with `{name}`) |
| `dares/{dare}` | The commish (starters) and each player (one per season) | Members | 1 | `text`, `by`, `source`, `status` (active, vetoed, retired), `season` |
| `suggestions/{idea}` | Any member. The commish tags it. | Members | 2 | `by`, `text`, `at`, `tag` (planned, maybe, no), `votes` |
| `rivalries/{pair}` | Jobs | Members | 2 | `a`, `b`, `wins`, `draws`, `lastMet` |
| `trophies/{season}` | Jobs | Members | 2 | One entry per trophy in SCOPE.md's trophy case |

## In a season: `leagues/{league}/seasons/{season}/...`

| Path | Written by | Read by | Phase | Fields |
| --- | --- | --- | --- | --- |
| The season document | The commish while it is in setup, with an audit entry. Jobs after that. | Members | 1, rules today | Settings: `name`, `status`, `regularWeeks` (3 to 12), `playoffs`, `playoffSize`, `par` (1 to 6), `groupWeeks`, `timeZone`, `kickoff`, `draftAt`, `joinMidSeason`, `holidayEvents`, `updatedAt`, `audit`. Jobs: `ruleOneIssue` (when each Rule One arrives), `schedule`. Phase 3: `modes` (the draft's vote), `teams`, `captains`, `bounty`, `events`, `seasonDare`, `bracket` |
| `calendar/{date}` | Jobs | Members | 1, rules today | `date`, `period`, `week`, `dayIndex`, `phase` (regular, playoff), `kind` (play, reset), `mode`, `kit`, `start`, `sixPm`, `end`, `lock`, `nextEnd`, `periodStart`, `sundayStart`, `restOpens` |
| `roster/{player}` | The player proposes goals. Votes and the commish settle them. | Members | 1 | `goals` (mind, body, wildcard: text and status), `joinedPeriod`, `seed`. Phase 3: `team` |
| `days/{player}_{date}` | That player, while the day is open. Never deleted. | Members | 1, rules today | `player`, `date`, `goals` (mind, body, wildcard), `screenMinutes` (0 to 1,440 in 15s, or null), `beers` (0 to 30), `firstAt`, `updatedAt` |
| `kit/{period}_{player}_aerial` | That player, before the day starts | Members | 1, rules today | `player`, `item`, `period`, `date`, `at` |
| `kit/{period}_{player}_fullBoost` | That player, while the day is open | Members | 1, rules today | The same, plus `lane` |
| `kit/{period}_{player}_rest` | That player, while both days are still ahead | Members | 1, rules today | `player`, `item`, `period`, `date`, `at`. No document means Sunday. |
| `kit/ruleOne_{player}_{n}` | That player, while the day is open, once that Rule One has been issued | Members | 1, rules today | `player`, `item`, `number` (1 to 3), `date`, `at` |
| `sealed/{period}_{player}_demolition` | That player, before the day starts. Never changed. | Its author; everyone after `revealAt` | 1, rules today | `kind`, `player`, `period`, `target`, `date`, `lane`, `revealAt`, `at` |
| Other `sealed/` items | Jobs, or the player for a Boot target | Nobody until revealed | 1 and 3 | Phase 1: Wheel draws and coin flips. Phase 3: Rumble items and Boot targets. All use `kind` and `revealAt`. |
| `weeks/{period}` | Jobs. The commish can settle or unlock one with an audit entry. | Members | 1, rules today (read only) | `period`, `week`, `mode`, `pairs`, `targets` (who each player may demolish), `status`, `results` (per player), `house`, `awards` (MVP, Bust, Wheel), `settledAt`, `finalAt`. Phase 2: `recap`. Phase 3: `teams`, `modeData` (tiles, race, bounty bar) |
| `standings/current` | Jobs | Members | 1 | `rows`, `asOf` |
| `adjustments/{id}` | The commish, with a reason and an audit entry. Never edited or deleted. | Members | 1, rules today | `player`, `date`, `amount` (−20 to 20), `void` (a square, or null), `reason`, `by`, `at`, `audit` |
| `receipts/{player}_{date}_{square}` | The requester creates it. The owner backs down. Jobs resolve it. | Members | 1 | `target`, `date`, `square`, `by`, `slot`, `requestedAt`, `deadline`, `backedDownAt`, `status` |
| `receiptSlots/{period}_{player}_{n}` | The requester, with the receipt | Members | 1 | `receipt`. Three slots a week is the limit of 3 requests. |
| `proofs/{id}` | The player who owes the proof, before the deadline | Members | 1 | `photo` (300 KB or less), `at`. Jobs delete it after 14 days. |
| `spins/{id}` | The spinner, by tapping Spin | Members | 1 | `player`, `period`, `at`. Its existence is what unseals the Wheel draw. |
| `votes/{id}` | Each voter, once | Members | 1 | `voter`, `about`, `choice`, `at`. Used for goal vetoes, dare vetoes and dare proof. Phase 3: the group-play ranking. |
| `draft/{doc}` | The commish runs it; players make their own picks | Members | 1 and 3 | Order, the step under way, the clock, rival picks. Phase 3: captains' picks. |
| `predictions/{period}_{player}` | That player, before Sunday 11:59 pm | That player; everyone after the deadline | 2 | `picks`, `at` |
| `pokes/{date}_{player}` | That player, once a day | Members | 2 | `to`, `at` |
| `rematches/{id}` | The challenger | Members | 2 | `from`, `to`, `period`, `status`, `winner` |

## Choices worth knowing

1. **Leagues are created by a setup script, not from the app.** The app's web settings are public, so if the app could create leagues, anyone on the internet could fill the database.
2. **The member list is a map on the league document.** That is how "12 players at most" is enforced in one atomic save when someone joins.
3. **Sealed items sit under the season,** not the league as SCOPE.md sketched, so their names stay short and each season's are separate.
4. **A Demolition unseals by time.** Its `revealAt` is copied from the calendar's lock when it is set, and the rules check that the copy is honest. The jobs still post the "Landed, Missed or Blocked" feed event, but if a job runs late nothing stays hidden past the lock, and the commish can settle the week from the app.
5. **Removing a player blanks their key** and takes them off the member list. No claim can match a blank key, so they are out at once.
6. **Proof photos are in their own collection,** so listing receipts never downloads photos.
