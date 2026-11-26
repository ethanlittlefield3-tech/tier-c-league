import { useRef, useState } from 'preact/hooks';
import { ACCENT_ZONES, BADGES, RANK_DECAL, STARTER_PARTS, seasonDecals, type Badge, type Part, type PartSlot } from '@tcl/engine';
import { backdropOf } from '../art/car/backdrops.ts';
import { CarArt } from '../art/car/CarArt.tsx';
import { BurstIcon, GoalExplosion } from '../art/car/GoalExplosion.tsx';
import { STARTER_CAR, type CarParts } from '../art/car/draw.ts';
import { Swatch } from '../art/car/Swatch.tsx';
import { useDoc } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import '../art/car/backdrops.css';
import './garage.css';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no. That part may not be yours yet.',
};

const SLOTS: { slot: PartSlot; name: string }[] = [
  { slot: 'body', name: 'Body' },
  { slot: 'paint', name: 'Paint' },
  { slot: 'paint2', name: 'Accent' },
  { slot: 'finish', name: 'Finish' },
  { slot: 'decal', name: 'Decal' },
  { slot: 'wheels', name: 'Wheels' },
  { slot: 'boost', name: 'Boost' },
  { slot: 'trail', name: 'Trail' },
  { slot: 'explosion', name: 'Explosion' },
  { slot: 'topper', name: 'Topper' },
  { slot: 'backdrop', name: 'Backdrop' },
];

/** A small picture for each slot, on its button. */
const SLOT_ICONS: Record<PartSlot, string> = {
  body: 'M3 15l2-5 4-2h6l3 3 3 1v3H3z M7 17a2 2 0 1 0 0 .1 M17 17a2 2 0 1 0 0 .1',
  paint: 'M5 19c3 0 4-2 4-4l7-7 3 3-7 7c-2 0-4 1-4 4z M14 6l3-3 4 4-3 3',
  paint2: 'M3 12h18 M3 16h18 M5 8h14',
  finish: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z',
  decal: 'M4 4h16v16H4z M8 14l3-4 3 3 2-2 2 3',
  wheels: 'M12 3a9 9 0 1 0 .1 0 M12 8a4 4 0 1 0 .1 0 M12 3v5 M12 16v5 M3 12h5 M16 12h5',
  boost: 'M21 12H9 M9 7l-6 5 6 5 M14 8l-3 4 3 4',
  trail: 'M20 12c-3-4-7-4-10 0s-7 4-8 0 M6 7a1 1 0 1 0 .1 0 M10 17a1 1 0 1 0 .1 0',
  explosion: 'M12 2v5 M12 17v5 M2 12h5 M17 12h5 M5 5l3 3 M16 16l3 3 M19 5l-3 3 M5 19l3-3',
  topper: 'M6 20h12 M9 20V10h6v10 M8 10l4-6 4 6',
  backdrop: 'M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6',
};

function SlotIcon(props: { slot: PartSlot }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={SLOT_ICONS[props.slot]} />
    </svg>
  );
}

interface Option {
  part: Part;
  /** Why it isn't yours yet, or `null` when it is. */
  locked: string | null;
  /** The badge that unlocks it, for its label. */
  badge: Badge | null;
}

/**
 * Every part in a slot: the starter kit, then what badges unlock, then (for
 * decals) your rank's emblem and a decal for each season you finished.
 */
