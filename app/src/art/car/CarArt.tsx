import { useMemo } from 'preact/hooks';
import { drawCar, type CarParts } from './draw.ts';

/**
 * A car, drawn from its parts. The markup comes from `drawCar`, which only
 * ever draws parts from the catalog, so nothing a player typed reaches it.
 */
export function CarArt(props: { parts: Partial<CarParts> | null | undefined; team?: 'blue' | 'orange'; bare?: boolean; class?: string; title?: string }) {
  const key = JSON.stringify(props.parts ?? {});
  const markup = useMemo(() => drawCar(props.parts ?? {}, { team: props.team, bare: props.bare, title: props.title }), [key, props.team, props.bare, props.title]);
  return <span class={props.class} dangerouslySetInnerHTML={{ __html: markup }} />;
}
