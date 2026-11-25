import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, dev3, league, now, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

const wall = (post: string) => `${league}/wall/${post}`;
const taunt = (by: string, to: string | null, text = 'Touch grass, {name}.', kind = 'taunt') => ({ by, kind, text, to, at: now(), deleted: false });
const brag = (by: string, text = 'New bench PR: 100 kg.') => ({ by, kind: 'brag', text, to: null, at: now(), deleted: false });
const comment = (by: string, text = 'Nice one!') => ({ by, text, at: now(), deleted: false });
const reaction = (fire: boolean, skull: boolean, beer: boolean) => ({ fire, skull, beer });
/** A player's reactions sit on the post itself, one set per player. */
const react = (db: Db, post: string, player: string, value: unknown) => db.doc(wall(post)).update({ [`reactions.${player}`]: value });

/** Maya's (p2's) brag, already on the wall. */
async function withBrag() {
  await asJob((db) => db.doc(wall('b1')).set({ by: 'p2', kind: 'brag', text: 'Passed the exam.', to: null, at: new Date(), deleted: false }));
}

describe('The wall', () => {
  it('A player posts a taunt or a quick-chat line at another player', async () => {
    await assertSucceeds(dev2().doc(wall('t1')).set(taunt('p2', 'p3')));
    await assertSucceeds(dev2().doc(wall('q1')).set(taunt('p2', 'p3', 'Calculated.', 'quick')));
  });

  it('A brag is aimed at nobody', async () => {
    await assertSucceeds(dev2().doc(wall('b2')).set(brag('p2')));
    await assertFails(dev2().doc(wall('b3')).set({ ...brag('p2'), to: 'p3' }));
  });

  it("A taunt is aimed at someone in the league who isn't you", async () => {
    await assertFails(dev2().doc(wall('t2')).set(taunt('p2', 'p2')));
    await assertFails(dev2().doc(wall('t3')).set(taunt('p2', 'p9')));
    await assertFails(dev2().doc(wall('t4')).set(taunt('p2', null)));
  });

  it('A post is 1 to 280 characters', async () => {
    await assertFails(dev2().doc(wall('b4')).set(brag('p2', '')));
    await assertFails(dev2().doc(wall('b5')).set(brag('p2', 'x'.repeat(281))));
    await assertSucceeds(dev2().doc(wall('b6')).set(brag('p2', 'x'.repeat(280))));
  });

  it("Nobody posts in someone else's name, and nobody outside the league posts at all", async () => {
    await assertFails(dev3().doc(wall('b7')).set(brag('p2')));
    await assertFails(stranger().doc(wall('b8')).set(brag('p9')));
  });

  it('A post carries the server time, goes up live, and is a taunt, a quick-chat line or a brag', async () => {
    await assertFails(dev2().doc(wall('b9')).set({ ...brag('p2'), at: new Date(0) }));
    await assertFails(dev2().doc(wall('b10')).set({ ...brag('p2'), deleted: true }));
    await assertFails(dev2().doc(wall('b11')).set({ ...taunt('p2', 'p3'), kind: 'poll' }));
  });

  it('Nobody can edit a post', async () => {
    await withBrag();
    await assertFails(dev2().doc(wall('b1')).update({ text: 'Passed the exam with an A.' }));
  });

  it('The author can take their post down, which blanks its words', async () => {
    await withBrag();
    await assertFails(dev2().doc(wall('b1')).update({ deleted: true }));
    await assertSucceeds(dev2().doc(wall('b1')).update({ deleted: true, text: '' }));
  });

  it('Nobody else can take a post down, except the commish, whose take-down goes in the audit log', async () => {
    await withBrag();
    await assertFails(dev3().doc(wall('b1')).update({ deleted: true, text: '' }));
    await assertFails(dev1().doc(wall('b1')).update({ deleted: true, text: '' }));
    const db = dev1();
    const batch = db.batch();
    batch.update(db.doc(wall('b1')), { deleted: true, text: '', audit: 'a-wall' });
    batch.set(db.doc(`${league}/audit/a-wall`), auditEntry('wall.delete', 'wall/b1'));
    await assertSucceeds(batch.commit());
  });

  it('Everyone in the league can read the wall; nobody outside can', async () => {
    await withBrag();
    await assertSucceeds(dev3().doc(wall('b1')).get());
    await assertSucceeds(dev3().collection(`${league}/wall`).get());
    await assertFails(stranger().doc(wall('b1')).get());
  });
});

