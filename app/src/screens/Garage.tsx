import { useRef, useState } from 'preact/hooks';
import { BADGES, STARTER_PARTS, type Badge, type Part, type PartSlot } from '@tcl/engine';
import { CarArt } from '../art/car/CarArt.tsx';
import { BurstIcon, GoalExplosion } from '../art/car/GoalExplosion.tsx';
import { STARTER_CAR, paintColors, type CarParts } from '../art/car/draw.ts';
import { useDoc } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import './garage.css';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no. That part may not be yours yet.',
};

const SLOTS: { slot: PartSlot; name: string }[] = [
  { slot: 'body', name: 'Body' },
  { slot: 'paint', name: 'Paint' },
  { slot: 'decal', name: 'Decal' },
  { slot: 'wheels', name: 'Wheels' },
  { slot: 'boost', name: 'Boost' },
  { slot: 'explosion', name: 'Explosion' },
  { slot: 'topper', name: 'Topper' },
];

/** Every part in a slot: the starter kit, then what badges unlock, with the badge for each. */
function partsFor(slot: PartSlot): { part: Part; badge: Badge | null }[] {
  return [
    ...STARTER_PARTS.filter((part) => part.slot === slot).map((part) => ({ part, badge: null })),
    ...BADGES.flatMap((badge) => badge.unlocks.filter((part) => part.slot === slot).map((part) => ({ part, badge }))),
  ];
}

