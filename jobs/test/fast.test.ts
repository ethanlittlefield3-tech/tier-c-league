import { describe, expect, it } from 'vitest';
import { BOT_PHOTO, botMoves, type BotState } from '../lib/bots.ts';
import { FAST_BOTS, fastClockOf, fastDocs } from '../lib/fast.ts';
import { newLeague } from '../lib/league-seed.ts';
import { seasonSync } from '../lib/season-sync.ts';

const MIN = 60_000;
const NOW = Date.UTC(2027, 0, 6, 15); // a Wednesday afternoon in New York
let seed = 1;
const random = (bytes: number) => Uint8Array.from({ length: bytes }, () => (seed = (seed * 48271) % 2147483647) % 256);
const league = newLeague({ name: 'Fast Test League', commishName: 'Commish', random });
const bots = FAST_BOTS.map((_, n) => ({ id: `bot${n + 1}`, key: `TCL-BBBB-BBB${n + 2}` }));
const docs = fastDocs({ league, bots, now: NOW, dayMinutes: 8, leadMinutes: 5, timeZone: 'America/New_York' });
const at = (path: string) => docs.find((doc) => doc.path === path)?.data as Record<string, unknown>;
const season = `leagues/${league.id}/seasons/s1`;

describe('Making the fast test league', () => {
  it('It is a demo league of its own, closed to new players, with the commish and three made-up players', () => {
    const root = at(`leagues/${league.id}`);
    expect(root.demo).toBe(true);
    expect(root.joining).toBe('closed');
    expect(Object.keys(root.members as object).sort()).toEqual([league.commish, 'bot1', 'bot2', 'bot3'].sort());
    expect(at(`leagues/${league.id}/players/bot1`).displayName).toBe(FAST_BOTS[0]!.name);
  });

  it('Its season runs on a fast clock: Monday of Week 1 starts a few minutes after it is made, and each day lasts 8 minutes', () => {
    const settings = at(season);
    expect(settings.status).toBe('active');
    expect(settings.fast).toEqual({ startsAt: new Date(NOW + 5 * MIN), dayMinutes: 8, bots: ['bot1', 'bot2', 'bot3'] });
    const monday = at(`${season}/calendar/${String(settings.kickoff)}`);
    expect(monday.start).toEqual(new Date(NOW + 5 * MIN));
    expect(monday.lock).toEqual(new Date(NOW + 5 * MIN + 12 * MIN));
    // Rule One arrives at the start of Week 1, on the same clock.
    expect(settings.ruleOneIssue).toEqual([new Date(NOW + 5 * MIN)]);
  });

  it('The draft is done and the schedule is set: the commish faces the first made-up player in Week 1', () => {
    const week1 = at(`${season}/weeks/w01`);
    expect(week1.pairs).toContainEqual({ a: league.commish, b: 'bot1' });
    expect(at(`${season}/draft/state`).step).toBe('done');
    expect(at(`${season}/roster/${league.commish}`).goals).toBeTruthy();
  });

  it('The fast clock only ever counts in a demo league', () => {
    expect(fastClockOf({ demo: true }, { fast: { startsAt: 5, dayMinutes: 8, bots: ['bot1'] } })).toEqual({ startsAt: 5, dayMinutes: 8, bots: ['bot1'] });
    expect(fastClockOf({}, { fast: { startsAt: 5, dayMinutes: 8, bots: ['bot1'] } })).toBeNull();
    expect(fastClockOf({ demo: true }, {})).toBeNull();
    expect(fastClockOf({ demo: true }, { fast: { startsAt: 5, dayMinutes: 0 } })).toBeNull();
  });

  it('The calendar job leaves a fast season alone', () => {
    const settings = at(season);
    const sync = seasonSync({ settings: { status: 'active', kickoff: String(settings.kickoff), regularWeeks: 3, timeZone: 'America/New_York', fast: true }, existing: [], ruleOneIssue: null });
    expect(sync.skip).toBe('fast test season');
    expect(sync.write).toEqual([]);
  });
});

