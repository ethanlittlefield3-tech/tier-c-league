/**
 * Alerts (SCOPE.md, "Notifications"): this device's push token and its alert
 * settings, kept in `devices/{device}`, where the tick job reads them. An
 * iPhone only offers alerts inside the Home Screen app, after a tap.
 *
 * The token is fetched again on every open, so a lapsed one is replaced.
 */
import { getApp } from 'firebase/app';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { DEFAULT_ALERTS, type AlertSettings } from '@tcl/engine';
import { installState } from '../install/state.ts';
import { surroundings } from '../install/surroundings.ts';
import { backend } from './backend.ts';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

export type AlertState =
  /** This browser can't show alerts, or an iPhone isn't in the Home Screen app. */
  | 'unsupported'
  /** The league has no web push key yet. */
  | 'not-ready'
  /** The phone's settings block alerts for the app. */
  | 'blocked'
  | 'off'
  | 'on';

function platform(): 'ios' | 'android' | 'desktop' {
  const device = installState(surroundings()).device;
  return device === 'iphone' || device === 'ipad' ? 'ios' : device === 'android' ? 'android' : 'desktop';
}

/**
 * Whether the phone lets the app show alerts. The newer way of asking is
 * tried first: some browsers report the older one wrongly.
 */
async function permission(): Promise<NotificationPermission> {
  try {
    const status = await navigator.permissions?.query({ name: 'notifications' as PermissionName });
    if (status) return status.state === 'prompt' ? 'default' : status.state;
  } catch {
    // Not supported here: fall through to the older way.
  }
  return Notification.permission;
}

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && installState(surroundings()).canOfferNotifications;
}

/** The push token for this device: a stand-in in the emulators, where nothing can be sent. */
async function tokenFor(device: string): Promise<string> {
  const key = backend()?.pushKey ?? null;
  if (!key) throw new Error('No web push key.');
  if (key === 'emulator') return `emulator-${device}`;
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) throw new Error('No push on this browser.');
  const serviceWorkerRegistration = await navigator.serviceWorker.ready;
  return getToken(getMessaging(getApp()), { vapidKey: key, serviceWorkerRegistration });
}

async function save(me: Me, token: string, settings: AlertSettings): Promise<void> {
  const { db, device } = await connect();
  await setDoc(doc(db, 'devices', device), {
    token,
    platform: platform(),
    league: me.league,
    player: me.player,
    settings: settings.categories,
    quiet: settings.quiet,
    updatedAt: serverTimestamp(),
  });
}

/** Whether this device can have alerts, whether they are on, and its settings. */
export async function alertState(me: Me): Promise<{ state: AlertState; settings: AlertSettings }> {
  if (!supported()) return { state: 'unsupported', settings: DEFAULT_ALERTS };
  if (!backend()?.pushKey) return { state: 'not-ready', settings: DEFAULT_ALERTS };
  const allowed = await permission();
  if (allowed === 'denied') return { state: 'blocked', settings: DEFAULT_ALERTS };
  try {
    const { db, device } = await connect();
    const saved = (await getDoc(doc(db, 'devices', device))).data();
    if (!saved || saved.league !== me.league || saved.player !== me.player || allowed !== 'granted') return { state: 'off', settings: DEFAULT_ALERTS };
    return { state: 'on', settings: { categories: { ...DEFAULT_ALERTS.categories, ...(saved.settings ?? {}) }, quiet: saved.quiet ?? DEFAULT_ALERTS.quiet } };
  } catch (error) {
    throw trouble(error);
  }
}

/** Asks the phone for permission (this must follow a tap), then signs this device up. */
export async function turnOnAlerts(me: Me, settings: AlertSettings): Promise<AlertState> {
  if (!supported()) return 'unsupported';
  const answer = await Notification.requestPermission();
  if (answer !== 'granted') return answer === 'denied' ? 'blocked' : 'off';
  try {
    const { device } = await connect();
    await save(me, await tokenFor(device), settings);
    return 'on';
  } catch (error) {
    throw trouble(error);
  }
}

/** Saves which alerts this device gets, and its quiet hours. */
export async function saveAlertSettings(me: Me, settings: AlertSettings): Promise<void> {
  try {
    const { device } = await connect();
    await save(me, await tokenFor(device), settings);
  } catch (error) {
    throw trouble(error);
  }
}

/** Signs this device out of alerts. */
export async function turnOffAlerts(): Promise<void> {
  try {
    const { db, device } = await connect();
    await deleteDoc(doc(db, 'devices', device));
    if (backend()?.pushKey && backend()?.pushKey !== 'emulator') {
      const { deleteToken, getMessaging } = await import('firebase/messaging');
      await deleteToken(getMessaging(getApp())).catch(() => undefined);
    }
  } catch (error) {
    throw trouble(error);
  }
}

/** On every open: if alerts are on, fetches the token again and saves it if it changed. */
export async function refreshAlerts(me: Me): Promise<void> {
  try {
    if (!supported() || !backend()?.pushKey || (await permission()) !== 'granted') return;
    const { db, device } = await connect();
    const saved = (await getDoc(doc(db, 'devices', device))).data();
    if (!saved || saved.league !== me.league || saved.player !== me.player) return;
    const token = await tokenFor(device);
    if (token !== saved.token) await save(me, token, { categories: { ...DEFAULT_ALERTS.categories, ...(saved.settings ?? {}) }, quiet: saved.quiet ?? DEFAULT_ALERTS.quiet });
  } catch {
    // Best effort: the next open tries again.
  }
}
