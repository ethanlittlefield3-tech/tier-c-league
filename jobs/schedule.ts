/**
 * Builds each league's schedule once its draft is done: every regular week
 * with its matchups, and then the season goes active.
 *
 *   On GitHub:  every hour, before the season calendar (Actions, "Keep the season calendar"), and by hand
 *   Locally:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node jobs/schedule.ts
 *
 * Safe to run any number of times: the weeks and the season's move to active
 * are one save, and an active season is left alone. LEAGUE_ID limits it to
 * one league. Logs are public, so it logs counts and IDs only.
 */
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { connect } from './admin.ts';
import { scheduleDocs, type DraftState, type ScheduleResult } from './lib/schedule-docs.ts';

const { app, emulator } = connect();
const db = getFirestore(app);

const only = process.env.LEAGUE_ID?.trim();
const leagues = only ? [await db.collection('leagues').doc(only).get()] : (await db.collection('leagues').get()).docs;
let built = 0;

for (const league of leagues) {
  const seasonId = league.get('season');
  if (!league.exists || typeof seasonId !== 'string') continue;
  const seasonRef = league.ref.collection('seasons').doc(seasonId);

  // Read and write together, so a draft that changes meanwhile is read again.
  const result = await db.runTransaction<ScheduleResult | null>(async (tx) => {
    const season = await tx.get(seasonRef);
    if (!season.exists) return null;
    const draft = await tx.get(seasonRef.collection('draft').doc('state'));
    // The group-play vote, counted here, where no phone can change it.
    const votes = await tx.get(seasonRef.collection('votes').where('kind', '==', 'modes'));
    const rankings = Object.fromEntries(votes.docs.map((vote) => [String(vote.get('voter')), vote.get('ranking')]));
    const plan = scheduleDocs({
      status: season.get('status'),
      regularWeeks: season.get('regularWeeks'),
      draft: draft.exists ? (draft.data() as DraftState) : null,
      groupWeeks: season.get('groupWeeks'),
      rankings,
      commish: typeof league.get('commish') === 'string' ? String(league.get('commish')) : null,
      kickoff: season.get('kickoff'),
    });
    if ('weeks' in plan) {
      for (const week of plan.weeks) tx.set(seasonRef.collection('weeks').doc(week.id), week.data, { merge: true });
      // The season keeps each group-play week's mode, so the calendar job gives those days their power-ups.
      tx.update(seasonRef, { status: 'active', scheduledAt: FieldValue.serverTimestamp(), modes: plan.modes });
    }
    return plan;
  });
  if (result === null) continue;
  if ('skip' in result) {
    console.log(`League ${league.id}, season ${seasonId}: left alone (${result.skip}).`);
  } else {
    built += 1;
    console.log(`League ${league.id}, season ${seasonId}: ${result.weeks.length} weeks scheduled, season active.`);
  }
}

console.log(`Done: ${built} schedule${built === 1 ? '' : 's'} built${emulator ? ' in the local emulator' : ''}.`);
