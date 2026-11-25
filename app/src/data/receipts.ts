/**
 * Receipts (SCOPE.md, "Receipts on demand"): ask another player to prove a
 * square, and answer a request with a photo or by backing down. Each request
 * takes one of the asker's 3 slots for that week, in the same save.
 */
import { collection, doc, serverTimestamp, Timestamp, updateDoc, writeBatch, type Firestore } from 'firebase/firestore';
import type { Square } from '@tcl/engine';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

async function attempt<T>(work: (db: Firestore) => Promise<T>): Promise<T> {
  try {
    const { db } = await connect();
    return await work(db);
  } catch (error) {
    throw trouble(error);
  }
}

/** A receipt's name: whose day, which day, which square. */
export const receiptId = (target: string, date: string, square: Square) => `${target}_${date}_${square}`;

/**
 * Asks for receipts. `slot` is the number (1 to 3) of a free request slot for
 * the target day's week; `deadline` comes from that day's calendar.
 */
export const askForReceipts = (me: Me, season: string, input: { target: string; date: string; square: Square; period: string; slot: number; deadline: number }) =>
  attempt(async (db) => {
    const seasonRef = doc(db, 'leagues', me.league, 'seasons', season);
    const id = receiptId(input.target, input.date, input.square);
    const slot = `${input.period}_${me.player}_${input.slot}`;
    const save = writeBatch(db);
    save.set(doc(collection(seasonRef, 'receipts'), id), {
      target: input.target,
      date: input.date,
      square: input.square,
      by: me.player,
      slot,
      requestedAt: serverTimestamp(),
      deadline: Timestamp.fromMillis(input.deadline),
      proofAt: null,
      backedDownAt: null,
    });
    save.set(doc(collection(seasonRef, 'receiptSlots'), slot), { receipt: id });
    await save.commit();
  });

/** Takes the claim back before the deadline. It costs nothing more (ruling R4). */
export const backDown = (me: Me, season: string, id: string) =>
  attempt((db) => updateDoc(doc(db, 'leagues', me.league, 'seasons', season, 'receipts', id), { backedDownAt: serverTimestamp() }));

/** Proves a receipt with a photo, already shrunk to 300 KB or less. */
export const proveReceipt = (me: Me, season: string, id: string, photo: string) =>
  attempt(async (db) => {
    const seasonRef = doc(db, 'leagues', me.league, 'seasons', season);
    const save = writeBatch(db);
    save.set(doc(collection(seasonRef, 'proofs'), id), { photo, at: serverTimestamp() });
    save.update(doc(collection(seasonRef, 'receipts'), id), { proofAt: serverTimestamp() });
    await save.commit();
  });
