import { RANK_NAMES, type Lane, type Rank } from '@tcl/engine';
import { FormGauge } from '../art/FormGauge.tsx';
import { useAll, useDoc, useNow, useWhere } from '../data/hooks.ts';
import type { Me } from '../data/identity.ts';
import { seasonDates, type DayEntry } from '../today/model.ts';
import { telemetryModel, WINDOW_DAYS, type TelemetryModel } from '../telemetry/model.ts';
import './telemetry.css';

const LANE_NAMES: Record<Lane, string> = { mind: 'Mind', body: 'Body', wildcard: 'Wildcard' };
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const one = (value: number) => (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, '');
const signed = (value: number) => (value > 0 ? `+${one(value)}` : value < 0 ? `−${one(-value)}` : '0');
const percent = (value: number) => `${Math.round(value * 100)}%`;
const hours = (minutes: number) => {
  const whole = Math.floor(minutes / 60);
  const rest = Math.round(minutes - whole * 60);
  return whole === 0 ? `${rest}m` : rest === 0 ? `${whole}h` : `${whole}h ${rest}m`;
};
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;

/** What to work on, from the biggest leak, in plain words. */
function leakTip(model: TelemetryModel): string | null {
  const leak = model.leak;
  if (!leak) return null;
  if (leak.kind === 'goals') return `Missed goals cost you ${one(leak.perWeek)} a week. Your ${LANE_NAMES[leak.lane!]} goal is the one you miss most: two more a week is +2.`;
  if (leak.kind === 'screen') return `Screen time costs you ${one(leak.perWeek)} a week against its best. Every hour less a day is worth up to +7 a week.`;
  if (leak.kind === 'beers') return `Beers cost you ${one(leak.perWeek)} a week, one point each.`;
  return `Days with nothing logged cost you ${one(leak.perWeek)} a week. Logging something every day, even a bad one, stops it.`;
}

const LEAKS: { key: keyof TelemetryModel['leaks']; name: string }[] = [
  { key: 'goals', name: 'Missed goals' },
  { key: 'screen', name: 'Screen time' },
  { key: 'beers', name: 'Beers' },
  { key: 'noShows', name: 'Nothing logged' },
];

const ROWS: Record<string, { name: string; show: (value: number) => string }> = {
  points: { name: 'Points a week', show: one },
  goals: { name: 'Goals hit', show: percent },
  screen: { name: 'Screen time a day', show: hours },
  beers: { name: 'Beers a week', show: one },
  logged: { name: 'Days logged', show: percent },
};

/** A small ring for a lane's hit rate. */
function LaneRing(props: { rate: number | null }) {
  const length = 2 * Math.PI * 16;
  const filled = (props.rate ?? 0) * length;
  return (
    <svg class="tm-ring" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="16" class="tm-ring-track" />
      <circle cx="20" cy="20" r="16" class="tm-ring-fill" stroke-dasharray={`${filled.toFixed(2)} ${length.toFixed(2)}`} transform="rotate(-90 20 20)" />
    </svg>
  );
}

function Card(props: { title: string; meta?: string; children: preact.ComponentChildren; label: string }) {
  return (
    <section class="tm-card" aria-label={props.label}>
      <header class="tm-card-head">
        <h2>{props.title}</h2>
        {props.meta && <span>{props.meta}</span>}
      </header>
      {props.children}
    </section>
  );
}

/**
 * Telemetry (the commish's request, 2026-11-28): your own numbers. Your form
 * is the spotlight, one number on a boost gauge; then where your points go,
 * your lanes, screen time, the shape of your week, how steady you are, and
 * how you stand against the league. All from the real season: a practice
 * week never counts here.
 */
