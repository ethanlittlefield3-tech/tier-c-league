import { useEffect, useState } from 'preact/hooks';
import { useAll, useDoc, useNow, usePeek } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { Back, Heading } from '../ui/parts.tsx';
import { WheelArt } from '../wheel/WheelArt.tsx';
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

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'That spin was not accepted.',
};

/** "Sunday 11:59 pm", in league time, for a deadline at midnight. */
function dueText(dueAt: number, timeZone: string): string {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(dueAt - 60_000);
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
  const league = useDoc<{ season?: string | null }>(leaguePath);
  const seasonPath = league.data?.season ? `${leaguePath}/seasons/${league.data.season}` : null;
  const season = useDoc<{ timeZone: string }>(seasonPath);
  const weeks = useAll<{ week: number; wheel?: Record<string, Draw> }>(seasonPath ? `${seasonPath}/weeks` : null);
  const spins = useAll<Spin>(seasonPath ? `${seasonPath}/spins` : null);
  const players = useAll<{ displayName?: string }>(`${leaguePath}/players`);
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
                name={name}
                timeZone={season.data?.timeZone ?? 'America/New_York'}
              />
            ))}
          </>
        )}
      </div>
    </main>
  );
}

function DrawCard(props: { me: Me; seasonId: string; seasonPath: string; period: string; draw: Draw; spin: Spin | null; name: (player: string) => string; timeZone: string }) {
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
      <p class="panel-text">
        Proof is due by {dueText(props.draw.dueAt, props.timeZone)}
        {now >= props.draw.dueAt ? ', and the time is up.' : '.'}
      </p>
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
