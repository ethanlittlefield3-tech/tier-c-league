import { useEffect, useState } from 'preact/hooks';
import { DODGE_PENALTY, PROOF_VOTE_HOURS, WEEKDAYS, dareStatus, fastDate, isVideoDare, weekdayIndex } from '@tcl/engine';
import { useAll, useDoc, useNow, usePeek, useWhere } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { shrinkPhoto } from '../receipts/photo.ts';
import { fastOf, type SeasonClockDoc } from '../today/model.ts';
import { Back, Heading } from '../ui/parts.tsx';
import { timeLeft } from '../ui/when.ts';
import { WheelArt } from '../wheel/WheelArt.tsx';
import './draft.css';
import './receipts.css';
import './wheel.css';

export interface Draw {
  id: string;
  player: string;
  n: number;
  pool: string[];
  drawnAt: number;
  dueAt: number;
}

export interface Spin {
  player: string;
  period: string;
  at: number | null;
  proofAt: number | null;
}

export interface ProofVote {
  voter: string;
  player: string;
  draw: string;
  choice: 'counts' | 'doesntCount';
}

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'That spin was not accepted.',
};

/** "Sunday 11:59 pm", in league time, for a deadline at midnight: on a fast test league's own clock if it has one. */
function dueText(dueAt: number, season: SeasonClockDoc): string {
  const fast = fastOf(season);
  const day = fast ? WEEKDAYS[weekdayIndex(fastDate(fast.kickoff, fast, dueAt - 1))] : new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: season.timeZone }).format(dueAt - 60_000);
  return `${day} 11:59 pm`;
}

/** The newest week that has Wheel draws, with them in order. */
export function latestWheel(weeks: { id: string; data: { week: number; wheel?: Record<string, Draw> } }[]) {
  const withDraws = weeks.filter((week) => week.data.wheel && Object.keys(week.data.wheel).length > 0).sort((a, b) => b.data.week - a.data.week);
  const week = withDraws[0];
  if (!week) return null;
  const draws = Object.values(week.data.wheel ?? {}).sort((a, b) => (a.player === b.player ? a.n - b.n : a.player < b.player ? -1 : 1));
  return { period: week.id, week: week.data.week, draws };
}

/**
 * The Wheel of Shame (SCOPE.md): each week's lowest scorer spins a sealed
 * wheel live. The server drew the result when the week went final; the spin
 * only reveals it, on every phone at once.
 */
export function Wheel(props: { me: Me; onBack: () => void }) {
  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<{ season?: string | null; members?: Record<string, boolean> }>(leaguePath);
  const seasonPath = league.data?.season ? `${leaguePath}/seasons/${league.data.season}` : null;
  const season = useDoc<SeasonClockDoc>(seasonPath);
  const weeks = useAll<{ week: number; wheel?: Record<string, Draw> }>(seasonPath ? `${seasonPath}/weeks` : null);
  const spins = useAll<Spin>(seasonPath ? `${seasonPath}/spins` : null);
  const proofVotes = useWhere<ProofVote>(seasonPath ? `${seasonPath}/votes` : null, 'kind', 'proof');
  const players = useAll<{ displayName?: string }>(`${leaguePath}/players`);
  const eligible = Math.max(0, Object.keys(league.data?.members ?? {}).length - 1);
  const name = (player: string) => players.docs.find((found) => found.id === player)?.data.displayName ?? 'A former player';
  const wheel = latestWheel(weeks.docs);

  return (
    <main class="screen wheel">
      <div class="screen-body">
        <Back onBack={props.onBack} />
        <Heading>The Wheel of Shame</Heading>
        {!wheel || !seasonPath || !league.data?.season ? (
          <p class="lead">No spins yet. The week's lowest scorer spins once the week is final, at midnight on Tuesday.</p>
        ) : (
          <>
            <p class="lead">Week {wheel.week}. The result was sealed when the week went final; the spin only reveals it.</p>
            {wheel.draws.map((draw) => (
              <DrawCard
                key={draw.id}
                me={props.me}
                seasonId={league.data?.season ?? ''}
                seasonPath={seasonPath}
                period={wheel.period}
                draw={draw}
                spin={spins.docs.find((found) => found.id === draw.id)?.data ?? null}
                votes={proofVotes.docs.map((found) => found.data).filter((vote) => vote.draw === draw.id)}
                eligible={eligible}
                name={name}
                season={season.data ?? { timeZone: 'America/New_York' }}
              />
            ))}
          </>
        )}
      </div>
    </main>
  );
}

const PROOF_TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'That was not accepted. The deadline may have passed.',
};

