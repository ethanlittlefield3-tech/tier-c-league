/** Your car (SCOPE.md, "Garage and achievements"): saved on your profile, where everyone sees it. */
import { doc, updateDoc } from 'firebase/firestore';
import type { CarParts } from '../art/car/draw.ts';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

/** Saves every slot of your car at once. The rules check each part is yours to use. */
export async function saveCar(me: Me, car: CarParts): Promise<void> {
  try {
    const { db } = await connect();
    await updateDoc(doc(db, 'leagues', me.league, 'players', me.player), { car });
  } catch (error) {
    throw trouble(error);
  }
}
