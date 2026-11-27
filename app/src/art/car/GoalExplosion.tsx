// A goal explosion (SCOPE.md, "Car parts": played when you win a week), drawn
// for this app. Each kind is a burst of small pieces flying out from the
// middle; the CSS in garage.css moves them with transform and opacity only,
// and the resting state is the finished burst: nothing left on screen.

interface Kind {
  colors: string[];
  count: number;
  /** The piece: 'ray', 'drop', 'bubble', 'shard', 'bolt', 'chip', 'star' or 'ring'. */
  piece: 'ray' | 'drop' | 'bubble' | 'shard' | 'bolt' | 'chip' | 'star' | 'ring' | 'cloud' | 'skull' | 'bill' | 'duck';
  reach: number;
  /** Pieces rise rather than fly out evenly. */
  rise?: boolean;
}

const KINDS: Record<string, Kind> = {
  stock: { colors: ['#3d9bff', '#ff8a1e', '#ffffff'], count: 14, piece: 'ray', reach: 80 },
  inferno: { colors: ['#ff3b1f', '#ff8a1e', '#ffd21f'], count: 14, piece: 'drop', reach: 70, rise: true },
  zen: { colors: ['#7fe9e0', '#c4f5ff', '#ffffff'], count: 4, piece: 'ring', reach: 90 },
  foam: { colors: ['#ffffff', '#ffe9a8', '#fff6d6'], count: 16, piece: 'bubble', reach: 75, rise: true },
  shockwave: { colors: ['#ffffff', '#9fd0ff', '#3d9bff'], count: 3, piece: 'ring', reach: 100 },
  thunder: { colors: ['#ffd21f', '#fff3a0', '#ffffff'], count: 8, piece: 'bolt', reach: 85 },
  shatter: { colors: ['#c4f5ff', '#9fd0ff', '#ffffff'], count: 16, piece: 'shard', reach: 90 },
  confetti: { colors: ['#ff3f5a', '#ffd21f', '#2fd06a', '#3d9bff', '#b58cff'], count: 22, piece: 'chip', reach: 85 },
  golden: { colors: ['#ffcf3f', '#fff3b8', '#b07d00'], count: 16, piece: 'star', reach: 85 },
  // The joke goal explosions (ruling R23).
  stinkBomb: { colors: ['#7ed957', '#a8f07a', '#5aa83a'], count: 12, piece: 'cloud', reach: 70, rise: true },
  skullRain: { colors: ['#ffffff', '#e9eef5', '#c9d1de'], count: 12, piece: 'skull', reach: 85 },
  cashSplash: { colors: ['#2fd06a', '#7ef0a8', '#1f9a4a'], count: 16, piece: 'bill', reach: 90 },
  quackAttack: { colors: ['#ffd21f', '#ffe27a', '#ffcf3f'], count: 12, piece: 'duck', reach: 85 },
};

