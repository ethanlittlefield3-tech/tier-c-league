import { useState } from 'preact/hooks';
import { captainOnTurn, pickDeadline, type CaptainsDraft, type Squad } from '@tcl/engine';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'That pick did not go through. It may not be your turn any more.',
};

const SQUAD_NAME: Record<Squad, string> = { blue: 'Blue', orange: 'Orange' };

/**
 * The captains' draft (SCOPE.md, draft step 6): blue and orange squads for
 * Team Week, snake-drafted by two captains, each pick on a 2-minute clock.
 * The squads hold for the season.
 */
export function Captains(props: { me: Me; seasonId: string; draft: CaptainsDraft & { turnStartedAt?: number | null }; name: (player: string) => string; now: number; live: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turn = captainOnTurn(props.draft);
  const captain = props.draft.captains[turn];
  const mine = props.live && props.draft.pool.length > 0 && captain === props.me.player;
  const left = props.draft.turnStartedAt ? Math.max(0, pickDeadline(props.draft.turnStartedAt) - props.now) : null;
  const clock = left === null ? '' : `${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, '0')}`;

  const pick = (player: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.pickForSquad(props.me, props.seasonId, player))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };

  return (
    <section class="panel draft-captains" aria-labelledby="captains-title">
      <h2 id="captains-title">Team Week squads</h2>
      <div class="squads">
        {(['blue', 'orange'] as const).map((squad) => (
          <div key={squad} class="squad" data-squad={squad}>
            <h3>{SQUAD_NAME[squad]}</h3>
            <ol aria-label={`${SQUAD_NAME[squad]} squad`}>
              {props.draft.squads[squad].map((player, at) => (
                <li key={player}>
                  {props.name(player)}
                  {at === 0 && <span class="squad-captain"> (captain)</span>}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      {props.draft.pool.length === 0 ? (
        <p class="panel-text">The squads are set. They hold for every Team Week this season.</p>
      ) : props.live ? (
        <>
          <p class="draft-clock" role="status">
            {mine ? 'Your pick.' : `${props.name(captain)} is picking for ${SQUAD_NAME[turn]}.`} <span class="draft-countdown">{clock}</span>
          </p>
          {mine && (
            <div class="choice choice-wrap" role="group" aria-label={`Pick for ${SQUAD_NAME[turn]}`}>
              {props.draft.pool.map((player) => (
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
        </>
      ) : null}
    </section>
  );
}
