import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  FRI2,
  MON2,
  MON3,
  NO_KIT_DAY,
  PLAYOFF_DAY,
  PLAYOFF_TOMORROW,
  SAT2,
  SUN2,
  THU2,
  TUE2,
  TUE3,
  WED2,
  WED4,
  aerial,
  asJob,
  assertFails,
  assertSucceeds,
  dev1,
  dev2,
  fullBoost,
  kitPath,
  now,
  restDay,
  ruleOne,
  seedLeague,
  startEmulator,
  stopEmulator,
} from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

/** Put a kit document in place as if it had been saved earlier, in time. */
const earlier = (id: string, data: Record<string, unknown>) =>
  asJob((db) => db.doc(kitPath(id)).set({ ...data, at: new Date(Date.now() - 48 * 3_600_000) }));

describe('Aerial', () => {
  it('Can be set before the target day starts', async () => {
    await assertSucceeds(dev1().doc(kitPath('w02_p1_aerial')).set(aerial('p1', 2, THU2)));
  });

  it('Cannot be set once the target day has started', async () => {
    await assertFails(dev1().doc(kitPath('w02_p1_aerial')).set(aerial('p1', 2, WED2)));
    await assertFails(dev1().doc(kitPath('w02_p1_aerial')).set(aerial('p1', 2, TUE2)));
    await assertFails(dev1().doc(kitPath('w02_p1_aerial')).set(aerial('p1', 2, MON2)));
  });

  it('Can be cancelled or moved until its day starts', async () => {
    const doc = dev1().doc(kitPath('w02_p1_aerial'));
    await doc.set(aerial('p1', 2, THU2));
    await assertSucceeds(doc.set(aerial('p1', 2, SAT2)));
    await assertSucceeds(doc.delete());
  });

  it('Cannot be cancelled or moved after its day has started', async () => {
    await earlier('w02_p1_aerial', aerial('p1', 2, WED2));
    const doc = dev1().doc(kitPath('w02_p1_aerial'));
    await assertFails(doc.delete());
    await assertFails(doc.set(aerial('p1', 2, FRI2)));
  });

  it('One a week: there is a single slot, and once it is used a second Aerial is impossible', async () => {
    await earlier('w02_p1_aerial', aerial('p1', 2, TUE2));
    // No second slot under any other name.
    await assertFails(dev1().doc(kitPath('w02_p1_aerial2')).set(aerial('p1', 2, FRI2)));
    await assertFails(dev1().doc(kitPath('w02_p1_aerial_b')).set(aerial('p1', 2, FRI2)));
    // And the used one cannot be pointed at a new day.
    await assertFails(dev1().doc(kitPath('w02_p1_aerial')).set(aerial('p1', 2, FRI2)));
  });

  it("Cannot borrow next week's Aerial: the slot must belong to the week of the target day", async () => {
    await assertFails(dev1().doc(kitPath('w03_p1_aerial')).set(aerial('p1', 3, THU2)));
    await assertFails(dev1().doc(kitPath('w03_p1_aerial')).set(aerial('p1', 2, THU2)));
  });

  it("Monday is safe: next week's kit cannot be set before it refills on Monday at 12:00 am", async () => {
    await assertFails(dev1().doc(kitPath('w03_p1_aerial')).set(aerial('p1', 3, MON3)));
    await assertFails(dev1().doc(kitPath('w03_p1_aerial')).set(aerial('p1', 3, TUE3)));
  });

  it('Nobody can set an Aerial for another player', async () => {
    await assertFails(dev2().doc(kitPath('w02_p1_aerial')).set(aerial('p1', 2, THU2)));
  });

  it('Cannot be set in a week with no kit, like an Alley week', async () => {
    await assertFails(dev1().doc(kitPath('w09_p1_aerial')).set(aerial('p1', 9, NO_KIT_DAY)));
  });
});

