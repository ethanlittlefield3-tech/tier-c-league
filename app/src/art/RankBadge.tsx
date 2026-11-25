// A rank badge, drawn for this app: a rounded hexagon in the tier's metal,
// with a mark that grows with the tier. One chevron for Bronze, two for
// Silver, three for Gold; a bar under three for Platinum; a gem for
// Diamond; a star for Champion; a star in a ring for Grand Champ.
import type { Rank } from '@tcl/engine';

const METAL: Record<Rank, { light: string; mid: string; dark: string; edge: string }> = {
  bronze: { light: '#f2b27d', mid: '#c47a3a', dark: '#7a4316', edge: '#3d1f08' },
  silver: { light: '#ffffff', mid: '#c9d3e3', dark: '#7f8ba1', edge: '#363d4a' },
  gold: { light: '#fff3b8', mid: '#ffcf3f', dark: '#b07d00', edge: '#4d3600' },
  platinum: { light: '#e8fffb', mid: '#7ee0d4', dark: '#2f9488', edge: '#0f3d38' },
  diamond: { light: '#e3f3ff', mid: '#5fb4ff', dark: '#1f63b8', edge: '#0a2752' },
  champion: { light: '#f1e6ff', mid: '#b58cff', dark: '#6a3fc2', edge: '#2a1259' },
  grandChamp: { light: '#ffe1e4', mid: '#ff6b7a', dark: '#c0263a', edge: '#4f0a14' },
};

const HEX = 'M50 6 L88 28 L88 72 L50 94 L12 72 L12 28 Z';

function chevrons(count: number, top: number) {
  return Array.from({ length: count }, (_, index) => {
    const y = top + index * 12;
    return <path key={index} d={`M33 ${y} L50 ${y + 9} L67 ${y}`} fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />;
  });
}

function mark(rank: Rank) {
  switch (rank) {
    case 'bronze':
      return chevrons(1, 46);
    case 'silver':
      return chevrons(2, 40);
    case 'gold':
      return chevrons(3, 34);
    case 'platinum':
      return (
        <>
          {chevrons(3, 30)}
          <path d="M35 70 H65" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />
        </>
      );
    case 'diamond':
      return <path d="M50 30 L66 50 L50 70 L34 50 Z M40 50 H60" fill="#ffffff" fill-opacity="0.9" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" />;
    case 'champion':
      return <path d="M50 30 L55.9 43.8 L70.9 45.2 L59.5 55 L62.9 69.7 L50 62 L37.1 69.7 L40.5 55 L29.1 45.2 L44.1 43.8 Z" fill="#ffffff" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" />;
    case 'grandChamp':
      return (
        <>
          <circle cx="50" cy="51" r="21" fill="none" stroke="#ffcf3f" stroke-width="4" />
          <path d="M50 34 L54.4 44.5 L65.6 45.5 L57.1 52.8 L59.7 63.8 L50 58 L40.3 63.8 L42.9 52.8 L34.4 45.5 L45.6 44.5 Z" fill="#ffffff" />
        </>
      );
  }
}

export function RankBadge(props: { rank: Rank; class?: string }) {
  const metal = METAL[props.rank];
  const id = `rank-${props.rank}`;
  return (
    <svg class={props.class} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color={metal.light} />
          <stop offset="0.5" stop-color={metal.mid} />
          <stop offset="1" stop-color={metal.dark} />
        </linearGradient>
      </defs>
      <path d={HEX} transform="translate(3 3)" fill={metal.edge} stroke={metal.edge} stroke-width="8" stroke-linejoin="round" />
      <path d={HEX} fill={`url(#${id})`} stroke="#050914" stroke-width="5" stroke-linejoin="round" />
      <path d="M50 17 L78 33 L78 67 L50 83 L22 67 L22 33 Z" fill={metal.dark} fill-opacity="0.55" stroke="#050914" stroke-width="2" stroke-linejoin="round" />
      <g>{mark(props.rank)}</g>
      <path d="M17 29 L50 10" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.75" />
    </svg>
  );
}
