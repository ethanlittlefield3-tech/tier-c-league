/**
 * Makes a demo league for trying every screen: the commish and five made-up
 * players, a season in its third week, logs, goals, the schedule, dares,
 * wall posts, power-ups and a receipt waiting on the commish. Run the weekly
 * job for it straight after (the workflow does) and the standings fill in and
 * the commish spins the Wheel.
 *
 *   On GitHub:  Actions, "Demo league", Run workflow, "make"
 *   Locally:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node jobs/demo-league.ts
 *
 * It is a league of its own, marked as a demo, so a real league is never
 * touched. Like "Create a league", it never prints the code or the key,
 * because this repo's logs are public: both are in the Firebase console.
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { getFirestore } from 'firebase-admin/firestore';
import { makeRecoveryKey } from '../engine/src/ids.ts';
import { connect } from './admin.ts';
import { DEMO_PLAYERS, demoDocs } from './lib/demo.ts';
import { newLeague } from './lib/league-seed.ts';

const { app, emulator } = connect();
const db = getFirestore(app);
const random = (bytes: number) => new Uint8Array(randomBytes(bytes));

const league = newLeague({ name: 'Demo League', commishName: 'Commish', random });
const fakes = DEMO_PLAYERS.map(() => ({ id: Array.from(random(16), (byte) => 'abcdefghjkmnpqrstuvwxyz23456789'[byte % 30]).join(''), key: makeRecoveryKey(random(8)) }));
const docs = demoDocs({ league, fakes, now: Date.now(), timeZone: process.env.TIME_ZONE?.trim() || 'America/New_York' });

// The league and its code are created, never overwritten; the rest goes in batches.
const first = db.batch();
for (const { path, data } of docs.slice(0, 5)) first.create(db.doc(path), data);
await first.commit();
for (let start = 5; start < docs.length; start += 400) {
  const batch = db.batch();
  for (const { path, data } of docs.slice(start, start + 400)) batch.set(db.doc(path), data);
  await batch.commit();
}

console.log(`Demo league made${emulator ? ' in the local emulator' : ''}: id ${league.id}, ${fakes.length + 1} players, ${docs.length} documents.`);
console.log('To get in, on a computer (so your phone stays in your real league), you need two things from the Firebase console, under Firestore Database:');
console.log(`  1. The league code: open "codes" and find the document whose "league" field is ${league.id}. The code is its name.`);
console.log(`  2. The recovery key: open leagues, ${league.id}, keys, ${league.commish}. The key is its "key" field.`);
console.log('Then open the app, tap "I\'m already in a league", and enter both.');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `league=${league.id}\n`);
