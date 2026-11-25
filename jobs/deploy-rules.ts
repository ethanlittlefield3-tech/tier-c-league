/**
 * Publishes firebase/firestore.rules to the league's database.
 *
 *   On GitHub:  runs by itself after the tests pass on main
 *               (Actions, "Publish the security rules")
 *
 * The rules are the referee: phones talk to the database directly, and these
 * rules decide what each one may read and write. So they are only published
 * from main, and only after every rule test has passed.
 */
import { readFileSync } from 'node:fs';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { connect } from './admin.ts';

const { app, emulator } = connect();
if (emulator) {
  console.log('The local emulator loads the rules file by itself. Nothing to publish.');
  process.exit(0);
}

const source = readFileSync(new URL('../firebase/firestore.rules', import.meta.url), 'utf8');
const rules = getSecurityRules(app);

// Publishing identical rules again would only pile up copies, so check first.
let live: string | null = null;
try {
  live = (await rules.getFirestoreRuleset()).source[0]?.content ?? null;
} catch {
  // No rules have been published yet, or the database is brand new.
}

if (live === source) {
  console.log('The published rules already match firebase/firestore.rules. Nothing to do.');
} else {
  try {
    const ruleset = await rules.releaseFirestoreRulesetFromSource(source);
    console.log(`Security rules published: ${ruleset.name}.`);
  } catch (error) {
    const code = (error as { code?: string }).code ?? 'unknown';
    console.error(`The rules could not be published (${code}).`);
    console.error('If this says the caller lacks permission: in the Google Cloud console, under IAM, give the');
    console.error('firebase-adminsdk service account the "Firebase Rules Admin" role, then run this again.');
    console.error('If it says the database does not exist: create the Firestore database first.');
    process.exit(1);
  }
}
