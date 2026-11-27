// Icons for every power-up and Rumble item (the commish's request,
// 2026-11-27), drawn for this app in one line style, so they read as a set
// wherever a power-up is named: the tray, the scoreboard, Rumble, the
// group-play boards and your opponent's day.
import type { RumbleItem } from '@tcl/engine';

export type PowerItem = 'aerial' | 'demolition' | 'fullBoost' | 'ruleOne' | 'rest';
export type ItemName = PowerItem | RumbleItem;

const PATHS: Record<ItemName, string> = {
  // A car's nose lifting off: up and away.
  aerial: 'M4 17c4-1 7-4 9-8l3-5M16 4l-1 4 4-1M7 20h4',
  // A burst.
  demolition: 'M12 3l1.8 5.2L19 6l-2.6 4.8L21 13l-5.2.9L17 19l-5-3-5 3 1.2-5.1L3 13l4.6-2.2L5 6l5.2 2.2Z',
  // A bolt.
  fullBoost: 'M13 3 6 13h5l-1 8 7-10h-5Z',
  // A shield with a 1.
  ruleOne: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6ZM11 9l2-1v8',
  // A moon: the day off.
  rest: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z',
  // A funnel of wind, narrowing to the ground.
  tornado: 'M3 5h18M5 9h13M7 13h9M9 17h5M11 21h2',
  // A glove, mid-swing.
  punch: 'M7 10a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3a4 4 0 0 1-4 4h-1v3H9v-3.6A4 4 0 0 1 7 13ZM11 10h5M3 9h2M2 13h3',
  // A boot.
  boot: 'M7 3h5v9l6 2.5a3 3 0 0 1 2 2.8V20H5V14ZM5 17h15M9 3v4',
  // A row of spikes on the ground.
  spike: 'M3 19l3-8 3 8 3-11 3 11 3-8 3 8M2 19h20',
  // Two arrows, trading places.
  swap: 'M4 8h14l-3-3M20 16H6l3 3',
  // A snowflake.
  freeze: 'M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17M9 4l3 2 3-2M9 20l3-2 3 2',
  // A horseshoe magnet.
  magnet: 'M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4ZM6 8h4M14 8h4',
};

/** A power-up's or Rumble item's icon, in the current text color. */
export function ItemIcon(props: { item: ItemName; class?: string }) {
  return (
    <svg class={props.class ?? 'item-icon'} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={PATHS[props.item]} />
    </svg>
  );
}
