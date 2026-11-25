import { useState } from 'preact/hooks';
import { LANES, RUMBLE_NAMES, RUMBLE_TEXT, type Lane, type RumbleItem } from '@tcl/engine';
import type { Trouble } from '../data/identity.ts';
import type { Where } from '../data/kit.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import './group.css';

const LANE_NAMES: Record<Lane, string> = { mind: 'Mind', body: 'Body', wildcard: 'Wildcard' };
const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no: a Boot is picked by noon, once, against a goal of a player who is not resting.',
};

/**
 * Today in a Rumble week (SCOPE.md, "Rumble"): your item for today and your
 * opponent's, revealed at 12:00 am, and, when yours is Boot, the goal you
 * pick for it by noon. Every item is played for you; only Boot needs a pick.
 */
export function RumblePanel(props: {
  where: Where;
  now: number;
  today: { date: string; period: string; noon?: number; lock: number };
  vsHouse: boolean;
  mine: RumbleItem | null;
  theirs: RumbleItem | null;
  opponent: { id: string; name: string; goals: Partial<Record<Lane, string>>; resting: boolean } | null;
  /** The goal your Boot picked today, if it did. */
  myBoot: Lane | null;
}) {
  const [lane, setLane] = useState<Lane | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (props.vsHouse) {
    return (
      <section class="panel rumble" aria-labelledby="rumble-title">
        <h2 id="rumble-title">Rumble</h2>
        <p class="panel-text">You face The House this week. The House plays no items, so neither do you: every point you score still counts.</p>
      </section>
    );
  }

  const bootOpen = props.mine === 'boot' && !props.myBoot && props.today.noon !== undefined && props.now < props.today.noon;
  const kick = () => {
    if (busy || !lane || !props.opponent) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.setBoot(props.where, { period: props.today.period, target: props.opponent!.id, date: props.today.date, lane, lock: props.today.lock }))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };

  return (
    <section class="panel rumble" aria-labelledby="rumble-title">
      <h2 id="rumble-title">Today's Rumble items</h2>
      <p class="rumble-item" data-item={props.mine ?? 'none'}>
        <strong>You: {props.mine ? RUMBLE_NAMES[props.mine] : 'arrives at 12:00 am'}</strong>
        {props.mine && <span>{RUMBLE_TEXT[props.mine]}</span>}
      </p>
      {props.opponent && (
        <p class="rumble-item" data-item={props.theirs ?? 'none'}>
          <strong>
            {props.opponent.name}: {props.theirs ? RUMBLE_NAMES[props.theirs] : 'not out yet'}
          </strong>
          {props.theirs && <span>{RUMBLE_TEXT[props.theirs]}</span>}
        </p>
      )}
      {props.mine === 'boot' && props.opponent && (
        <div class="rumble-boot">
          {props.myBoot ? (
            <p class="power-done">
              Your Boot is on {props.opponent.name}'s {LANE_NAMES[props.myBoot]} goal. Only you can see it until the day locks at noon tomorrow.
            </p>
          ) : props.opponent.resting ? (
            <p class="panel-text">{props.opponent.name} is resting today, so Boot has no goal to take.</p>
          ) : bootOpen ? (
            <>
              <p class="panel-text">Pick one of {props.opponent.name}'s goals by 12:00 pm. It can't be changed once set.</p>
              <div class="power-lanes" role="group" aria-label="Which goal to Boot">
                {LANES.map((each) => (
                  <button type="button" class="power-choice power-lane" aria-pressed={lane === each} disabled={busy} onClick={() => setLane(each)}>
                    <span>{LANE_NAMES[each]}</span>
                    <small>{props.opponent!.goals[each] || 'Not set yet'}</small>
                  </button>
                ))}
              </div>
              {error && (
                <p class="field-error" role="alert">
                  {error}
                </p>
              )}
              <button type="button" class="btn" disabled={busy || !lane} onClick={kick}>
                {busy ? 'Booting' : 'Boot it'}
              </button>
            </>
          ) : (
            <p class="panel-text">Noon has passed, so today's Boot went unused.</p>
          )}
        </div>
      )}
    </section>
  );
}
