# Checkpoint B: what the security rules block

Generated 2026-11-25 by `npm run checkpoint:b`. Do not edit by hand: every line below is the title of an emulator test.

- **Tests:** 298 of 298 passing.
- **Rules:** `firebase/firestore.rules`. **Data model:** `docs/DATA-MODEL.md`.
- Each test signs in as a real device and tries the action against the Firestore emulator, with the same rules file that will be deployed.

## Who is in the league

A device is in a league only while its claim holds the player's current recovery key.

**Who can read the league**

- A member can read the league, its players, the season, the calendar and the logs
- A signed-in stranger with no claim can read nothing in the league
- A visitor who is not signed in can read nothing at all
- Nobody can list leagues or league codes, so a code cannot be found by browsing
- Anyone signed in who knows the code can look it up

**Joining**

- Joining with the league code creates the player, their key and the device claim together
- Joining needs the right league code
- A recovery key in the wrong shape is refused
- Joining is refused while the commish has the league closed
- A 13th player cannot join
- A new player cannot take over a profile that already exists
- Joining cannot slip in any other change to the league, like making yourself commish
- Nobody can mint themselves a key and a claim without joining through the league code
- Leagues cannot be created or deleted from a phone

**Finding a profile from its recovery key**

- A new phone that knows a recovery key can find which player it belongs to
- A key nobody holds finds nothing
- A visitor who is not signed in cannot look a key up
- Nobody can list the keys on file, not even the commish, so a key cannot be found by browsing
- Joining has to file the new key, so the player can always recover later
- An entry holds the player and nothing else
- A key cannot be filed under a different player
- Recovery files the new key and takes the old one off file
- A recovery that leaves the old key on file is refused
- A recovery that does not file the new key is refused
- Nobody can take a current key off file, which would stop that player ever recovering

**Recovery keys**

- A player can read their own key
- A player cannot read another player's key
- The commish can read every key
- A device cannot claim to be a player without that player's current key
- A device cannot write a claim for some other device
- Recovering on a new phone works with the current key
- After a recovery the key has changed, and every other device is signed out at once
- A wrong guess at the old key changes nothing
- A key cannot be rotated to something that is not a key
- One player cannot rotate another player's key
- A device's claim can be read by that device and by the commish, and by no other player
- A device can sign itself out

**Profiles and devices**

- A player can change their own display name
- A player cannot change someone else's profile
- A player cannot give themselves badges, ranks or unlocked parts: those come from the jobs
- A display name must be 1 to 24 characters
- An accented letter counts as one character and an emoji as two
- A device's push settings can be read and written by that device only
- A device signs up for alerts only as the player its claim holds, so alerts can't follow someone else
- Alert settings hold a token, the platform, the 7 categories on or off, and quiet hours from 0 to 23, saved at the server time
- A device can turn its alerts off by deleting its settings; nobody else can
- A phone that was signed out can no longer save alerts for that player

## Joining with the commish's approval

With joining set to "with my approval", a new player asks first, and only the commish lets them in, with an audit entry.

**Joining with the commish's approval**

- A new player can't just join: they ask first, with the league code, under their own sign-in
- A request starts unanswered, and carries the server time and a name of 1 to 24 characters, and nothing else
- Only the commish lets someone in, with an audit entry; then their phone joins as usual
- The commish can turn someone away, with an audit entry, and then they cannot join
- The player and the commish can see the request; nobody else can
- The player can take their request back; nobody else can

**Asking to join in other leagues**

- An open league takes no requests: you just join
- A closed league takes no requests either

## Daily logs

You write your own day, and only between its start and its lock, by the server's clock.

**Logging a day**

- A player can log their own day while it is open
- A player can change today as often as they like
- A player can fix yesterday until it locks at noon
- Nobody can write a day after it locks
- Nobody can write a day before it starts
- Nobody can write another player's day
- The commish cannot edit another player's day either
- Someone outside the league cannot write a day
- A day cannot be filed under the wrong name, or moved to another date
- A day cannot be deleted
- The time a day was saved comes from the server, not the phone

