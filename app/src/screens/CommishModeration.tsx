import { useState } from 'preact/hooks';
import { STARTER_DARES } from '@tcl/engine';
import { useAll, useDoc } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { Field } from '../ui/parts.tsx';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league did not accept that.',
};

type Pending =
  | { kind: 'week'; id: string; label: string }
  | { kind: 'dare'; id: string; label: string }
  | { kind: 'starter'; index: number; off: boolean; label: string };

/**
 * Commish tools, weeks and moderation (SCOPE.md, "Commish tools"): unlock a
 * final week so the weekly job counts it again, and take a dare off the Wheel.
 * Both need a reason, and both go in the league log.
 */
export function CommishModeration(props: { me: Me; seasonId: string }) {
  const seasonPath = `leagues/${props.me.league}/seasons/${props.seasonId}`;
  const weeks = useAll<{ week: number; status?: string }>(`${seasonPath}/weeks`);
  const dares = useAll<{ text: string; removed?: boolean }>(`${seasonPath}/dares`);
  const players = useAll<{ displayName?: string }>(`leagues/${props.me.league}/players`);
  const wheel = useDoc<{ removedStarters?: number[] }>(`${seasonPath}/config/wheel`);
  const removedStarters = wheel.data?.removedStarters ?? [];
  const name = (player: string) => players.docs.find((found) => found.id === player)?.data.displayName ?? 'A former player';
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);

  const finals = weeks.docs.filter((found) => found.data.status === 'final').sort((a, b) => b.data.week - a.data.week);
  const standing = dares.docs.filter((found) => !found.data.removed);

  const confirm = (event: Event) => {
    event.preventDefault();
    if (!pending || busy) return;
    if (reason.trim().length === 0) return setNote({ error: true, text: 'Give a reason. It goes in the league log.' });
    setBusy(true);
    setNote(null);
    const done =
      pending.kind === 'week'
        ? `${pending.label} is unlocked. The weekly job counts it again within the hour.`
        : pending.kind === 'starter'
          ? `"${pending.label}" is ${pending.off ? 'back on' : 'off'} the Wheel.`
          : `${pending.label} is off the Wheel.`;
    void loadData()
      .then((api) =>
        pending.kind === 'week'
          ? api.unlockWeek(props.me, props.seasonId, pending.id, reason)
          : pending.kind === 'starter'
            ? api.setRemovedStarters(props.me, props.seasonId, pending.off ? removedStarters.filter((index) => index !== pending.index) : [...removedStarters, pending.index], reason)
            : api.removeDare(props.me, props.seasonId, pending.id, reason),
      )
      .then(() => {
        setNote({ error: false, text: done });
        setPending(null);
        setReason('');
      })
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  const ask = (next: Pending) => {
    setNote(null);
    setReason('');
    setPending(next);
  };

  return (
    <section class="panel" aria-labelledby="moderation-title">
      <h2 id="moderation-title">Weeks and dares</h2>

      <h3 class="draft-subhead">Final weeks</h3>
      {finals.length === 0 ? (
        <p class="panel-text">No week is final yet.</p>
      ) : (
        finals.map((found) => (
          <div class="receipt-row" key={found.id}>
            <span class="receipt-what">Week {found.data.week}</span>
            <button type="button" class="receipt-ask" disabled={busy} onClick={() => ask({ kind: 'week', id: found.id, label: `Week ${found.data.week}` })}>
              Unlock
            </button>
          </div>
        ))
      )}
      <p class="panel-text">Unlocking lets a late fix count: the weekly job counts the week again, then it goes final again.</p>

      <h3 class="draft-subhead">Dares on the Wheel</h3>
      {standing.length === 0 ? (
        <p class="panel-text">No dares from the draft.</p>
      ) : (
        standing.map((found) => (
          <div class="receipt-row" key={found.id}>
            <span class="receipt-what">
              {found.data.text} <span class="receipt-state">({name(found.id)})</span>
            </span>
            <button type="button" class="receipt-ask" disabled={busy} aria-label={`Remove ${name(found.id)}'s dare`} onClick={() => ask({ kind: 'dare', id: found.id, label: `${name(found.id)}'s dare` })}>
              Remove
            </button>
          </div>
        ))
      )}

      <h3 class="draft-subhead">Starter dares</h3>
      {STARTER_DARES.map((dare, index) => {
        const off = removedStarters.includes(index);
        return (
          <div class="receipt-row" key={dare} data-off={off}>
            <span class="receipt-what">
              {dare}
              {off ? <span class="receipt-state"> (off the Wheel)</span> : null}
            </span>
            <button type="button" class="receipt-ask" disabled={busy} aria-label={`${off ? 'Put back' : 'Remove'}: ${dare}`} onClick={() => ask({ kind: 'starter', index, off, label: dare })}>
              {off ? 'Put back' : 'Remove'}
            </button>
          </div>
        );
      })}

      {pending && (
        <form class="moderation-confirm" onSubmit={confirm} noValidate>
          <p class="panel-text">
            <strong>
              {pending.kind === 'week'
                ? `Unlock ${pending.label}?`
                : pending.kind === 'starter'
                  ? `${pending.off ? 'Put back' : 'Take off'} "${pending.label}"?`
                  : `Take ${pending.label} off the Wheel?`}
            </strong>
          </p>
          <Field id="moderation-reason" label="Reason" value={reason} onInput={setReason} maxLength={500} help="Everyone sees it in the league log." />
          <button class={pending.kind === 'starter' && pending.off ? 'btn' : 'btn btn-danger'} type="submit" disabled={busy}>
            {pending.kind === 'week' ? `Unlock ${pending.label}` : pending.kind === 'starter' ? (pending.off ? 'Put it back' : 'Take it off') : 'Remove the dare'}
          </button>
          <button type="button" class="btn-quiet" onClick={() => setPending(null)}>
            Cancel
          </button>
        </form>
      )}
      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
    </section>
  );
}
