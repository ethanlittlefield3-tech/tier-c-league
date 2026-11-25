import { useState } from 'preact/hooks';
import { REVOTE_HOURS } from '@tcl/engine';
import { useDoc, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { timeLeft } from '../ui/when.ts';
import './draft.css';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league did not accept that.',
};

const NEXT: Record<string, { step: 'rivals' | 'dares' | 'done'; label: string; reason: string } | undefined> = {
  goals: { step: 'rivals', label: 'Move on to rival picks', reason: 'Moved the live draft on to rival picks' },
  rivals: { step: 'dares', label: 'Move on to dares', reason: 'Moved the live draft on to dares' },
  dares: { step: 'done', label: 'Finish the draft', reason: 'Finished the live draft' },
};

const STEP_NAME: Record<string, string> = { goals: 'goals and votes', rivals: 'rival picks', dares: 'dares', done: 'done' };

type Api = Awaited<ReturnType<typeof loadData>>;

/**
 * The commish's draft controls: start it, move the live draft from step to
 * step, and close the goal votes sooner or give them more time.
 */
export function DraftControls(props: { me: Me; seasonId: string; status: string; members: string[]; joiningOpen: boolean }) {
  const draft = useDoc<{ step: string; order?: string[]; votesCloseAt?: number }>(`leagues/${props.me.league}/seasons/${props.seasonId}/draft/state`);
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'start' | 'close' | null>(null);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);

  const run = (work: (api: Api) => Promise<unknown>, done: string) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    void loadData()
      .then(work)
      .then(() => {
        setNote({ error: false, text: done });
        setConfirm(null);
      })
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  const state = draft.data;
  const next = state ? NEXT[state.step] : undefined;
  const closeAt = state?.votesCloseAt ?? null;
  const votesOpen = closeAt !== null && now < closeAt;
  const moreTime = () => Math.max(closeAt ?? now, now) + REVOTE_HOURS * 3_600_000;

  return (
    <section class="panel" aria-labelledby="draft-controls-title">
      <h2 id="draft-controls-title">The draft</h2>
      {!state ? (
        props.status === 'setup' ? (
          confirm === 'start' ? (
            <>
              <p class="panel-text">
                <strong>Start the draft?</strong> The order is drawn at random, goals and votes open for 24 hours, and the season's settings are fixed from here on.
                {props.joiningOpen ? ' Anyone who joins after this is not in the draft order, so close joining first if everyone is in.' : ''}
              </p>
              <button type="button" class="btn" disabled={busy} onClick={() => run((api) => api.startDraft(props.me, props.seasonId, props.members), 'The draft is on. Everyone can set their goals.')}>
                Start the draft
              </button>
              <button type="button" class="btn-quiet" onClick={() => setConfirm(null)}>
                Not yet
              </button>
            </>
          ) : (
            <>
              <p class="panel-text">Goals and votes, rival picks for Week 1, and dares for the Wheel. Start it when everyone is ready.</p>
              <button type="button" class="btn btn-second" onClick={() => setConfirm('start')}>
                Start the draft
              </button>
            </>
          )
        ) : (
          <p class="panel-text">This season has no draft.</p>
        )
      ) : (
        <>
          <p class="panel-text">
            Live step: <strong>{STEP_NAME[state.step] ?? state.step}</strong>.
          </p>
          {next && (
            <button type="button" class="btn btn-second" disabled={busy} onClick={() => run((api) => api.advanceDraft(props.me, props.seasonId, next.step, next.reason), 'Done.')}>
              {next.label}
            </button>
          )}

          <p class="panel-text draft-votes-line">
            {votesOpen ? (
              <>
                Goals and votes close in <strong>{timeLeft((closeAt ?? now) - now)}</strong>.
              </>
            ) : (
              'Goals and votes are closed.'
            )}
          </p>
          {votesOpen && confirm === 'close' ? (
            <>
              <p class="panel-text">
                <strong>Close goals and votes now?</strong> Goals are fixed for the season from then on.
              </p>
              <button type="button" class="btn btn-danger" disabled={busy} onClick={() => run((api) => api.setVotesClose(props.me, props.seasonId, 'now', 'Closed goals and votes'), 'Goals and votes are closed.')}>
                Close them now
              </button>
              <button type="button" class="btn-quiet" onClick={() => setConfirm(null)}>
                Keep them open
              </button>
            </>
          ) : (
            <div class="draft-votes-buttons">
              <button
                type="button"
                class="btn btn-second"
                disabled={busy}
                onClick={() => run((api) => api.setVotesClose(props.me, props.seasonId, moreTime(), votesOpen ? `Gave goals and votes ${REVOTE_HOURS} more hours` : `Reopened goals and votes for ${REVOTE_HOURS} hours`), votesOpen ? 'More time given.' : 'Reopened.')}
              >
                {votesOpen ? `Give ${REVOTE_HOURS} more hours` : `Reopen for ${REVOTE_HOURS} hours`}
              </button>
              {votesOpen && (
                <button type="button" class="btn-quiet" disabled={busy} onClick={() => setConfirm('close')}>
                  Close goals and votes now
                </button>
              )}
            </div>
          )}
        </>
      )}
      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role="status">
          {note.text}
        </p>
      )}
    </section>
  );
}
