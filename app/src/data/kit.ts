/**
 * Playing power-ups and moving the rest day. Each one is a single document
 * with a fixed name, which is how the security rules allow "one of each a
 * week" (firebase/firestore.rules, "Aerial, Full Boost, rest day and Rule One").
 */
import { Timestamp, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Lane } from '@tcl/engine';
import { connect } from './firebase.ts';
import { trouble } from './identity.ts';

export interface Where {
  league: string;
  season: string;
  player: string;
}

async function kitDoc(where: Where, id: string) {
  const { db } = await connect();
  return doc(db, 'leagues', where.league, 'seasons', where.season, 'kit', id);
}

async function attempt(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    throw trouble(error);
  }
}

/** Sets Aerial on a day, or moves it there. */
export const playAerial = (where: Where, period: string, date: string) =>
  attempt(async () => {
    await setDoc(await kitDoc(where, `${period}_${where.player}_aerial`), { player: where.player, item: 'aerial', period, date, at: serverTimestamp() });
  });

export const cancelAerial = (where: Where, period: string) =>
  attempt(async () => {
    await deleteDoc(await kitDoc(where, `${period}_${where.player}_aerial`));
  });

/** Counts a missed goal as hit on a day, or moves Full Boost there. `second` is the #1 seed's extra one in a playoff semifinal. */
export const playFullBoost = (where: Where, period: string, date: string, lane: Lane, second = false) =>
  attempt(async () => {
    const item = second ? 'fullBoost2' : 'fullBoost';
    await setDoc(await kitDoc(where, `${period}_${where.player}_${item}`), { player: where.player, item, period, date, lane, at: serverTimestamp() });
  });

export const takeBackFullBoost = (where: Where, period: string, second = false) =>
  attempt(async () => {
    await deleteDoc(await kitDoc(where, `${period}_${where.player}_${second ? 'fullBoost2' : 'fullBoost'}`));
  });

/** Moves the rest day. It is never deleted: with no document, it is Sunday. */
export const moveRestDay = (where: Where, period: string, date: string) =>
  attempt(async () => {
    await setDoc(await kitDoc(where, `${period}_${where.player}_rest`), { player: where.player, item: 'rest', period, date, at: serverTimestamp() });
  });

/** Declares Rule One number `number` on a day. */
export const declareRuleOne = (where: Where, number: number, date: string) =>
  attempt(async () => {
    await setDoc(await kitDoc(where, `ruleOne_${where.player}_${number}`), { player: where.player, item: 'ruleOne', number, date, at: serverTimestamp() });
  });

export const takeBackRuleOne = (where: Where, number: number) =>
  attempt(async () => {
    await deleteDoc(await kitDoc(where, `ruleOne_${where.player}_${number}`));
  });

/**
 * Sets this week's Demolition. Sealed: only you can read it until the day
 * locks, the commish included. It can't be changed or taken back.
 */
/** A Rumble Boot: one of today's opponent's goals, picked by noon, sealed until the day locks, and final. */
export const setBoot = (where: Where, input: { period: string; target: string; date: string; lane: Lane; lock: number }) =>
  attempt(async () => {
    const { db } = await connect();
    const sealed = doc(db, 'leagues', where.league, 'seasons', where.season, 'sealed', `boot_${input.date}_${where.player}`);
    await setDoc(sealed, {
      kind: 'boot',
      player: where.player,
      period: input.period,
      target: input.target,
      date: input.date,
      lane: input.lane,
      revealAt: Timestamp.fromMillis(input.lock),
      at: serverTimestamp(),
    });
  });

export const setDemolition = (where: Where, input: { period: string; target: string; date: string; lane: Lane; lock: number }) =>
  attempt(async () => {
    const { db } = await connect();
    const sealed = doc(db, 'leagues', where.league, 'seasons', where.season, 'sealed', `${input.period}_${where.player}_demolition`);
    await setDoc(sealed, {
      kind: 'demolition',
      player: where.player,
      period: input.period,
      target: input.target,
      date: input.date,
      lane: input.lane,
      revealAt: Timestamp.fromMillis(input.lock),
      at: serverTimestamp(),
    });
  });
