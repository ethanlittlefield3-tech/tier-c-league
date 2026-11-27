import { ItemIcon } from '../art/itemIcons.tsx';
import { LANES, REMATCH_LAST_DAY, RUMBLE_NAMES, isPairedMode, rematchFor, weekPeriod, type Lane } from '@tcl/engine';
import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useDoc, useNow, useWhere } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { formatPoints, formatScreenShort, pointsChip } from '../today/model.ts';
import type { DayCell } from '../today/week.ts';
import { GoalMark } from './GoalMark.tsx';
import { useMatchup } from './useMatchup.ts';
import { GroupBoard } from './GroupBoard.tsx';
import { useWeekBoard } from './useWeekBoard.ts';
import { ReceiptAsk } from './ReceiptAsk.tsx';
import './match.css';
import './sheet.css';

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
      <button type="button" class="match-poke-btn" disabled={busy || poked || sent.loading} onClick={send} title={`Once a day, ${props.name} gets a "you awake?" alert.`}>
        {poked ? 'Poked today' : busy ? 'Poking' : `Poke ${props.name}`}
      </button>
      <p class={error ? 'field-error' : 'match-poke-note'} role={error ? 'alert' : 'status'}>
        {error ?? (poked ? `Sent. ${props.name} gets a "you awake?" alert, if their alerts are on.` : '')}
      </p>
    </div>
  );
}

interface Race {
  from: string;
  to: string;
  lost: string;
  period: string;
}

/**
 * A rematch (SCOPE.md, "Rematch challenge"): after a loss, challenge the
 * winner to a side race this week, by Wednesday. Most points wins; the winner
 * gets the Payback decal, and the loser wears an L for a week.
 */
function Rematch(props: { me: Me; seasonId: string; week: number; period: string; dayIndex: number; date: string }) {
  const seasonPath = `leagues/${props.me.league}/seasons/${props.seasonId}`;
  const lost = props.week > 1 ? weekPeriod(props.week - 1) : null;
  const before = useDoc<{ status?: string; results?: Record<string, { opponent: string; outcome: string; points?: number; opponentPoints?: number }> }>(lost ? `${seasonPath}/weeks/${lost}` : null);
  const races = useWhere<Race>(`${seasonPath}/rematches`, 'period', props.period);
  const mine = races.docs.map((found) => found.data).find((race) => race.from === props.me.player || race.to === props.me.player) ?? null;
  const offer = rematchFor(props.me.player, before.data);
  const rival = mine ? (mine.from === props.me.player ? mine.to : mine.from) : (offer?.to ?? null);
  const rivalProfile = useDoc<{ displayName?: string }>(rival ? `leagues/${props.me.league}/players/${rival}` : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = rivalProfile.data?.displayName ?? 'your rival';
  const stakes = 'Most points this week wins: the winner gets the Payback decal, and the loser wears an L for a week.';

  if (races.loading || before.loading) return null;
  if (mine) {
    return (
      <section class="match-rematch" aria-labelledby="rematch-title">
        <h2 id="rematch-title">Rematch on</h2>
        <p class="panel-text">
          {mine.from === props.me.player ? `You challenged ${name} after Week ${props.week - 1}.` : `${name} challenged you after Week ${props.week - 1}.`} {stakes}
        </p>
      </section>
    );
  }
  if (!offer || !lost || props.dayIndex > REMATCH_LAST_DAY) return null;
  const send = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.challenge(props.me, props.seasonId, { lost, period: props.period, date: props.date, to: offer.to }))
      .catch((failure: unknown) => setError(REMATCH_TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };
  return (
    <section class="match-rematch" aria-labelledby="rematch-title">
      <h2 id="rematch-title">Rematch?</h2>
      <p class="panel-text">
        {name} beat you {offer.against}–{offer.points} in Week {props.week - 1}. Challenge them to a side race this week, by Wednesday. {stakes}
      </p>
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" class="btn" disabled={busy} onClick={send}>
        {busy ? 'Challenging' : `Challenge ${name}`}
      </button>
    </section>
  );
}

const REMATCH_TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no: a rematch is for the week right after a loss, by its Wednesday.',
};


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

/** A group-play week with no single opponent: everyone's week, live, on the mode's board. */
function GroupMatch(props: { me: Me; now: number; match: ReturnType<typeof useMatchup> }) {
  const { match } = props;
  const board = useWeekBoard({
    seasonPath: match.seasonPath,
    leaguePath: `leagues/${props.me.league}`,
    week: match.weekDoc,
    days: match.days,
    par: match.season?.par ?? 3,
    now: props.now,
    timeZone: match.season?.timeZone ?? 'America/New_York',
    today: match.dates?.today,
  });
  if (!match.weekDoc) return null;
  if (board.loading) {
    return (
      <div class="waiting today-waiting" aria-busy="true">
        <div class="waiting-ring" />
        <p role="status">Getting everyone's week</p>
      </div>
    );
  }
  return (
    <div class="match">
      <GroupBoard me={props.me} week={match.weekDoc} ids={board.ids} weeks={board.weeks} totals={board.totals} players={board.players} status={statusOf(board.weeks[props.me.player], match.dates?.today)} />
    </div>
  );
}

