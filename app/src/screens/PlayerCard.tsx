import { createPortal } from 'preact/compat';
import { useEffect, useRef } from 'preact/hooks';
import { RANK_NAMES, recordText, type Rank, type Rival } from '@tcl/engine';
import { BackdropArt } from '../art/car/BackdropArt.tsx';
import { backdropOf } from '../art/car/backdrops.ts';
import { CarArt } from '../art/car/CarArt.tsx';
import type { CarParts } from '../art/car/draw.ts';
import { RankBadge } from '../art/RankBadge.tsx';
import '../art/car/backdrops.css';
import './sheet.css';

export interface PlayerStats {
  name: string;
  rank: Rank | null;
  car?: Partial<CarParts>;
  stickers?: Partial<Record<string, { until?: unknown }>>;
  /** Their place in the standings, once there are standings. */
  place: number | null;
  seasonPoints: number | null;
  /** "W–D–L" this season. */
  record: string;
  perfectDays: number | null;
  beers: number | null;
  badges: number;
  /** Your all-time record against them; `null` for yourself, or before you have met. */
  rival: Rival | null;
}

/**
 * A player's card (the commish's request, 2026-11-26): tap a name in League
 * for their car in the showroom, their rank emblem and name, this season's
 * numbers, and your all-time record against them, with their day a tap away.
 */
export function PlayerCard(props: { stats: PlayerStats; onDay?: () => void; onClose: () => void }) {
  const { stats } = props;
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const tile = (label: string, value: string | number | null) => (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? '–'}</dd>
    </div>
  );
  return createPortal(
    <div class="sheet-layer">
      <div class="sheet-backdrop" onClick={props.onClose} />
      <section class="sheet player-card" role="dialog" aria-modal="true" aria-labelledby="player-card-title">
        {/* The showroom: their car, big, on the backdrop they picked. */}
        <div class="player-card-showroom backdrop" data-backdrop={backdropOf(stats.car?.backdrop)} role="img" aria-label={`${stats.name}'s car`}>
          <BackdropArt kind={backdropOf(stats.car?.backdrop)} />
          <CarArt parts={stats.car} stickers={stats.stickers} rank={stats.rank} class="player-card-showroom-car" />
        </div>
        <div class="player-card-head">
          {stats.rank ? <RankBadge rank={stats.rank} class="player-card-badge" /> : <span class="player-card-badge player-card-unranked" aria-hidden="true" />}
          <div>
            <h2 id="player-card-title" ref={title} tabIndex={-1}>
              {stats.name}
            </h2>
            <p class="player-card-rank">{stats.rank ? RANK_NAMES[stats.rank] : 'Unranked'}</p>
          </div>
        </div>
        <dl class="player-card-stats">
          {tile('Place', stats.place === null ? null : `#${stats.place}`)}
          {tile('Season Points', stats.seasonPoints)}
          {tile('W–D–L', stats.record)}
          {tile('Perfect days', stats.perfectDays)}
          {tile('Beers', stats.beers)}
          {tile('Badges', stats.badges)}
        </dl>
        {stats.rival && (
          <p class="player-card-rival">
            You against {stats.name}, all time: <strong>{recordText(stats.rival)}</strong>
          </p>
        )}
        {props.onDay && (
          <button type="button" class="sheet-save" onClick={props.onDay}>
            See {stats.name}'s day
          </button>
        )}
        <button type="button" class="sheet-other" onClick={props.onClose}>
          Close
        </button>
      </section>
    </div>,
    document.body,
  );
}
