import { useMemo } from 'preact/hooks';
import { activeStickers } from '@tcl/engine';
import { STARTER_CAR, drawCar, type CarParts } from './draw.ts';

/**
 * A car, drawn from its parts. The markup comes from `drawCar`, which only
 * ever draws parts from the catalog, so nothing a player typed reaches it.
 * `data-car` names its body and paint. A car wears the stickers still on it
 * (`data-stickers`), worked out from the time they come off.
 */
export function CarArt(props: {
  parts: Partial<CarParts> | null | undefined;
  stickers?: Partial<Record<string, { until?: unknown }>> | null;
  team?: 'blue' | 'orange';
  bare?: boolean;
  class?: string;
  title?: string;
  /** The owner's rank, for the rank decal's emblem. */
  rank?: string | null;
}) {
  const key = JSON.stringify(props.parts ?? {});
  const on = activeStickers(props.stickers, Date.now());
  const markup = useMemo(() => drawCar(props.parts ?? {}, { team: props.team, bare: props.bare, title: props.title, stickers: on, rank: props.rank ?? undefined }), [key, on.join(), props.team, props.bare, props.title, props.rank]);
  const car = { ...STARTER_CAR, ...(props.parts ?? {}) };
  return <span class={props.class} data-car={`${car.body} ${car.paint}`} data-stickers={on.length ? on.join(' ') : undefined} dangerouslySetInnerHTML={{ __html: markup }} />;
}
