import scene from '../art/title-scene.svg?raw';
import './title.css';

const FONT = "'Exo 2', 'Avenir Next Condensed', 'Arial Narrow', system-ui, sans-serif";
const BLUE_DEPTH = ['#0d4fb0', '#0c489f', '#0b408f', '#0a387e', '#09306d', '#08285c', '#06204a'];
const ORANGE_DEPTH = ['#e06400', '#cc5b00', '#b85200', '#a34900', '#8f4000', '#7a3700', '#662e00'];
const BRONZE_DEPTH = ['#8a5518', '#7d4c15', '#704412', '#633c10', '#56340d', '#492c0b', '#3c2408'];
const HEX = '279,12 313.6,32 313.6,72 279,92 244.4,72 244.4,32';
const HEX_INNER = '279,21 305.8,36.5 305.8,67.5 279,83 252.2,67.5 252.2,36.5';

/** A word with a solid 3D edge: copies stacked down and to the right, then the face on top. */
function Word(props: { text: string; x: number; y: number; anchor: 'end' | 'middle'; depth: string[] }) {
  const common = { 'text-anchor': props.anchor, 'font-size': 80, 'letter-spacing': -1 };
  return (
    <>
      {props.depth
        .map((color, i) => (
          <text {...common} x={props.x + i + 1} y={props.y + i + 1} fill={color} stroke={color} stroke-width="3" stroke-linejoin="round">
            {props.text}
          </text>
        ))
        .reverse()}
      <text {...common} x={props.x} y={props.y} fill="url(#lk-face)" stroke="#050914" stroke-width="3" stroke-linejoin="round" paint-order="stroke">
        {props.text}
      </text>
    </>
  );
}

/** TIER, the gold C badge, and LEAGUE. */
function Lockup() {
  return (
    <svg class="title-lockup" viewBox="0 0 390 190" aria-hidden="true">
      <defs>
        <linearGradient id="lk-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.1" stop-color="#ffffff" />
          <stop offset="0.6" stop-color="#eaf2ff" />
          <stop offset="1" stop-color="#b3ccf5" />
        </linearGradient>
        <linearGradient id="lk-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff3c4" />
          <stop offset="0.4" stop-color="#ffcf3f" />
          <stop offset="0.75" stop-color="#c98a24" />
          <stop offset="1" stop-color="#8a5518" />
        </linearGradient>
        <linearGradient id="lk-streak" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#1f8bff" stop-opacity="0" />
          <stop offset="0.35" stop-color="#1f8bff" />
          <stop offset="0.7" stop-color="#ffb24a" />
          <stop offset="1" stop-color="#ff8a1e" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g transform="rotate(-4 195 95)" font-family={FONT} font-style="italic" font-weight="900">
        <path d="M196 112L352 2L362 10L206 120Z" fill="url(#lk-streak)" />
        <Word text="TIER" x={226} y={80} anchor="end" depth={BLUE_DEPTH} />
        <g transform="translate(279 52) skewX(-10) translate(-279 -52)">
          {BRONZE_DEPTH.map((color, i) => (
            <polygon points={HEX} transform={`translate(${i + 1} ${i + 1})`} fill={color} stroke={color} stroke-width="3" stroke-linejoin="round" />
          )).reverse()}
          <polygon points={HEX} fill="url(#lk-gold)" stroke="#050914" stroke-width="3" stroke-linejoin="round" />
          <polygon points={HEX_INNER} fill="#0b1530" stroke="#7a4a12" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M247.5 33.8L279 15.6" fill="none" stroke="#fffbe6" stroke-width="2" stroke-linecap="round" opacity="0.95" />
        </g>
        <text x="279" y="75" text-anchor="middle" font-size="62" fill="url(#lk-gold)" stroke="#050914" stroke-width="2" stroke-linejoin="round" paint-order="stroke">
          C
        </text>
        <path d="M312 18L314.4 24.6L321 27L314.4 29.4L312 36L309.6 29.4L303 27L309.6 24.6Z" fill="#ffffff" />
        <Word text="LEAGUE" x={195} y={160} anchor="middle" depth={ORANGE_DEPTH} />
      </g>
    </svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 3l5 5-5 5M9 3l5 5-5 5" />
    </svg>
  );
}

function Nunchucks() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 7.5Q12 2.5 15.5 7.5" fill="none" stroke="#ffcf3f" stroke-width="1.8" stroke-dasharray="2.2 1.6" stroke-linecap="round" />
      <rect x="6.3" y="7" width="3.6" height="14" rx="1.8" fill="#ffcf3f" transform="rotate(-24 8.1 14)" />
      <rect x="14.1" y="7" width="3.6" height="14" rx="1.8" fill="#ffcf3f" transform="rotate(24 15.9 14)" />
    </svg>
  );
}

/** The title screen: the arena scene, the logo and the way in. */
export function Title(props: { onEnter?: () => void }) {
  return (
    <main class="title">
      <div
        class="title-scene"
        role="img"
        aria-label="A blue rocket car boosts across a night arena and blasts the ball toward the camera"
        dangerouslySetInnerHTML={{ __html: scene }}
      />
      <div class="title-stack">
        <h1 class="sr-only">Tier C League</h1>
        <Lockup />
        <button class="title-enter" type="button" onClick={props.onEnter}>
          Tap to enter
          <Chevron />
        </button>
        <p class="title-credit">
          <Nunchucks />A Nunchucks Production
        </p>
      </div>
    </main>
  );
}
