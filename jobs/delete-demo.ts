/**
 * Deletes a demo league and everything in it. It refuses any league that is
 * not marked as a demo, so it can never delete a real league.
 *
 *   On GitHub:  Actions, "Demo league", Run workflow, "delete", with the league id
 *   Locally:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 DEMO_LEAGUE_ID=... node jobs/delete-demo.ts
 */
import { getFirestore } from 'firebase-admin/firestore';
import { connect } from './admin.ts';

const { app } = connect();
const db = getFirestore(app);

const id = process.env.DEMO_LEAGUE_ID?.trim() ?? '';
if (!/^[a-z0-9]{8,40}$/.test(id)) {
  console.error('Give the demo league id, the one the "make" run printed.');
  process.exit(1);
}
const league = await db.collection('leagues').doc(id).get();
if (!league.exists) {
  console.error(`No league ${id}.`);
  process.exit(1);
}
if (league.get('demo') !== true) {
  console.error(`League ${id} is not a demo league, so it is left alone.`);
  process.exit(1);
}
const code = league.get('code');
if (typeof code === 'string' && code.length > 0) await db.collection('codes').doc(code).delete();
await db.recursiveDelete(league.ref);
console.log(`Demo league ${id} deleted.`);
