import { useEffect, useRef, useState } from 'preact/hooks';
import { Lockup } from '../art/Lockup.tsx';
import { NunchucksMark } from '../art/NunchucksMark.tsx';
import { SmallNunchucks } from '../art/SmallNunchucks.tsx';
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
import { recall, remember } from '../storage.ts';
import './title.css';

const PLAYED_KEY = 'tcl.intro.fullDay';

/** Where the intro is: the Nunchucks card, the boost scene, or the title itself. */
type Phase = 'card' | 'boost' | 'title';

function chooseMode(): IntroMode {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // If the phone refuses to keep notes, the full intro simply plays each time.
  return introMode({ lastFullDay: recall(PLAYED_KEY), today: deviceDay(new Date()), reducedMotion });
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 3l5 5-5 5M9 3l5 5-5 5" />
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
      if (mode === 'full') remember(PLAYED_KEY, deviceDay(new Date()));
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
            <Lockup class="title-lockup" />
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
