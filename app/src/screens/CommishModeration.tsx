import { useState } from 'preact/hooks';
import { STARTER_DARES } from '@tcl/engine';
import { useAll, useDoc, useNow, useWhere } from '../data/hooks.ts';
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
  | { kind: 'settle'; id: string; label: string }
  | { kind: 'week'; id: string; label: string }
  | { kind: 'dare'; id: string; label: string }
  | { kind: 'starter'; index: number; off: boolean; label: string };

/**
 * Commish tools, weeks and moderation (SCOPE.md, "Commish tools"): settle a
 * finished week when the weekly job runs late, unlock a final week so the job
 * counts it again, and take a dare off the Wheel. Each needs a reason, and
 * each goes in the league log.
 */
export function CommishModeration(props: { me: Me; seasonId: string }) {
  const seasonPath = `leagues/${props.me.league}/seasons/${props.seasonId}`;
  // Each week's Sunday, from the calendar the security rules read: a week is over when its Sunday locks.
  const sundays = useWhere<{ period: string; lock: number }>(`${seasonPath}/calendar`, 'dayIndex', 6);
  const weeks = useAll<{ week: number; status?: string; results?: unknown; pairs?: unknown[] }>(`${seasonPath}/weeks`);
  const now = useNow();
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
  // Weeks whose Sunday has locked with no results yet: the weekly job is late.
  const lockOf = (period: string) => sundays.docs.find((found) => found.data.period === period)?.data.lock ?? Infinity;
  const late = weeks.docs.filter((found) => !found.data.results && (found.data.pairs?.length ?? 0) > 0 && now >= lockOf(found.id)).sort((a, b) => a.data.week - b.data.week);
  const standing = dares.docs.filter((found) => !found.data.removed);

  const confirm = (event: Event) => {
    event.preventDefault();
    if (!pending || busy) return;
    if (reason.trim().length === 0) return setNote({ error: true, text: 'Give a reason. It goes in the league log.' });
    setBusy(true);
    setNote(null);
    const done =
      pending.kind === 'settle'
        ? `${pending.label}'s results are up. The weekly job checks them when it runs and makes them final.`
        : pending.kind === 'week'
          ? `${pending.label} is unlocked. The weekly job counts it again within the hour.`
          : pending.kind === 'starter'
            ? `"${pending.label}" is ${pending.off ? 'back on' : 'off'} the Wheel.`
            : `${pending.label} is off the Wheel.`;
    const save = async (api: Awaited<ReturnType<typeof loadData>>): Promise<boolean> => {
      if (pending.kind === 'settle') return api.settleWeekNow(props.me, props.seasonId, pending.id, reason);
      if (pending.kind === 'week') await api.unlockWeek(props.me, props.seasonId, pending.id, reason);
      else if (pending.kind === 'starter') await api.setRemovedStarters(props.me, props.seasonId, pending.off ? removedStarters.filter((index) => index !== pending.index) : [...removedStarters, pending.index], reason);
      else await api.removeDare(props.me, props.seasonId, pending.id, reason);
      return true;
    };
    void loadData()
      .then(save)
      .then((saved) => {
        if (!saved) return setNote({ error: true, text: `${pending.label} isn't over yet. A week ends when its Sunday locks, at noon on Monday.` });
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

      {late.length > 0 && (
        <>
          <h3 class="draft-subhead">Waiting on the weekly job</h3>
          {late.map((found) => (
            <div class="receipt-row" key={found.id}>
              <span class="receipt-what">Week {found.data.week}</span>
              <button type="button" class="receipt-ask" disabled={busy} aria-label={`Settle Week ${found.data.week} now`} onClick={() => ask({ kind: 'settle', id: found.id, label: `Week ${found.data.week}` })}>
                Settle now
              </button>
            </div>
          ))}
          <p class="panel-text">These weeks are over, but the weekly job hasn't counted them yet. It runs every hour. Settling one here counts it on your phone with the same rules, as provisional results; the job checks them when it runs.</p>
        </>
      )}

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
              {pending.kind === 'settle'
                ? `Settle ${pending.label} now?`
                : pending.kind === 'week'
                ? `Unlock ${pending.label}?`
                : pending.kind === 'starter'
                  ? `${pending.off ? 'Put back' : 'Take off'} "${pending.label}"?`
                  : `Take ${pending.label} off the Wheel?`}
            </strong>
          </p>
          <Field id="moderation-reason" label="Reason" value={reason} onInput={setReason} maxLength={500} help="Everyone sees it in the league log." />
          <button class={(pending.kind === 'starter' && pending.off) || pending.kind === 'settle' ? 'btn' : 'btn btn-danger'} type="submit" disabled={busy}>
            {pending.kind === 'settle' ? `Settle ${pending.label}` : pending.kind === 'week' ? `Unlock ${pending.label}` : pending.kind === 'starter' ? (pending.off ? 'Put it back' : 'Take it off') : 'Remove the dare'}
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
