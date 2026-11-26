/**
 * Which database the app talks to.
 *
 * - The live app uses the league's own Firebase project. Its settings are not
 *   secret: they only say where the database is, and every browser that opens
 *   the app can see them. The security rules are what protect the data.
 * - On a developer's machine and in the flow tests, the app talks to the
 *   Firebase emulators instead, so nothing real is ever touched.
 */
import type { FirebaseOptions } from 'firebase/app';

export interface Backend {
  options: FirebaseOptions;
  /** Where the local emulators are, or `null` for the real database. */
  emulators: { firestorePort: number; authPort: number } | null;
  /**
   * The Cloud Messaging web push key, which lets phones sign up for alerts.
   * Public by design, like the settings above. `null` until the commish makes
   * one; `'emulator'` in the emulators, where alerts can't be sent and each
   * phone gets a stand-in token.
   */
  pushKey: string | null;
}

// The league's Firebase project. These are the settings Firebase gives every
// web app, and they are public by design: they say where the database is, not
// who may use it. Nothing here unlocks any data. The security rules do that.
const LIVE: FirebaseOptions | null = {
  apiKey: 'AIzaSyAesGbAggP1A_3EoXAxM4u_GL14U53Ztgg',
  authDomain: 'tier-c-league.firebaseapp.com',
  projectId: 'tier-c-league',
  storageBucket: 'tier-c-league.firebasestorage.app',
  messagingSenderId: '662838025969',
  appId: '1:662838025969:web:dca510de9a24975d025350',
};

// The league's Cloud Messaging web push key: the public half, made by the
// commish on 2026-11-26. The private half stays inside Firebase.
const PUSH_KEY: string | null = 'BG4Wxu_5IDdiOfjNozVWAgEh8QWvhZcbh_6LbdknhdzNfpYesw5dY_Cj1CDnZ0MwSLMqKRs0PRCVGw-IiYxeIzM';

const EMULATED: Backend = {
  options: { projectId: 'demo-tier-c', apiKey: 'demo-key', appId: 'demo-app' },
  // The same ports as firebase/firebase.json.
  emulators: { firestorePort: 8080, authPort: 9099 },
  pushKey: 'emulator',
};

/** `null` means the league's database has not been set up yet. */
export function backend(): Backend | null {
  if (import.meta.env.VITE_BACKEND === 'emulator') return EMULATED;
  return LIVE ? { options: LIVE, emulators: null, pushKey: PUSH_KEY } : null;
}
