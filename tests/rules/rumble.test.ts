import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { THU2, WED2, asJob, assertFails, assertSucceeds, dev1, dev2, kitPath, now, sealedPath, season, seedLeague, startEmulator, stopEmulator, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

const item = (id: string) => `${season}/rumble/${id}`;

/** A Boot on a goal of `target`'s, today unless another day is named. */
async function boot(db: Db, player: string, target: string, overrides: Record<string, unknown> = {}, date = WED2) {
  const day = await db.doc(`${season}/calendar/${date}`).get();
  return { kind: 'boot', player, period: 'w02', target, date, lane: 'body', revealAt: day.get('lock'), at: now(), ...overrides };
}

beforeEach(async () => {
  await seedLeague();
  // This week is Rumble. Today p1 holds Boot and p2 Tornado; tomorrow p1 holds Boot again, still sealed.
  await asJob(async (db) => {
    const today = await db.doc(`${season}/calendar/${WED2}`).get();
    const tomorrow = await db.doc(`${season}/calendar/${THU2}`).get();
    await db.doc(`${season}/weeks/w02`).update({ mode: 'rumble' });
    await db.doc(item(`${WED2}_p1`)).set({ player: 'p1', period: 'w02', date: WED2, item: 'boot', revealAt: today.get('start') });
    await db.doc(item(`${WED2}_p2`)).set({ player: 'p2', period: 'w02', date: WED2, item: 'tornado', revealAt: today.get('start') });
    await db.doc(item(`${THU2}_p1`)).set({ player: 'p1', period: 'w02', date: THU2, item: 'boot', revealAt: tomorrow.get('start') });
  });
});

describe('Rumble items', () => {
  it("Each day's items are sealed until the day starts; then everyone in the league can see them", async () => {
    await assertSucceeds(dev2().doc(item(`${WED2}_p1`)).get());
    await assertSucceeds(dev1().doc(item(`${WED2}_p2`)).get());
    await assertFails(dev2().doc(item(`${THU2}_p1`)).get());
  });

  it('Not even its own player sees an item early, and no phone can list, write or change them', async () => {
    await assertFails(dev1().doc(item(`${THU2}_p1`)).get());
    await assertFails(dev1().collection(`${season}/rumble`).where('player', '==', 'p1').get());
    await assertFails(dev1().doc(item(`${THU2}_p1`)).set({ player: 'p1', period: 'w02', date: THU2, item: 'tornado', revealAt: new Date() }));
    await assertFails(dev1().doc(item(`${THU2}_p2`)).set({ player: 'p2', period: 'w02', date: THU2, item: 'boot', revealAt: new Date() }));
    await assertFails(dev1().doc(item(`${WED2}_p1`)).update({ item: 'tornado' }));
  });
});

describe('A Rumble Boot', () => {
  it("Whoever holds Boot today picks one of their opponent's goals before noon; only they can see it until the day locks", async () => {
    await assertSucceeds(dev1().doc(sealedPath(`boot_${WED2}_p1`)).set(await boot(dev1(), 'p1', 'p2')));
    await assertSucceeds(dev1().doc(sealedPath(`boot_${WED2}_p1`)).get());
    await assertFails(dev2().doc(sealedPath(`boot_${WED2}_p1`)).get());
  });

  it("Only with Boot today, only your own, only at today's opponent, and it reveals at the lock", async () => {
    await assertFails(dev2().doc(sealedPath(`boot_${WED2}_p2`)).set(await boot(dev2(), 'p2', 'p1')));
    // p2 can't play p1's Boot for them.
    await assertFails(dev2().doc(sealedPath(`boot_${WED2}_p1`)).set(await boot(dev2(), 'p1', 'p2')));
    await assertFails(dev1().doc(sealedPath(`boot_${WED2}_p1`)).set(await boot(dev1(), 'p1', 'p3')));
    await assertFails(dev1().doc(sealedPath(`boot_${WED2}_p1`)).set(await boot(dev1(), 'p1', 'p2', { revealAt: new Date() })));
    await assertFails(dev1().doc(sealedPath(`boot_${WED2}_p1`)).set(await boot(dev1(), 'p1', 'p2', { lane: 'screen' })));
    // Tomorrow's Boot waits for tomorrow.
    await assertFails(dev1().doc(sealedPath(`boot_${THU2}_p1`)).set(await boot(dev1(), 'p1', 'p2', {}, THU2)));
  });

  it("Not after noon, and not on a goal of an opponent who is resting today", async () => {
    await asJob((db) => db.doc(kitPath('w02_p2_rest')).set({ player: 'p2', item: 'rest', period: 'w02', date: WED2, at: new Date() }));
    await assertFails(dev1().doc(sealedPath(`boot_${WED2}_p1`)).set(await boot(dev1(), 'p1', 'p2')));
    await asJob((db) => db.doc(kitPath('w02_p2_rest')).delete());
    await asJob((db) => db.doc(`${season}/calendar/${WED2}`).update({ noon: new Date(Date.now() - 60_000) }));
    await assertFails(dev1().doc(sealedPath(`boot_${WED2}_p1`)).set(await boot(dev1(), 'p1', 'p2')));
  });

  it('It is final once set', async () => {
    await assertSucceeds(dev1().doc(sealedPath(`boot_${WED2}_p1`)).set(await boot(dev1(), 'p1', 'p2')));
    await assertFails(dev1().doc(sealedPath(`boot_${WED2}_p1`)).set(await boot(dev1(), 'p1', 'p2', { lane: 'mind' })));
    await assertFails(dev1().doc(sealedPath(`boot_${WED2}_p1`)).delete());
  });
});