function partsFor(slot: PartSlot, profile: { badges: Record<string, unknown>; rank: string | null; seasons: Record<string, number> }): Option[] {
  const options: Option[] = [
    ...STARTER_PARTS.filter((part) => part.slot === slot).map((part) => ({ part, locked: null, badge: null })),
    ...BADGES.flatMap((badge) =>
      badge.unlocks.filter((part) => part.slot === slot).map((part) => ({ part, badge, locked: profile.badges[badge.id] === undefined ? `Earn ${badge.name} to keep it: ${badge.how}.` : null })),
    ),
  ];
  if (slot !== 'decal') return options;
  const seasons = seasonDecals(profile.seasons);
  return [
    ...options,
    { part: RANK_DECAL, badge: null, locked: profile.rank ? null : 'Your rank emblem is yours once your first week is final.' },
    ...(seasons.length > 0
      ? seasons.map((part) => ({ part, badge: null, locked: null }))
      : [{ part: { slot: 'decal' as const, id: `season-s1-${new Date().getFullYear()}`, name: 'Season decal' }, badge: null, locked: 'Finish a season to get its decal, with its number and year.' }]),
  ];
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
  const profile = useDoc<{ car?: Partial<CarParts>; badges?: Record<string, unknown>; stickers?: Partial<Record<string, { until?: unknown }>>; rank?: string; seasons?: Record<string, number> }>(`leagues/${props.me.league}/players/${props.me.player}`);
  const saved: CarParts = { ...STARTER_CAR, ...(profile.data?.car ?? {}) };
  const [draft, setDraft] = useState<CarParts | null>(null);
  const mine = draft ?? saved;
  // A locked part, tried on: it shows on the car, but is never saved.
  const [trying, setTrying] = useState<{ part: Part; why: string } | null>(null);
  const car = trying ? { ...mine, [trying.part.slot]: trying.part.id } : mine;
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

  const pick = (part: Part, locked: string | null) => {
    if (locked) {
      setTrying({ part, why: locked });
      setNote(null);
      if (part.slot === 'explosion') setBoom((count) => count + 1);
      return;
    }
    setTrying(null);
    const next = { ...mine, [part.slot]: part.id };
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

  // Where the accent goes (ruling R22): each place is on or off, saved at once.
  const toggleZone = (zone: string) => {
    const zones = mine.accents.includes(zone) ? mine.accents.filter((each) => each !== zone) : [...mine.accents, zone];
    const next = { ...mine, accents: zones };
    setDraft(next);
    setTrying(null);
    setNote(null);
    void loadData()
      .then((api) => api.saveCar(props.me, next))
      .then(() => setNote({ error: false, text: zones.length ? `Accent on: ${zones.map((each) => ACCENT_ZONES.find((found) => found.id === each)?.name.toLowerCase()).join(', ')}.` : 'No accent anywhere.' }))
      .catch((failure: unknown) => {
        setDraft(null);
        setNote({ error: true, text: TROUBLE[whyOf(failure)] });
      });
  };

  const options = partsFor(slot, { badges: earned, rank: profile.data?.rank ?? null, seasons: profile.data?.seasons ?? {} });
  const count = Object.keys(earned).length;
  const slotName = SLOTS.find((each) => each.slot === slot)?.name;
  return (
    <div class="garage">
      <section class="garage-stage backdrop" data-backdrop={backdropOf(car.backdrop)} aria-label="Your car">
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
            <CarArt parts={car} stickers={profile.data?.stickers} rank={profile.data?.rank} class="garage-car" />
          </span>
        </button>
        {boom > 0 && <GoalExplosion key={boom} kind={car.explosion} class="garage-boom" />}
      </section>
      <p class="garage-count">
        {count} of {BADGES.length} badges earned. Each one unlocks a part.
      </p>

      {trying && (
        <div class="garage-trying">
          <p role="status">
            <strong>Trying on {trying.part.name}.</strong> {trying.why}
          </p>
          <button type="button" class="btn-quiet" onClick={() => setTrying(null)}>
            Back to my car
          </button>
        </div>
      )}

      <div class="garage-slots" role="group" aria-label="Part">
        {SLOTS.map(({ slot: each, name }) => (
          <button key={each} type="button" class="garage-slot" aria-pressed={slot === each} onClick={() => setSlot(each)}>
            <SlotIcon slot={each} />
            <span>{name}</span>
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

      {slot === 'paint2' && (
        <div class="garage-zones" role="group" aria-label="Where the accent goes">
          {ACCENT_ZONES.map((zone) => (
            <button key={zone.id} type="button" class="garage-zone" aria-pressed={mine.accents.includes(zone.id)} onClick={() => toggleZone(zone.id)}>
              {zone.name}
            </button>
          ))}
        </div>
      )}

      <ul class="garage-parts" aria-label={slotName}>
        {options.map(({ part, badge, locked }) => {
          const on = mine[part.slot as keyof CarParts] === part.id && !locked;
          const tried = trying?.part.id === part.id && trying.part.slot === part.slot;
          const art =
            part.slot === 'paint' ? (
              <Swatch paint={part.id} />
            ) : part.slot === 'explosion' ? (
              <BurstIcon kind={part.id} />
            ) : part.slot === 'backdrop' ? (
              <span class="garage-part-backdrop backdrop" data-backdrop={backdropOf(part.id)}>
                <CarArt parts={mine} bare />
              </span>
            ) : (
              <CarArt parts={{ ...mine, [part.slot]: part.id }} rank={profile.data?.rank} bare={part.slot !== 'boost' && part.slot !== 'trail'} />
            );
          return (
            <li key={part.id}>
              <button
                type="button"
                class="garage-part"
                data-locked={Boolean(locked)}
                data-trying={tried}
                aria-pressed={on}
                aria-label={locked ? `${part.name}, locked${badge ? `: earn ${badge.name}` : ''}` : part.name}
                onClick={() => pick(part, locked)}
              >
                <span class="garage-part-art">{art}</span>
                <span class="garage-part-name">{part.name}</span>
                {locked && <span class="garage-lock">{badge ? badge.name : 'Locked'}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
