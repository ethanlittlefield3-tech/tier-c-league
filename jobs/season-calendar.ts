/**
 * Keeps each league's current season calendar in step with its settings.
 *
 *   On GitHub:  every hour (Actions, "Keep the season calendar"), and by hand
 *   Locally:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node jobs/season-calendar.ts
 *
 * Safe to run any number of times: it writes only days that changed, and
 * removes days a moved kickoff left behind. LEAGUE_ID limits it to one league.
 * Logs are public, so it logs counts and IDs only.
 */
import { Timestamp, getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { connect } from './admin.ts';
import { fastClockOf } from './lib/fast.ts';
import { seasonSync } from './lib/season-sync.ts';

const { app, emulator } = connect();
const db = getFirestore(app);

/** Timestamps as milliseconds, the way the sync compares them. */
const ms = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : value);
const plain = (data: DocumentData) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value.map(ms) : ms(value)]));

const only = process.env.LEAGUE_ID?.trim();
const leagues = only ? [await db.collection('leagues').doc(only).get()] : (await db.collection('leagues').get()).docs;
let checked = 0;

for (const league of leagues) {
  const seasonId = league.get('season');
  if (!league.exists || typeof seasonId !== 'string') continue;
  const seasonRef = league.ref.collection('seasons').doc(seasonId);
  const season = await seasonRef.get();
  if (!season.exists) continue;
  checked += 1;

  const calendar = await seasonRef.collection('calendar').get();
  const issue = season.get('ruleOneIssue');
  const sync = seasonSync({
    settings: {
      status: season.get('status'),
      kickoff: season.get('kickoff'),
      regularWeeks: season.get('regularWeeks'),
      timeZone: season.get('timeZone'),
      fast: fastClockOf({ demo: league.get('demo') }, { fast: plain(season.get('fast') ?? {}) }) !== null,
    },
    existing: calendar.docs.map((day) => ({ id: day.id, data: plain(day.data()) })),
    ruleOneIssue: Array.isArray(issue) ? issue.map((at) => Number(ms(at))) : null,
  });
  if (sync.skip) {
    console.log(`League ${league.id}, season ${seasonId}: left alone (${sync.skip}).`);
    continue;
  }

  // At most 500 changes go in one save.
  const changes = [
    ...sync.write.map((day) => (batch: FirebaseFirestore.WriteBatch) => batch.set(seasonRef.collection('calendar').doc(day.id), day.data)),
    ...sync.remove.map((id) => (batch: FirebaseFirestore.WriteBatch) => batch.delete(seasonRef.collection('calendar').doc(id))),
    ...(sync.ruleOneIssue ? [(batch: FirebaseFirestore.WriteBatch) => batch.update(seasonRef, { ruleOneIssue: sync.ruleOneIssue })] : []),
  ];
  for (let start = 0; start < changes.length; start += 400) {
    const batch = db.batch();
    for (const change of changes.slice(start, start + 400)) change(batch);
    await batch.commit();
  }
  console.log(`League ${league.id}, season ${seasonId}: ${sync.write.length} days written, ${sync.remove.length} removed${sync.ruleOneIssue ? ', Rule One times set' : ''}.`);
}

console.log(`Done: ${checked} season${checked === 1 ? '' : 's'} checked${emulator ? ' in the local emulator' : ''}.`);