export function Telemetry(props: { me: Me }) {
  const now = useNow(60_000);
  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<{ season?: string | null }>(leaguePath);
  const seasonId = league.data?.season ?? null;
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const season = useDoc<{ par: number; kickoff: string; regularWeeks: number; timeZone: string; status?: string }>(seasonPath);
  const profile = useDoc<{ rankHistory?: { points: number; max: number }[] }>(`${leaguePath}/players/${props.me.player}`);
  const days = useWhere<DayEntry & { date: string }>(seasonPath ? `${seasonPath}/days` : null, 'player', props.me.player);
  const kit = useWhere<{ item?: string; period?: string; date?: string }>(seasonPath ? `${seasonPath}/kit` : null, 'player', props.me.player);
  const weeks = useAll<{ stats?: Record<string, never>; lines?: { player: string; points: number }[] }>(seasonPath ? `${seasonPath}/weeks` : null);
  const players = useAll<{ rankHistory?: { points: number; max: number }[] }>(`${leaguePath}/players`);

  if (league.loading || season.loading || profile.loading) {
    return (
      <div class="waiting" aria-busy="true">
        <div class="waiting-ring" />
        <p role="status">Reading your telemetry</p>
      </div>
    );
  }

  const today = season.data ? seasonDates(now, season.data).today : '';
  const model = telemetryModel({
    me: props.me.player,
    season: season.data ? { par: season.data.par, kickoff: season.data.kickoff, regularWeeks: season.data.regularWeeks } : null,
    today,
    logs: Object.fromEntries(days.docs.map((found) => [found.data.date, found.data])),
    kit: kit.docs.map((found) => found.data),
    history: profile.data?.rankHistory ?? [],
    weeks: weeks.docs.map((found) => ({ id: found.id, stats: found.data.stats, lines: found.data.lines })),
    players: players.docs.map((found) => ({ id: found.id, history: found.data.rankHistory ?? [] })),
  });

  const shown = model.form ?? model.pace;
  const moved = model.form !== null && model.formBefore !== null ? model.form - model.formBefore : null;
  const worstLeak = Math.max(...LEAKS.map((leak) => model.leaks[leak.key]), 0.001);
  const shape = model.shape.filter((day) => day.average !== null);
  const bestDay = shape.length ? shape.reduce((a, b) => (a.average! >= b.average! ? a : b)) : null;
  const worstDay = shape.length ? shape.reduce((a, b) => (a.average! <= b.average! ? a : b)) : null;
  const screenMax = Math.max(60, ...model.screen.weeks.map((week) => week.perDay ?? 0), (season.data?.par ?? 3) * 60);

  return (
    <div class="telemetry">
      <section class="tm-hero" aria-label="Your form">
        <div class="tm-gauge">
          <FormGauge value={shown} pace={model.form !== null ? model.pace : null} />
          <div class="tm-readout">
            <span class="tm-readout-label">{model.form !== null ? 'Form' : model.pace !== null ? 'Pace' : 'Form'}</span>
            <strong class="tm-number">{shown ?? '–'}</strong>
            {model.rank && (
              <span class="tm-rank" data-rank={model.rank}>
                {RANK_NAMES[model.rank as Rank]}
              </span>
            )}
          </div>
        </div>
        <p class="tm-hero-note">
          {model.form !== null
            ? moved === null || moved === 0
              ? 'Out of 100: your last 4 final weeks against the most each could score. It moves every Tuesday.'
              : `${moved > 0 ? '▲' : '▼'} ${Math.abs(moved)} since last week. Out of 100: your last 4 final weeks against the most each could score.`
            : model.started
              ? "This week's pace so far, out of 100. Your form fills in once your first week is final."
              : 'Your telemetry starts on kickoff day. Your form fills in once your first week is final.'}
        </p>
        {model.form !== null && model.pace !== null && (
          <p class="tm-pace">
            <span class="tm-pace-mark" aria-hidden="true" />
            This week's pace: <strong>{model.pace}</strong>
          </p>
        )}
      </section>

      {model.started && (
        <>
          <Card title="Where your points go" meta={`Last ${Math.min(WINDOW_DAYS, model.stats.days)} days, a week`} label="Where your points go">
            <ul class="tm-bars">
              {LEAKS.map((leak) => (
                <li data-worst={model.leak?.kind === leak.key}>
                  <span class="tm-bar-name">{leak.name}</span>
                  <span class="tm-bar" aria-hidden="true">
                    <span style={{ transform: `scaleX(${(model.leaks[leak.key] / worstLeak).toFixed(3)})` }} />
                  </span>
                  <strong class="tm-bar-value">{model.leaks[leak.key] > 0 ? `−${one(model.leaks[leak.key])}` : '0'}</strong>
                </li>
              ))}
            </ul>
            <p class="tm-tip">{leakTip(model) ?? 'Nothing given away. A perfect stretch.'}</p>
          </Card>

          <Card title="Goals by lane" meta="Hit rate" label="Goals by lane">
            <ul class="tm-lanes">
              {model.lanes.map((lane) => {
                const change = lane.rate !== null && lane.before !== null ? Math.round((lane.rate - lane.before) * 100) : null;
                return (
                  <li>
                    <span class="tm-lane-ring">
                      <LaneRing rate={lane.rate} />
                      <strong>{lane.rate === null ? '–' : percent(lane.rate)}</strong>
                    </span>
                    <span class="tm-lane-name">{LANE_NAMES[lane.lane]}</span>
                    {change !== null && change !== 0 && (
                      <span class="tm-change" data-up={change > 0}>
                        {change > 0 ? '▲' : '▼'} {Math.abs(change)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Screen time" meta={model.screen.perDay === null ? 'Not logged yet' : `${hours(model.screen.perDay)} a day`} label="Screen time">
            <div class="tm-screen" aria-hidden="true">
              <span class="tm-par" style={{ transform: `translateY(${(-((season.data?.par ?? 3) * 60) / screenMax) * 72}px)` }}>
                <span>Par {season.data?.par ?? 3}h</span>
              </span>
              {model.screen.weeks.map((week) => (
                <span class="tm-screen-week">
                  <span class="tm-screen-bar" data-over={week.perDay !== null && week.perDay > (season.data?.par ?? 3) * 60} style={{ transform: `scaleY(${((week.perDay ?? 0) / screenMax).toFixed(3)})` }} />
                  <small>W{week.week}</small>
                </span>
              ))}
            </div>
            <p class="sr-only">{model.screen.weeks.map((week) => `Week ${week.week}: ${week.perDay === null ? 'not logged' : `${hours(week.perDay)} a day`}`).join('. ')}</p>
          </Card>

          <Card title="Your week" meta="Average day" label="Your week">
            <ol class="tm-shape">
              {model.shape.map((day) => (
                <li data-sign={day.average === null ? 'none' : day.average > 0 ? 'up' : day.average < 0 ? 'down' : 'zero'} aria-label={`${DAYS[day.dayIndex]}: ${day.average === null ? 'no days yet' : signed(day.average)}`}>
                  <small aria-hidden="true">{LETTERS[day.dayIndex]}</small>
                  <strong aria-hidden="true">{day.average === null ? '' : signed(day.average)}</strong>
                </li>
              ))}
            </ol>
            {bestDay && worstDay && bestDay.dayIndex !== worstDay.dayIndex && (
              <p class="tm-tip">
                Best: {DAYS[bestDay.dayIndex]}s, {signed(bestDay.average!)}. Toughest: {DAYS[worstDay.dayIndex]}s, {signed(worstDay.average!)}.
              </p>
            )}
          </Card>

          <Card title="Consistency" label="Consistency">
            <div class="tm-tiles">
              <p>
                <strong>{model.stats.days ? percent(model.stats.logged / model.stats.days) : '–'}</strong>
                <small>Days logged</small>
              </p>
              <p>
                <strong>{model.stats.perfect}</strong>
                <small>Perfect days</small>
              </p>
              <p>
                <strong>{model.streak.current}</strong>
                <small>Day streak · best {model.streak.best}</small>
              </p>
            </div>
          </Card>
        </>
      )}

      <Card title="You vs the league" meta="Settled weeks" label="You against the league">
        {model.league.form === null && model.league.rows.length === 0 ? (
          <p class="tm-tip">The league comes in once the first week is settled.</p>
        ) : (
          <ul class="tm-compare">
            {model.form !== null && model.league.form !== null && (
              <li>
                <span class="tm-compare-name">Form</span>
                <span class="tm-compare-bars" aria-hidden="true">
                  <span class="tm-you" style={{ transform: `scaleX(${(model.form / 100).toFixed(3)})` }} />
                  <span class="tm-them" style={{ transform: `scaleX(${(model.league.form / 100).toFixed(3)})` }} />
                </span>
                <span class="tm-compare-values">
                  <strong>{model.form}</strong> vs {model.league.form}
                </span>
                {model.league.formPlace !== null && (
                  <span class="tm-place">
                    {ordinal(model.league.formPlace)} of {model.league.formOf}
                  </span>
                )}
              </li>
            )}
            {model.league.rows.map((row) => {
              const top = Math.max(row.you, row.league, 0.001);
              return (
                <li>
                  <span class="tm-compare-name">{ROWS[row.key]!.name}</span>
                  <span class="tm-compare-bars" aria-hidden="true">
                    <span class="tm-you" style={{ transform: `scaleX(${(row.you / top).toFixed(3)})` }} />
                    <span class="tm-them" style={{ transform: `scaleX(${(row.league / top).toFixed(3)})` }} />
                  </span>
                  <span class="tm-compare-values">
                    <strong>{ROWS[row.key]!.show(row.you)}</strong> vs {ROWS[row.key]!.show(row.league)}
                  </span>
                  <span class="tm-place">
                    {ordinal(row.place)} of {row.of}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p class="tm-legend" aria-hidden="true">
          <span class="tm-you-key" /> You <span class="tm-them-key" /> League average
        </p>
      </Card>
    </div>
  );
}
