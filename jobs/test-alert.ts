/**
 * Sends one test alert to the commish's phones in each league (or only
 * LEAGUE_ID's), to check alerts reach a phone. Started by hand from the
 * Actions tab ("Send a test alert"). Only phones that turned alerts on, and
 * are still signed in as the commish, get it.
 *
 * The log is public, so it shows counts only. In the local emulator nothing
 * can be sent, so each push is printed instead, for the tests to read.
 */
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { connect } from './admin.ts';

const { app, emulator } = connect();
const db = getFirestore(app);
const only = process.env.LEAGUE_ID?.trim();
const leagues = only ? [await db.collection('leagues').doc(only).get()] : (await db.collection('leagues').get()).docs;
const message = { title: 'Test alert', body: 'Alerts reach this phone.', screen: 'today', tag: 'test' };
let sent = 0;
let phones = 0;

for (const league of leagues) {
  const commish = league.get('commish');
  if (!league.exists || typeof commish !== 'string') continue;
  const devices = await db.collection('devices').where('league', '==', league.id).where('player', '==', commish).get();
  // Only a phone still signed in as the commish: a lost phone was signed out by a new key.
  const key = (await league.ref.collection('keys').doc(commish).get()).get('key');
  for (const device of devices.docs) {
    const claim = await league.ref.collection('claims').doc(device.id).get();
    if (!claim.exists || claim.get('player') !== commish || claim.get('key') !== key) continue;
    phones += 1;
    if (emulator) {
      console.log(`push ${JSON.stringify({ device: device.id, ...message })}`);
      sent += 1;
      continue;
    }
    try {
      await getMessaging(app).send({ token: String(device.get('token')), webpush: { headers: { Urgency: 'high', TTL: '3600' }, data: message } });
      sent += 1;
    } catch (error) {
      console.log(`League ${league.id}: one phone could not be reached (${(error as { code?: string }).code ?? 'unknown'}).`);
    }
  }
}

console.log(`Done: ${sent} test alert${sent === 1 ? '' : 's'} sent to ${phones} phone${phones === 1 ? '' : 's'}${emulator ? ' (printed: the local emulator sends nothing)' : ''}.`);