**Out-of-range entries**

- Beers must be a whole number from 0 to 30
- Screen time must be 0 to 1,440 minutes in 15-minute steps, or not logged
- Goals must be exactly the three lanes, each a yes or a no
- A day cannot carry extra fields, like points

## Aerial, Full Boost, rest days and Rule One

Each has one fixed slot, and each slot has its own deadline.

**Aerial**

- Can be set before the target day starts
- Cannot be set once the target day has started
- Can be cancelled or moved until its day starts
- Cannot be cancelled or moved after its day has started
- One a week: there is a single slot, and once it is used a second Aerial is impossible
- Cannot borrow next week's Aerial: the slot must belong to the week of the target day
- Monday is safe: next week's kit cannot be set before it refills on Monday at 12:00 am
- Nobody can set an Aerial for another player
- Cannot be set in a week with no kit, like an Alley week

**Full Boost**

- Can be used on today, and on yesterday until it locks at noon
- Cannot be used on a day that has locked, or one that has not started
- Only works on a goal lane
- Has nothing to fix on your rest day
- One a week: once its day has locked it is spent, and it cannot be moved or taken back
- Can be moved or taken back while its day is still open
- Nobody can use a Full Boost for another player

**Rest day**

- Can move to another day of the same week while both days are still ahead
- Can move again and again, with no limit, while both days are still ahead
- Cannot move onto a day that has already started
- Cannot move once the rest day itself has started
- Cannot move off Sunday once Sunday has started
- Stays inside its own week
- Next week's rest day can be set early, including onto next Monday
- The week after next cannot be set yet
- A rest day cannot be deleted, only moved
- Nobody can move another player's rest day
- There are no rest days in the playoffs

**Rule One**

- Can be declared for a day until it locks at noon the next day
- Cannot be declared after the day has locked, or before it starts
- A Rule One that has not been issued yet cannot be used
- There is no fourth Rule One, whatever it is called
- Can be taken back or moved while its day is still open, and not after
- Works in the regular season only
- Nobody can declare Rule One for another player

**Kit documents in general**

- A kit document cannot carry extra fields or a made-up item
- A Demolition cannot be saved in the open kit collection, where everyone could read it

## Demolition

Hidden from everyone but the player who set it until the day locks. There is no exception for the commish.

**Setting a Demolition**

- Can be set on your opponent before the target day starts
- Cannot be set once the target day has started
- Cannot be aimed at the opponent's rest day: Sunday by default
- Cannot be aimed at a rest day the opponent has moved, and their old Sunday becomes fair game
- Targets a goal lane only, never screen time or beers
- Can only hit this week's opponent
- Has nothing to aim at in a bye week against The House
- One a week: it cannot be changed or deleted once set, and there is no second slot
- Monday is safe: next week's Demolition cannot be set before the kit refills
- Nobody can set a Demolition in another player's name
- The reveal time is the day's lock, and cannot be set to anything else

**Sealed until the day locks**

- The player who set a Demolition can read it back
- The player it is aimed at cannot read it before the day locks
- The commish cannot read it before the day locks
- No other player can read it or find it by listing
- Checking for a Demolition that was never set looks the same as one that was: both are refused
- Once the day has locked, anyone in the league can read it

## Commish powers and the audit log

Every commish change has to arrive with an audit entry, or it is refused.

**Season settings**

- The commish can set up a season, and it lands in the audit log
- The commish can start a new season and make it the league's current one in one save, with an audit entry for each
- Starting a season needs both audit entries: the league cannot be pointed at it quietly
- Nobody else can start a season
- A player who is not the commish cannot change settings
- The commish cannot change settings without an audit entry in the same save
- An audit entry must describe the change it travels with
- Out-of-range settings are refused
- The commish cannot write fields that belong to the jobs, like the schedule clock
- Once a season is under way its core settings are locked, even for the commish
- Nobody can write the calendar or the week results from a phone, the commish included

**Docks, voids and corrections**