describe('Comments and reactions', () => {
  beforeEach(withBrag);

  it('Anyone in the league can comment on a brag', async () => {
    await assertSucceeds(dev3().doc(`${wall('b1')}/comments/c1`).set(comment('p3')));
  });

  it('Taunts and quick chat take reactions, not comments', async () => {
    await asJob((db) => db.doc(wall('t1')).set({ by: 'p2', kind: 'taunt', text: 'Calculated.', to: 'p3', at: new Date(), deleted: false }));
    await assertFails(dev3().doc(`${wall('t1')}/comments/c2`).set(comment('p3')));
    await assertSucceeds(react(dev3(), 't1', 'p3', reaction(true, false, false)));
  });

  it('A comment is 1 to 280 characters, in your own name, at the server time', async () => {
    await assertFails(dev3().doc(`${wall('b1')}/comments/c3`).set(comment('p3', '')));
    await assertFails(dev3().doc(`${wall('b1')}/comments/c4`).set(comment('p3', 'x'.repeat(281))));
    await assertFails(dev3().doc(`${wall('b1')}/comments/c5`).set(comment('p2')));
    await assertFails(dev3().doc(`${wall('b1')}/comments/c6`).set({ ...comment('p3'), at: new Date(0) }));
  });

  it('A taken-down post takes no more comments or reactions', async () => {
    await asJob((db) => db.doc(wall('b1')).update({ deleted: true, text: '' }));
    await assertFails(dev3().doc(`${wall('b1')}/comments/c7`).set(comment('p3')));
    await assertFails(react(dev3(), 'b1', 'p3', reaction(true, false, false)));
  });

  it('A comment is taken down by its writer, or by the commish with an audit entry', async () => {
    await asJob(async (db) => {
      await db.doc(`${wall('b1')}/comments/c8`).set({ by: 'p3', text: 'Nice one!', at: new Date(), deleted: false });
      await db.doc(`${wall('b1')}/comments/c9`).set({ by: 'p3', text: 'Again!', at: new Date(), deleted: false });
    });
    await assertFails(dev2().doc(`${wall('b1')}/comments/c8`).update({ deleted: true, text: '' }));
    await assertFails(dev3().doc(`${wall('b1')}/comments/c8`).update({ text: 'Edited' }));
    await assertSucceeds(dev3().doc(`${wall('b1')}/comments/c8`).update({ deleted: true, text: '' }));
    const db = dev1();
    const batch = db.batch();
    batch.update(db.doc(`${wall('b1')}/comments/c9`), { deleted: true, text: '', audit: 'a-comment' });
    batch.set(db.doc(`${league}/audit/a-comment`), auditEntry('wall.delete', 'wall/b1/comments/c9'));
    await assertSucceeds(batch.commit());
  });

  it('Each player has one set of reactions on a post: fire, skull and beer, each on or off', async () => {
    await assertSucceeds(react(dev3(), 'b1', 'p3', reaction(true, false, true)));
    await assertSucceeds(react(dev3(), 'b1', 'p3', reaction(false, false, true)));
    await assertSucceeds(react(dev2(), 'b1', 'p2', reaction(true, false, false)));
    // Changing Maya's reactions in her name is refused.
    await assertFails(react(dev3(), 'b1', 'p2', reaction(false, true, false)));
    await assertFails(react(dev3(), 'b1', 'p3', { ...reaction(true, false, false), heart: true }));
    await assertFails(react(dev3(), 'b1', 'p3', { fire: 'yes', skull: false, beer: false }));
    await assertFails(react(dev3(), 'b1', 'p3', { fire: true, skull: false }));
  });

  it('A reaction changes nothing else on the post', async () => {
    await assertFails(dev3().doc(wall('b1')).update({ 'reactions.p3': reaction(true, false, false), text: 'Edited' }));
    await assertFails(stranger().doc(wall('b1')).update({ 'reactions.p9': reaction(true, false, false) }));
  });

  it('Everyone in the league can see the comments; nobody outside can', async () => {
    await assertSucceeds(dev3().collection(`${wall('b1')}/comments`).get());
    await assertFails(stranger().collection(`${wall('b1')}/comments`).get());
  });
});

describe('Saved custom taunts', () => {
  const profile = (player: string) => `${league}/players/${player}`;

  it('A player keeps up to 10 custom taunts on their profile', async () => {
    await assertSucceeds(dev2().doc(profile('p2')).update({ taunts: ['Warm up the Wheel, {name}.', 'Is that all, {name}?'] }));
    await assertFails(dev2().doc(profile('p2')).update({ taunts: Array.from({ length: 11 }, (_, n) => `Taunt ${n}`) }));
    await assertFails(dev2().doc(profile('p2')).update({ taunts: 'Not a list' }));
  });

  it("Nobody can change someone else's saved taunts", async () => {
    await assertFails(dev3().doc(profile('p2')).update({ taunts: ['Mine now.'] }));
  });
});
