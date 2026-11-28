/**
 * A season reset (the commish's request, 2026-11-28): the commish asks in
 * Commish tools, and this takes the league's current season back as if it
 * had never been set up. jobs/lib/reset.ts has the rules.
 *
 *   node jobs/reset.ts check   From the alerts workflow, every 10 minutes:
 *                              which leagues have a reset to start (for
 *                              GITHUB_OUTPUT). The "Reset a season" workflow
 *                              backs the league up, then runs the reset.
 *   node jobs/reset.ts run     LEAGUE_ID: does the reset now.
 *
 * In order: the league goes back to the season before (so no phone or job
 * uses the season any more), the season and its trophy case are deleted,
 * each profile loses what the season gave it, the feed loses the season's
 * news, the rivalry records are worked out again from the seasons left, and
 * the alerts job forgets the season's matchups. Each step can run again, so
 * a reset that stops part way is simply started again.
 *
 * Locally, with FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 set. Logs are public:
 * counts and IDs only.
 */
import { appendFileSync } from 'node:fs';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { PRACTICE_SEASON } from '../engine/src/practice.ts';
import { rivalRecords, type RivalWeek } from '../engine/src/rivalries.ts';
import { connect } from './admin.ts';
import { bannerAfter, feedToClear, previousSeason, profileReset, resetStep, type ResetProfile, type ResetRequest } from './lib/reset.ts';

const { app, emulator } = connect();
const db = getFirestore(app);
const ms = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : typeof value === 'number' ? value : null);

async function reset(id: string): Promise<void> {
  const league = db.collection('leagues').doc(id);
  const requestRef = league.collection('reset').doc('request');
  const request = await requestRef.get();
  if (!request.exists) {
    console.log(`League ${id}: no reset asked for.`);
    return;
  }
  const season = String(request.get('season') ?? '');
  const leagueDoc = await league.get();
  const seasons = (await league.collection('seasons').get()).docs;
  const found = seasons.find((each) => each.id === season);
  const current = leagueDoc.get('season') ?? null;
  // A reset that stopped part way was checked when it started: it carries on from where it got to.
  const running = request.get('status') === 'running';
  if (!running && (season === PRACTICE_SEASON || !found || found.get('practice') === true || current !== season)) {
    await requestRef.update({
      status: 'failed',
      reason: 'That season is no longer the current one, so nothing was reset.',
    });
    console.log(`League ${id}: the reset's season isn't the current one. Nothing reset.`);
    return;
  }
  await requestRef.update({
    status: 'running',
    runAt: FieldValue.serverTimestamp(),
  });

  // 1. The league goes back to the season before, with its champion's banner.
  const previousId = previousSeason(
    seasons.map((each) => each.id),
    season,
  );
  const previous = previousId ? seasons.find((each) => each.id === previousId)! : null;
  if (current === season) {
    await league.update({
      season: previousId,
      banner: bannerAfter({
        banner: leagueDoc.get('banner'),
        season,
        previous: previous ? { id: previous.id, champion: previous.get('champion') ?? null } : null,
      }),
    });
  }

  // 2. The season and everything in it, and its trophy case.
  await db.recursiveDelete(league.collection('seasons').doc(season));
  await league.collection('trophies').doc(season).delete();

  // 3. Each profile loses what the season gave it.
  const removedBadges: Record<string, string[]> = {};
  let changed = 0;
  for (const player of (await league.collection('players').get()).docs) {
    const { update, removedBadges: removed } = profileReset(player.data() as ResetProfile, season);
    if (removed.length) removedBadges[player.id] = removed;
    if (Object.keys(update).length === 0) continue;
    const write: Record<string, unknown> = { ...update };
    if (update.rank === null) write.rank = FieldValue.delete();
    if (update.stickers === null) write.stickers = FieldValue.delete();
    await player.ref.update(write);
    changed += 1;
  }

  // 4. The feed's news from the season.
  const feed = await league.collection('feed').get();
  const clear = feedToClear(
    feed.docs.map((each) => each.id),
    season,
    removedBadges,
  );
  for (const each of clear) await league.collection('feed').doc(each).delete();

  // 5. Rivalry records, worked out again from every final week of the seasons left.
  const finals: RivalWeek[] = [];
  for (const each of (await league.collection('seasons').get()).docs) {
    if (each.id === PRACTICE_SEASON || each.get('practice') === true) continue;
    for (const week of (await each.ref.collection('weeks').where('status', '==', 'final').get()).docs) {
      if (week.get('results'))
        finals.push({
          season: each.id,
          week: Number(week.get('week')),
          results: week.get('results'),
        });
    }
  }
  const records = rivalRecords(finals);
  for (const player of (await league.collection('players').get()).docs) await player.ref.update({ rivals: records[player.id] ?? {} });

  // 6. The alerts job forgets the season's matchups, so a new season's Week 1 starts clean.
  const tick = db.collection('jobs').doc(`tick_${id}`);
  if ((await tick.get()).exists)
    await tick.update({
      leads: FieldValue.delete(),
      closeSent: FieldValue.delete(),
    });

  await requestRef.delete();
  const badges = Object.values(removedBadges).reduce((sum, list) => sum + list.length, 0);
  console.log(
    `League ${id}: season ${season} reset, back to ${previousId ?? 'no season'}. ${changed} profile${changed === 1 ? '' : 's'} changed, ${badges} badge${badges === 1 ? '' : 's'} and ${clear.length} feed item${clear.length === 1 ? '' : 's'} taken off.`,
  );
}

/** For the alerts workflow: the leagues with a reset to start. */
async function check(): Promise<void> {
  const start: string[] = [];
  const now = Date.now();
  for (const league of (await db.collection('leagues').get()).docs) {
    const request = await league.ref.collection('reset').doc('request').get();
    if (!request.exists) continue;
    const read: ResetRequest = {
      status: request.get('status'),
      dispatchedAt: ms(request.get('dispatchedAt')),
      runAt: ms(request.get('runAt')),
    };
    if (resetStep({ request: read, now }) !== 'start') continue;
    await request.ref.update({ dispatchedAt: FieldValue.serverTimestamp() });
    start.push(league.id);
  }
  console.log(`Season resets: ${start.length} to start${emulator ? ' (in the local emulator)' : ''}.`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `start=${start.join(' ')}\n`);
}

const mode = process.argv[2] ?? '';
const given = process.env.LEAGUE_ID?.trim() ?? '';
if (mode === 'check') await check();
else if (mode === 'run') {
  if (!/^[A-Za-z0-9]+$/.test(given)) throw new Error('Set LEAGUE_ID to the league whose season to reset.');
  await reset(given);
} else throw new Error(`Unknown mode "${mode}": use check or run.`);
