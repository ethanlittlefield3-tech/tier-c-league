import { formatPoints } from '../today/model.ts';
import type { DayCell } from '../today/week.ts';
import './week.css';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface WeekSide {
  points: number;
  beers: number;
}

/** Who leads, in plain words. A tie on points goes to fewer beers (SCOPE.md, "Winning a 1v1"). */
export function leadText(me: WeekSide, them: WeekSide, name: string): string {
  if (me.points > them.points) return `You lead by ${me.points - them.points}`;
  if (them.points > me.points) return `${name} leads by ${them.points - me.points}`;
  if (me.beers < them.beers) return 'Level on points: you lead on fewer beers';
  if (them.beers < me.beers) return `Level on points: ${name} leads on fewer beers`;
  return 'All square';
}

/**
 * This week at a glance: the score against your opponent, and your seven days
 * (SCOPE.md, Today: "week bars").
 */
export function WeekStrip(props: { week: number; cells: DayCell[]; me: WeekSide; opponent: (WeekSide & { name: string }) | null; vsHouse: boolean }) {
  return (
    <section class="week" aria-labelledby="week-title">
      <div class="week-score">
        <h2 id="week-title">Week {props.week}</h2>
        {props.opponent ? (
          <>
            <p class="week-vs">
              <span class="week-side week-me">
                You <strong>{formatPoints(props.me.points)}</strong>
              </span>
              <span class="week-versus">vs</span>
              <span class="week-side week-them">
                {props.opponent.name} <strong>{formatPoints(props.opponent.points)}</strong>
              </span>
            </p>
            <p class="week-lead">{leadText(props.me, props.opponent, props.opponent.name)}</p>
          </>
        ) : props.vsHouse ? (
          <p class="week-lead">You face The House this week. It scores the league's average.</p>
        ) : (
          <p class="week-lead">
            You <strong>{formatPoints(props.me.points)}</strong> so far. Your opponent shows here once the schedule is out.
          </p>
        )}
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
