import { useState } from 'preact/hooks';
import { REVOTE_HOURS, pickDeadline, picker, picksDone } from '@tcl/engine';
import { useAll, useDoc, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { timeLeft } from '../ui/when.ts';
import { useMissedPicks, type PickView } from './useMissedPicks.ts';
import './draft.css';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league did not accept that.',
};

const NEXT: Record<string, { step: 'modes' | 'rivals' | 'dares' | 'done'; label: string; reason: string } | undefined> = {
  goals: { step: 'rivals', label: 'Move on to rival picks', reason: 'Moved the live draft on to rival picks' },
  modes: { step: 'rivals', label: 'Close the vote and move on to rival picks', reason: 'Closed the group-play vote and moved on to rival picks' },
  rivals: { step: 'dares', label: 'Move on to dares', reason: 'Moved the live draft on to dares' },
  dares: { step: 'done', label: 'Finish the draft', reason: 'Finished the live draft' },
};

const STEP_NAME: Record<string, string> = { goals: 'goals and votes', modes: 'the group-play vote', rivals: 'rival picks', dares: 'dares', done: 'done' };

/** With group-play weeks, the group-play vote comes between goals and rival picks. */
const VOTE_NEXT = { step: 'modes' as const, label: 'Move on to the group-play vote', reason: 'Moved the live draft on to the group-play vote' };

type Api = Awaited<ReturnType<typeof loadData>>;

/**
 * The commish's draft controls: start it, move the live draft from step to
 * step, and close the goal votes sooner or give them more time.
 */
export function DraftControls(props: { me: Me; seasonId: string; status: string; members: string[]; joiningOpen: boolean; groupWeeks?: number[] }) {
  const draft = useDoc<PickView & { step: string; votesCloseAt?: number }>(`leagues/${props.me.league}/seasons/${props.seasonId}/draft/state`);
  const players = useAll<{ displayName?: string }>(`leagues/${props.me.league}/players`);
  const now = useNow(draft.data?.step === 'rivals' ? 1000 : 30_000);
  // The commish's phone makes a missed pick at random, here as well as on the Draft screen.
  useMissedPicks(props.me, props.seasonId, draft.data, true, now);
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
  const next = state ? (state.step === 'goals' && (props.groupWeeks ?? []).length > 0 ? VOTE_NEXT : NEXT[state.step]) : undefined;
  const closeAt = state?.votesCloseAt ?? null;
  const votesOpen = closeAt !== null && now < closeAt;
  const moreTime = () => Math.max(closeAt ?? now, now) + REVOTE_HOURS * 3_600_000;
  const name = (player: string) => players.docs.find((found) => found.id === player)?.data.displayName ?? 'Player';
  const picking = state?.step === 'rivals' ? picker(state.left ?? []) : null;
  const pickTimeUp = picking !== null && state?.turnStartedAt != null && now >= pickDeadline(state.turnStartedAt);
  const waitingOnPicks = state?.step === 'rivals' && !picksDone(state.left ?? []);

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
          {pickTimeUp && picking && (
            <button type="button" class="btn btn-second" disabled={busy} onClick={() => run((api) => api.pickForMissed(props.me, props.seasonId), 'Picked at random.')}>
              Pick at random for {name(picking)}
            </button>
          )}
          {next && (
            <button
              type="button"
              class="btn btn-second"
              disabled={busy || waitingOnPicks}
              onClick={() =>
                run(
                  (api) => (next.step === 'rivals' ? api.startRivalPicks(props.me, props.seasonId, props.members) : api.advanceDraft(props.me, props.seasonId, next.step, next.reason)),
                  'Done.',
                )
              }
            >
              {next.label}
            </button>
          )}
          {waitingOnPicks && <p class="panel-text">Dares come once every rival pick is in.</p>}

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