- The commish can dock a point with a reason, and it lands in the audit log
- The commish can void a square or enter a correction the same way
- A reason is required
- It is refused without an audit entry in the same save
- A player cannot dock anyone, with or without an audit entry
- A dock cannot be edited or deleted afterwards: undoing one means entering a correction
- A single adjustment is limited to 20 points either way, and must void a real square

**The audit log**

- Everyone in the league can read it
- Entries cannot be edited or deleted, even by the commish
- A player cannot write audit entries
- An entry is stamped with the commish who made it and the server time, and neither can be faked

**Commish powers over players**

- Reissuing a key lands in the audit log and signs that player out everywhere
- The commish cannot reissue a key without an audit entry
- The player can recover on a new phone with the reissued key, and the old key finds nothing
- A reissue that does not file the new key, or leaves the old one on file, is refused
- Blanking a key to remove a player takes it off file, so it can never be used to get back in
- Handing over the commish role lands in the audit log
- A player cannot make themselves commish
- The commish can close the league to new players, and remove a player, with an audit entry each time

## Goals

Everyone in the league can read every player's goals.

**Goals for the season**

- Everyone in the league can see every player's goals
- Someone outside the league cannot see anyone's goals
- Before the draft opens, nobody can set or change goals from a phone, the commish included

## The draft

The commish runs it, and every change goes in the audit log. Players set their own goals and vote on everyone else's until the votes close.

**Starting the draft**

- The commish starts the draft: the order is set, the season moves to draft, and both are in the audit log
- Nobody else can start it
- Once the draft has started, the season settings are fixed

**Goals at the draft**

- While the draft's votes are open, a player sets their three goals
- A goal is 1 to 60 characters
- Changing a goal's words gives it a new version, so votes on the old words stop counting
- Nobody can set someone else's goals, the commish included
- Goals are fixed once the draft's votes close
- Goals can still be set and voted on after the live draft moves on, until the votes close, for anyone who missed it
- Players vote approve or veto on each other's goals, and can change their vote
- Nobody votes on their own goal, or in someone else's name
- A vote is for the goal's current words: a vote on an old version is refused
- A vote has to be approve or veto
- Votes on goals close when the draft's votes close
- The commish can close the votes sooner or give more time, and it goes in the audit log
- The draft always says when its votes close
- Everyone in the league can see the draft and the votes; nobody outside can

**Rival picks**

- In draft order, the first unpicked player picks a Week 1 rival from the others still unpicked
- It has to be your turn: nobody picks out of turn, or for someone else
- You pick someone still unpicked, never yourself
- Both players leave the running, and the rest keep their draft order
- Each pick starts the next pick's 2-minute clock
- A pick is final
- Someone who has already picked can never pick again, even if a slip puts them back at the front of the line
- When it is the commish's turn, they pick like everyone else
- With one player left there is no pick to make: they face The House
- Picks happen only during the rival-pick step
- A pick changes nothing else in the draft
- The commish can make a missed pick for a player, and it goes in the audit log

**Dares at the draft**

- At the dares step, each player adds one dare for the Wheel
- A dare is 1 to 80 characters
- Nobody adds a dare in someone else's name, the commish included
- Changing a dare's words gives it a new version, so votes on the old words stop counting
- Dares wait for the dares step, and close when the votes close
- After the live draft ends, a late dare is still welcome until the votes close
- Players vote approve or veto on each other's dares, never their own and never in someone else's name
- A vote is for the dare's current words
- Votes on dares wait for the dares step too
- Votes on dares close when the votes close
- A dare vote has no lane, and is filed under its own name
- Everyone in the league can see the dares; nobody outside can

## Standings

Everyone in the league can read them. Only the weekly job writes them.

**The standings**

- Everyone in the league can read the standings
- Nobody outside the league can
- Only the weekly job writes them: no phone can, the commish included
- A week's results can be read by everyone in the league and written by no phone

## Weeks and dares

