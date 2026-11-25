import { useState } from 'preact/hooks';
import { LANES, voteOutcome, type Lane, type VoteOutcome } from '@tcl/engine';
import { useAll, useDoc, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { Back, Field, Heading } from '../ui/parts.tsx';
import { timeLeft } from '../ui/when.ts';
import { Dares, type DareVote } from './Dares.tsx';
import { RivalPicks } from './RivalPicks.tsx';
import './draft.css';

interface DraftState {
  step: 'goals' | 'rivals' | 'dares' | 'done';
  order?: string[];
  left?: string[];
  picks?: Record<string, string>;
  turnStartedAt?: number | null;
  /** When goals and votes close, in milliseconds. */
  votesCloseAt?: number;
}

type Goals = Partial<Record<Lane, { text: string; version?: number }>>;

interface Vote {
  voter: string;
  kind: string;
  player: string;
  lane: Lane;
  version: number;
  choice: 'approve' | 'veto';
}

const LANES_HELP: Record<Lane, { name: string; help: string }> = {
  mind: { name: 'Mind', help: 'Learning or studying: study 1 hour, read 20 pages, a course lesson.' },
  body: { name: 'Body', help: 'Anything physical: the gym, 10k steps, a run.' },
  wildcard: { name: 'Wildcard', help: 'Your own pick: meal prep, no vaping, call family.' },
};

const OUTCOME: Record<VoteOutcome, string> = { open: 'Voting', approved: 'Approved', vetoed: 'Vetoed' };

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league did not accept that. The votes may have closed.',
};

/** The tally for one version of one player's goal. */
function tally(votes: Vote[], player: string, lane: Lane, version: number | undefined, eligible: number, closed: boolean) {
  const these = votes.filter((vote) => vote.kind === 'goal' && vote.player === player && vote.lane === lane && vote.version === version);
  const approvals = these.filter((vote) => vote.choice === 'approve').length;
  const vetoes = these.filter((vote) => vote.choice === 'veto').length;
  return { approvals, vetoes, outcome: voteOutcome({ eligible, approvals, vetoes, closed }), mine: (voter: string) => these.find((vote) => vote.voter === voter)?.choice ?? null };
}