function piece(kind: Kind['piece'], color: string) {
  switch (kind) {
    case 'drop':
      return <path d="M0 -7Q5 0 0 6Q-5 0 0 -7Z" fill={color} />;
    case 'bubble':
      return <circle r="4.5" fill="none" stroke={color} stroke-width="1.6" />;
    case 'shard':
      return <path d="M-4 -3L5 -1L-1 5Z" fill={color} stroke="#ffffff" stroke-width="0.6" />;
    case 'bolt':
      return <path d="M1 -9L-4 1L0 1L-2 9L5 -2L1 -2Z" fill={color} />;
    case 'chip':
      return <rect x="-3" y="-1.6" width="6" height="3.2" fill={color} />;
    case 'star':
      return <path d="M0 -5L1.4 -1.4L5 0L1.4 1.4L0 5L-1.4 1.4L-5 0L-1.4 -1.4Z" fill={color} />;
    case 'ring':
      return <circle r="20" fill="none" stroke={color} stroke-width="3" />;
    case 'cloud':
      return (
        <g fill={color}>
          <circle cx="-4" cy="1" r="5" />
          <circle cx="3" cy="-1" r="6" />
          <circle cx="7" cy="3" r="4" />
        </g>
      );
    case 'skull':
      return (
        <g>
          <path d="M-5 1Q-5 -6 0 -6Q5 -6 5 1Q5 3 3 3V5H-3V3Q-5 3 -5 1Z" fill={color} stroke="#050914" stroke-width="0.8" />
          <circle cx="-2" cy="-0.5" r="1.3" fill="#050914" />
          <circle cx="2" cy="-0.5" r="1.3" fill="#050914" />
        </g>
      );
    case 'bill':
      return (
        <g>
          <rect x="-7" y="-3.5" width="14" height="7" rx="1" fill={color} stroke="#0f6a32" stroke-width="0.8" />
          <circle r="2" fill="none" stroke="#0f6a32" stroke-width="0.8" />
        </g>
      );
    case 'duck':
      return (
        <g>
          <path d="M-6 2Q-6 -2 -1 -1Q0 -6 4 -5Q7 -4 5 -1Q7 2 3 5H-3Q-6 5 -6 2Z" fill={color} stroke="#050914" stroke-width="0.7" />
          <path d="M5 -3l3 0.6l-3 1.2z" fill="#ff7a12" />
          <circle cx="3" cy="-3.2" r="0.7" fill="#050914" />
        </g>
      );
    default:
      return <rect x="-1.5" y="-9" width="3" height="18" rx="1.5" fill={color} />;
  }
}

export function GoalExplosion(props: { kind: string; class?: string; /** Holds the burst back, in milliseconds. */ delay?: number }) {
  const kind = KINDS[props.kind] ?? KINDS.stock!;
  return (
    <svg class={`boom ${props.class ?? ''}`} data-kind={props.kind} viewBox="-100 -100 200 200" aria-hidden="true">
      {Array.from({ length: kind.count }, (_, index) => {
        const turn = (index / kind.count) * Math.PI * 2 + (index % 2) * 0.2;
        const reach = kind.reach * (0.6 + ((index * 37) % 40) / 100);
        const x = kind.piece === 'ring' ? 0 : Math.round(Math.cos(turn) * reach);
        const y = kind.piece === 'ring' ? 0 : Math.round(Math.sin(turn) * reach * (kind.rise ? 0.5 : 1) - (kind.rise ? 30 : 0));
        const spin = kind.piece === 'ray' ? Math.round((turn * 180) / Math.PI + 90) : (index % 2 ? 1 : -1) * (90 + index * 20);
        const scale = kind.piece === 'ring' ? 1 + index * 0.9 : 1;
        return (
          <g key={index} class="boom-bit" style={{ '--x': `${x}px`, '--y': `${y}px`, '--r': `${spin}deg`, '--s': scale, animationDelay: `${(props.delay ?? 0) + index * (kind.piece === 'ring' ? 140 : 12)}ms` }}>
            {piece(kind.piece, kind.colors[index % kind.colors.length]!)}
          </g>
        );
      })}
    </svg>
  );
}

/** A still picture of a goal explosion, for its tile in the Garage. */
export function BurstIcon(props: { kind: string }) {
  const kind = KINDS[props.kind] ?? KINDS.stock!;
  return (
    <svg viewBox="-30 -30 60 60" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => {
        const turn = (index / 8) * Math.PI * 2;
        return (
          <g key={index} transform={`translate(${Math.round(Math.cos(turn) * 16)} ${Math.round(Math.sin(turn) * 16)}) rotate(${Math.round((turn * 180) / Math.PI + 90)}) scale(${kind.piece === 'ring' ? 0.35 : 0.9})`}>
            {piece(kind.piece, kind.colors[index % kind.colors.length]!)}
          </g>
        );
      })}
      <circle r="5" fill={kind.colors[0]} />
    </svg>
  );
}