/** "Thu · Live" while the week has days to go, else "Week over", for a board's corner. */
function statusOf(cells: { state: string }[] | undefined, today: string | undefined): string {
  const going = (cells ?? []).some((cell) => cell.state !== 'locked');
  if (!going || !today) return 'Week over';
  return `${new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })} \u00b7 Live`;
}

/** The group-play board, in a week with no single opponent: shown on Game Day in place of the scoreboard. */
export function GroupBoardFor(props: { me: Me }) {
  const now = useNow();
  const match = useMatchup(props.me, now);
  if (match.loading || !match.seasonId || !match.today || isPairedMode(match.mode)) return null;
  return <GroupMatch me={props.me} now={now} match={match} />;
}

/**
 * Your opponent's day (the commish's request, 2026-11-27): a tap on their car
 * on Game Day's scoreboard opens it over the page. Their goals, screen time,
 * beers and day total, live, and anything played on the day.
 */
export function OpponentDay(props: { me: Me; onClose: () => void }) {
  const now = useNow();
  const match = useMatchup(props.me, now);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const them = match.opponent;
  const theirToday = match.theirWeek?.cells.find((cell) => cell.today) ?? null;
  const score = theirToday?.score ?? null;
  const todayDate = match.dates?.today ?? '';
  const on = (item: string) => them?.kit.find((play) => play.item === item && play.date === todayDate);
  const log = them?.log;
  const name = them?.name ?? 'Your opponent';

  return createPortal(
    <div class="sheet-layer">
      <div class="sheet-backdrop" onClick={props.onClose} />
      <section class="sheet match-day" role="dialog" aria-modal="true" aria-labelledby="match-day-title">
        <div class="match-day-head">
          <h2 id="match-day-title" ref={title} tabIndex={-1}>
            {name}'s day
          </h2>
          <p class="match-day-total" data-sign={!score ? 'zero' : score.total > 0 ? 'up' : score.total < 0 ? 'down' : 'zero'}>
            {score ? formatPoints(score.total) : '0'}
            <span>{theirToday?.state === 'locked' ? 'final' : 'so far'}</span>
          </p>
        </div>
        {!them ? (
          <p class="sheet-lead">Getting their day.</p>
        ) : (
          <>
            <div class="match-notes">
              {theirToday?.rest && <span class="match-note match-note-rest">Rest day</span>}
              {match.mode === 'rumble' && match.rumbleItems[`${todayDate}_${them.id}`] && (
                <span class="match-note">
                  <ItemIcon item={match.rumbleItems[`${todayDate}_${them.id}`]!} />
                  Item: {RUMBLE_NAMES[match.rumbleItems[`${todayDate}_${them.id}`]!]}
                </span>
              )}
              {on('aerial') && (
                <span class="match-note">
                  <ItemIcon item="aerial" />
                  Aerial: counts double
                </span>
              )}
              {on('ruleOne') && (
                <span class="match-note">
                  <ItemIcon item="ruleOne" />
                  Rule One: scores 0
                </span>
              )}
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
                  <div class="square square-goal" data-lane={lane} data-state={state} aria-label={`${name}'s ${LANE_NAMES[lane]}: ${text || 'not set yet'}, ${state}`}>
                    <span class="square-goal-text">{text || 'Set at the draft'}</span>
                    <GoalMark state={state} />
                  </div>
                );
              })}
            </div>
            <p class="match-beers">
              Beers today: <strong>{log?.beers ?? 0}</strong>
            </p>
            {match.theirWeek && (
              <div class="match-their-week">
                <div class="match-letters" aria-hidden="true">
                  <span />
                  {match.theirWeek.cells.map((cell) => (
                    <span data-today={cell.today}>{LETTERS[cell.dayIndex]}</span>
                  ))}
                </div>
                <WeekRow who={name} team="orange" cells={match.theirWeek.cells} />
              </div>
            )}
          </>
        )}
        <button type="button" class="btn picks-done" onClick={props.onClose}>
          Close
        </button>
      </section>
    </div>,
    document.body,
  );
}

/**
 * The rest of Match, below Game Day's power-ups (the commish's request,
 * 2026-11-27): a slim poke, then asking your opponent for receipts, then a
 * rematch, Drop Shot's floors and your Demolition, when there are any.
 */
export function MatchExtras(props: { me: Me }) {
  const now = useNow();
  const match = useMatchup(props.me, now);
  if (match.loading || !match.seasonId || !match.season || !match.today || !match.dates) return null;
  const rematch = <Rematch me={props.me} seasonId={match.seasonId} week={match.today.week} period={match.today.period} dayIndex={match.today.dayIndex} date={match.dates.today} />;
  if (!isPairedMode(match.mode)) return null;
  const them = match.opponent;
  if (match.vsHouse || !them || !match.myWeek || !match.theirWeek) return rematch;
  const todayDate = match.dates.today;
  return (
    <div class="match-extras">
      <Poke me={props.me} seasonId={match.seasonId} date={todayDate} to={them.id} name={them.name} />
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
      {rematch}
      {match.myDemolition && (
        <p class="match-secret">
          Your Demolition: {dayName(match.myDemolition.date)}, their {LANE_NAMES[match.myDemolition.lane]} goal. Only you can see it until noon the next day.
        </p>
      )}
    </div>
  );
}