describe('Full Boost', () => {
  it('Can be used on today, and on yesterday until it locks at noon', async () => {
    await assertSucceeds(dev1().doc(kitPath('w02_p1_fullBoost')).set(fullBoost('p1', 2, WED2)));
    await assertSucceeds(dev1().doc(kitPath('w02_p1_fullBoost')).set(fullBoost('p1', 2, TUE2, 'mind')));
  });

  it('Cannot be used on a day that has locked, or one that has not started', async () => {
    await assertFails(dev1().doc(kitPath('w02_p1_fullBoost')).set(fullBoost('p1', 2, MON2)));
    await assertFails(dev1().doc(kitPath('w02_p1_fullBoost')).set(fullBoost('p1', 2, THU2)));
  });

  it('Only works on a goal lane', async () => {
    await assertFails(dev1().doc(kitPath('w02_p1_fullBoost')).set(fullBoost('p1', 2, WED2, 'screen')));
    await assertFails(dev1().doc(kitPath('w02_p1_fullBoost')).set(fullBoost('p1', 2, WED2, 'beers')));
  });

  it('Has nothing to fix on your rest day', async () => {
    await earlier('w02_p1_rest', restDay('p1', 2, WED2));
    await assertFails(dev1().doc(kitPath('w02_p1_fullBoost')).set(fullBoost('p1', 2, WED2)));
  });

  it('One a week: once its day has locked it is spent, and it cannot be moved or taken back', async () => {
    await earlier('w02_p1_fullBoost', fullBoost('p1', 2, MON2));
    const doc = dev1().doc(kitPath('w02_p1_fullBoost'));
    await assertFails(doc.set(fullBoost('p1', 2, WED2)));
    await assertFails(doc.delete());
    await assertFails(dev1().doc(kitPath('w02_p1_fullBoost2')).set(fullBoost('p1', 2, WED2)));
  });

  it('Can be moved or taken back while its day is still open', async () => {
    const doc = dev1().doc(kitPath('w02_p1_fullBoost'));
    await doc.set(fullBoost('p1', 2, TUE2));
    await assertSucceeds(doc.set(fullBoost('p1', 2, WED2, 'wildcard')));
    await assertSucceeds(doc.delete());
  });

  it('Nobody can use a Full Boost for another player', async () => {
    await assertFails(dev2().doc(kitPath('w02_p1_fullBoost')).set(fullBoost('p1', 2, WED2)));
  });
});

describe('Rest day', () => {
  it('Can move to another day of the same week while both days are still ahead', async () => {
    await assertSucceeds(dev1().doc(kitPath('w02_p1_rest')).set(restDay('p1', 2, FRI2)));
  });

  it('Can move again and again, with no limit, while both days are still ahead', async () => {
    const doc = dev1().doc(kitPath('w02_p1_rest'));
    await assertSucceeds(doc.set(restDay('p1', 2, FRI2)));
    await assertSucceeds(doc.set(restDay('p1', 2, THU2)));
    await assertSucceeds(doc.set(restDay('p1', 2, SUN2)));
    await assertSucceeds(doc.set(restDay('p1', 2, SAT2)));
  });

  it('Cannot move onto a day that has already started', async () => {
    await assertFails(dev1().doc(kitPath('w02_p1_rest')).set(restDay('p1', 2, WED2)));
    await assertFails(dev1().doc(kitPath('w02_p1_rest')).set(restDay('p1', 2, TUE2)));
  });

  it('Cannot move once the rest day itself has started', async () => {
    await earlier('w02_p1_rest', restDay('p1', 2, WED2));
    await assertFails(dev1().doc(kitPath('w02_p1_rest')).set(restDay('p1', 2, FRI2)));
  });

  it('Cannot move off Sunday once Sunday has started', async () => {
    // In Week 1 every day is long over, including the default Sunday.
    await assertFails(dev1().doc(kitPath('w01_p1_rest')).set(restDay('p1', 1, '2027-01-08')));
  });

  it('Stays inside its own week', async () => {
    await assertFails(dev1().doc(kitPath('w02_p1_rest')).set(restDay('p1', 2, TUE3)));
    await assertFails(dev1().doc(kitPath('w02_p1_rest')).set(restDay('p1', 3, TUE3)));
  });

  it("Next week's rest day can be set early, including onto next Monday", async () => {
    await assertSucceeds(dev1().doc(kitPath('w03_p1_rest')).set(restDay('p1', 3, MON3)));
    await assertSucceeds(dev1().doc(kitPath('w03_p1_rest')).set(restDay('p1', 3, TUE3)));
  });

  it('The week after next cannot be set yet', async () => {
    await assertFails(dev1().doc(kitPath('w04_p1_rest')).set(restDay('p1', 4, WED4)));
  });

  it('A rest day cannot be deleted, only moved', async () => {
    const doc = dev1().doc(kitPath('w02_p1_rest'));
    await doc.set(restDay('p1', 2, FRI2));
    await assertFails(doc.delete());
  });

  it("Nobody can move another player's rest day", async () => {
    await assertFails(dev2().doc(kitPath('w02_p1_rest')).set(restDay('p1', 2, FRI2)));
  });

  it('There are no rest days in the playoffs', async () => {
    await assertFails(dev1().doc(kitPath('w09_p1_rest')).set(restDay('p1', 9, PLAYOFF_TOMORROW)));
  });
});

