import { CarArt } from '../art/car/CarArt.tsx';
import type { CarParts } from '../art/car/draw.ts';
import { formatPoints } from '../today/model.ts';
import type { DayCell } from '../today/week.ts';
import { leadText, meterText } from './WeekStrip.tsx';
import './week.css';
import './scoreboard.css';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface BoardSide {
  name: string;
  car: Partial<CarParts> | null | undefined;
  stickers?: Partial<Record<string, { until?: unknown }>> | null;
  points: number;
  beers: number;
  /** Goals in today, 0 to 3, or `rest` on a rest day. */
  boost: number | 'rest';
}

/** One goal's slice of the boost ring: three slices of 110 degrees, from the top, with gaps. */
function slice(index: number): string {
  const point = (degrees: number) => {
    const radians = ((degrees - 90) * Math.PI) / 180;
    return `${(20 + 16 * Math.cos(radians)).toFixed(2)} ${(20 + 16 * Math.sin(radians)).toFixed(2)}`;
  };
  const start = index * 120 + 5;
  return `M ${point(start)} A 16 16 0 0 1 ${point(start + 110)}`;
}

/**
 * A boost gauge (the commish's request, 2026-11-27): one slice for each goal
 * in today, so you can see at a glance how a side's day is going. A rest day
 * reads "Rest".
 */
function BoostGauge(props: { boost: number | 'rest'; label: string }) {
  const filled = props.boost === 'rest' ? 0 : props.boost;
  return (
    <span class="boost" role="img" aria-label={props.label} data-full={filled === 3}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <path class="boost-slice" data-on={index < filled} d={slice(index)} />
        ))}
      </svg>
      <span class="boost-value" aria-hidden="true">
        {props.boost === 'rest' ? 'Rest' : Math.round((filled / 3) * 100)}
      </span>
    </span>
  );
}

/** A side's car, with a boost flame that grows with its goals today. */
function BoardCar(props: { side: BoardSide; team: 'blue' | 'orange' }) {
  const level = props.side.boost === 'rest' ? 0 : props.side.boost / 3;
  return (
    <span class="board-car" data-team={props.team}>
      <span class="board-flame" aria-hidden="true" style={{ transform: `scaleX(${level.toFixed(2)})`, opacity: level > 0 ? 1 : 0 }}>
        <svg viewBox="0 0 40 20">
          <path d="M40 4C28 3 14 0 0 10 14 20 28 17 40 16Z" fill="currentColor" />
          <path d="M40 7C31 6 22 5 12 10 22 15 31 14 40 13Z" fill="#fff6c8" />
        </svg>
      </span>
      <CarArt parts={props.side.car} stickers={props.side.stickers} team={props.team} bare class="board-car-art" />
    </span>
  );
}

const goalsWords = (boost: number | 'rest') => (boost === 'rest' ? 'rest day' : `${boost} of 3 goals in today`);

/**
 * Game Day's scoreboard (the commish's request, 2026-11-27): you against your
 * opponent this week, each car with its boost gauge for today, the win meter
 * and your seven days. A tap on your opponent's side opens their day.
 */
export function Scoreboard(props: {
  week: number;
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
        <h2 id="week-title">Week {props.week}</h2>
        <span class="board-status">{props.status}</span>
      </div>
      <div class="board-sides">
        <div class="board-side week-side week-me" data-team="blue">
          <BoardCar side={me} team="blue" />
          <BoostGauge boost={me.boost} label={`Your boost: ${goalsWords(me.boost)}`} />
          <span class="board-name">You</span>
          <strong class="board-points">{formatPoints(me.points)}</strong>
        </div>
        <span class="board-vs" aria-hidden="true">
          VS
        </span>
        <button type="button" class="board-side week-side week-them" data-team="orange" aria-label={`See ${them.name}'s day: ${formatPoints(them.points)} this week, ${goalsWords(them.boost)}`} onClick={props.onOpponent}>
          <BoardCar side={them} team="orange" />
          <BoostGauge boost={them.boost} label={`${them.name}'s boost: ${goalsWords(them.boost)}`} />
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
