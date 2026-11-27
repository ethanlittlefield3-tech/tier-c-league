import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import { addRecords, pickFor, weekOdds } from '@tcl/engine';
import { CarArt } from '../art/car/CarArt.tsx';
import type { CarParts } from '../art/car/draw.ts';
import { useAll, useNow, useWhere } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { recall, remember } from '../storage.ts';
import { usePicksDue, type PicksDue } from './usePicksDue.ts';
import './sheet.css';
import './picks.css';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'Picks for this week are closed.',
};

/**
 * Picks pop up by themselves once a week, on Monday: the first time the app
 * opens that day, unless every matchup is picked already. Closed, they come
 * back from Today's picks banner until 11:59 pm.
 */
export function MondayPicks(props: { me: Me; open: boolean; onOpen: () => void; onClose: () => void }) {
  const now = useNow();
  const due = usePicksDue(props.me, now);
  useEffect(() => {
    if (!due || due.picked === due.pairs.length) return;
    const key = `tcl.picks.popped.${props.me.league}.${props.me.player}.${due.seasonId}.${due.period}`;
    if (recall(key)) return;
    remember(key, '1');
    props.onOpen();
  }, [due?.period, due?.picked]);
  return props.open && due ? <PicksSheet me={props.me} due={due} onClose={props.onClose} /> : null;
}

/**
 * Predictions (SCOPE.md, "Predictions"; ruling R25): pick the winners of the
 * week that just started, by 11:59 pm on its Monday. Nobody else sees your
 * picks until then. When the week is final, a summary goes in the feed, and
 * the season's best record wins Prophet.
 */
export function PicksSheet(props: { me: Me; due: PicksDue; onClose: () => void }) {
  const { due } = props;
  const players = useAll<{ displayName?: string; car?: Partial<CarParts>; rankHistory?: { season: string; period: string; points: number }[] }>(`leagues/${props.me.league}/players`);
  const record = useWhere<{ made?: number; right?: number }>(`leagues/${props.me.league}/seasons/${due.seasonId}/predictions`, 'player', props.me.player);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const picks = draft ?? due.picks;
  const picked = due.pairs.filter((pair) => pickFor(picks, pair) !== null).length;
  const season = addRecords(record.docs.filter((found) => typeof found.data.made === 'number').map((found) => ({ made: found.data.made!, right: found.data.right ?? 0 })));
  const player = (id: string) => players.docs.find((found) => found.id === id)?.data;
  const name = (id: string) => (id === props.me.player ? 'You' : (player(id)?.displayName ?? 'Player'));

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const choose = (pair: { a: string; b: string }, chosen: string) => {
    const others = picks.filter((each) => each !== pair.a && each !== pair.b);
    const next = pickFor(picks, pair) === chosen ? others : [...others, chosen];
    setDraft(next);
    setError(null);
    void loadData()
      .then((api) => api.savePicks(props.me, due.seasonId, { period: due.period, monday: due.monday, lockAt: due.lockAt, picks: next }))
      .catch((failure: unknown) => {
        setDraft(null);
        setError(TROUBLE[whyOf(failure)]);
      });
  };

  // Each side's chance in the week's odds, from their recent weeks; an even matchup shows none.
  const chanceOf = (pair: { a: string; b: string }, id: string) => {
    const a = weekOdds(player(pair.a)?.rankHistory, player(pair.b)?.rankHistory, due.seasonId, due.week);
    return a === 0.5 ? null : id === pair.a ? a : 1 - a;
  };
  const side = (pair: { a: string; b: string }, id: string) => {
    const chance = chanceOf(pair, id);
    const percent = chance === null ? null : `${Math.round(chance * 100)}%`;
    return (
      <button type="button" class="picks-side" aria-pressed={pickFor(picks, pair) === id} aria-label={percent ? `${name(id)}, ${percent} to win` : name(id)} onClick={() => choose(pair, id)}>
        <CarArt parts={player(id)?.car} bare class="picks-car" />
        <span class="picks-name">{name(id)}</span>
        {percent && (
          <span class="picks-odds" data-fav={chance! > 0.5}>
            {percent} to win
          </span>
        )}
      </button>
    );
  };

  return createPortal(
    <div class="sheet-layer">
      <div class="sheet-backdrop" onClick={props.onClose} />
      <section class="sheet picks-sheet" role="dialog" aria-modal="true" aria-labelledby="picks-title">
        <p class="picks-kicker">New week</p>
        <h2 id="picks-title" ref={title} tabIndex={-1}>
          Week {due.week} picks
        </h2>
        <p class="sheet-lead">Who wins each matchup? Picks close tonight at 11:59 pm, and nobody sees yours until then.</p>
        <ul class="picks-list">
          {due.pairs.map((pair) => (
            <li key={`${pair.a}-${pair.b}`}>
              <div class="picks-match" role="group" aria-label={`${name(pair.a)} against ${name(pair.b)}`}>
                {side(pair, pair.a)}
                <span class="picks-vs" aria-hidden="true">
                  vs
                </span>
                {side(pair, pair.b)}
              </div>
            </li>
          ))}
        </ul>
        <p class="fine-print picks-note">The odds come from each player's last 4 final weeks.</p>
        <p class="picks-count" aria-live="polite">
          {picked} of {due.pairs.length} picked
        </p>
        {error && (
          <p class="field-error" role="alert">
            {error}
          </p>
        )}
        {season.made > 0 && (
          <p class="fine-print picks-record">
            This season: {season.right} right of {season.made}. The best record wins Prophet.
          </p>
        )}
        <button type="button" class="btn picks-done" onClick={props.onClose}>
          {picked === due.pairs.length ? 'Done' : 'Later'}
        </button>
      </section>
    </div>,
    document.body,
  );
}