If the weekly job runs late, the commish can post a finished week's results as provisional. The commish can also unlock a final week or take a dare off the Wheel. Every such change goes in the audit log.

**Unlocking a final week**

- The commish can unlock a final week, so the weekly job counts it again, and it goes in the audit log
- Nobody else can, and not without the audit entry
- Unlocking changes nothing else: no results, and only a final week

**Settling a week from the app**

- If the weekly job runs late, the commish can post a finished week's results from the app, with an audit entry
- Not before the week's Sunday locks, and the Sunday named has to be that week's
- The results stay provisional: only the weekly job makes a week final, and the commish never posts over a final week
- Only the commish, only with the audit entry, and nothing but the results change
- Results the job already posted can be posted again; they keep the time they were first posted

**Removing a dare**

- The commish can take a dare off the Wheel, and it goes in the audit log
- Nobody else can, and not without the audit entry, and nothing else about the dare changes

**Taking starter dares off the Wheel**

- The commish can take starter dares off the Wheel or put them back, and it goes in the audit log
- Only the 8 starters, by their place in the list, and only by the commish with the audit entry

## Receipts

You ask in your own name, before the day locks, 3 times a week. Only the player asked can answer, and only before the deadline.

**Asking for receipts**

- Anyone in the league can ask for receipts on a square someone else claimed, until that day locks
- You can't ask yourself, or ask on a square with nothing claimed
- On a rest day, receipts cover screen time only
- Proof is due by the end of that day, or by the end of the next day when asked after 6 pm
- A request always takes one of your slots, and nobody can take a slot of yours
- Each player has 3 requests a week
- Each square takes one request
- A request is filed under the square's own name, in your name, at the server time

**Answering a receipt**

- The player can back down before the deadline, for free
- A receipt is proven only with the photo, in the same save
- Or prove it with a photo of up to 300 KB before the deadline
- Once proven or backed down, it stays that way
- After the deadline, nothing changes: the square is voided and costs 1 more point
- Nobody can change a request's facts, the commish included
- Everyone in the league can see receipts and proof; nobody outside can

**Fixing screen time for a receipt (ruling R6)**

- While a screen-time receipt is open, the player can still fix the number, even after the day locks, and nothing else
- Once the receipt is answered or its deadline passes, the number is fixed

## The Wheel of Shame

The job seals each draw. Nobody reads it until its spinner taps Spin, once.

**The Wheel of Shame**

- A draw stays sealed until its spinner spins, even from the spinner and the commish
- The spinner taps Spin once, at the server time, and everyone in the league sees the result
- Nobody else can spin for them
- A spin needs a draw, at the right week, and the server time, and carries nothing else
- Tiebreak coins stay sealed from everyone, their own player included
- Everyone in the league can see the spins; nobody outside can

**Proving a Wheel dare**

- The spinner posts a photo of up to 300 KB before the deadline
- A dare is proven once, and only with the photo in the same save
- Once proven, the proof time is fixed, so the vote window cannot be restarted
- Proving changes nothing else on the spin
- After the deadline no proof is taken: the dare is dodged
- Everyone in the league can see the proof; nobody outside can

**Voting on Wheel dare proof**

- Everyone else votes Counts or Doesn't count, and can change their vote
- The spinner does not vote on their own dare
- Votes stay open for 24 hours from the proof
- A vote is yours, filed under its own name, and only Counts or Doesn't count
- No proof, no vote

## The wall

Everyone in the league reads it. You post, comment and react in your own name. Nobody edits a post, and only its author or the commish takes it down.

**The wall**

- A player posts a taunt or a quick-chat line at another player
- A brag is aimed at nobody
- A taunt is aimed at someone in the league who isn't you
- A post is 1 to 280 characters
- Nobody posts in someone else's name, and nobody outside the league posts at all
- A post carries the server time, goes up live, and is a taunt, a quick-chat line or a brag
- Nobody can edit a post
- The author can take their post down, which blanks its words
- Nobody else can take a post down, except the commish, whose take-down goes in the audit log
- Everyone in the league can read the wall; nobody outside can

