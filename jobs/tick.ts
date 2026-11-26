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
import { FieldValue, Timestamp, getFirestore, type DocumentData, type DocumentSnapshot } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { addDays } from '../engine/src/calendar.ts';
import { receiptFixes, type StoredReceipt } from '../engine/src/receipts.ts';
import type { PlayerWeekData } from '../engine/src/settlement.ts';
import { fastLeagueClock, zoneClock } from '../engine/src/clock.ts';
import { weekPeriod } from '../engine/src/ids.ts';
import { connect } from './admin.ts';
import { alertsDue, timedChecks, type Alert, type AlertDay, type AlertInput } from './lib/alerts.ts';
import { activityAlerts, type ActivePost } from './lib/activity.ts';
import { deliver, type Device, type Push } from './lib/deliver.ts';
import { fastClockOf } from './lib/fast.ts';
import { closeAlerts, leadsOf, liveTotals, passedAlerts, type Lead } from './lib/live.ts';
import { offseasonAlerts, offseasonLeavers } from './lib/offseason.ts';
import type { RumbleItem } from '../engine/src/rumble.ts';
import type { Lane } from '../engine/src/scoring.ts';

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

/**
 * Each player's points so far this week, as their phones show them, for
 * "your opponent passed you" and "close finish". Only the players asked for
 * are read: about 17 documents each.
 */
async function weekTotals(input: {
  seasonRef: FirebaseFirestore.DocumentReference;
  period: string;
  days: { date: string; period: string; dayIndex: number; phase: string; start: number; lock: number }[];
  players: string[];
  /** Each player's opponent, whose Demolition is the only one that can hit them. */
  opponentOf: Record<string, string>;
  /** The week's 1v1s, and its mode: a Rumble week's totals count the items. */
  pairs: { a: string; b: string }[];
  mode: string;
  par: number;
  now: number;
}): Promise<Record<string, number>> {
  const { seasonRef, period, days, now } = input;
  const data: Record<string, PlayerWeekData & { demolitionsOn: { date: string; lane: Lane; lock: number }[] }> = {};
  for (const player of input.players) {
    const [logs, kit, ruleOnes, fixes, asked, sealed] = await Promise.all([
      db.getAll(...days.map((day) => seasonRef.collection('days').doc(`${player}_${day.date}`))),
      seasonRef.collection('kit').where('player', '==', player).where('period', '==', period).get(),
      seasonRef.collection('kit').where('player', '==', player).where('item', '==', 'ruleOne').get(),
      seasonRef.collection('adjustments').where('player', '==', player).get(),
      seasonRef.collection('receipts').where('target', '==', player).get(),
      input.opponentOf[player] ? seasonRef.collection('sealed').doc(`${period}_${input.opponentOf[player]}_demolition`).get() : null,
    ]);
    data[player] = {
      logs: Object.fromEntries(logs.filter((log) => log.exists).map((log) => [String(log.get('date')), plain(log.data()!) as unknown as PlayerWeekData['logs'][string]])),
      kit: [...kit.docs, ...ruleOnes.docs].map((play) => plain(play.data()) as unknown as PlayerWeekData['kit'][number]),
      adjustments: [
        ...fixes.docs.map((fix) => plain(fix.data()) as unknown as PlayerWeekData['adjustments'][number]),
        ...receiptFixes(asked.docs.map((receipt) => plain(receipt.data()) as unknown as StoredReceipt), now),
      ],
      demolitionsOn: [],
    };
    const hit = sealed?.exists && sealed.get('target') === player ? sealed : null;
    const lock = hit ? days.find((day) => day.date === hit.get('date'))?.lock : undefined;
    if (hit && lock !== undefined) data[player]!.demolitionsOn.push({ date: String(hit.get('date')), lane: hit.get('lane'), lock });
  }
  // A Rumble week: the items out so far, and the Boots played, for each 1v1.
  let rumble: Parameters<typeof liveTotals>[0]['rumble'] = null;
  if (input.mode === 'rumble') {
    const [items, boots] = await Promise.all([seasonRef.collection('rumble').where('period', '==', period).get(), seasonRef.collection('sealed').where('period', '==', period).where('kind', '==', 'boot').get()]);
    rumble = {
      items: Object.fromEntries(items.docs.filter((item) => now >= Number(ms(item.get('revealAt')))).map((item) => [item.id, item.get('item') as RumbleItem])),
      boots: boots.docs.map((boot) => ({ player: String(boot.get('player')), target: String(boot.get('target')), date: String(boot.get('date')), lane: boot.get('lane') as Lane })),
    };
  }
  return liveTotals({ par: input.par, days, pairs: input.pairs, data, now, rumble });
}

