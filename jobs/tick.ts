/**
 * Alerts (SCOPE.md, "Notifications"; PHASE1.md, Step 4, "tick"): every 10
 * minutes, works out which pushes came due since the last run and sends them
 * to each phone that wants them, holding them through its quiet hours.
 *
 *   On GitHub:  every 10 minutes (Actions, "Send alerts"), and by hand
 *   Locally:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node jobs/tick.ts
 *
 * It reads only what can have changed: about a dozen documents for a quiet
 * ten minutes. Its memory between runs is `jobs/tick_{league}`, which no
 * phone can read. In the local emulator nothing can be sent, so each push is
 * printed instead; on GitHub the log is public, so it prints counts only.
 * LEAGUE_ID limits it to one league.
 */
import { Timestamp, getFirestore, type DocumentData, type DocumentSnapshot } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { addDays } from '../engine/src/calendar.ts';
import { fastLeagueClock, zoneClock } from '../engine/src/clock.ts';
import { weekPeriod } from '../engine/src/ids.ts';
import { connect } from './admin.ts';
import { alertsDue, timedChecks, type Alert, type AlertDay, type AlertInput } from './lib/alerts.ts';
import { deliver, type Device, type Push } from './lib/deliver.ts';
import { fastClockOf } from './lib/fast.ts';

const MIN = 60_000;
const HOUR = 60 * MIN;
const { app, emulator } = connect();
const db = getFirestore(app);
const ms = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : value);
/** Timestamps as milliseconds, all the way down. */
const deep = (value: unknown): unknown =>
  value instanceof Timestamp
    ? value.toMillis()
    : Array.isArray(value)
      ? value.map(deep)
      : value !== null && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, deep(inner)]))
        : value;
const plain = (data: DocumentData) => deep(data) as Record<string, unknown>;
const stamp = (at: number) => Timestamp.fromMillis(at);
const docs = (snapshots: DocumentSnapshot[]) => snapshots.filter((found) => found.exists).map((found) => ({ id: found.id, ...plain(found.data()!) }));

/** A token that no longer reaches a phone: its device is signed out of alerts. */
const GONE = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'];

async function send(pushes: Push[]): Promise<{ sent: number; gone: string[] }> {
  if (pushes.length === 0) return { sent: 0, gone: [] };
  if (emulator) {
    // Nothing can be sent from the emulator, so the pushes are printed for the tests to read.
    for (const push of pushes) console.log(`push ${JSON.stringify({ device: push.device, title: push.title, body: push.body, screen: push.screen, tag: push.tag })}`);
    return { sent: pushes.length, gone: [] };
  }
  const gone: string[] = [];
  let sent = 0;
  for (let start = 0; start < pushes.length; start += 500) {
    const chunk = pushes.slice(start, start + 500);
    const result = await getMessaging(app).sendEach(
      chunk.map((push) => ({
        token: push.token,
        webpush: { headers: { Urgency: 'high', TTL: String(6 * 3600) }, data: { title: push.title, body: push.body, screen: push.screen, tag: push.tag } },
      })),
    );
    result.responses.forEach((response, index) => {
      if (response.success) sent += 1;
      else if (GONE.includes(response.error?.code ?? '')) gone.push(chunk[index]!.device);
    });
  }
  return { sent, gone };
}

const only = process.env.LEAGUE_ID?.trim();
const leagues = only ? [await db.collection('leagues').doc(only).get()] : (await db.collection('leagues').get()).docs;
let totalSent = 0;

