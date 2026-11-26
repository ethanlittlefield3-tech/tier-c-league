/**
 * The commish's tools. Every one of these saves carries a new audit entry the
 * whole league can read, and the security rules refuse any that doesn't
 * (firebase/firestore.rules, "audited").
 */
import { bountyText, makeRecoveryKey, receiptFixes, settleDue, weekPlayers, type BountyTarget, type GroupWeekInput, type HolidayEvent, type Lane, type RumbleItem, type PlayerWeekData, type Square, type StoredReceipt, type WeekLineStored, type WeekMode } from '@tcl/engine';
import { Timestamp, collection, deleteField, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch, type Firestore } from 'firebase/firestore';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';
import { plain } from './live.ts';

const freshKey = () => makeRecoveryKey(crypto.getRandomValues(new Uint8Array(8)));

async function attempt<T>(work: (db: Firestore) => Promise<T>): Promise<T> {
  try {
    const { db } = await connect();
    return await work(db);
  } catch (error) {
    throw trouble(error);
  }
}

function auditEntry(me: Me, action: string, target: string, reason: string) {
  return { by: me.player, at: serverTimestamp(), action, target, reason: reason.trim().slice(0, 500) };
}

/** A player's current recovery key. Only the player and the commish can read it. */
export const keyOf = (me: Me, player: string) =>
  attempt(async (db) => String((await getDoc(doc(db, 'leagues', me.league, 'keys', player))).data()?.key ?? ''));

/**
 * Gives a player a new key. Every phone they are signed in on is signed out,
 * which is also how a lost phone is signed out. Resolves to the new key.
 */
export const reissueKey = (me: Me, player: string, reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const old = String((await getDoc(doc(league, 'keys', player))).data()?.key ?? '');
    const key = freshKey();
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(doc(league, 'keys', player), { key, prev: old, rotatedAt: serverTimestamp(), audit });
    if (old) save.delete(doc(league, 'lookup', old));
    save.set(doc(league, 'lookup', key), { player });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'key.reissue', `keys/${player}`, reason));
    await save.commit();
    return key;
  });

/** Changes the league document: who may join, the co-commish, or who is commish. */
export const editLeague = (me: Me, changes: { joining?: 'open' | 'approval' | 'closed'; coCommish?: string | null; commish?: string }, reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(league, { ...changes, audit });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'league.settings', 'league', reason));
    await save.commit();
  });

/**
 * Marks a player as left (ruling R14): off the member list, their key blanked
 * so no phone of theirs gets back in, and on the list of former players, with
 * the season they left in, so the commish can bring them back. Their
 * matchups stay on the schedule and score as if they did nothing.
 */
export const removePlayer = (me: Me, player: string, reason: string, season: string | null = null) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const old = String((await getDoc(doc(league, 'keys', player))).data()?.key ?? '');
    const leagueAudit = doc(collection(league, 'audit')).id;
    const keyAudit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(league, { [`members.${player}`]: deleteField(), [`former.${player}`]: season ?? '', audit: leagueAudit });
    save.set(doc(league, 'audit', leagueAudit), auditEntry(me, 'league.settings', 'league', reason));
    save.update(doc(league, 'keys', player), { key: '', prev: old, rotatedAt: serverTimestamp(), audit: keyAudit });
    if (old) save.delete(doc(league, 'lookup', old));
    save.set(doc(league, 'audit', keyAudit), auditEntry(me, 'key.reissue', `keys/${player}`, reason));
    await save.commit();
  });

/** Docks points, voids a square, or enters a correction on a player's day. A reason is required. */
export const adjustScore = (me: Me, season: string, input: { player: string; date: string; amount: number; void: Square | null; reason: string }) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const adjustment = doc(collection(league, 'seasons', season, 'adjustments'));
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.set(adjustment, {
      player: input.player,
      date: input.date,
      amount: input.amount,
      void: input.void,
      reason: input.reason.trim(),
      by: me.player,
      at: serverTimestamp(),
      audit,
    });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'score.adjust', `adjustments/${adjustment.id}`, input.reason));
    await save.commit();
  });

/** Unlocks a final week, so the weekly job counts it again with any late fixes. It goes final again after. */
export const unlockWeek = (me: Me, season: string, period: string, reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(doc(league, 'seasons', season, 'weeks', period), { status: 'provisional', audit });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'week.unlock', `weeks/${period}`, reason));
    await save.commit();
  });

type SettleDays = Parameters<typeof settleDue>[0]['days'];
type Demolition = Parameters<typeof settleDue>[0]['demolitions'][number];

/**
 * Settles a finished week on this phone, for when the weekly job runs late
 * (SCOPE.md, "Commish tools"). It reads what the job reads and counts it with
 * the same engine code. The results post as provisional: the job counts the
 * week again when it runs, and only the job makes a week final. Resolves to
 * false if the week's Sunday hasn't locked yet.
 */