function DrawCard(props: {
  me: Me;
  seasonId: string;
  seasonPath: string;
  period: string;
  draw: Draw;
  spin: Spin | null;
  votes: ProofVote[];
  eligible: number;
  name: (player: string) => string;
  season: SeasonClockDoc;
}) {
  const now = useNow();
  const spun = props.spin !== null;
  const mine = props.draw.player === props.me.player;
  // Spun while this card was open: show the spin. Already spun before: show where it landed.
  const [watching] = useState(() => !spun);
  const [tries, setTries] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The rules show the result once the server has the spin, so look again until it does.
  const result = usePeek<{ slice: number; dare: string }>(spun ? `${props.seasonPath}/sealed/wheel_${props.draw.id}` : null, tries + (props.spin?.at ?? 0));
  useEffect(() => {
    if (!spun || result || tries >= 8) return undefined;
    const timer = setTimeout(() => setTries((count) => count + 1), 1500);
    return () => clearTimeout(timer);
  }, [spun, result, tries]);

  const spin = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.spinTheWheel(props.me, props.seasonId, { id: props.draw.id, period: props.period }))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };

  const who = mine ? 'You' : props.name(props.draw.player);
  const landed = result?.slice ?? null;
  const counts = props.votes.filter((vote) => vote.choice === 'counts').length;
  const doesntCount = props.votes.filter((vote) => vote.choice === 'doesntCount').length;
  const status = dareStatus({ spunAt: props.spin?.at ?? null, proofAt: props.spin?.proofAt ?? null, dueAt: props.draw.dueAt, now, eligible: props.eligible, counts, doesntCount });
  const myVote = props.votes.find((vote) => vote.voter === props.me.player)?.choice ?? null;
  const proofPhoto = usePeek<{ photo: string }>(props.spin?.proofAt ? `${props.seasonPath}/dareProofs/${props.draw.id}` : null, props.spin?.proofAt ?? 0);

  const upload = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    void shrinkPhoto(file)
      .then((photo) => loadData().then((api) => api.proveDare(props.me, props.seasonId, props.draw.id, photo)))
      .catch((failure: unknown) => setError(failure instanceof Error && !('why' in failure) ? failure.message : PROOF_TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };

  const vote = (choice: 'counts' | 'doesntCount') => {
    void loadData()
      .then((api) => api.voteOnProof(props.me, props.seasonId, { player: props.draw.player, draw: props.draw.id, choice }))
      .catch((failure: unknown) => setError(PROOF_TROUBLE[whyOf(failure)]));
  };
  return (
    <section class="panel wheel-card" aria-labelledby={`spin-${props.draw.id}`}>
      <h2 id={`spin-${props.draw.id}`}>
        {mine ? 'Your spin' : `${who} spins`}
        {props.draw.n > 1 ? `, again (${props.draw.n})` : ''}
      </h2>
      <WheelArt pool={props.draw.pool} landed={landed} animate={watching} label={landed === null ? `The wheel, ${props.draw.pool.length} dares` : `The wheel landed on: ${result?.dare ?? ''}`} />
      {!spun ? (
        mine ? (
          <button type="button" class="btn wheel-spin" disabled={busy} onClick={spin}>
            Spin the Wheel
          </button>
        ) : (
          <p class="panel-text wheel-wait">Waiting for {who} to spin.</p>
        )
      ) : result ? (
        <p class="wheel-dare" data-landed={watching ? 'live' : 'before'}>
          {mine ? 'Your dare' : `${who}'s dare`}: <strong>{result.dare}</strong>
        </p>
      ) : (
        <p class="panel-text">Revealing…</p>
      )}
      {status === 'spun' && (
        <>
          <p class="panel-text">
            Proof is due by {dueText(props.draw.dueAt, props.season)}, in {timeLeft(props.draw.dueAt - now)}. Then everyone else votes for {PROOF_VOTE_HOURS} hours.
          </p>
          {result && isVideoDare(result.dare) && <p class="fine-print">A video goes in the group chat. Upload a still from it here, and the league votes in the app.</p>}
          {mine && (
            <label class="btn receipt-upload wheel-proof-upload" data-busy={busy}>
              Upload proof
              <input type="file" accept="image/*" class="sr-only" disabled={busy} onChange={upload} />
            </label>
          )}
        </>
      )}
      {status === 'unspun' && <p class="panel-text">Proof is due by {dueText(props.draw.dueAt, props.season)}, spun or not.</p>}
      {(status === 'voting' || status === 'counted' || status === 'redo') && (
        <div class="wheel-proof">
          {proofPhoto ? <img src={proofPhoto.photo} alt={`${mine ? 'Your' : `${who}'s`} dare proof`} /> : <p class="panel-text">Getting the photo…</p>}
          <p class="draft-tally" data-outcome={status === 'counted' ? 'approved' : status === 'redo' ? 'vetoed' : 'open'}>
            {status === 'counted' ? 'It counts. Dare done.' : status === 'redo' ? `It doesn't count: ${mine ? 'you spin' : `${who} spins`} again.` : 'Voting'}: {counts} counts, {doesntCount} doesn't
          </p>
          {status === 'voting' && !mine && (
            <div class="draft-vote-buttons" role="group" aria-label="Your vote on the proof">
              <button type="button" class="choice-option" aria-pressed={myVote === 'counts'} onClick={() => vote('counts')}>
                Counts
              </button>
              <button type="button" class="choice-option draft-veto" aria-pressed={myVote === 'doesntCount'} onClick={() => vote('doesntCount')}>
                Doesn't count
              </button>
            </div>
          )}
          {status === 'voting' && mine && <p class="panel-text">Everyone else votes for {PROOF_VOTE_HOURS} hours from when you posted it.</p>}
        </div>
      )}
      {status === 'dodged' && (
        <p class="wheel-dodged">
          {props.draw.id.startsWith('p')
            ? `No proof by the deadline: ${mine ? 'you dodged' : `${who} dodged`} the Season Dare.`
            : `No proof by the deadline: ${mine ? 'you lose' : `${who} loses`} ${-DODGE_PENALTY} Season Points.`}
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
