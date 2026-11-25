import { useState } from 'preact/hooks';
import { HOUSE, pickDeadline, picker, picksDone, week1Pairs } from '@tcl/engine';
import { useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { countdown } from '../ui/when.ts';
import { useMissedPicks, type PickView } from './useMissedPicks.ts';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'That pick was not accepted. It may not be your pick any more.',
};

/**
 * Rival picks (SCOPE.md, draft step 4): in draft order, each unpicked player
 * chooses a Week 1 opponent, on a 2-minute clock. With an odd count, the last
 * player faces The House.
 */
export function RivalPicks(props: { me: Me; seasonId: string; state: PickView; name: (player: string) => string; isCommish: boolean }) {
  const live = props.state.step === 'rivals';
  const now = useNow(live ? 1000 : 30_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useMissedPicks(props.me, props.seasonId, props.state, props.isCommish, now);

  const order = props.state.order ?? [];
  const left = props.state.left ?? [];
  const picks = props.state.picks ?? {};
  const done = picksDone(left);
  const who = live ? picker(left) : null;
  const started = props.state.turnStartedAt ?? null;
  const remaining = started === null ? 0 : pickDeadline(started) - now;
  const mine = who === props.me.player;

  const label = (player: string) => (player === props.me.player ? 'You' : player === HOUSE ? 'The House' : props.name(player));
  const lower = (player: string) => (player === props.me.player ? 'you' : props.name(player));
  const pickedBy = (player: string) => order.find((chooser) => picks[chooser] === player) ?? null;
  // The House joins Week 1 only once every pick is in.
  const pairs = week1Pairs({ order, picks, left: done ? left : [] });

  const status = (player: string) => {
    const chose = picks[player];
    if (chose) return `picked ${lower(chose)}`;
    const by = pickedBy(player);
    if (by) return `picked by ${lower(by)}`;
    if (player === who) return 'picking now';
    if (done && left[0] === player) return 'faces The House';
    return 'waiting';
  };

  const pick = (rival: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.pickRival(props.me, props.seasonId, rival))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };

  return (
    <section class="panel draft-rivals" aria-labelledby="rivals-title">
      <h2 id="rivals-title">Rival picks</h2>
      {done ? (
        <p class="panel-text">Every pick is in. This is Week 1.</p>
      ) : who === null ? (
        <p class="panel-text">The rival picks were left unfinished.</p>
      ) : mine ? (
        <p class="draft-clock draft-your-pick" role="status">
          <span>
            <strong>Your pick.</strong> Choose your Week 1 rival.
          </span>
          <span class="draft-countdown">{countdown(remaining)}</span>
        </p>
      ) : (
        <p class="draft-clock" role="status">
          <span>
            {props.name(who)} is picking.{remaining <= 0 ? ' Time is up, so the pick is made at random.' : ''}
          </span>
          <span class="draft-countdown">{countdown(remaining)}</span>
        </p>
      )}

      {mine && (
        <div class="draft-choices" role="group" aria-label="Your Week 1 rival">
          {left.slice(1).map((player) => (
            <button key={player} type="button" class="choice-option" disabled={busy} onClick={() => pick(player)}>
              {props.name(player)}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}

      {pairs.length > 0 && (
        <>
          <h3 class="draft-subhead">Week 1</h3>
          <ul class="draft-pairs">
            {pairs.map(([a, b]) => (
              <li key={a}>
                {label(a)} <span>vs</span> {label(b)}
              </li>
            ))}
          </ul>
        </>
      )}

      {!done && (
        <>
          <h3 class="draft-subhead">Draft order</h3>
          <ol class="draft-order">
            {order.map((player) => (
              <li key={player} data-state={player === who ? 'picking' : undefined}>
                <span>{label(player)}</span> <span class="draft-order-state">{status(player)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