export const settleWeekNow = (me: Me, season: string, period: string, reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const seasonRef = doc(league, 'seasons', season);
    const [settings, weekDoc, calendar, weeks, leagueDoc] = await Promise.all([
      getDoc(seasonRef),
      getDoc(doc(seasonRef, 'weeks', period)),
      getDocs(query(collection(seasonRef, 'calendar'), where('period', '==', period))),
      getDocs(collection(seasonRef, 'weeks')),
      getDoc(league),
    ]);
    const week = weekDoc.data() ?? {};
    const pairs = (week.pairs ?? []) as { a: string; b: string }[];
    // A group-play week's mode and what it plays with: squads, duos, the Bounty or the whole roster.
    const group: GroupWeekInput = { mode: (week.mode ?? 'regular') as WeekMode, teams: week.teams ?? null, duos: week.duos ?? null, bounty: week.bounty ?? null, roster: week.roster ?? null };
    const playing = weekPlayers({ ...group, pairs });
    const days = calendar.docs.map((day) => plain(day.data())) as SettleDays;
    const sunday = days.find((day) => day.dayIndex === 6);
    if (playing.length === 0 || !sunday) return false;

    const now = Date.now();
    const players: Record<string, PlayerWeekData> = {};
    const demolitions: Demolition[] = [];
    await Promise.all(
      playing.map(async (player) => {
        const [logs, kit, fixes, asked, demolition] = await Promise.all([
          Promise.all(days.map((day) => getDoc(doc(seasonRef, 'days', `${player}_${day.date}`)))),
          getDocs(query(collection(seasonRef, 'kit'), where('player', '==', player))),
          getDocs(query(collection(seasonRef, 'adjustments'), where('player', '==', player))),
          getDocs(query(collection(seasonRef, 'receipts'), where('target', '==', player))),
          // One Demolition a week at most, readable by everyone once its day locks.
          // The rules refuse a missing one the same way, so a refusal means none.
          getDoc(doc(seasonRef, 'sealed', `${period}_${player}_demolition`)).catch(() => null),
        ]);
        players[player] = {
          logs: Object.fromEntries(logs.filter((log) => log.exists()).map((log) => [String(log.get('date')), plain(log.data()) as PlayerWeekData['logs'][string]])),
          kit: kit.docs.map((play) => plain(play.data()) as PlayerWeekData['kit'][number]),
          adjustments: [
            ...fixes.docs.map((fix) => plain(fix.data()) as PlayerWeekData['adjustments'][number]),
            // Receipts count like the commish's fixes: backed down, or failed once the deadline passes.
            ...receiptFixes(asked.docs.map((receipt) => plain(receipt.data()) as StoredReceipt), now),
          ],
        };
        if (demolition?.exists()) demolitions.push(plain(demolition.data()) as Demolition);
      }),
    );

    // A Rumble week's items and Boots, each readable once its day has started or locked.
    if (group.mode === 'rumble') {
      const items: Record<string, RumbleItem> = {};
      const boots: { player: string; target: string; date: string; lane: Lane }[] = [];
      await Promise.all(
        days.flatMap((day) =>
          playing.map(async (player) => {
            const [item, kicked] = await Promise.all([
              getDoc(doc(seasonRef, 'rumble', `${day.date}_${player}`)).catch(() => null),
              getDoc(doc(seasonRef, 'sealed', `boot_${day.date}_${player}`)).catch(() => null),
            ]);
            if (item?.exists()) items[item.id] = item.get('item') as RumbleItem;
            if (kicked?.exists()) boots.push({ player, target: String(kicked.get('target')), date: day.date, lane: kicked.get('lane') as Lane });
          }),
        ),
      );
      group.rumble = { items, boots };
    }

    // Each player's points in the earlier final weeks, oldest first, for the Bust.
    const earlier: Record<string, number[]> = {};
    for (const found of weeks.docs.map((each) => each.data()).filter((each) => each.status === 'final' && Number(each.week) < Number(week.week)).sort((a, b) => Number(a.week) - Number(b.week))) {
      for (const line of (found.lines ?? []) as WeekLineStored[]) (earlier[line.player] ??= []).push(line.points);
    }

    const data = settings.data() ?? {};
    // Players marked as left (ruling R14) play on as no-shows, out of the awards.
    const away = Object.keys((leagueDoc.data()?.former ?? {}) as Record<string, string>);
    const settled = settleDue({ ...group, week: Number(week.week), period, par: Number(data.par), timeZone: String(data.timeZone), days, pairs, players, demolitions, earlier, away, now });
    if (!settled) return false;

    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(doc(seasonRef, 'weeks', period), {
      status: 'provisional',
      results: settled.results,
      house: settled.house,
      awards: settled.awards,
      lines: settled.lines,
      group: settled.group,
      sunday: sunday.date,
      ...(week.settledAt ? {} : { settledAt: serverTimestamp() }),
      audit,
    });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'week.settle', `weeks/${period}`, reason));
    await save.commit();
    return true;
  });

