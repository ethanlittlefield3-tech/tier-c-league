import { useState } from 'preact/hooks';
import { useDoc } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { Field } from '../ui/parts.tsx';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no: only the current season can be reset, by the commish.',
};

interface Request {
  season: string;
  status: 'requested' | 'running' | 'failed';
  reason?: string;
}

/** "Season 2" from `s2`: where the reset takes the league back to. */
function whereTo(seasonId: string): string {
  const number = Number(seasonId.replace(/^s/, '')) || 1;
  return number <= 1 ? 'no season at all, as before it was set up' : `the end of Season ${number - 1}, with its offseason done`;
}

/**
 * Commish tools, the season reset (the commish's request, 2026-11-28): takes
 * the current season back as if it had never been set up, with everything it
 * gave out. The commish types the season's name to be sure; GitHub's reset
 * job backs the league up and does it, usually within the hour: GitHub runs
 * its scheduled jobs late.
 */
export function CommishReset(props: { me: Me; seasonId: string; seasonName: string }) {
  const request = useDoc<Request>(`leagues/${props.me.league}/reset/request`);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (request.loading) return null;

  const act = (work: (api: Awaited<ReturnType<typeof loadData>>) => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then(work)
      .then(() => setTyped(''))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };
  const asked = request.data;
  const name = props.seasonName;
  const sure = typed.trim().toLowerCase() === name.trim().toLowerCase();

  return (
    <section class="panel reset-panel" aria-labelledby="reset-title">
      <h2 id="reset-title">Reset the season</h2>
      {asked?.status === 'failed' ? (
        <>
          <p class="panel-text" role="status">
            The reset couldn't run. {asked.reason ?? ''}
          </p>
          <button type="button" class="btn btn-second" disabled={busy} onClick={() => act((api) => api.cancelReset(props.me))}>
            Dismiss
          </button>
        </>
      ) : asked ? (
        <>
          <p class="panel-text" role="status">
            {asked.status === 'running' ? `Resetting ${name} now. It takes a minute.` : `${name} is being reset, after a backup of the league. GitHub usually starts it within the hour. To start it now: on GitHub, open Actions, choose Send alerts, then Run workflow.`}
          </p>
          {asked.status === 'requested' && (
            <button type="button" class="btn btn-second" disabled={busy} onClick={() => act((api) => api.cancelReset(props.me))}>
              Call it off
            </button>
          )}
        </>
      ) : (
        <>
          <p class="panel-text">
            Takes {name} back as if it had never been set up. The league goes back to {whereTo(props.seasonId)}, and you set the season up again: settings, draft and all.
          </p>
          <ul class="reset-list">
            <li>Every day logged, point, power-up, week, standing and pick in it.</li>
            <li>Everything it gave out: its weeks in everyone's rank, its badges and the car parts from them, rivalry records, trophies, the champion's banner and its news in the feed.</li>
            <li>Players stay in the league, and the chat stays.</li>
          </ul>
          <p class="fine-print">There's no undo here. The league is backed up first, if the backups repo is set up.</p>
          <Field id="reset-confirm" label={`Type ${name} to confirm`} value={typed} onInput={setTyped} maxLength={40} />
          <button type="button" class="btn btn-danger" disabled={busy || !sure} onClick={() => act((api) => api.requestReset(props.me, props.seasonId, name))}>
            Reset {name}
          </button>
        </>
      )}
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