for (const league of leagues) {
  const seasonId = league.get('season');
  if (!league.exists || typeof seasonId !== 'string') continue;
  const seasonRef = league.ref.collection('seasons').doc(seasonId);
  const season = await seasonRef.get();
  if (!season.exists || !['setup', 'draft', 'active'].includes(String(season.get('status')))) continue;

  const stateRef = db.collection('jobs').doc(`tick_${league.id}`);
  const state = (await stateRef.get()).data() ?? {};
  const now = Date.now();
  // A first run looks back 15 minutes; a job that was down looks back 6 hours at most.
  const since = typeof ms(state.since) === 'number' ? Math.max(Number(ms(state.since)), now - 6 * HOUR) : now - 15 * MIN;
  const fast = fastClockOf({ demo: league.get('demo') }, { fast: plain(season.get('fast') ?? {}) });
  const clock = fast ? fastLeagueClock(String(season.get('kickoff')), fast) : zoneClock(String(season.get('timeZone')));

  // The calendar around now: from the day before the last run to today.
  const dates: string[] = [];
  for (let date = addDays(clock.dateOf(since), -1); date <= clock.dateOf(now); date = addDays(date, 1)) dates.push(date);
  const calendarDocs = await db.getAll(...dates.map((date) => seasonRef.collection('calendar').doc(date)));
  const calendar = docs(calendarDocs) as unknown as (AlertDay & { week: number })[];
  const checks = timedChecks({ since, now, clock, calendar });

  // What happened since the last run.
  const after = stamp(since);
  const [wall, asked, dueSoon, docks, spun, proven] = await Promise.all([
    league.ref.collection('wall').where('at', '>', after).get(),
    seasonRef.collection('receipts').where('requestedAt', '>', after).get(),
    seasonRef.collection('receipts').where('deadline', '>', stamp(since + HOUR)).where('deadline', '<=', stamp(now + HOUR)).get(),
    seasonRef.collection('adjustments').where('at', '>', after).get(),
    seasonRef.collection('spins').where('at', '>', after).get(),
    seasonRef.collection('spins').where('proofAt', '>', after).get(),
  ]);
  const today = calendar.find((day) => day.date === clock.dateOf(now)) ?? calendar.at(-1);
  const weekIds = today ? [today.week, today.week - 1].filter((week) => week >= 1).map(weekPeriod) : [];
  const weeks = (weekIds.length ? docs(await db.getAll(...weekIds.map((id) => seasonRef.collection('weeks').doc(id)))) : []) as unknown as AlertInput['weeks'];
  const revealed = Array.isArray(state.revealed) ? (state.revealed as string[]) : [];
  const held = (state.held ?? {}) as Record<string, Alert[]>;
  const draftAt = typeof ms(season.get('draftAt')) === 'number' ? Number(ms(season.get('draftAt'))) : null;

  const reveals = weeks.flatMap((week) => (week.reveals ?? []).filter((reveal) => reveal.at <= now));
  const newReveals = reveals.filter((reveal) => !revealed.includes(`reveal-${reveal.player}-${reveal.date}`));
  const finalNow = weeks.some((week) => typeof week.finalAt === 'number' && since < week.finalAt && week.finalAt <= now);
  const draftNow = draftAt !== null && ((since < draftAt - HOUR && draftAt - HOUR <= now) || (since < draftAt && draftAt <= now));
  const anything = checks.length > 0 || !wall.empty || !asked.empty || !dueSoon.empty || !docks.empty || !spun.empty || !proven.empty || newReveals.length > 0 || finalNow || draftNow || Object.keys(held).length > 0;

  let alerts: Alert[] = [];
  let pushes: Push[] = [];
  let nextHeld: Record<string, Alert[]> = {};
  let gone: string[] = [];
  if (anything) {
    const members = Object.keys((league.get('members') ?? {}) as Record<string, boolean>);
    const names = docs(await db.getAll(...members.map((player) => league.ref.collection('players').doc(player))));
    const players = Object.fromEntries(names.map((player) => [player.id, String((player as { displayName?: unknown }).displayName ?? 'Player')]));

    // The timed alerts' days: each player's logs, and this week's power-ups.
    const logDates = [...new Set(checks.filter((check) => check.kind === 'log' || check.kind === 'lastCall').map((check) => check.day.date))];
    const logs = logDates.length ? docs(await db.getAll(...logDates.flatMap((date) => members.map((player) => seasonRef.collection('days').doc(`${player}_${date}`))))) : [];
    const periods = [...new Set(checks.filter((check) => check.kind !== 'log').map((check) => check.day.period))];
    const kit = periods.length
      ? [
          ...(await Promise.all(periods.map((period) => seasonRef.collection('kit').where('period', '==', period).get()))).flatMap((snapshot) => snapshot.docs.map((play) => plain(play.data()))),
          ...(await seasonRef.collection('kit').where('item', '==', 'ruleOne').get()).docs.map((play) => plain(play.data())),
        ]
      : [];
    const issued = (season.get('ruleOneIssue') ?? []) as unknown[];

    const input: AlertInput = {
      since,
      now,
      clock,
      players,
      calendar,
      logged: Object.fromEntries(logs.map((log) => [log.id, log as unknown as AlertInput['logged'][string]])),
      kit: kit as unknown as AlertInput['kit'],
      ruleOnesIssued: issued.filter((at) => Number(ms(at)) <= now).length,
      wall: wall.docs.map((post) => ({ id: post.id, ...plain(post.data()) })) as unknown as AlertInput['wall'],
      receipts: [...new Map([...asked.docs, ...dueSoon.docs].map((receipt) => [receipt.id, { id: receipt.id, ...plain(receipt.data()) }])).values()] as unknown as AlertInput['receipts'],
      docks: docks.docs.map((dock) => ({ id: dock.id, ...plain(dock.data()) })) as unknown as AlertInput['docks'],
      weeks,
      revealed,
      spins: [...new Map([...spun.docs, ...proven.docs].map((spin) => [spin.id, { id: spin.id, ...plain(spin.data()) }])).values()].map((spin) => ({ proofAt: null, ...spin })) as unknown as AlertInput['spins'],
      draftAt,
    };
    alerts = alertsDue(input);

    if (alerts.length > 0 || Object.keys(held).length > 0) {
      const found = await db.collection('devices').where('league', '==', league.id).get();
      const devices: Device[] = found.docs
        .map((device) => ({ id: device.id, ...(device.data() as Omit<Device, 'id'>) }))
        .filter((device) => members.includes(device.player));
      const out = deliver({ alerts, devices, held, now, hour: clock.hourOf(now) });
      nextHeld = out.held;

      // Only phones still signed in as their player get anything: a lost phone was signed out by a new key.
      const receiving = [...new Set(out.pushes.map((push) => push.device))];
      const signedOut: string[] = [];
      for (const id of receiving) {
        const device = devices.find((each) => each.id === id)!;
        const [claim, key] = await db.getAll(league.ref.collection('claims').doc(id), league.ref.collection('keys').doc(device.player));
        if (!claim?.exists || claim.get('player') !== device.player || claim.get('key') !== key?.get('key')) signedOut.push(id);
      }
      pushes = out.pushes.filter((push) => !signedOut.includes(push.device));
      const result = await send(pushes);
      totalSent += result.sent;
      gone = [...signedOut, ...result.gone];
      for (const id of gone) await db.collection('devices').doc(id).delete();
    }
  }

  await stateRef.set({
    since: stamp(now),
    held: nextHeld,
    revealed: [...new Set([...revealed, ...reveals.map((reveal) => `reveal-${reveal.player}-${reveal.date}`)])].slice(-500),
    updatedAt: stamp(now),
  });
  if (alerts.length > 0 || pushes.length > 0 || Object.keys(nextHeld).length > 0) {
    console.log(`League ${league.id}: ${alerts.length} alerts, ${pushes.length} pushes, ${Object.values(nextHeld).flat().length} held, ${gone.length} phones signed out of alerts.`);
  }
}

console.log(`Done: ${totalSent} push${totalSent === 1 ? '' : 'es'} sent${emulator ? ' (printed: the local emulator sends nothing)' : ''}.`);
