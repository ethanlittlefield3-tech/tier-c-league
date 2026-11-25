import { LANES, nemesisOf, recordText, type Lane, type Rival } from '@tcl/engine';
import { CarArt } from '../art/car/CarArt.tsx';
import type { CarParts } from '../art/car/draw.ts';
import { useState } from 'preact/hooks';
import { useDoc, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { formatPoints, formatScreenShort, pointsChip } from '../today/model.ts';
import type { DayCell } from '../today/week.ts';
import { GoalMark } from './GoalMark.tsx';
import { useMatchup } from './useMatchup.ts';
import { ReceiptAsk } from './ReceiptAsk.tsx';
import { leadText } from './WeekStrip.tsx';
import './match.css';

const LANE_NAMES: Record<Lane, string> = { mind: 'Mind', body: 'Body', wildcard: 'Wildcard' };
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const dayName = (date: string) => {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return DAYS[(new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7] ?? date;
};

const POKE_TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: "The league said no: one poke a day, to this week's opponent.",
};

/** A poke (SCOPE.md, "Poke"): one "you awake?" push to your opponent a day. */
function Poke(props: { me: Me; seasonId: string; date: string; to: string; name: string }) {
  const sent = useDoc<{ to: string }>(`leagues/${props.me.league}/seasons/${props.seasonId}/pokes/${props.date}_${props.me.player}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poked = Boolean(sent.data);
  const send = () => {
    if (busy || poked) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.poke(props.me, props.seasonId, props.date, props.to))
      .catch((failure: unknown) => setError(POKE_TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };
  return (
    <div class="match-poke">
      <button type="button" class="btn btn-second" disabled={busy || poked || sent.loading} onClick={send}>
        {poked ? 'Poked today' : busy ? 'Poking' : `Poke ${props.name}`}
      </button>
      <p class={error ? 'field-error' : 'fine-print'} role={error ? 'alert' : 'status'}>
        {error ?? (poked ? `Sent. ${props.name} gets a "you awake?" alert, if their alerts are on.` : `Once a day, ${props.name} gets a "you awake?" alert.`)}
      </p>
    </div>
  );
}

function Notice(props: { title: string; children: string }) {
  return (
    <section class="today-notice">
      <h2>{props.title}</h2>
      <p>{props.children}</p>
    </section>
  );
}

/** One player's seven days, as a row of cells. */
function WeekRow(props: { who: string; team: 'blue' | 'orange'; cells: DayCell[] }) {
  return (
    <div class="match-row" data-team={props.team}>
      <p class="match-row-name">{props.who}</p>
      <ol class="match-cells">
        {props.cells.map((cell) => (
          <li
            data-state={cell.state}
            data-today={cell.today}
            data-sign={!cell.score ? 'none' : cell.score.total > 0 ? 'up' : cell.score.total < 0 ? 'down' : 'zero'}
            aria-label={`${props.who}, ${DAYS[cell.dayIndex]}: ${cell.score ? formatPoints(cell.score.total) : 'not started'}${cell.rest ? ', rest day' : ''}`}
          >
            {cell.score ? formatPoints(cell.score.total) : cell.rest ? 'R' : ''}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Match (SCOPE.md, "Screens"): this week's matchup. Your opponent's live day
 * in team orange, and both weeks side by side. Until group play is built,
 * every week is a 1v1.
 */
export function Match(props: { me: Me }) {
  const now = useNow();
  const match = useMatchup(props.me, now);
  const mine = useDoc<{ car?: Partial<CarParts>; rivals?: Record<string, Rival> }>(`leagues/${props.me.league}/players/${props.me.player}`);

  if (match.loading) {
    return (
      <div class="waiting today-waiting" aria-busy="true">
        <div class="waiting-ring" />
        <p role="status">Getting this week</p>
      </div>
    );
  }
  if (!match.seasonId || !match.season) return <Notice title="No season yet">Your commish sets up the season. Your matchups show here from kickoff.</Notice>;
  if (!match.today || !match.myWeek) return <Notice title="No matchup today">There is no week in play today. Check the League tab for what is next.</Notice>;
  if (match.vsHouse) {
    return <Notice title="You face The House">The House scores the league's average for the week, worked out when the week settles. Every point you score still counts.</Notice>;
  }
  if (!match.opponent || !match.theirWeek) return <Notice title="No opponent yet">Your opponent shows here once the schedule is out, after the draft.</Notice>;

  const them = match.opponent;
  const theirToday = match.theirWeek.cells.find((cell) => cell.today) ?? null;
  const score = theirToday?.score ?? null;
  const todayDate = match.dates?.today ?? '';
  const on = (item: string) => them.kit.find((play) => play.item === item && play.date === todayDate);
  const log = them.log;

  return (
    <div class="match">
      <section class="match-board" aria-label="This week's score">
        <div class="match-side" data-team="blue">
          <CarArt parts={mine.data?.car} team="blue" class="match-car" />
          <span class="match-name">You</span>
          <span class="match-points">{formatPoints(match.myWeek.totals.points)}</span>
        </div>
        <span class="match-vs" aria-hidden="true">
          VS
        </span>
        <div class="match-side" data-team="orange">
          <CarArt parts={them.car} team="orange" class="match-car match-car-them" />
          <span class="match-name">{them.name}</span>
          {nemesisOf(mine.data?.rivals) === them.id && (
            <span class="match-nemesis">
              <span role="img" aria-hidden="true">
                💀
              </span>{' '}
              Nemesis
            </span>
          )}
          <span class="match-points">{formatPoints(match.theirWeek.totals.points)}</span>
        </div>
        <p class="match-lead">{leadText(match.myWeek.totals, match.theirWeek.totals, them.name)}</p>
        <p class="match-record">
          All-time against {them.name}: {recordText(mine.data?.rivals?.[them.id])}
        </p>
      </section>

      <section class="match-day" aria-labelledby="match-day-title">
        <div class="match-day-head">
          <h2 id="match-day-title">{them.name}'s day</h2>
          <p class="match-day-total" data-sign={!score ? 'zero' : score.total > 0 ? 'up' : score.total < 0 ? 'down' : 'zero'}>
            {score ? formatPoints(score.total) : '0'}
            <span>{theirToday?.state === 'locked' ? 'final' : 'so far'}</span>
          </p>
        </div>
        <div class="match-notes">
          {theirToday?.rest && <span class="match-note match-note-rest">Rest day</span>}
          {on('aerial') && <span class="match-note">Aerial: counts double</span>}
          {on('ruleOne') && <span class="match-note">Rule One: scores 0</span>}
        </div>
        <div class="squares match-squares">
          <div class="square square-screen" data-logged={log?.screenMinutes !== null && log?.screenMinutes !== undefined}>
            <span class="square-label">Screen time</span>
            <span class="square-value">{formatScreenShort(log?.screenMinutes ?? null)}</span>
            {score && log && log.screenMinutes !== null && <span class="square-chip match-chip">{pointsChip(score.screen.points)}</span>}
          </div>
          {LANES.map((lane) => {
            const state = score?.goals[lane] ?? 'missed';
            const text = them.goals[lane]?.text ?? '';
            return (
              <div class="square square-goal" data-lane={lane} data-state={state} aria-label={`${them.name}'s ${LANE_NAMES[lane]}: ${text || 'not set yet'}, ${state}`}>
                <span class="square-goal-text">{text || 'Set at the draft'}</span>
                <GoalMark state={state} />
              </div>
            );
          })}
        </div>
        <p class="match-beers">
          Beers today: <strong>{log?.beers ?? 0}</strong>
        </p>
        {todayDate && <Poke me={props.me} seasonId={match.seasonId} date={todayDate} to={them.id} name={them.name} />}
      </section>

      <ReceiptAsk
        me={props.me}
        seasonId={match.seasonId}
        now={now}
        timeZone={match.season.timeZone}
        today={todayDate}
        them={them}
        days={match.receiptDays}
        logs={match.theirLogs}
        theirReceipts={match.theirReceipts}
        myRequests={match.myRequests}
      />

      <section class="week match-week" aria-labelledby="match-week-title">
        <h2 id="match-week-title">This week</h2>
        <div class="match-letters" aria-hidden="true">
          <span />
          {match.myWeek.cells.map((cell) => (
            <span data-today={cell.today}>{LETTERS[cell.dayIndex]}</span>
          ))}
        </div>
        <WeekRow who="You" team="blue" cells={match.myWeek.cells} />
        <WeekRow who={them.name} team="orange" cells={match.theirWeek.cells} />
      </section>

      {match.myDemolition && (
        <p class="match-secret">
          Your Demolition: {dayName(match.myDemolition.date)}, their {LANE_NAMES[match.myDemolition.lane]} goal. Only you can see it until noon the next day.
        </p>
      )}
    </div>
  );
}
