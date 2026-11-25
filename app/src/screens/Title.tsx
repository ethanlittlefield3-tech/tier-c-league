import { useEffect, useRef, useState } from 'preact/hooks';
import { NunchucksMark } from '../art/NunchucksMark.tsx';
import arena from '../art/title/arena.svg?raw';
import ballMotion from '../art/title/ball-motion.svg?raw';
import ball from '../art/title/ball.svg?raw';
import car from '../art/title/car.svg?raw';
import front from '../art/title/front.svg?raw';
import impact from '../art/title/impact.svg?raw';
import lightsAll from '../art/title/lights-all.svg?raw';
import lightsLeft from '../art/title/lights-left.svg?raw';
import lightsRight from '../art/title/lights-right.svg?raw';
import { INTRO_TIMING, deviceDay, introMode, type IntroMode } from '../intro/mode.ts';
import { playEnterSound } from '../intro/sound.ts';
import './title.css';

const FONT = "'Exo 2', 'Avenir Next Condensed', 'Arial Narrow', system-ui, sans-serif";
const BLUE_DEPTH = ['#0d4fb0', '#0c489f', '#0b408f', '#0a387e', '#09306d', '#08285c', '#06204a'];
const ORANGE_DEPTH = ['#e06400', '#cc5b00', '#b85200', '#a34900', '#8f4000', '#7a3700', '#662e00'];
const BRONZE_DEPTH = ['#8a5518', '#7d4c15', '#704412', '#633c10', '#56340d', '#492c0b', '#3c2408'];
const HEX = '279,12 313.6,32 313.6,72 279,92 244.4,72 244.4,32';
const HEX_INNER = '279,21 305.8,36.5 305.8,67.5 279,83 252.2,67.5 252.2,36.5';
const PLAYED_KEY = 'tcl.intro.fullDay';

/** Where the intro is: the Nunchucks card, the boost scene, or the title itself. */
type Phase = 'card' | 'boost' | 'title';

function chooseMode(): IntroMode {
  let lastFullDay: string | null = null;
  try {
    lastFullDay = localStorage.getItem(PLAYED_KEY);
  } catch {
    // Private windows can refuse storage. Then the full intro simply plays each time.
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return introMode({ lastFullDay, today: deviceDay(new Date()), reducedMotion });
}

function rememberFullIntro(): void {
  try {
    localStorage.setItem(PLAYED_KEY, deviceDay(new Date()));
  } catch {
    // Nothing to do: see chooseMode.
  }
}

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

function SmallNunchucks() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 7.5Q12 2.5 15.5 7.5" fill="none" stroke="#ffcf3f" stroke-width="1.8" stroke-dasharray="2.2 1.6" stroke-linecap="round" />
      <rect x="6.3" y="7" width="3.6" height="14" rx="1.8" fill="#ffcf3f" transform="rotate(-24 8.1 14)" />
      <rect x="14.1" y="7" width="3.6" height="14" rx="1.8" fill="#ffcf3f" transform="rotate(24 15.9 14)" />
    </svg>
  );
}

/** One piece of the scene. The intro moves whole layers, which a phone does smoothly. */
function Layer(props: { name: string; svg: string }) {
  return <div class={`layer layer-${props.name}`} dangerouslySetInnerHTML={{ __html: props.svg }} />;
}

/**
 * The intro and the title screen it ends on.
 *
 * The full intro: the Nunchucks card (about 2 seconds), the boost scene (about
 * 2.5 seconds), then the title slams in. A tap anywhere skips to the title.
 * Sound only starts with the tap that enters.
 */
export function Title(props: { onEnter?: () => void }) {
  const [mode] = useState<IntroMode>(chooseMode);
  const [phase, setPhase] = useState<Phase>(mode === 'full' ? 'card' : 'title');
  const [skipped, setSkipped] = useState(false);
  const titleSince = useRef(0);
  const enterButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (phase === 'title') {
      titleSince.current = performance.now();
      if (mode === 'full') rememberFullIntro();
      enterButton.current?.focus({ preventScroll: true });
      return undefined;
    }
    const next: Phase = phase === 'card' ? 'boost' : 'title';
    const timer = setTimeout(() => setPhase(next), INTRO_TIMING[phase]);
    return () => clearTimeout(timer);
  }, [phase, mode]);

  const skip = () => {
    setSkipped(true);
    setPhase('title');
  };

  // Any key skips the intro, the same as a tap.
  useEffect(() => {
    if (phase === 'title') return undefined;
    const onKey = () => skip();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const onTap = () => {
    if (phase !== 'title') {
      skip();
      return;
    }
    // The tap that skipped the intro must not also enter.
    if (performance.now() - titleSince.current < INTRO_TIMING.tapGuard) return;
    playEnterSound();
    props.onEnter?.();
  };

  return (
    <main class="title" data-mode={mode} data-phase={phase} data-skipped={skipped ? 'yes' : 'no'} onClick={onTap}>
      <div class="stage">
        <div class="scene" role="img" aria-label="A blue rocket car boosts across a night arena and blasts the ball toward the camera">
          <Layer name="arena" svg={arena} />
          <div class="dim" />
          <Layer name="lights-left" svg={lightsLeft} />
          <Layer name="lights-right" svg={lightsRight} />
          <Layer name="lights-all" svg={lightsAll} />
          <Layer name="car" svg={car} />
          <Layer name="ball-motion" svg={ballMotion} />
          <Layer name="ball" svg={ball} />
          <Layer name="impact" svg={impact} />
          <Layer name="front" svg={front} />
        </div>
        <div class="title-glow" />
        <div class="title-stack">
          <h1 class="sr-only">Tier C League</h1>
          <div class="lockup-wrap">
            <Lockup />
          </div>
          <button class="title-enter" type="button" ref={enterButton}>
            Tap to enter
            <Chevron />
          </button>
          <p class="title-credit">
            <SmallNunchucks />A Nunchucks Production
          </p>
        </div>
      </div>
      <div class="flash" />
      {mode === 'full' && phase !== 'title' && (
        <div class="card">
          <div class="card-mark">
            <NunchucksMark />
          </div>
          <div class="card-words">
            <span class="card-word-a">A NUNCHUCKS</span>
            <span class="card-word-b">PRODUCTION</span>
          </div>
          <p class="card-skip">Tap to skip</p>
        </div>
      )}
    </main>
  );
}
