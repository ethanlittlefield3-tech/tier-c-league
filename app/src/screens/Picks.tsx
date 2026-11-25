import { useState } from 'preact/hooks';
import { addDays, addRecords, pickFor, weekPeriod } from '@tcl/engine';
import { useDoc, useWhere } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'Picks for that week are closed.',
};

interface Saved {
  picks: string[];
  right?: number;
  made?: number;
}

/**
 * Predictions (SCOPE.md, "Predictions"): pick next week's winners, by Sunday
 * 11:59 pm. Picks stay hidden until the week starts. The week's top picker
 * gets a shoutout in the feed, and the season's best record wins Prophet.
 */
export function Picks(props: {
  me: Me;
  seasonId: string;
  today: { date: string; week: number; dayIndex: number };
  weeks: { id: string; data: { week: number; pairs?: { a: string; b: string }[] } }[];
  name: (player: string) => string;
  now: number;
}) {
  const seasonPath = `leagues/${props.me.league}/seasons/${props.seasonId}`;
  const period = weekPeriod(props.today.week + 1);
  const monday = addDays(props.today.date, 7 - props.today.dayIndex);
  const next = props.weeks.find((week) => week.id === period);
  const mondayCal = useDoc<{ start: number; period: string }>(`${seasonPath}/calendar/${monday}`);
  const mine = useDoc<Saved>(`${seasonPath}/predictions/${period}_${props.me.player}`);
  const record = useWhere<Saved>(`${seasonPath}/predictions`, 'player', props.me.player);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const season = addRecords(record.docs.filter((found) => typeof found.data.made === 'number').map((found) => ({ made: found.data.made!, right: found.data.right ?? 0 })));

  const pairs = (next?.data.pairs ?? []).filter((pair) => pair.a !== 'HOUSE' && pair.b !== 'HOUSE');
  const picks = draft ?? mine.data?.picks ?? [];
  const lockAt = mondayCal.data?.period === period ? mondayCal.data.start : null;
  const open = lockAt !== null && props.now < lockAt;

  const choose = (pair: { a: string; b: string }, player: string) => {
    if (!open || lockAt === null) return;
    const others = picks.filter((picked) => picked !== pair.a && picked !== pair.b);
    const chosen = pickFor(picks, pair) === player ? others : [...others, player];
    setDraft(chosen);
    setError(null);
    void loadData()
      .then((api) => api.savePicks(props.me, props.seasonId, { period, monday, lockAt, picks: chosen }))
      .catch((failure: unknown) => {
        setDraft(null);
        setError(TROUBLE[whyOf(failure)]);
      });
  };

  return (
    <section class="panel league-panel" aria-labelledby="picks-title">
      <h2 id="picks-title">Your picks</h2>
      {pairs.length === 0 || lockAt === null ? (
        <p class="panel-text">Picks open for each week once its matchups are set, until the Sunday before it at 11:59 pm.</p>
      ) : (
        <>
          <p class="panel-text">
            {open ? `Pick Week ${props.today.week + 1}'s winners by Sunday at 11:59 pm. Nobody sees your picks until then.` : `Week ${props.today.week + 1} has started: picks are locked.`}
          </p>
          <ul class="picks">
            {pairs.map((pair) => (
              <li key={`${pair.a}-${pair.b}`}>
                <div class="choice" role="group" aria-label={`${props.name(pair.a)} against ${props.name(pair.b)}`}>
                  {[pair.a, pair.b].map((player) => (
                    <button key={player} type="button" class="choice-option" aria-pressed={pickFor(picks, pair) === player} disabled={!open} onClick={() => choose(pair, player)}>
                      {props.name(player)}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
      {season.made > 0 && (
        <p class="panel-text picks-record">
          This season: {season.right} right of {season.made}. The best record wins Prophet.
        </p>
      )}
    </section>
  );
}