describe('Rule One', () => {
  it('Can be declared for a day until it locks at noon the next day', async () => {
    await assertSucceeds(dev1().doc(kitPath('ruleOne_p1_1')).set(ruleOne('p1', 1, TUE2)));
    await assertSucceeds(dev1().doc(kitPath('ruleOne_p1_1')).set(ruleOne('p1', 1, WED2)));
  });

  it('Cannot be declared after the day has locked, or before it starts', async () => {
    await assertFails(dev1().doc(kitPath('ruleOne_p1_1')).set(ruleOne('p1', 1, MON2)));
    await assertFails(dev1().doc(kitPath('ruleOne_p1_1')).set(ruleOne('p1', 1, THU2)));
  });

  it('A Rule One that has not been issued yet cannot be used', async () => {
    // The second one arrives at the start of Week 5.
    await assertFails(dev1().doc(kitPath('ruleOne_p1_2')).set(ruleOne('p1', 2, WED2)));
  });

  it('There is no fourth Rule One, whatever it is called', async () => {
    await assertFails(dev1().doc(kitPath('ruleOne_p1_4')).set(ruleOne('p1', 4, WED2)));
    await assertFails(dev1().doc(kitPath('ruleOne_p1_0')).set(ruleOne('p1', 0, WED2)));
    await assertFails(dev1().doc(kitPath('ruleOne_p1_1b')).set(ruleOne('p1', 1, WED2)));
  });

  it('Can be taken back or moved while its day is still open, and not after', async () => {
    const doc = dev1().doc(kitPath('ruleOne_p1_1'));
    await doc.set(ruleOne('p1', 1, TUE2));
    await assertSucceeds(doc.delete());
    await earlier('ruleOne_p1_1', ruleOne('p1', 1, MON2));
    await assertFails(doc.delete());
    await assertFails(doc.set(ruleOne('p1', 1, WED2)));
  });

  it('Works in the regular season only', async () => {
    await assertFails(dev1().doc(kitPath('ruleOne_p1_1')).set(ruleOne('p1', 1, PLAYOFF_DAY)));
  });

  it('Nobody can declare Rule One for another player', async () => {
    await assertFails(dev2().doc(kitPath('ruleOne_p1_1')).set(ruleOne('p1', 1, WED2)));
  });
});

describe('Kit documents in general', () => {
  it('A kit document cannot carry extra fields or a made-up item', async () => {
    await assertFails(dev1().doc(kitPath('w02_p1_aerial')).set({ ...aerial('p1', 2, THU2), multiplier: 5 }));
    await assertFails(dev1().doc(kitPath('w02_p1_nuke')).set({ player: 'p1', item: 'nuke', period: 'w02', date: THU2, at: now() }));
  });

  it('A Demolition cannot be saved in the open kit collection, where everyone could read it', async () => {
    await assertFails(dev1().doc(kitPath('w02_p1_demolition')).set({ player: 'p1', item: 'demolition', period: 'w02', date: THU2, lane: 'mind', target: 'p2', at: now() }));
  });
});