/** Everyone's goals and how their votes ended, once the votes close. */
function Results(props: {
  members: string[];
  rosters: { id: string; data: { goals?: Goals } }[];
  votes: Vote[];
  eligible: number;
  name: (player: string) => string;
  me: string;
}) {
  const order = [props.me, ...props.members.filter((player) => player !== props.me)];
  return (
    <section class="panel" aria-labelledby="results-title">
      <h2 id="results-title">The season's goals</h2>
      <p class="panel-text">Votes are closed. A goal still vetoed here is one for your commish to settle.</p>
      {order.map((player) => {
        const goals = props.rosters.find((found) => found.id === player)?.data.goals;
        return (
          <div class="draft-player" key={player}>
            <h3>{player === props.me ? 'You' : props.name(player)}</h3>
            {!goals ? (
              <p class="panel-text">No goals set.</p>
            ) : (
              LANES.map((lane) => {
                const goal = goals[lane];
                if (!goal) return null;
                const count = tally(props.votes, player, lane, goal.version, props.eligible, true);
                return (
                  <div class="draft-vote" key={lane} data-lane={lane} data-player={player}>
                    <p class="draft-vote-goal">
                      <span>{LANES_HELP[lane].name}</span>
                      {goal.text}
                    </p>
                    <p class="draft-tally" data-outcome={count.outcome}>
                      {OUTCOME[count.outcome]}: {count.approvals} approve, {count.vetoes} veto
                    </p>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </section>
  );
}

const STEP: Record<DraftState['step'], string> = { goals: 'goals', rivals: 'rival picks', dares: 'dares', done: 'done' };

/**
 * The draft (SCOPE.md, "Draft day agenda"). The live draft has three steps:
 * goals, with everyone voting on everyone else's; rival picks for Week 1; and
 * dares for the Wheel. The commish moves it from step to step. Goals and votes
 * stay open for 24 hours, for anyone who missed it live.
 */
export function Draft(props: { me: Me; onBack: () => void }) {
  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<{ season?: string | null; members?: Record<string, boolean>; commish?: string; coCommish?: string | null }>(leaguePath);
  const seasonId = league.data?.season ?? null;
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const draft = useDoc<DraftState>(seasonPath ? `${seasonPath}/draft/state` : null);
  const rosters = useAll<{ goals?: Goals }>(seasonPath ? `${seasonPath}/roster` : null);
  const votes = useAll<Vote>(seasonPath ? `${seasonPath}/votes` : null);
  const players = useAll<{ displayName?: string }>(`${leaguePath}/players`);
  const now = useNow();

  const mine = rosters.docs.find((found) => found.id === props.me.player)?.data.goals ?? {};
  const [texts, setTexts] = useState<Record<Lane, string> | null>(null);
  const shown: Record<Lane, string> = texts ?? { mind: mine.mind?.text ?? '', body: mine.body?.text ?? '', wildcard: mine.wildcard?.text ?? '' };
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);

  const members = Object.keys(league.data?.members ?? {});
  const eligible = Math.max(0, members.length - 1);
  const step = draft.data?.step ?? null;
  const closeAt = draft.data?.votesCloseAt ?? null;
  const closed = closeAt === null || now >= closeAt;
  const isCommish = league.data?.commish === props.me.player || league.data?.coCommish === props.me.player;
  const name = (player: string) => players.docs.find((found) => found.id === player)?.data.displayName ?? 'Player';
  const allVotes = votes.docs.map((found) => found.data);

  const saveGoals = (event: Event) => {
    event.preventDefault();
    if (busy || !seasonId) return;
    if (LANES.some((lane) => shown[lane].trim().length === 0)) return setNote({ error: true, text: 'Set all three goals first.' });
    if (LANES.some((lane) => shown[lane].trim().length > 60)) return setNote({ error: true, text: 'Each goal can be up to 60 characters.' });
    setBusy(true);
    setNote(null);
    void loadData()
      .then((api) => api.saveGoals(props.me, seasonId, shown))
      .then(() => {
        setTexts(null);
        setNote({ error: false, text: 'Saved. Everyone else can vote on them now.' });
      })
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  const vote = (player: string, lane: Lane, version: number, choice: 'approve' | 'veto') => {
    if (!seasonId) return;
    void loadData()
      .then((api) => api.voteOnGoal(props.me, seasonId, { player, lane, version, choice }))
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }));
  };

  return (
    <main class="screen draft">
      <div class="screen-body">
        <Back onBack={props.onBack} />
        <Heading>The draft</Heading>
        {!draft.data ? (
          <p class="lead">The draft hasn't started. Your commish starts it from Commish tools.</p>
        ) : (
          <>
            <p class="lead">
              {step === 'goals'
                ? "Set your three goals, then vote on everyone else's. A goal vetoed by more than half the league needs new words."
                : step === 'done'
                  ? 'The draft is done.'
                  : step === 'dares'
                    ? "Add one dare for the Wheel, and vote on everyone else's. A dare vetoed by more than half the league stays off the Wheel."
                    : `The live draft has moved on to ${STEP[step ?? 'goals']}.`}
            </p>
            {draft.data.left && seasonId && <RivalPicks me={props.me} seasonId={seasonId} state={draft.data} name={name} isCommish={isCommish} />}
            {(step === 'dares' || step === 'done') && seasonId && (
              <Dares me={props.me} seasonId={seasonId} open={!closed} members={members} votes={votes.docs.map((found) => found.data as unknown as DareVote)} eligible={eligible} name={name} />
            )}
            {closed ? (
              <Results members={members} rosters={rosters.docs} votes={allVotes} eligible={eligible} name={name} me={props.me.player} />
            ) : (
              <>
                <p class="draft-clock" role="status">
                  Goals and votes close in <strong>{timeLeft((closeAt ?? now) - now)}</strong>.
                </p>

                <form class="panel" onSubmit={saveGoals} noValidate aria-labelledby="my-goals-title">
                  <h2 id="my-goals-title">Your goals</h2>
                  {LANES.map((lane) => {
                    const count = tally(allVotes, props.me.player, lane, mine[lane]?.version, eligible, closed);
                    return (
                      <div class="draft-goal" key={lane}>
                        <Field
                          id={`goal-${lane}`}
                          label={LANES_HELP[lane].name}
                          value={shown[lane]}
                          onInput={(value) => {
                            setNote(null);
                            setTexts({ ...shown, [lane]: value });
                          }}
                          maxLength={80}
                          help={LANES_HELP[lane].help}
                        />
                        {mine[lane] && (
                          <p class="draft-tally" data-outcome={count.outcome} data-testid={`my-tally-${lane}`}>
                            {OUTCOME[count.outcome]}: {count.approvals} approve, {count.vetoes} veto
                            {count.outcome === 'vetoed' ? '. Change the words and save.' : ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {note && (
                    <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
                      {note.text}
                    </p>
                  )}
                  <button class="btn" type="submit" disabled={busy}>
                    {busy ? 'Saving' : 'Save my goals'}
                  </button>
                </form>

                <section class="panel" aria-labelledby="vote-title">
                  <h2 id="vote-title">Vote on goals</h2>
                  <p class="panel-text">Is each goal a fair daily yes or no you can prove? Veto freebies and ones that can't happen most days.</p>
                  {members
                    .filter((player) => player !== props.me.player)
                    .map((player) => {
                      const goals = rosters.docs.find((found) => found.id === player)?.data.goals;
                      return (
                        <div class="draft-player" key={player}>
                          <h3>{name(player)}</h3>
                          {!goals ? (
                            <p class="panel-text">Hasn't set their goals yet.</p>
                          ) : (
                            LANES.map((lane) => {
                              const goal = goals[lane];
                              if (!goal) return null;
                              const count = tally(allVotes, player, lane, goal.version, eligible, closed);
                              const my = count.mine(props.me.player);
                              return (
                                <div class="draft-vote" key={lane} data-lane={lane} data-player={player}>
                                  <p class="draft-vote-goal">
                                    <span>{LANES_HELP[lane].name}</span>
                                    {goal.text}
                                  </p>
                                  <div class="draft-vote-buttons">
                                    <button type="button" class="choice-option" aria-pressed={my === 'approve'} aria-label={`Approve ${name(player)}'s ${LANES_HELP[lane].name} goal`} onClick={() => vote(player, lane, goal.version ?? 1, 'approve')}>
                                      Approve
                                    </button>
                                    <button type="button" class="choice-option draft-veto" aria-pressed={my === 'veto'} aria-label={`Veto ${name(player)}'s ${LANES_HELP[lane].name} goal`} onClick={() => vote(player, lane, goal.version ?? 1, 'veto')}>
                                      Veto
                                    </button>
                                  </div>
                                  <p class="draft-tally" data-outcome={count.outcome}>
                                    {OUTCOME[count.outcome]}: {count.approvals} approve, {count.vetoes} veto
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
