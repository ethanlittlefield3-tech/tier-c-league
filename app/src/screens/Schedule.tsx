import { useState } from 'preact/hooks';
import { MODE_BLURBS, MODE_NAMES, addDays, type GroupMode } from '@tcl/engine';
import { groupLines, type GroupDoc } from '../group/words.ts';

export interface Result {
  player: string;
  opponent: string;
  points: number;
  opponentPoints: number;
  /** `none` in a Bounty or Alley week, which counts toward nobody's record. */
  outcome: 'win' | 'draw' | 'loss' | 'none';
  seasonPoints: number;
}

export interface WeekDoc {
  week: number;
  /** The group-play mode, or `regular`. */
  mode?: string;
  /** `playoff` for a playoff round, which the Playoffs panel shows. */
  phase?: string;
  pairs?: { a: string; b: string }[];
  teams?: { blue: string[]; orange: string[] };
  status?: 'provisional' | 'final';
  results?: Record<string, Result>;
  awards?: { mvp: string[]; bust: string[]; wheel: string[] };
  /** A group-play week's summary, once settled. */
  group?: GroupDoc | null;
}

const points = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const modeName = (mode: string | undefined) => (mode && mode in MODE_NAMES ? MODE_NAMES[mode as GroupMode] : null);
const modeBlurb = (mode: string | undefined) => (mode && mode in MODE_BLURBS ? MODE_BLURBS[mode as GroupMode] : null);

/** "Nov 30 – Dec 6", or "Dec 7 – 13" within one month: a regular week, Monday to Sunday. */
export function weekDates(kickoff: string, week: number): string {
  const monday = addDays(kickoff, 7 * (week - 1));
  const sunday = addDays(monday, 6);
  const month = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = (date: string) => Number(date.slice(8));
  return month(monday) === month(sunday) ? `${month(monday)} ${day(monday)} – ${day(sunday)}` : `${month(monday)} ${day(monday)} – ${month(sunday)} ${day(sunday)}`;
}

function Arrow(props: { back?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={props.back ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} />
    </svg>
  );
}

/**
 * The season's weeks, one at a time (the commish's request, 2026-11-26): it
 * opens on this week's faceoffs, and the arrows go back through the results,
 * with each week's MVP, Bust and Wheel, and on to the weeks to come.
 */
export function Schedule(props: { weeks: { id: string; data: WeekDoc }[]; currentPeriod: string | null; kickoff?: string | null; me: string; name: (player: string) => string }) {
  const weeks = props.weeks.filter((week) => week.data.phase !== 'playoff').sort((a, b) => a.data.week - b.data.week);
  // This week if it is on the schedule, else the latest week with results, else the first to come.
  const start = (() => {
    const current = weeks.findIndex((week) => week.id === props.currentPeriod);
    if (current >= 0) return current;
    const settled = weeks.map((week) => Boolean(week.data.results)).lastIndexOf(true);
    return settled >= 0 ? settled : 0;
  })();
  const [picked, setPicked] = useState<number | null>(null);
  const at = Math.min(Math.max(picked ?? start, 0), Math.max(weeks.length - 1, 0));
  const week = weeks[at];
  const state = week?.data.results ? (week.data.status === 'final' ? 'Final' : 'Provisional') : week?.id === props.currentPeriod ? 'This week' : at > start ? 'Coming up' : 'Played';

  return (
    <section class="panel league-panel schedule" aria-labelledby="schedule-title">
      <h2 id="schedule-title">Schedule</h2>
      {!week ? (
        <p class="panel-text">The schedule appears after the draft.</p>
      ) : (
        <>
          <div class="schedule-nav">
            <button type="button" class="schedule-arrow" aria-label="Earlier week" disabled={at === 0} onClick={() => setPicked(at - 1)}>
              <Arrow back />
            </button>
            <div class="schedule-title" aria-live="polite">
              <p class="result-head">
                Week {week.data.week}
                {modeName(week.data.mode) && <> · {modeName(week.data.mode)}</>}
              </p>
              <p class="schedule-status">
                <span class="schedule-pill" data-state={state === 'This week' ? 'live' : state === 'Final' ? 'final' : 'other'}>
                  {state}
                </span>{' '}
                · {at + 1} of {weeks.length}
              </p>
            </div>
            <button type="button" class="schedule-arrow" aria-label="Later week" disabled={at === weeks.length - 1} onClick={() => setPicked(at + 1)}>
              <Arrow />
            </button>
          </div>
          <WeekBody week={week.data} dates={props.kickoff ? weekDates(props.kickoff, week.data.week) : null} current={week.id === props.currentPeriod} me={props.me} name={props.name} />
        </>
      )}
    </section>
  );
}

