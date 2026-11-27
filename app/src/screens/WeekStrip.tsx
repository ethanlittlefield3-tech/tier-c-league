import { formatPoints } from '../today/model.ts';
import type { DayCell } from '../today/week.ts';
import './week.css';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface WeekSide {
  points: number;
  beers: number;
}

/**
 * Who leads, in plain words. A tie on points goes to fewer beers (SCOPE.md,
 * "Winning a 1v1"). The House scores an average, so a gap shows to a tenth.
 */
export function leadText(me: WeekSide, them: WeekSide, name: string): string {
  const gap = Math.round((me.points - them.points) * 10) / 10;
  if (gap > 0) return `You lead by ${gap}`;
  if (gap < 0) return `${name} leads by ${-gap}`;
  if (me.beers < them.beers) return 'Level on points: you lead on fewer beers';
  if (them.beers < me.beers) return `Level on points: ${name} leads on fewer beers`;
  return 'All square';
}

/** What the win meter says: who's favored, or that it's too close to call. */
export function meterText(share: number, name: string): string {
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  if (share >= 0.55) return `You're favored, ${percent(share)}`;
  if (share <= 0.45) return `${name} is favored, ${percent(1 - share)}`;
  return 'Too close to call';
}

/**
 * This week before the schedule is out: your points so far and your seven
 * days. With an opponent, or The House, Game Day shows the scoreboard instead.
 */
export function WeekStrip(props: { week: number; cells: DayCell[]; me: WeekSide }) {
  return (
    <section class="week" aria-labelledby="week-title">
      <div class="week-score">
        <h2 id="week-title">Week {props.week}</h2>
        <p class="week-lead">
          You <strong>{formatPoints(props.me.points)}</strong> so far. Your opponent shows here once the schedule is out.
        </p>
      </div>
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
    </section>
  );
}