function Swatch(props: { paint: string }) {
  const tones = paintColors(props.paint);
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={`swatch-${props.paint}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={tones.light} />
          <stop offset="0.5" stop-color={tones.mid} />
          <stop offset="1" stop-color={tones.dark} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="16" fill={`url(#swatch-${props.paint})`} stroke="#050914" stroke-width="2.5" />
      <path d="M10 14Q14 8 21 7" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7" />
    </svg>
  );
}

/** How far a drag turns the car: degrees for each pixel. */
const TURN_PER_PIXEL = 0.9;

/** The side the car rests on: every half turn shows its other side. */
const settle = (angle: number) => Math.round(angle / 180) * 180;

/** How wide the car looks from an angle; it never quite vanishes edge-on. */
function face(angle: number): number {
  const width = Math.cos((angle * Math.PI) / 180);
  return Math.sign(width || 1) * Math.max(Math.abs(width), 0.08);
}

/** Where the turntable's own turn has the car right now, so a grab starts from there. */
function angleOf(element: Element | null): number {
  if (!element) return 0;
  const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
  return (Math.acos(Math.max(-1, Math.min(1, matrix.a))) * 180) / Math.PI;
}

/**
 * The Garage (SCOPE.md, "Garage and achievements"): your car on a turntable,
 * and every part for it. Your car is your icon across the app. Each badge
 * unlocks a part; a locked part shows the badge that unlocks it.
 */
export function Garage(props: { me: Me }) {
  const profile = useDoc<{ car?: Partial<CarParts>; badges?: Record<string, unknown> }>(`leagues/${props.me.league}/players/${props.me.player}`);
  const saved: CarParts = { ...STARTER_CAR, ...(profile.data?.car ?? {}) };
  const [draft, setDraft] = useState<CarParts | null>(null);
  const car = draft ?? saved;
  const [slot, setSlot] = useState<PartSlot>('body');
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);
  const [boom, setBoom] = useState(0);
  const earned = profile.data?.badges ?? {};

  // The turntable turns on its own until you take hold of it (SCOPE.md, "2.5D
  // art": you drag to spin the car). A drag turns it under your finger and lets
  // go on the nearest side; a tap, or Enter, turns it round.
  const [angle, setAngle] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const held = useRef<{ x: number; from: number; to: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const turning = useRef<HTMLSpanElement>(null);

  const grab = (event: PointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    const from = angle ?? angleOf(turning.current);
    held.current = { x: event.clientX, from, to: from, moved: false };
    dragged.current = false;
  };
  const drag = (event: PointerEvent) => {
    const hold = held.current;
    if (!hold) return;
    const distance = event.clientX - hold.x;
    if (!hold.moved && Math.abs(distance) < 6) return;
    hold.moved = true;
    hold.to = hold.from + distance * TURN_PER_PIXEL;
    setDragging(true);
    setAngle(hold.to);
  };
  const letGo = () => {
    const hold = held.current;
    held.current = null;
    if (!hold?.moved) return;
    dragged.current = true;
    setDragging(false);
    setAngle(settle(hold.to));
  };
  const turnRound = (event: MouseEvent) => {
    // The click that ends a drag is not a tap. A key press (no pointer, so no
    // count of clicks) always turns it.
    const afterDrag = dragged.current && event.detail > 0;
    dragged.current = false;
    if (afterDrag) return;
    setAngle(settle(angle ?? angleOf(turning.current)) + 180);
  };
  const side = angle === null ? undefined : (settle(angle) / 180) % 2 === 0 ? 'right' : 'left';

  const pick = (part: Part, badge: Badge | null) => {
    if (badge && earned[badge.id] === undefined) {
      setNote({ error: false, text: `${part.name}: earn ${badge.name}. ${badge.how}.` });
      return;
    }
    const next = { ...car, [part.slot]: part.id };
    setDraft(next);
    setNote(null);
    if (part.slot === 'explosion') setBoom((count) => count + 1);
    void loadData()
      .then((api) => api.saveCar(props.me, next))
      .then(() => setNote({ error: false, text: `${part.name} is on your car.` }))
      .catch((failure: unknown) => {
        setDraft(null);
        setNote({ error: true, text: TROUBLE[whyOf(failure)] });
      });
  };

  const options = partsFor(slot);
  const count = Object.keys(earned).length;
  return (
    <div class="garage">
      <section class="garage-stage" aria-label="Your car">
        <button
          type="button"
          class="garage-turntable"
          data-turn={angle === null ? 'auto' : dragging ? 'drag' : 'rest'}
          aria-label="Turn your car"
          onPointerDown={grab}
          onPointerMove={drag}
          onPointerUp={letGo}
          onPointerCancel={letGo}
          onClick={turnRound}
        >
          <span class="garage-platform" aria-hidden="true">
            <span class="garage-dial" style={angle === null ? undefined : { transform: `rotate(${Math.round(angle)}deg)` }}>
              <span class="garage-ring" />
            </span>
          </span>
          <span
            ref={turning}
            class="garage-turn"
            data-side={side}
            data-mirrored={angle !== null && face(angle) < 0}
            style={angle === null ? undefined : { transform: `scaleX(${face(angle).toFixed(3)})` }}
          >
            <CarArt parts={car} class="garage-car" />
          </span>
        </button>
        {boom > 0 && <GoalExplosion key={boom} kind={car.explosion} class="garage-boom" />}
      </section>
      <p class="garage-count">
        {count} of {BADGES.length} badges earned. Each one unlocks a part.
      </p>

      <div class="choice garage-slots" role="group" aria-label="Part">
        {SLOTS.map(({ slot: each, name }) => (
          <button key={each} type="button" class="choice-option" aria-pressed={slot === each} onClick={() => setSlot(each)}>
            {name}
          </button>
        ))}
      </div>

      {note && (
        <p class={note.error ? 'field-error' : 'panel-text garage-note'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
      {slot === 'explosion' && (
        <button type="button" class="btn btn-second garage-watch" onClick={() => setBoom((count) => count + 1)}>
          Watch it
        </button>
      )}

      <ul class="garage-parts" aria-label={SLOTS.find((each) => each.slot === slot)?.name}>
        {options.map(({ part, badge }) => {
          const locked = badge !== null && earned[badge.id] === undefined;
          const on = car[part.slot] === part.id;
          return (
            <li key={part.id}>
              <button
                type="button"
                class="garage-part"
                data-locked={locked}
                aria-pressed={on}
                aria-label={locked ? `${part.name}, locked: earn ${badge!.name}` : part.name}
                onClick={() => pick(part, badge)}
              >
                <span class="garage-part-art">
                  {part.slot === 'paint' ? <Swatch paint={part.id} /> : part.slot === 'explosion' ? <BurstIcon kind={part.id} /> : <CarArt parts={{ ...car, [part.slot]: part.id }} bare={part.slot !== 'boost'} />}
                </span>
                <span class="garage-part-name">{part.name}</span>
                {locked && <span class="garage-lock">{badge!.name}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
