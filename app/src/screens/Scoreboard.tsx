import { MODE_NAMES, RUMBLE_NAMES, type GroupMode, type RumbleItem } from '@tcl/engine';
import { CarArt } from '../art/car/CarArt.tsx';
import type { CarParts } from '../art/car/draw.ts';
import { ItemIcon } from '../art/itemIcons.tsx';
import { formatPoints } from '../today/model.ts';
import type { DayCell } from '../today/week.ts';
import { leadText, meterText } from './WeekStrip.tsx';
import './week.css';
import './scoreboard.css';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** A side's day so far, for its dial: goals in, screen time logged, and a rest day (goals off). */
export interface Boost {
  goals: number;
  screen: boolean;
  rest: boolean;
}

export interface BoardSide {
  name: string;
  car: Partial<CarParts> | null | undefined;
  stickers?: Partial<Record<string, { until?: unknown }>> | null;
  points: number;
  beers: number;
  boost: Boost;
}

/** How full a dial is, from 0 to 1: a quarter for each goal in and for screen time. */
const fullness = (boost: Boost) => (boost.goals + (boost.screen ? 1 : 0)) / 4;

/** One quarter of the dial: four slices of 80 degrees, from the top, with gaps. */
function slice(index: number): string {
  const point = (degrees: number) => {
    const radians = ((degrees - 90) * Math.PI) / 180;
    return `${(20 + 16 * Math.cos(radians)).toFixed(2)} ${(20 + 16 * Math.sin(radians)).toFixed(2)}`;
  };
  const start = index * 90 + 5;
  return `M ${point(start)} A 16 16 0 0 1 ${point(start + 80)}`;
}

/**
 * The day dial (the commish's requests, 2026-11-27): a slice for each goal in
 * today and one for screen time, so you can see at a glance how a side's day
 * is going. Full, it reads 100 in gold. On a rest day the goal slices rest.
 */
export function DayDial(props: { boost: Boost; label: string }) {
  const { boost } = props;
  return (
    <span class="boost" role="img" aria-label={props.label} data-full={boost.goals === 3 && boost.screen} data-rest={boost.rest}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <path class="boost-slice" data-on={index < boost.goals} d={slice(index)} />
        ))}
        <path class="boost-slice boost-screen" data-on={boost.screen} d={slice(3)} />
      </svg>
      <span class="boost-value" aria-hidden="true">
        {boost.rest ? 'Rest' : Math.round(fullness(boost) * 100)}
      </span>
    </span>
  );
}

/** A goal that counts: hit, or counted by a power-up. */
const GOAL_IN = new Set<string>(['hit', 'boosted', 'swappedIn']);

/** Today's dial for a side: the goals in, whether screen time is logged, and a rest day. */
export function boostOf(cells: readonly { today: boolean; rest: boolean; score: { goals: Record<string, string>; screen: { state: string } } | null }[]): Boost {
  const today = cells.find((cell) => cell.today);
  if (!today) return { goals: 0, screen: false, rest: false };
  return {
    goals: today.rest ? 0 : Object.values(today.score?.goals ?? {}).filter((state) => GOAL_IN.has(state)).length,
    screen: today.score?.screen.state === 'logged',
    rest: today.rest,
  };
}

/** A side's car, with a boost flame that grows as its dial fills, and today's Rumble item on its roof. */
function BoardCar(props: { side: BoardSide; team: 'blue' | 'orange'; item?: RumbleItem | null }) {
  const level = fullness(props.side.boost);
  return (
    <span class="board-car" data-team={props.team}>
      <span class="board-flame" aria-hidden="true" style={{ transform: `scaleX(${level.toFixed(2)})`, opacity: level > 0 ? 1 : 0 }}>
        <svg viewBox="0 0 40 20">
          <path d="M40 4C28 3 14 0 0 10 14 20 28 17 40 16Z" fill="currentColor" />
          <path d="M40 7C31 6 22 5 12 10 22 15 31 14 40 13Z" fill="#fff6c8" />
        </svg>
      </span>
      <CarArt parts={props.side.car} stickers={props.side.stickers} team={props.team} bare class="board-car-art" />
      {props.item && (
        <span class="board-item" title={RUMBLE_NAMES[props.item]}>
          <ItemIcon item={props.item} />
        </span>
      )}
    </span>
  );
}

