import { useEffect, useState } from 'preact/hooks';
import { CATEGORIES, DEFAULT_ALERTS, type AlertSettings, type Category } from '@tcl/engine';
import { CATEGORY_TEXT, hourText } from '../alerts/text.ts';
import type { AlertState } from '../data/alerts.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no. Close the app and open it again, then try once more.',
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * Alerts, in Profile (SCOPE.md, "Notifications"): turn them on with a tap,
 * pick which kinds come, and set quiet hours. Alerts held in quiet hours
 * arrive when they end.
 */
export function Alerts(props: { me: Me }) {
  const [state, setState] = useState<AlertState | 'loading'>('loading');
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_ALERTS);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    void loadData()
      .then((api) => api.alertState(props.me))
      .then((found) => {
        if (!live) return;
        setState(found.state);
        setSettings(found.settings);
      })
      .catch((failure: unknown) => live && setNote({ error: true, text: TROUBLE[whyOf(failure)] }));
    return () => {
      live = false;
    };
  }, [props.me.player]);

  const run = (work: (api: Awaited<ReturnType<typeof loadData>>) => Promise<unknown>, done: string | null) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    void loadData()
      .then(work)
      .then(() => done && setNote({ error: false, text: done }))
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  const change = (next: AlertSettings) => {
    setSettings(next);
    run((api) => api.saveAlertSettings(props.me, next), 'Saved.');
  };

  const turnOn = () =>
    run(async (api) => {
      const next = await api.turnOnAlerts(props.me, settings);
      setState(next);
      if (next === 'blocked') setNote({ error: true, text: 'Alerts are blocked for Tier C. Turn them on in your phone’s settings, then come back here.' });
      if (next === 'off') setNote({ error: false, text: 'Alerts are still off. Turn them on whenever you like.' });
    }, null);

  return (
    <section class="panel alerts" aria-labelledby="profile-alerts-title">
      <h2 id="profile-alerts-title">Alerts</h2>
      {state === 'loading' && <p class="panel-text">Checking this phone…</p>}
      {state === 'unsupported' && <p class="panel-text">Alerts work in the app on your Home Screen. On an iPhone they need iOS 16.4 or later.</p>}
      {state === 'not-ready' && <p class="panel-text">Alerts aren’t switched on for the league yet. Your commish does that once, and then they can be turned on here.</p>}
      {state === 'blocked' && <p class="panel-text">Alerts are blocked for Tier C. Turn them on in your phone’s settings, then come back here.</p>}
      {state === 'off' && (
        <>
          <p class="panel-text">Deadlines, your matchup, power-ups, taunts and receipts. You pick which, and quiet hours hold them overnight.</p>
          <button class="btn" type="button" disabled={busy} onClick={turnOn}>
            {busy ? 'Turning on' : 'Turn on alerts'}
          </button>
        </>
      )}
      {state === 'on' && (
        <>
          <ul class="alerts-list">
            {CATEGORIES.map((category: Category) => (
              <li key={category}>
                <button
                  type="button"
                  class="alerts-switch"
                  role="switch"
                  aria-checked={settings.categories[category]}
                  disabled={busy}
                  onClick={() => change({ ...settings, categories: { ...settings.categories, [category]: !settings.categories[category] } })}
                >
                  <span class="alerts-name">{CATEGORY_TEXT[category].name}</span>
                  <span class="alerts-help">{CATEGORY_TEXT[category].help}</span>
                </button>
              </li>
            ))}
          </ul>
          <fieldset class="alerts-quiet">
            <legend>Quiet hours</legend>
            <label>
              From
              <select value={settings.quiet.start} disabled={busy} onChange={(event) => change({ ...settings, quiet: { ...settings.quiet, start: Number(event.currentTarget.value) } })}>
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hourText(hour)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              to
              <select value={settings.quiet.end} disabled={busy} onChange={(event) => change({ ...settings, quiet: { ...settings.quiet, end: Number(event.currentTarget.value) } })}>
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hourText(hour)}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <p class="panel-text">Alerts that come in quiet hours arrive when they end, in league time.</p>
          <button
            class="btn-quiet"
            type="button"
            disabled={busy}
            onClick={() =>
              run(async (api) => {
                await api.turnOffAlerts();
                setState('off');
              }, 'Alerts are off on this phone.')
            }
          >
            Turn off alerts
          </button>
        </>
      )}
      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
    </section>
  );
}
