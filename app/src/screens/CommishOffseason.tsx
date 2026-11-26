import { useState } from 'preact/hooks';
import { addDays, localDate, wallTimeToInstant } from '@tcl/engine';
import { useAll, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { deadlineWords, type useOffseason } from './useOffseason.ts';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no: the deadline has to be ahead, at most 30 days out, and can only move before it passes.',
};

/** "Friday, Mar 12". */
const dayWords = (date: string) => {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

/**
 * Commish tools, the offseason (SCOPE.md, "Seasons"): once the season is over,
 * the commish sets the deadline for everyone to tap Stay or Leave, and sees
 * the answers. At the deadline the leavers come off the roster, and once the
 * season's last dares are done the next season can be set up below.
 */
export function CommishOffseason(props: { me: Me; seasonId: string; seasonName: string; timeZone: string; off: ReturnType<typeof useOffseason> }) {
  const { off } = props;
  const now = useNow();
  const players = useAll<{ displayName?: string }>(`leagues/${props.me.league}/players`);
  const today = localDate(now, props.timeZone);
  const choices = Array.from({ length: 29 }, (_, at) => addDays(today, at + 1));
  const [date, setDate] = useState(addDays(today, 7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = (player: string) => players.docs.find((found) => found.id === player)?.data.displayName ?? 'A former player';
  const save = () => {
    if (busy) return;
    const deadline = wallTimeToInstant(date, 23, 59, props.timeZone);
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.setOffseasonDeadline(props.me, props.seasonId, deadline, deadlineWords(deadline, props.timeZone)))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };
  if (off.loading) return null;
  const answered = (choice: string) => Object.entries(off.answers).filter(([, said]) => said === choice).map(([player]) => name(player));
  const staying = answered('stay');
  const leaving = answered('leave');
  return (
    <section class="panel" aria-labelledby="offseason-title">
      <h2 id="offseason-title">The offseason</h2>
      {off.deadline === null ? (
        <p class="panel-text">{props.seasonName} is over. Set a deadline for everyone to tap Stay or Leave. Anyone who doesn't answer stays.</p>
      ) : !off.passed ? (
        <p class="panel-text">
          Everyone taps Stay or Leave by <strong>{deadlineWords(off.deadline, props.timeZone)}</strong>. No answer counts as staying.
        </p>
      ) : (
        <p class="panel-text">The deadline has passed. {off.closed ? (off.left.length > 0 ? `${off.left.map(name).join(', ')} left the league.` : 'Everyone is staying.') : 'The leavers come off the roster within a few minutes.'}</p>
      )}
      {off.deadline !== null && !off.passed && (
        <ul class="offseason-answers" aria-label="The answers so far">
          <li>
            Staying: <strong>{staying.length > 0 ? staying.join(', ') : 'nobody yet'}</strong>
          </li>
          <li>
            Leaving: <strong>{leaving.length > 0 ? leaving.join(', ') : 'nobody yet'}</strong>
          </li>
        </ul>
      )}
      {!off.passed && (
        <>
          <p class="setup-label">
            <label for="offseason-day">Deadline (11:59 pm that day)</label>
          </p>
          <select id="offseason-day" class="setup-select" value={date} disabled={busy} onChange={(event) => setDate(event.currentTarget.value)}>
            {choices.map((choice) => (
              <option value={choice}>{dayWords(choice)}</option>
            ))}
          </select>
          <button type="button" class="btn offseason-save" disabled={busy} onClick={save}>
            {off.deadline === null ? 'Set the deadline' : 'Move the deadline'}
          </button>
        </>
      )}
      {off.passed && off.openDares.length > 0 && (
        <p class="fine-print">
          {off.openDares.length === 1 ? 'One dare' : `${off.openDares.length} dares`} from {props.seasonName} {off.openDares.length === 1 ? 'is' : 'are'} still open. The next season can start once {off.openDares.length === 1 ? "it's" : "they're"} done.
        </p>
      )}
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