export const dayWords = (boost: Boost) => `${boost.rest ? 'rest day' : `${boost.goals} of 3 goals in`}, screen time ${boost.screen ? 'logged' : 'not logged'}`;

const goalsWords = dayWords;

/**
 * Game Day's scoreboard (the commish's request, 2026-11-27): you against your
 * opponent this week, each car with its boost gauge for today, the win meter
 * and your seven days. A tap on your opponent's side opens their day.
 */
export function Scoreboard(props: {
  week: number;
  /** A group-play 1v1 (Rumble or Drop Shot) names its mode in the header. */
  mode?: GroupMode | null;
  /** Rumble: today's item on each side, shown on the cars. */
  items?: { mine: RumbleItem | null; theirs: RumbleItem | null } | null;
  /** "Thu · Live", or "Week over". */
  status: string;
  me: BoardSide;
  them: BoardSide & { nemesis: boolean };
  /** Your share of the win meter, or null once no day is left. */
  meter: number | null;
  /** "All-time against Maya: 1–0–2". */
  record: string;
  cells: DayCell[];
  onOpponent: () => void;
}) {
  const { me, them } = props;
  return (
    <section class="week board" aria-labelledby="week-title">
      <div class="board-head">
        <h2 id="week-title">
          Week {props.week}
          {props.mode && <span class="board-mode">: {MODE_NAMES[props.mode]}</span>}
        </h2>
        <span class="board-status">{props.status}</span>
      </div>
      <div class="board-sides">
        <div class="board-side week-side week-me" data-team="blue">
          <BoardCar side={me} team="blue" item={props.items?.mine} />
          <DayDial boost={me.boost} label={`Your day: ${goalsWords(me.boost)}`} />
          <span class="board-name">You</span>
          <strong class="board-points">{formatPoints(me.points)}</strong>
        </div>
        <span class="board-vs" aria-hidden="true">
          VS
        </span>
        <button type="button" class="board-side week-side week-them" data-team="orange" aria-label={`See ${them.name}'s day: ${formatPoints(them.points)} this week, ${goalsWords(them.boost)}`} onClick={props.onOpponent}>
          <BoardCar side={them} team="orange" item={props.items?.theirs} />
          <DayDial boost={them.boost} label={`${them.name}'s day: ${goalsWords(them.boost)}`} />
          <span class="board-name">
            {them.name}
            {them.nemesis && (
              <span class="match-nemesis">
                <span role="img" aria-hidden="true">
                  💀
                </span>{' '}
                Nemesis
              </span>
            )}
          </span>
          <strong class="board-points">{formatPoints(them.points)}</strong>
          <span class="board-tap" aria-hidden="true">
            Tap for their day
          </span>
        </button>
      </div>
      <div class="board-lead">
        <p class="week-lead">{leadText(me, them, them.name)}</p>
        {props.meter !== null && (
          <p class="meter-text" aria-hidden="true">
            {meterText(props.meter, them.name)}
          </p>
        )}
      </div>
      {props.meter !== null && (
        <div class="meter" role="meter" aria-label="Win meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(props.meter * 100)} aria-valuetext={meterText(props.meter, them.name)}>
          <div class="meter-bar" aria-hidden="true">
            <span class="meter-me" style={{ transform: `scaleX(${props.meter.toFixed(3)})` }} />
          </div>
        </div>
      )}
      <ol class="week-days">
        {props.cells.map((cell) => (
          <li data-state={cell.state} data-today={cell.today} data-rest={cell.rest} aria-label={`${NAMES[cell.dayIndex]}: ${cell.score ? formatPoints(cell.score.total) : 'not started'}${cell.rest ? ', rest day' : ''}`}>
            <span class="week-letter" aria-hidden="true">
              {LETTERS[cell.dayIndex]}
            </span>
            <span class="week-cell" aria-hidden="true" data-sign={!cell.score ? 'none' : cell.score.total > 0 ? 'up' : cell.score.total < 0 ? 'down' : 'zero'}>
              {cell.score ? formatPoints(cell.score.total) : cell.rest ? 'R' : ''}
            </span>
          </li>
        ))}
      </ol>
      <p class="board-record">{props.record}</p>
    </section>
  );
}