/**
 * One week, like an official fixtures card: a strip with its dates, then a
 * row a matchup, the names either side of the score once it is settled, or
 * of "vs" before. Its awards follow, once settled.
 */
function WeekBody(props: { week: WeekDoc; dates: string | null; current: boolean; me: string; name: (player: string) => string }) {
  const { week, name, me } = props;
  const strip = (label: string) => (
    <p class="schedule-strip">
      <span>{props.dates ?? `Week ${week.week}`}</span>
      <span>{label}</span>
    </p>
  );
  if (week.results) {
    const seen = new Set<string>();
    return (
      <div class="result-week">
        <div class="schedule-board">
          {strip(week.status === 'final' ? 'Final scores' : 'Scores')}
          <ul class="pairs">
            {groupLines(week.group, name)?.map((line) => <li data-me={line.players.includes(me)}>{line.text}</li>)}
            {Object.values(week.group ? {} : week.results)
              .filter((result) => result.outcome !== 'none')
              .filter((result) => {
                if (seen.has(result.player)) return false;
                seen.add(result.player);
                seen.add(result.opponent);
                return true;
              })
              .map((result) => (
                <li class="fixture" data-me={result.player === me || result.opponent === me}>
                  <span class="fixture-name" data-won={result.outcome === 'win'}>
                    {name(result.player)}
                  </span>{' '}
                  <span class="fixture-score">
                    <strong data-won={result.outcome === 'win'}>{points(result.points)}</strong> <span class="sr-only">{result.outcome === 'draw' ? 'drew' : result.outcome === 'win' ? 'beat' : 'lost to'}</span>
                    <span class="fixture-dash" aria-hidden="true">
                      –
                    </span>{' '}
                    <strong data-won={result.outcome === 'loss'}>{points(result.opponentPoints)}</strong>
                  </span>{' '}
                  <span class="fixture-name fixture-right" data-won={result.outcome === 'loss'}>
                    {name(result.opponent)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
        {week.awards && (week.awards.mvp.length > 0 || week.awards.bust.length > 0 || week.awards.wheel.length > 0) && (
          <p class="result-awards">
            {week.awards.mvp.length > 0 && (
              <span class="schedule-award">
                <b>MVP</b> {week.awards.mvp.map(name).join(', ')}
              </span>
            )}{' '}
            {week.awards.bust.length > 0 && (
              <span class="schedule-award">
                <b>Bust</b> {week.awards.bust.map(name).join(', ')}
              </span>
            )}{' '}
            {week.awards.wheel.length > 0 && (
              <span class="schedule-award">
                <b>Wheel</b> {week.awards.wheel.map(name).join(', ')}
              </span>
            )}
          </p>
        )}
      </div>
    );
  }
  return (
    <div class="result-week">
      {modeBlurb(week.mode) && (
        <p class="result-mode">
          {modeBlurb(week.mode)}
          {props.current && ' Match shows how it stands.'}
        </p>
      )}
      <div class="schedule-board">
        {strip(week.mode === 'teamWeek' ? 'Teams' : 'Matchups')}
        <ul class="pairs">
          {(week.pairs ?? []).map((pair) => (
            <li class="fixture" data-me={pair.a === me || pair.b === me}>
              <span class="fixture-name">{name(pair.a)}</span> <span class="fixture-vs">vs</span> <span class="fixture-name fixture-right">{name(pair.b)}</span>
            </li>
          ))}
          {week.mode === 'teamWeek' &&
            week.teams &&
            (['blue', 'orange'] as const).map((team) => (
              <li data-me={week.teams![team].includes(me)} data-team={team}>
                {team === 'blue' ? 'Blue' : 'Orange'}: {week.teams![team].map(name).join(', ')}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
