/**
 * Makes a new league with one player in it: the commish.
 *
 *   On GitHub:  Actions, "Create a league", Run workflow
 *   Locally:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node jobs/create-league.ts
 *
 * The league code and the commish's recovery key are never printed, because
 * this repo's logs are public. The commish reads both in the Firebase console,
 * which only they can open, then gets in with "I'm already in a league".
 */
import { randomBytes } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { connect } from './admin.ts';
import { leagueSeed, newLeague } from './lib/league-seed.ts';

const { app, emulator } = connect();
const db = getFirestore(app);

const league = newLeague({
  name: process.env.LEAGUE_NAME?.trim() || 'Tier C League',
  random: (bytes) => new Uint8Array(randomBytes(bytes)),
});

// One save, and every document must be new: a code or key that somehow
// already exists stops the whole thing instead of overwriting a league.
const save = db.batch();
for (const { path, data } of leagueSeed(league, new Date())) save.create(db.doc(path), data);
await save.commit();

console.log(`League created${emulator ? ' in the local emulator' : ''}: id ${league.id}, 1 player.`);
console.log('To get in, the commish needs two things. Both are in the Firebase console, under Firestore Database:');
console.log('  1. The league code: open the "codes" collection. The code is the name of the document there.');
console.log(`  2. The recovery key: open leagues, ${league.id}, keys. The key is the "key" field of the document there.`);
console.log('Then open the app, tap "I\'m already in a league", and enter both.');
