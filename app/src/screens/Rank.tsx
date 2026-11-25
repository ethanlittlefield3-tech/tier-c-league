import { useEffect, useRef, useState } from 'preact/hooks';
import { RANK_NAMES, RANK_WEEKS, rankMove, type Rank } from '@tcl/engine';
import { RankBadge } from '../art/RankBadge.tsx';
import { CarArt } from '../art/car/CarArt.tsx';
import type { CarParts } from '../art/car/draw.ts';
import { recall, remember } from '../storage.ts';
import './rank.css';

export interface RankEntry {
  season: string;
  period: string;
  points: number;
  max: number;
  rank: Rank;
  /** How the week's matchup ended, and the other side's points. */
  outcome?: 'win' | 'draw' | 'loss';
  against?: number;
  /** Team Week and 2v2: your side's average, which faced `against`. */
  ours?: number;
}

/** "Week 3" from "w03". */
export const weekName = (period: string) => `Week ${Number(period.slice(1))}`;

/**
 * Your rank, in Profile (SCOPE.md, "Ranks and trophies"): your form over the
 * last 4 weeks, as a share of the most a week can score.
 */
export function RankPanel(props: { rank: Rank | null; history: RankEntry[] }) {
  const recent = props.history.slice(-RANK_WEEKS);
  const share = recent.length ? recent.reduce((sum, week) => sum + week.points / week.max, 0) / recent.length : 0;
  return (
    <section class="panel rank-panel" aria-labelledby="profile-rank-title">
      <h2 id="profile-rank-title">Rank</h2>
      {props.rank === null ? (
        <p class="panel-text">Unranked until your first week is final. Rank follows your last 4 weeks, as a share of the most a week can score.</p>
      ) : (
        <>
          <div class="rank-now">
            <RankBadge rank={props.rank} class="rank-badge" />
            <div>
              <p class="rank-name">{RANK_NAMES[props.rank]}</p>
              <p class="panel-text">
                {Math.round(share * 100)}% of the most you could score, over your last {recent.length === 1 ? 'week' : `${recent.length} weeks`}.
              </p>
            </div>
          </div>
          <ol class="rank-history" aria-label="Recent weeks">
            {[...props.history]
              .slice(-6)
              .reverse()
              .map((week) => (
                <li key={`${week.season}-${week.period}`}>
                  <RankBadge rank={week.rank} class="rank-history-badge" />
                  <span>
                    {weekName(week.period)}: {week.points} of {week.max}
                  </span>
                  <span class="rank-history-name">{RANK_NAMES[week.rank]}</span>
                </li>
              ))}
          </ol>
        </>
      )}
    </section>
  );
}

const SHARDS = [0, 1, 2, 3, 4, 5].map((index) => {
  const angle = (index * 60 + 30) * (Math.PI / 180);
  return { index, dx: Math.round(Math.cos(angle) * 140), dy: Math.round(Math.sin(angle) * 140), spin: (index % 2 ? 1 : -1) * (40 + index * 12) };
});

/** The wedge of the badge each shard keeps: from the middle to two corners. */
const CORNERS = [
  [50, 6],
  [88, 28],
  [88, 72],
  [50, 94],
  [12, 72],
  [12, 28],
] as const;

/**
 * The rank-up scene (SCOPE.md, "Rank-up animation"): the next time you open
 * the app after your rank changes, your car boosts through the old badge,
 * which shatters into the new one. A rank-down gets a short, sad version. With
 * Reduce Motion, the new badge simply fades in. A tap closes it.
 */
export function RankUp(props: { from: Rank | null; to: Rank; car?: Partial<CarParts> | null; onDone: () => void }) {
  const move = rankMove(props.from, props.to);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') props.onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div class="rankup" data-move={move} role="dialog" aria-modal="true" aria-labelledby="rankup-title" onClick={props.onDone}>
      <div class="rankup-stage">
        {props.from && (
          <svg class="rankup-old" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              {SHARDS.map((shard) => {
                const [a, b] = [CORNERS[shard.index]!, CORNERS[(shard.index + 1) % 6]!];
                return (
                  <clipPath id={`rankup-wedge-${shard.index}`} key={shard.index}>
                    <polygon points={`50,50 ${a[0]},${a[1]} ${b[0]},${b[1]}`} />
                  </clipPath>
                );
              })}
            </defs>
            {SHARDS.map((shard) => (
              <g key={shard.index} class="rankup-shard" clip-path={`url(#rankup-wedge-${shard.index})`} style={{ '--dx': `${shard.dx}px`, '--dy': `${shard.dy}px`, '--spin': `${shard.spin}deg` }}>
                <RankBadge rank={props.from!} />
              </g>
            ))}
          </svg>
        )}
        <div class="rankup-streak" aria-hidden="true" />
        <RankBadge rank={props.to} class="rankup-new" />
        {move === 'up' && <CarArt parts={props.car} class="rankup-car" />}
      </div>
      <p class="rankup-kind">{move === 'down' ? 'Rank down' : 'Rank up'}</p>
      <h1 id="rankup-title" class="rankup-name">
        {RANK_NAMES[props.to]}
      </h1>
      <p class="rankup-hint">Tap to carry on</p>
    </div>
  );
}

/** The rank this phone last showed, so the scene plays once per change. */
const seenKey = (league: string, player: string) => `tcl.rank.${league}.${player}`;

/**
 * Whether to play the rank scene: decided once, as the app opens, from the
 * rank then (`undefined` while it loads). It plays for a change from a rank
 * this phone has shown before. A phone's first rank arrives quietly in
 * Profile, so a new phone never replays old changes, and a rank that changes
 * while the app is open waits for the next open.
 */
export function useRankScene(league: string, player: string, rank: Rank | null | undefined): { from: Rank | null; to: Rank; done: () => void } | null {
  const [scene, setScene] = useState<{ from: Rank; to: Rank } | null>(null);
  const decided = useRef(false);
  useEffect(() => {
    if (decided.current || rank === undefined) return;
    decided.current = true;
    if (rank === null) return;
    const seen = recall(seenKey(league, player));
    if (seen === null) remember(seenKey(league, player), rank);
    else if (seen !== rank) setScene({ from: seen as Rank, to: rank });
  }, [rank]);
  if (!scene) return null;
  return {
    ...scene,
    done: () => {
      remember(seenKey(league, player), scene.to);
      setScene(null);
    },
  };
}