const only = process.env.LEAGUE_ID?.trim();
const leagues = only ? [await db.collection('leagues').doc(only).get()] : (await db.collection('leagues').get()).docs;
let totalSent = 0;

for (const league of leagues) {
  const seasonId = league.get('season');
  if (!league.exists || typeof seasonId !== 'string') continue;
  const seasonRef = league.ref.collection('seasons').doc(seasonId);
  const season = await seasonRef.get();
  // A finished season is in its offseason, and its last dares may still be open.
  if (!season.exists || !['setup', 'draft', 'active', 'finished'].includes(String(season.get('status')))) continue;

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
  const activitySince = typeof ms(state.activitySince) === 'number' ? Number(ms(state.activitySince)) : now - HOUR;
  // Reactions and comments are bundled: their posts are looked at once an hour.
  const activityDue = now - activitySince >= 55 * MIN;
  const [wall, asked, dueSoon, docks, spun, proven, changed, active, news, poked, challenged] = await Promise.all([
    league.ref.collection('wall').where('at', '>', after).get(),
    seasonRef.collection('receipts').where('requestedAt', '>', after).get(),
    seasonRef.collection('receipts').where('deadline', '>', stamp(since + HOUR)).where('deadline', '<=', stamp(now + HOUR)).get(),
    seasonRef.collection('adjustments').where('at', '>', after).get(),
    seasonRef.collection('spins').where('at', '>', after).get(),
    seasonRef.collection('spins').where('proofAt', '>', after).get(),
    seasonRef.collection('days').where('updatedAt', '>', after).get(),
    activityDue ? league.ref.collection('wall').where('activityAt', '>', stamp(activitySince)).get() : null,
    league.ref.collection('feed').where('at', '>', after).get(),
    seasonRef.collection('pokes').where('at', '>', after).get(),
    seasonRef.collection('rematches').where('at', '>', after).get(),
  ]);
  const today = calendar.find((day) => day.date === clock.dateOf(now)) ?? calendar.at(-1);
  // In the playoffs, and once the season is over, the rounds too: their Demolitions, results and champion.
  const rounds = (today as { phase?: string } | undefined)?.phase === 'playoff' || season.get('status') === 'finished' ? ['p01', 'p02', 'p03'] : [];
  const weekIds = [...(today ? [today.week, today.week - 1].filter((week) => week >= 1).map(weekPeriod) : []), ...rounds];
  const weeks = (weekIds.length ? docs(await db.getAll(...weekIds.map((id) => seasonRef.collection('weeks').doc(id)))) : []) as unknown as AlertInput['weeks'];
  const revealed = Array.isArray(state.revealed) ? (state.revealed as string[]) : [];
  const held = (state.held ?? {}) as Record<string, Alert[]>;
  const draftAt = typeof ms(season.get('draftAt')) === 'number' ? Number(ms(season.get('draftAt'))) : null;

  const reveals = weeks.flatMap((week) => (week.reveals ?? []).filter((reveal) => reveal.at <= now));
  const newReveals = reveals.filter((reveal) => !revealed.includes(`reveal-${reveal.player}-${reveal.date}`));
  const finalNow = weeks.some((week) => typeof week.finalAt === 'number' && since < week.finalAt && week.finalAt <= now);
  const draftNow = draftAt !== null && ((since < draftAt - HOUR && draftAt - HOUR <= now) || (since < draftAt && draftAt <= now));
  // This week's matchups, for "your opponent passed you" and "close finish".
  const thisWeek = weeks.find((week) => week.id === today?.period) as (AlertInput['weeks'][number] & { pairs?: { a: string; b: string }[] }) | undefined;
  const pairs = (thisWeek?.pairs ?? []).filter((pair) => pair.a !== 'HOUSE' && pair.b !== 'HOUSE');
  // With no day today (the offseason), nothing carries over.
  const leadsBefore = today && (state.leads as { period?: string; map?: Record<string, Lead> } | undefined)?.period === today.period ? ((state.leads as { map?: Record<string, Lead> }).map ?? {}) : {};
  const moved = new Set([
    ...changed.docs.map((day) => String(day.get('player'))),
    ...newReveals.map((reveal) => reveal.target),
    ...docks.docs.map((dock) => String(dock.get('player'))),
  ]);
  const passedPairs = pairs.filter((pair) => moved.has(pair.a) || moved.has(pair.b));
  const closeNow = checks.some((check) => check.kind === 'close' && check.day.period === today?.period);

  // The offseason (SCOPE.md, "Seasons"): everyone is asked to stay or leave by
  // the commish's deadline, and at the deadline the leavers come off the
  // roster. Their profile and history stay; their phones are signed out, and
  // the commish can bring them back with a new key.
  const offseasonDoc = season.get('status') === 'finished' ? await seasonRef.collection('config').doc('offseason').get() : null;
  let offseason: Alert[] = [];
  // Once its deadline has passed and the leavers are off, there is nothing more to read.
  if (offseasonDoc?.exists && offseasonDoc.get('closedAt') == null) {
    const answers = Object.fromEntries((await seasonRef.collection('stays').get()).docs.map((found) => [found.id, String(found.get('choice'))]));
    const input = {
      season: seasonId,
      seasonName: String(season.get('name') ?? 'The season'),
      deadline: Number(ms(offseasonDoc.get('deadline'))),
      openedAt: Number(ms(offseasonDoc.get('at'))),
      clock,
      members: Object.keys((league.get('members') ?? {}) as Record<string, boolean>),
      commish: String(league.get('commish')),
      answers,
    };
    offseason = offseasonAlerts({ ...input, since, now });
    const leavers = offseasonLeavers({ ...input, now, done: false });
    if (leavers) {
      const batch = db.batch();
      const changes: Record<string, unknown> = {};
      for (const player of leavers) {
        changes[`members.${player}`] = FieldValue.delete();
        changes[`former.${player}`] = seasonId;
        const keyRef = league.ref.collection('keys').doc(player);
        const old = String((await keyRef.get()).get('key') ?? '');
        batch.set(keyRef, { key: '', prev: old, rotatedAt: FieldValue.serverTimestamp() }, { merge: true });
        if (old) batch.delete(league.ref.collection('lookup').doc(old));
        batch.set(league.ref.collection('feed').doc(`left_${seasonId}_${player}`), { at: FieldValue.serverTimestamp(), kind: 'left', player, data: { season: seasonId } });
      }
      if (leavers.includes(String(league.get('coCommish')))) changes.coCommish = null;
      if (leavers.length > 0) batch.update(league.ref, changes);
      batch.update(offseasonDoc.ref, { closedAt: FieldValue.serverTimestamp(), left: leavers });
      await batch.commit();
      console.log(`League ${league.id}, season ${seasonId}: the offseason deadline passed, ${leavers.length} left.`);
    }
  }
  const anything =
    offseason.length > 0 || checks.length > 0 || !wall.empty || !asked.empty || !dueSoon.empty || !docks.empty || !spun.empty || !proven.empty || newReveals.length > 0 || finalNow || draftNow || passedPairs.length > 0 || (active !== null && !active.empty) || !news.empty || !poked.empty || !challenged.empty || Object.keys(held).length > 0;
  let leadsAfter: Record<string, Lead> = leadsBefore;
  let closeSent = today && (state.closeSent as { period?: string; players?: string[] } | undefined)?.period === today.period ? ((state.closeSent as { players?: string[] }).players ?? []) : [];
  let seen = (state.seen ?? {}) as Record<string, number>;

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
    const periods = [...new Set(checks.filter((check) => check.kind !== 'log' && check.kind !== 'mode' && check.kind !== 'rumble').map((check) => check.day.period))];
    const kit = periods.length
      ? [
          ...(await Promise.all(periods.map((period) => seasonRef.collection('kit').where('period', '==', period).get()))).flatMap((snapshot) => snapshot.docs.map((play) => plain(play.data()))),
          ...(await seasonRef.collection('kit').where('item', '==', 'ruleOne').get()).docs.map((play) => plain(play.data())),
        ]
      : [];
    const issued = (season.get('ruleOneIssue') ?? []) as unknown[];
    // At 8 am in a Rumble week, everyone's item for the day.
    const rumbleDates = checks.filter((check) => check.kind === 'rumble').map((check) => check.day.date);
    const rumbleItems = rumbleDates.length ? docs(await db.getAll(...rumbleDates.flatMap((date) => members.map((player) => seasonRef.collection('rumble').doc(`${date}_${player}`))))) : [];
    // At 7 pm on Sunday, next week, for its group-play mode.
    const modeCheck = checks.find((check) => check.kind === 'mode');
    const nextWeek = modeCheck ? await seasonRef.collection('weeks').doc(weekPeriod((modeCheck.day as AlertDay & { week: number }).week + 1)).get() : null;

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
      pokes: poked.docs.map((poke) => ({ id: poke.id, ...plain(poke.data()) })) as unknown as AlertInput['pokes'],
      rematches: challenged.docs.map((race) => ({ id: race.id, ...plain(race.data()) })) as unknown as AlertInput['rematches'],
      receipts: [...new Map([...asked.docs, ...dueSoon.docs].map((receipt) => [receipt.id, { id: receipt.id, ...plain(receipt.data()) }])).values()] as unknown as AlertInput['receipts'],
      docks: docks.docs.map((dock) => ({ id: dock.id, ...plain(dock.data()) })) as unknown as AlertInput['docks'],
      weeks,
      revealed,
      spins: [...new Map([...spun.docs, ...proven.docs].map((spin) => [spin.id, { id: spin.id, ...plain(spin.data()) }])).values()].map((spin) => ({ proofAt: null, ...spin })) as unknown as AlertInput['spins'],
      draftAt,
      news: news.docs.map((item) => ({ id: item.id, ...plain(item.data()) })) as unknown as AlertInput['news'],
      nextWeek: nextWeek?.exists ? ({ id: nextWeek.id, ...plain(nextWeek.data()!) } as unknown as AlertInput['nextWeek']) : null,
      rumbleItems: Object.fromEntries(rumbleItems.map((item) => [item.id, String((item as { item?: unknown }).item)])),
    };
    alerts = [...alertsDue(input), ...offseason];

    // Live scores: the matchups a change touched, or every one at 6 pm on the weekend.
    const livePairs = closeNow ? pairs : passedPairs;
    if (today && livePairs.length > 0) {
      const periodDays = docs((await seasonRef.collection('calendar').where('period', '==', today.period).get()).docs) as unknown as { date: string; period: string; dayIndex: number; phase: string; start: number; lock: number }[];
      periodDays.sort((a, b) => a.start - b.start);
      const opponentOf: Record<string, string> = Object.fromEntries(pairs.flatMap((pair) => [[pair.a, pair.b], [pair.b, pair.a]]));
      const totals = await weekTotals({ seasonRef, period: today.period, days: periodDays, players: [...new Set(livePairs.flatMap((pair) => [pair.a, pair.b]))], opponentOf, pairs: livePairs, mode: String((thisWeek as { mode?: unknown } | undefined)?.mode ?? 'regular'), par: Number(season.get('par')), now });
      const weekEnds = periodDays.at(-1)?.lock ?? now + 24 * HOUR;
      alerts.push(...passedAlerts({ period: today.period, pairs: livePairs, before: leadsBefore, totals, names: players, now, expires: weekEnds }));
      leadsAfter = { ...leadsBefore, ...leadsOf(livePairs, totals) };
      if (closeNow) {
        const close = closeAlerts({ period: today.period, pairs, totals, names: players, expires: weekEnds }).filter((alert) => !closeSent.includes(alert.player));
        alerts.push(...close);
        closeSent = [...closeSent, ...close.map((alert) => alert.player)];
      }
    }

    // Reactions and comments on each author's posts, once an hour.
    if (active && !active.empty) {
      const posts = active.docs.map((post) => ({ id: post.id, ...plain(post.data()) })) as unknown as ActivePost[];
      const comments = (
        await Promise.all(posts.map((post) => league.ref.collection('wall').doc(post.id).collection('comments').where('at', '>', stamp(activitySince)).get()))
      ).flatMap((snapshot, index) => snapshot.docs.map((comment) => ({ post: posts[index]!.id, by: String(comment.get('by')) })));
      const out = activityAlerts({ posts, comments, seen, players, now });
      alerts.push(...out.alerts);
      seen = out.seen;
    }

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
    activitySince: stamp(activityDue ? now : activitySince),
    leads: { period: today?.period ?? null, map: leadsAfter },
    closeSent: { period: today?.period ?? null, players: closeSent },
    // Reaction counts for the most recent posts only.
    seen: Object.fromEntries(Object.entries(seen).slice(-300)),
    held: nextHeld,
    revealed: [...new Set([...revealed, ...reveals.map((reveal) => `reveal-${reveal.player}-${reveal.date}`)])].slice(-500),
    updatedAt: stamp(now),
  });
  if (alerts.length > 0 || pushes.length > 0 || Object.keys(nextHeld).length > 0) {
    console.log(`League ${league.id}: ${alerts.length} alerts, ${pushes.length} pushes, ${Object.values(nextHeld).flat().length} held, ${gone.length} phones signed out of alerts.`);
  }
}

console.log(`Done: ${totalSent} push${totalSent === 1 ? '' : 'es'} sent${emulator ? ' (printed: the local emulator sends nothing)' : ''}.`);
