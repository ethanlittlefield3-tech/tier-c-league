// A player's badge: a hexagon in their team color with their initial on it.
// Until the garage ships in Phase 2, this stands in for a player's car
// (PHASE1.md). You are always team blue; your opponent is team orange.

const HEX = '50,4 89.8,27 89.8,73 50,96 10.2,73 10.2,27';
const FONT = "'Exo 2', 'Avenir Next Condensed', 'Arial Narrow', system-ui, sans-serif";
const PAINT = {
  blue: { light: '#7cc4ff', mid: '#1f8bff', dark: '#0d4fb0', edge: '#08285c' },
  orange: { light: '#ffc47c', mid: '#ff8a1e', dark: '#bf5200', edge: '#662e00' },
} as const;

export function PlayerBadge(props: { initial: string; team?: keyof typeof PAINT; class?: string }) {
  const team = props.team ?? 'blue';
  const paint = PAINT[team];
  const id = `pb-${team}`;
  return (
    <svg class={props.class} viewBox="0 0 104 104" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color={paint.light} />
          <stop offset="0.45" stop-color={paint.mid} />
          <stop offset="1" stop-color={paint.dark} />
        </linearGradient>
      </defs>
      <polygon points={HEX} transform="translate(4 4)" fill={paint.edge} stroke={paint.edge} stroke-width="4" stroke-linejoin="round" />
      <polygon points={HEX} transform="translate(2 2)" fill={paint.edge} stroke={paint.edge} stroke-width="4" stroke-linejoin="round" />
      <polygon points={HEX} fill={`url(#${id})`} stroke="#050914" stroke-width="4" stroke-linejoin="round" />
      <polygon points="50,13 82,31.5 82,68.5 50,87 18,68.5 18,31.5" fill="#0b1530" stroke="#050914" stroke-width="2" stroke-linejoin="round" />
      <path d="M14.5 29.5L50 9" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.8" />
      <text x="50" y="66" text-anchor="middle" font-family={FONT} font-style="italic" font-weight="900" font-size="46" fill="#ffffff" stroke="#050914" stroke-width="2" stroke-linejoin="round" paint-order="stroke">
        {props.initial}
      </text>
    </svg>
  );
}
