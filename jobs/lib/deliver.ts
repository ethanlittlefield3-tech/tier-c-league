/**
 * Each phone's share of the alerts due (SCOPE.md, "Notifications"): only the
 * kinds it has switched on, and nothing in its quiet hours. What comes in
 * quiet hours is held, then sent as one push when they end, if it is still
 * of use. Pure: the tick job keeps the held alerts between runs.
 */
import { isQuiet, type Category } from '../../engine/src/alerts.ts';
import type { Alert, Screen } from './alerts.ts';

export interface Device {
  id: string;
  token: string;
  player: string;
  settings: Partial<Record<Category, boolean>>;
  quiet: { start: number; end: number };
}

export interface Push {
  device: string;
  token: string;
  title: string;
  body: string;
  screen: Screen;
  /** A newer push with the same tag replaces the older one on the phone. */
  tag: string;
}

/** The newest alert for each key, oldest first. */
function newest(alerts: Alert[]): Alert[] {
  const byKey = new Map<string, Alert>();
  for (const alert of alerts) {
    byKey.delete(alert.key);
    byKey.set(alert.key, alert);
  }
  return [...byKey.values()];
}

export function deliver(input: {
  alerts: Alert[];
  devices: Device[];
  /** Alerts held for each device during its quiet hours, from earlier runs. */
  held: Record<string, Alert[]>;
  now: number;
  /** The hour of the day now, in league time. */
  hour: number;
}): { pushes: Push[]; held: Record<string, Alert[]> } {
  const pushes: Push[] = [];
  const held: Record<string, Alert[]> = {};
  for (const device of input.devices) {
    const wanted = (alert: Alert) => alert.player === device.player && device.settings[alert.category] !== false && alert.expires > input.now;
    const waiting = (input.held[device.id] ?? []).filter(wanted);
    const fresh = input.alerts.filter(wanted);
    if (isQuiet(input.hour, device.quiet)) {
      const keep = newest([...waiting, ...fresh]);
      if (keep.length > 0) held[device.id] = keep;
      continue;
    }
    const saved = newest(waiting);
    if (saved.length === 1) {
      const [only] = saved;
      pushes.push({ device: device.id, token: device.token, title: only!.title, body: only!.body, screen: only!.screen, tag: only!.key });
    } else if (saved.length > 1) {
      pushes.push({
        device: device.id,
        token: device.token,
        title: `${saved.length} alerts while it was quiet`,
        body: saved.map((alert) => alert.title).join(' · '),
        screen: saved.at(-1)!.screen,
        tag: 'held',
      });
    }
    for (const alert of newest(fresh)) pushes.push({ device: device.id, token: device.token, title: alert.title, body: alert.body, screen: alert.screen, tag: alert.key });
  }
  return { pushes, held };
}