/**
 * A group-play week's settings, until it starts on its Monday: a Bounty
 * Week's target, or whether a 2v2 week's duos are drawn at random or as
 * frenemies. Each goes in the audit log.
 */
export const setGroupPlay = (me: Me, season: string, period: string, change: { bounty: BountyTarget } | { pairing: 'random' | 'frenemies' }) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const reason = 'bounty' in change ? `Bounty target: ${bountyText(change.bounty)}` : `2v2 duos: ${change.pairing === 'frenemies' ? 'frenemies' : 'a random draw'}`;
    const save = writeBatch(db);
    save.update(doc(league, 'seasons', season, 'weeks', period), { ...change, audit });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'week.groupPlay', `weeks/${period}`, reason));
    await save.commit();
  });

/** Takes a player's dare off the Wheel. Draws already made keep their wheel. */
export const removeDare = (me: Me, season: string, player: string, reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(doc(league, 'seasons', season, 'dares', player), { removed: true, audit });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'dare.remove', `dares/${player}`, reason));
    await save.commit();
  });

/** Which of the 8 starter dares are off the Wheel, by their place in the list. */
export const setRemovedStarters = (me: Me, season: string, removedStarters: number[], reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.set(doc(league, 'seasons', season, 'config', 'wheel'), { removedStarters: [...new Set(removedStarters)].sort(), audit });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'wheel.starters', 'config/wheel', reason));
    await save.commit();
  });

/** Lets someone in who asked to join, or turns them away. Either way it goes in the league log. */
export const answerJoin = (me: Me, uid: string, name: string, letIn: boolean) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(doc(league, 'joinRequests', uid), letIn ? { approved: true, audit } : { declined: true, audit });
    save.set(doc(league, 'audit', audit), auditEntry(me, letIn ? 'join.approve' : 'join.decline', `joinRequests/${uid}`, letIn ? `Let ${name} in` : `Turned ${name} away`));
    await save.commit();
  });

/**
 * The Season Dare the Whiff Bowl's loser does (SCOPE.md, "Playoffs"): the
 * commish picks it from the pool before the playoffs are seeded. It goes in
 * the audit log.
 */
export const setSeasonDare = (me: Me, season: string, text: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.set(doc(league, 'seasons', season, 'config', 'seasonDare'), { text, audit });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'season.dare', 'config/seasonDare', `Season Dare: ${text}`));
    await save.commit();
  });

/**
 * Puts a holiday event on a regular-season day before it starts, changes it,
 * or takes it off with `null` (SCOPE.md, "Holiday events"). It goes in the
 * audit log.
 */
export const setHolidayEvent = (me: Me, season: string, date: string, event: HolidayEvent | null, words: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(doc(league, 'seasons', season, 'calendar', date), { event, audit });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'event.set', `calendar/${date}`, words));
    await save.commit();
  });

/** Sets or moves the offseason's Stay-or-Leave deadline (SCOPE.md, "Seasons"). It goes in the audit log. */
export const setOffseasonDeadline = (me: Me, season: string, deadline: number, words: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.set(doc(league, 'seasons', season, 'config', 'offseason'), { deadline: Timestamp.fromMillis(deadline), at: serverTimestamp(), audit });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'offseason.deadline', 'config/offseason', `Stay or leave by ${words}`));
    await save.commit();
  });

/**
 * Brings a former player back onto the roster, with a new key for their
 * phone, which the commish hands over (SCOPE.md, "Seasons": "you can return
 * in a later season"). Both changes go in the audit log. Resolves to the key.
 */
export const bringBack = (me: Me, player: string, name: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const old = String((await getDoc(doc(league, 'keys', player))).data()?.key ?? '');
    const key = freshKey();
    const leagueAudit = doc(collection(league, 'audit')).id;
    const keyAudit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(league, { [`members.${player}`]: true, [`former.${player}`]: deleteField(), audit: leagueAudit });
    save.set(doc(league, 'audit', leagueAudit), auditEntry(me, 'league.settings', 'league', `Brought ${name} back into the league`));
    save.update(doc(league, 'keys', player), { key, prev: old, rotatedAt: serverTimestamp(), audit: keyAudit });
    if (old) save.delete(doc(league, 'lookup', old));
    save.set(doc(league, 'lookup', key), { player });
    save.set(doc(league, 'audit', keyAudit), auditEntry(me, 'key.reissue', `keys/${player}`, `A new key for ${name}, back in the league`));
    await save.commit();
    return key;
  });
