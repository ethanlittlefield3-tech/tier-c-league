# Checkpoint B: what the security rules block

Generated 2026-11-25 by `npm run checkpoint:b`. Do not edit by hand: every line below is the title of an emulator test.

- **Tests:** 138 of 138 passing.
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
