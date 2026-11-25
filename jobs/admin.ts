/**
 * How a job connects to the league's database.
 *
 * - On GitHub, a job signs in as the league's service account. Its key is the
 *   FIREBASE_SERVICE_ACCOUNT secret, which only GitHub holds. It is never in
 *   this repo, never in a log and never in chat.
 * - On a developer's machine and in the tests, a job talks to the local
 *   emulator, which needs no key.
 *
 * Jobs skip the security rules, so everything a job writes is checked by its
 * own tests instead. And because this repo is public, so are the logs: a job
 * logs counts and IDs only, never names, codes, keys or photos.
 */
import { cert, initializeApp, type App } from 'firebase-admin/app';

export interface Connection {
  app: App;
  project: string;
  /** True when this is the local emulator, not the real database. */
  emulator: boolean;
}

export function connect(): Connection {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const project = process.env.GCLOUD_PROJECT ?? 'demo-tier-c';
    return { app: initializeApp({ projectId: project }), project, emulator: true };
  }

  const secret = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!secret) {
    throw new Error('No service account key. On GitHub it is the FIREBASE_SERVICE_ACCOUNT secret. To run against the local emulator, set FIRESTORE_EMULATOR_HOST.');
  }
  let key: { project_id?: string; client_email?: string; private_key?: string };
  try {
    key = JSON.parse(secret) as typeof key;
  } catch {
    // Never echo the secret back, not even part of it.
    throw new Error('The FIREBASE_SERVICE_ACCOUNT secret is not the whole key file. Paste the full contents of the downloaded .json file.');
  }
  if (!key.project_id || !key.client_email || !key.private_key) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT secret is missing parts of the key file. Paste the full contents of the downloaded .json file.');
  }
  const app = initializeApp({
    credential: cert({ projectId: key.project_id, clientEmail: key.client_email, privateKey: key.private_key }),
    projectId: key.project_id,
  });
  return { app, project: key.project_id, emulator: false };
}