**Comments and reactions**

- Anyone in the league can comment on a brag
- Taunts and quick chat take reactions, not comments
- A comment is 1 to 280 characters, in your own name, at the server time
- A taken-down post takes no more comments or reactions
- A comment is taken down by its writer, or by the commish with an audit entry
- Each player has one set of reactions on a post: fire, skull and beer, each on or off
- A reaction changes nothing else on the post
- Everyone in the league can see the comments; nobody outside can
- A reaction or a comment stamps its post with the server time, so its author can hear about it
- The stamp is always the server time, changes nothing else, and only on a post that is still up

**Saved custom taunts**

- A player keeps up to 10 custom taunts on their profile
- Nobody can change someone else's saved taunts

## The league feed

The jobs' news, like a badge earned or a rank changed. Everyone in the league reads it; no phone writes it.

**The league feed**

- Everyone in the league reads the jobs' news of badges and rank changes; nobody outside can
- Only the jobs write it: nobody in the league can add, change or remove news, the commish included

## The trophy case

Everyone in the league reads it. Only the weekly job awards trophies.

**The trophy case**

- Everyone in the league reads the trophy case; nobody outside it does
- Only the weekly job awards trophies: not a player, and not the commish

## Predictions

Each player picks a week's winners in their own name, until it starts. Nobody else sees them until then. Only the weekly job scores them.

**Predictions**

- Before a week starts, a player picks its winners in their own name, and can change them until it starts
- Once the week has started, picks are closed
- Picks are filed under their week and player, lock when the week starts, and name only players in the league, each once
- Until the week starts, only the picker sees their picks; after, everyone in the league does

## The suggestion box

Anyone posts an idea, everyone else upvotes it with their own vote, and only the commish tags it. Its author takes it down, or the commish does, with an audit entry.

**The suggestion box**

- Anyone in the league posts an idea in their own name, up to 280 characters, with no tag or votes yet
- Everyone else upvotes an idea with their own vote, and can take it back; nobody votes for their own idea, or for anyone else
- Only the commish tags an idea, Planned, Maybe or No, and can clear the tag
- Its author takes an idea down, which blanks its words; the commish can too, with an entry in the league log; nobody edits an idea's words
- Everyone in the league reads the ideas; nobody outside it does

## Pokes

One a day, to this week's opponent, dated today and in your own name. Never changed.

**Pokes**

- A player pokes this week's opponent, once a day
- Nobody pokes anyone but this week's opponent: not another player, and not The House
- A poke is dated today, sent in your own name and filed under it, stamped with the real time, and says nothing else
- Everyone in the league can read pokes; nobody changes or deletes one, and nobody outside the league reads them

## Rematch challenges

After a final week, the loser challenges the winner to a side race the next week, by its Wednesday, once. Only the weekly job settles it.

**Rematch challenges**

- After a final week, the loser challenges the player who beat them to a side race the next week, once
- The winner cannot challenge, nobody challenges a player who did not beat them, and never The House
- Only once the lost week is final, for the week right after it, which is this week, dated today and by its Wednesday
- A challenge is in your own name, filed under the lost week and you, dated today with the real time, and says nothing else
- Everyone in the league can read challenges; nobody changes or deletes one, and nobody outside the league reads them

## Rivalry records

Everyone in the league reads each player's all-time record. Only the weekly job writes it.

**Rivalry records**

- Everyone in the league can read a player's rivalry record; nobody outside it can
- Only the weekly job writes them: nobody can change their own record, or anyone else's

## The Garage

You change only your own car, and only to parts from the catalog, each in its own slot. A part a badge unlocks goes on once that badge is earned.

**The Garage**

- A player puts any starter part on their car: 3 bodies, 15 paints, and the rest of the starter kit
- A part a badge unlocks goes on only once that badge is earned, for every part in the catalog
- A part from another slot, a made-up part or a missing slot is refused
- A new player joins in a starter car they picked, but not in a part a badge unlocks
- Nobody changes someone else's car
