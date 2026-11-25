import { useMemo } from 'preact/hooks';
import { STARTER_CAR, drawCar, type CarParts } from './draw.ts';

/**
 * A car, drawn from its parts. The markup comes from `drawCar`, which only
 * ever draws parts from the catalog, so nothing a player typed reaches it.
 * `data-car` names its body and paint.
 */
export function CarArt(props: { parts: Partial<CarParts> | null | undefined; team?: 'blue' | 'orange'; bare?: boolean; class?: string; title?: string }) {
  const key = JSON.stringify(props.parts ?? {});
  const markup = useMemo(() => drawCar(props.parts ?? {}, { team: props.team, bare: props.bare, title: props.title }), [key, props.team, props.bare, props.title]);
  const car = { ...STARTER_CAR, ...(props.parts ?? {}) };
  return <span class={props.class} data-car={`${car.body} ${car.paint}`} dangerouslySetInnerHTML={{ __html: markup }} />;
}