// A week on an 8-minute clock, from a Monday that starts at T.
const T = Date.UTC(2027, 0, 4, 12);
const DAY = 8 * MIN;
const dates = ['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08', '2027-01-09', '2027-01-10'];
const calendar = dates.map((date, dayIndex) => {
  const start = T + dayIndex * DAY;
  return { date, period: 'w01', week: 1, dayIndex, start, sixPm: start + 0.75 * DAY, end: start + DAY, lock: start + 1.5 * DAY, nextEnd: start + 2 * DAY };
});
const state = (now: number, extra: Partial<BotState> = {}): BotState => ({
  now,
  calendar,
  bots: ['bot1', 'bot2', 'bot3'],
  watcher: 'me',
  days: {},
  kit: [],
  sealed: [],
  targets: { w01: { me: ['bot1'], bot1: ['me'], bot2: ['bot3'], bot3: ['bot2'] } },
  draws: [],
  spins: {},
  votes: [],
  slots: [],
  wall: [],
  ...extra,
});
const paths = (moves: ReturnType<typeof botMoves>) => moves.map((move) => move.path);

describe('The made-up players', () => {
  it('Each logs their day at their own time of day: early, midday or late', () => {
    expect(paths(botMoves(state(T + 0.2 * DAY)))).toContain('days/bot1_2027-01-04');
    expect(paths(botMoves(state(T + 0.2 * DAY)))).not.toContain('days/bot2_2027-01-04');
    expect(paths(botMoves(state(T + 0.7 * DAY)))).toEqual(expect.arrayContaining(['days/bot1_2027-01-04', 'days/bot2_2027-01-04', 'days/bot3_2027-01-04']));
  });

  it('A day is logged once, and a late log still lands before the lock, but never after', () => {
    const logged = { 'bot1_2027-01-04': { goals: { mind: true, body: true, wildcard: true } } };
    expect(paths(botMoves(state(T + 0.7 * DAY, { days: logged })))).not.toContain('days/bot1_2027-01-04');
    expect(paths(botMoves(state(T + 1.2 * DAY)))).toContain('days/bot3_2027-01-04');
    expect(paths(botMoves(state(T + 1.6 * DAY)))).not.toContain('days/bot3_2027-01-04');
  });

  it('A log has the shape the app saves: three goals, screen time, beers and its times', () => {
    const log = botMoves(state(T + 0.2 * DAY)).find((move) => move.path === 'days/bot1_2027-01-04')!;
    expect(log.data).toEqual({
      player: 'bot1',
      date: '2027-01-04',
      goals: { mind: true, body: true, wildcard: true },
      screenMinutes: 60,
      beers: 0,
      firstAt: new Date(T + 0.2 * DAY),
      updatedAt: new Date(T + 0.2 * DAY),
    });
  });

  it("The first made-up player sets a Demolition on the commish's Wednesday, before it starts, sealed until it locks", () => {
    const moves = botMoves(state(T + 0.6 * DAY));
    const demolition = moves.find((move) => move.path === 'sealed/w01_bot1_demolition');
    expect(demolition?.data).toMatchObject({ kind: 'demolition', player: 'bot1', period: 'w01', target: 'me', date: '2027-01-06', lane: 'body', revealAt: new Date(calendar[2]!.lock) });
    expect(paths(botMoves(state(T + 0.6 * DAY, { sealed: ['w01_bot1_demolition'] })))).not.toContain('sealed/w01_bot1_demolition');
    expect(paths(botMoves(state(T + 2.1 * DAY)))).not.toContain('sealed/w01_bot1_demolition');
  });

  it('The second sets Aerial on Thursday, and the third uses Full Boost on a missed goal on Friday', () => {
    expect(botMoves(state(T + 1.1 * DAY)).find((move) => move.path === 'kit/w01_bot2_aerial')?.data).toMatchObject({ player: 'bot2', item: 'aerial', period: 'w01', date: '2027-01-07' });
    expect(paths(botMoves(state(T + 3.1 * DAY)))).not.toContain('kit/w01_bot2_aerial');
    expect(botMoves(state(T + 4.8 * DAY)).find((move) => move.path === 'kit/w01_bot3_fullBoost')?.data).toMatchObject({ player: 'bot3', item: 'fullBoost', period: 'w01', date: '2027-01-08', lane: 'wildcard' });
  });

  it("The commish's opponent taunts them once, as Week 1 starts", () => {
    const taunt = botMoves(state(T + 0.05 * DAY)).find((move) => move.path === 'wall/fast-taunt');
    expect(taunt).toMatchObject({ under: 'league', data: { by: 'bot1', kind: 'quick', to: 'me', deleted: false } });
    expect(paths(botMoves(state(T + 0.05 * DAY, { wall: ['fast-taunt'] })))).not.toContain('wall/fast-taunt');
  });

  it('On Wednesday they ask the commish for receipts on a goal claimed that day, due as the app works it out', () => {
    const days = { 'me_2027-01-06': { goals: { mind: false, body: true, wildcard: false } } };
    const moves = botMoves(state(T + 2.4 * DAY, { days }));
    const receipt = moves.find((move) => move.path === 'receipts/me_2027-01-06_body');
    expect(receipt?.data).toMatchObject({ target: 'me', date: '2027-01-06', square: 'body', by: 'bot1', slot: 'w01_bot1_1', proofAt: null, backedDownAt: null, deadline: new Date(calendar[2]!.end) });
    expect(moves.find((move) => move.path === 'receiptSlots/w01_bot1_1')?.data).toEqual({ receipt: 'me_2027-01-06_body' });
    // Asked once a week, and never about an unclaimed square.
    expect(paths(botMoves(state(T + 2.4 * DAY, { days, slots: ['w01_bot1_1'] })))).not.toContain('receipts/me_2027-01-06_body');
    expect(paths(botMoves(state(T + 2.4 * DAY)))).not.toContain('receipts/me_2027-01-06_body');
  });

  it("A made-up player drawn for the Wheel spins it, proves the dare with a photo, and everyone else votes it counts", () => {
    const draw = { id: 'w01_bot3_1', player: 'bot3', period: 'w01', drawnAt: T + 8 * DAY, dueAt: T + 14 * DAY };
    expect(botMoves(state(T + 8.1 * DAY, { draws: [draw] })).find((move) => move.path === 'spins/w01_bot3_1')).toBeUndefined();
    expect(botMoves(state(T + 8.3 * DAY, { draws: [draw] })).find((move) => move.path === 'spins/w01_bot3_1')?.data).toEqual({ player: 'bot3', period: 'w01', at: new Date(T + 8.3 * DAY), proofAt: null });

    const spun = { 'w01_bot3_1': { at: T + 8.3 * DAY, proofAt: null } };
    const proving = botMoves(state(T + 8.7 * DAY, { draws: [draw], spins: spun }));
    expect(proving.find((move) => move.path === 'dareProofs/w01_bot3_1')?.data).toEqual({ photo: BOT_PHOTO, at: new Date(T + 8.7 * DAY) });
    expect(proving.find((move) => move.path === 'spins/w01_bot3_1')).toMatchObject({ merge: true, data: { proofAt: new Date(T + 8.7 * DAY) } });

    const proven = { 'w01_bot3_1': { at: T + 8.3 * DAY, proofAt: T + 8.7 * DAY } };
    const voting = botMoves(state(T + 8.9 * DAY, { draws: [draw], spins: proven }));
    expect(paths(voting)).toEqual(expect.arrayContaining(['votes/bot1_proof_w01_bot3_1', 'votes/bot2_proof_w01_bot3_1']));
    expect(paths(voting)).not.toContain('votes/bot3_proof_w01_bot3_1');
    expect(voting.find((move) => move.path === 'votes/bot1_proof_w01_bot3_1')?.data).toEqual({ voter: 'bot1', kind: 'proof', player: 'bot3', draw: 'w01_bot3_1', choice: 'counts', at: new Date(T + 8.9 * DAY) });
  });

  it("They vote on the commish's dare proof too, but never spin for the commish", () => {
    const draw = { id: 'w01_me_1', player: 'me', period: 'w01', drawnAt: T + 8 * DAY, dueAt: T + 14 * DAY };
    expect(paths(botMoves(state(T + 9 * DAY, { draws: [draw] })))).not.toContain('spins/w01_me_1');
    const proven = { 'w01_me_1': { at: T + 8.5 * DAY, proofAt: T + 8.8 * DAY } };
    expect(paths(botMoves(state(T + 9 * DAY, { draws: [draw], spins: proven })))).toEqual(expect.arrayContaining(['votes/bot1_proof_w01_me_1', 'votes/bot2_proof_w01_me_1', 'votes/bot3_proof_w01_me_1']));
  });

  it('The proof photo is a small JPEG, as the app sends', () => {
    expect(BOT_PHOTO.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(BOT_PHOTO.length).toBeLessThan(420_000);
  });
});
