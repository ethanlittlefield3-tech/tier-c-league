import { useState } from 'preact/hooks';
import { DARE_MAX, voteOutcome, type VoteOutcome } from '@tcl/engine';
import { useAll } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { Field } from '../ui/parts.tsx';

export interface DareVote {
  voter: string;
  kind: string;
  player: string;
  version: number;
  choice: 'approve' | 'veto';
}

const OUTCOME: Record<VoteOutcome, string> = { open: 'Voting', approved: 'Approved', vetoed: 'Vetoed' };

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league did not accept that. The votes may have closed.',
};

function tally(votes: DareVote[], player: string, version: number | undefined, eligible: number, closed: boolean) {
  const these = votes.filter((vote) => vote.kind === 'dare' && vote.player === player && vote.version === version);
  const approvals = these.filter((vote) => vote.choice === 'approve').length;
  const vetoes = these.filter((vote) => vote.choice === 'veto').length;
  return { approvals, vetoes, outcome: voteOutcome({ eligible, approvals, vetoes, closed }), mine: (voter: string) => these.find((vote) => vote.voter === voter)?.choice ?? null };
}

/**
 * The dare pick (SCOPE.md, draft step 5): each player adds one dare to the
 * Wheel, and everyone else votes on it. A majority veto removes it, and
 * nobody votes on their own.
 */
export function Dares(props: { me: Me; seasonId: string; open: boolean; members: string[]; votes: DareVote[]; eligible: number; name: (player: string) => string }) {
  const dares = useAll<{ text: string; version?: number }>(`leagues/${props.me.league}/seasons/${props.seasonId}/dares`);
  const mine = dares.docs.find((found) => found.id === props.me.player)?.data ?? null;
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? mine?.text ?? '';
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);
  const closed = !props.open;

  const save = (event: Event) => {
    event.preventDefault();
    if (busy) return;
    const words = shown.trim();
    if (words.length === 0) return setNote({ error: true, text: 'Type a dare first.' });
    if (words.length > DARE_MAX) return setNote({ error: true, text: `A dare can be up to ${DARE_MAX} characters.` });
    setBusy(true);
    setNote(null);
    void loadData()
      .then((api) => api.saveDare(props.me, props.seasonId, words))
      .then(() => {
        setText(null);
        setNote({ error: false, text: 'Saved. Everyone else can vote on it now.' });
      })
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  const vote = (player: string, version: number, choice: 'approve' | 'veto') => {
    void loadData()
      .then((api) => api.voteOnDare(props.me, props.seasonId, { player, version, choice }))
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }));
  };

  const myCount = mine ? tally(props.votes, props.me.player, mine.version, props.eligible, closed) : null;
  const others = props.members.filter((player) => player !== props.me.player);

  if (closed) {
    const order = [props.me.player, ...others];
    return (
      <section class="panel" aria-labelledby="dares-title">
        <h2 id="dares-title">Dares for the Wheel</h2>
        <p class="panel-text">Votes are closed. The Wheel holds the starter dares and every dare that stands.</p>
        {order.map((player) => {
          const found = dares.docs.find((doc) => doc.id === player)?.data;
          if (!found) return null;
          const count = tally(props.votes, player, found.version, props.eligible, true);
          return (
            <div class="draft-vote" key={player} data-dare={player}>
              <p class="draft-vote-goal">
                <span>{player === props.me.player ? 'Your dare' : props.name(player)}</span>
                {found.text}
              </p>
              <p class="draft-tally" data-outcome={count.outcome}>
                {OUTCOME[count.outcome]}: {count.approvals} approve, {count.vetoes} veto
              </p>
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <>
      <form class="panel" onSubmit={save} noValidate aria-labelledby="my-dare-title">
        <h2 id="my-dare-title">Your dare for the Wheel</h2>
        <p class="panel-text">One dare that the week's lowest scorer might spin. Keep it doable in a week, with a photo to prove it.</p>
        <Field
          id="my-dare"
          label="Your dare"
          hideLabel
          value={shown}
          onInput={(value) => {
            setNote(null);
            setText(value);
          }}
          maxLength={DARE_MAX + 20}
          help={`Up to ${DARE_MAX} characters.`}
        />
        {myCount && (
          <p class="draft-tally" data-outcome={myCount.outcome} data-testid="my-dare-tally">
            {OUTCOME[myCount.outcome]}: {myCount.approvals} approve, {myCount.vetoes} veto
            {myCount.outcome === 'vetoed' ? '. Change the words and save.' : ''}
          </p>
        )}
        {note && (
          <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
            {note.text}
          </p>
        )}
        <button class="btn" type="submit" disabled={busy}>
          {busy ? 'Saving' : 'Save my dare'}
        </button>
      </form>

      <section class="panel" aria-labelledby="dare-votes-title">
        <h2 id="dare-votes-title">Vote on dares</h2>
        <p class="panel-text">Veto anything unsafe, cruel or impossible to prove.</p>
        {others.map((player) => {
          const found = dares.docs.find((doc) => doc.id === player)?.data;
          if (!found) {
            return (
              <p class="panel-text" key={player}>
                {props.name(player)} hasn't added a dare yet.
              </p>
            );
          }
          const count = tally(props.votes, player, found.version, props.eligible, false);
          const my = count.mine(props.me.player);
          return (
            <div class="draft-vote" key={player} data-dare={player}>
              <p class="draft-vote-goal">
                <span>{props.name(player)}</span>
                {found.text}
              </p>
              <div class="draft-vote-buttons">
                <button type="button" class="choice-option" aria-pressed={my === 'approve'} aria-label={`Approve ${props.name(player)}'s dare`} onClick={() => vote(player, found.version ?? 1, 'approve')}>
                  Approve
                </button>
                <button type="button" class="choice-option draft-veto" aria-pressed={my === 'veto'} aria-label={`Veto ${props.name(player)}'s dare`} onClick={() => vote(player, found.version ?? 1, 'veto')}>
                  Veto
                </button>
              </div>
              <p class="draft-tally" data-outcome={count.outcome}>
                {OUTCOME[count.outcome]}: {count.approvals} approve, {count.vetoes} veto
              </p>
            </div>
          );
        })}
      </section>
    </>
  );
}
