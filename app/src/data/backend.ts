/**
 * Which database the app talks to.
 *
 * - The live app uses the league's own Firebase project. Its settings are not
 *   secret: they only say where the database is, and every browser that opens
 *   the app can see them. The security rules are what protect the data. The
 *   settings are filled in at Step 5, when the project is created.
 * - On a developer's machine and in the flow tests, the app talks to the
 *   Firebase emulators instead, so nothing real is ever touched.
 */
import type { FirebaseOptions } from 'firebase/app';

export interface Backend {
  options: FirebaseOptions;
  /** Where the local emulators are, or `null` for the real database. */
  emulators: { firestorePort: number; authPort: number } | null;
}

// Step 5 fills this in.
const LIVE: FirebaseOptions | null = null;

const EMULATED: Backend = {
  options: { projectId: 'demo-tier-c', apiKey: 'demo-key', appId: 'demo-app' },
  // The same ports as firebase/firebase.json.
  emulators: { firestorePort: 8080, authPort: 9099 },
};

/** `null` means the league's database has not been set up yet. */
export function backend(): Backend | null {
  if (import.meta.env.VITE_BACKEND === 'emulator') return EMULATED;
  return LIVE ? { options: LIVE, emulators: null } : null;
}
