import { useEffect, useRef, useState } from 'preact/hooks';
import { CarArt } from '../art/car/CarArt.tsx';
import { GoalExplosion } from '../art/car/GoalExplosion.tsx';
import { STARTER_CAR, type CarParts } from '../art/car/draw.ts';
import { recall, remember } from '../storage.ts';
import { weekName, type RankEntry } from './Rank.tsx';
import './win.css';

/** A score as the scene shows it, with a true minus sign. */
/** A score, with a true minus sign; a Team Week or 2v2 average keeps one decimal place. */
const score = (points: number) => (Number.isInteger(points) ? String(points) : points.toFixed(1)).replace('-', '\u2212');

/**
 * The win scene (SCOPE.md, "Car parts": the goal explosion is played when you
 * win a week). Your car drives onto the stage and your explosion bursts over
 * it, with the week's score. A tap, or Enter, closes it.
 */
export function WinScene(props: { week: RankEntry; car: Partial<CarParts> | null | undefined; onDone: () => void }) {
  const explosion = props.car?.explosion ?? STARTER_CAR.explosion;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') props.onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div class="win" role="dialog" aria-modal="true" aria-labelledby="win-title" onClick={props.onDone}>
      <div class="win-stage">
        <div class="win-platform" aria-hidden="true" />
        <CarArt parts={props.car} class="win-car" />
        <div class="win-boom">
          <GoalExplosion kind={explosion} delay={650} />
        </div>
      </div>
      <p class="win-kind">{weekName(props.week.period)}</p>
      <h1 id="win-title" class="win-title">
        You won
      </h1>
      <p class="win-score">
        {score(props.week.ours ?? props.week.points)}–{score(props.week.against ?? 0)}
      </p>
      <p class="win-hint">Tap to carry on</p>
    </div>
  );
}

/** The last final week this phone has looked at, so each win plays once. */
const seenKey = (league: string, player: string) => `tcl.week.${league}.${player}`;

/**
 * Whether to play the win scene: decided once, as the app opens, from the
 * latest final week in your rank history (`undefined` while it loads). It
 * plays for a win in a week this phone hasn't looked at yet, the first week
 * included. A phone that joins with weeks already final plays nothing old, a
 * draw or a loss plays nothing, and a week that goes final while the app is
 * open waits for the next open.
 */
export function useWinScene(league: string, player: string, latest: RankEntry | null | undefined): { week: RankEntry; done: () => void } | null {
  const [week, setWeek] = useState<RankEntry | null>(null);
  const decided = useRef(false);
  useEffect(() => {
    if (decided.current || latest === undefined) return;
    decided.current = true;
    // Before any week is final, the phone notes that it has seen none, so the
    // first win plays.
    if (latest === null) {
      if (recall(seenKey(league, player)) === null) remember(seenKey(league, player), 'none');
      return;
    }
    const id = `${latest.season}/${latest.period}`;
    const seen = recall(seenKey(league, player));
    if (seen !== null && seen !== id && latest.outcome === 'win') setWeek(latest);
    else remember(seenKey(league, player), id);
  }, [latest]);
  if (!week) return null;
  return {
    week,
    done: () => {
      remember(seenKey(league, player), `${week.season}/${week.period}`);
      setWeek(null);
    },
  };
}
