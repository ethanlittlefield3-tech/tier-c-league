import { createPortal } from 'preact/compat';
import type { CarParts } from '../art/car/draw.ts';
import { useEffect, useRef, useState } from 'preact/hooks';
import { LANES, daysLeft, holidayOf, isPairedMode, nemesisOf, recordText, rumbleWeek, type Rival, type WeekInput, paceSoFar, receiptFixes, receiptStatus, recentDailyAverage, weekPeriod, winMeter, type BountyTarget, type Lane, type Square, type StoredReceipt, type WeekMode } from '@tcl/engine';
import { GoalExplosion } from '../art/car/GoalExplosion.tsx';
import { useAll, useDoc, useNow, usePeek, useWhere } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import {
  BEERS_MAX,
  breakdown,
  formatPoints,
  formatScreen,
  formatScreenShort,
  isRestDay,
  fastOf,
  seasonDates,
  liveDayScore,
  pointsChip,
  windowOf,
  type DayEntry,
} from '../today/model.ts';
import type { CalDay } from '../today/kit.ts';
import { playerWeek, type KitPlay } from '../today/week.ts';
import { PowerUps, type Play } from './PowerUps.tsx';
import { ReceiptsDue } from './ReceiptsDue.tsx';
import { GroupBoardFor, MatchExtras, OpponentDay } from './Match.tsx';
import { Scoreboard, type Boost } from './Scoreboard.tsx';
import { usePicksDue } from './usePicksDue.ts';
import './picks.css';
import type { Draw } from './Wheel.tsx';
import './wheel.css';
import { GoalMark } from './GoalMark.tsx';
import { ScreenSheet } from './ScreenSheet.tsx';
import { WeekStrip } from './WeekStrip.tsx';
import { EventBanner, ModeBanner, PlayoffBanner } from './ModeBanner.tsx';
import { Offseason } from './Offseason.tsx';
import { RumblePanel } from './RumblePanel.tsx';
import { rumbleDraws, useRumble } from './useRumble.ts';
import { lateSyncRisk, useOnline } from '../ui/online.ts';
import { timeLeft } from '../ui/when.ts';
import './draft.css';
import './today.css';

interface LeagueDoc {
  season?: string | null;
}

interface SeasonDoc {
  name?: string;
  status?: string;
  champion?: string | null;
  par: number;
  timeZone: string;
  kickoff: string;
  ruleOneIssue?: number[];
  fast?: { startsAt?: number; dayMinutes?: number } | null;
}

interface WeekDoc {
  week?: number;
  mode?: string;
  /** A playoff round's week: its phase, round and the Whiff Bowl's racers. */
  phase?: string;
  round?: string;
  racers?: string[];
  pairs?: { a: string; b: string }[];
  targets?: Record<string, string[]>;
  teams?: { blue: string[]; orange: string[] };
  duos?: { a: string[]; b: string[] }[];
  bounty?: BountyTarget | null;
  roster?: string[];
  /** Demolitions whose day has locked, revealed by the weekly job. */
  reveals?: { player: string; target: string; date: string; lane: Lane }[];
}

type CalendarDoc = CalDay;

interface RosterDoc {
  goals?: Partial<Record<Lane, { text?: string }>>;
}

const LANE_NAMES: Record<Lane, string> = { mind: 'Mind', body: 'Body', wildcard: 'Wildcard' };
const EMPTY: DayEntry = { goals: { mind: false, body: false, wildcard: false }, screenMinutes: null, beers: 0 };

/** A goal that counts: hit, or counted by a power-up. */
const GOAL_IN = new Set<string>(['hit', 'boosted', 'swappedIn']);

/** Today's dial on the scoreboard: the goals in, whether screen time is logged, and a rest day. */
function boostOf(cells: readonly { today: boolean; rest: boolean; score: { goals: Record<string, string>; screen: { state: string } } | null }[]): Boost {
  const today = cells.find((cell) => cell.today);
  if (!today) return { goals: 0, screen: false, rest: false };
  return {
    goals: today.rest ? 0 : Object.values(today.score?.goals ?? {}).filter((state) => GOAL_IN.has(state)).length,
    screen: today.score?.screen.state === 'logged',
    rest: today.rest,
  };
}

/** "Thu", for the scoreboard. */
const weekdayShort = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Your log is saved on this phone and goes through when the signal is back.',
  refused: 'The league did not accept that. This day may have locked.',
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Monday, January 4" from a date like 2027-01-04. */
function longDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  return `${DAY_NAMES[weekday]}, ${MONTHS[month - 1]} ${day}`;
}

/** "Nov 25" from a date like 2026-11-25. */
function shortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number) as [number, number, number];
  return `${(MONTHS[month - 1] ?? '').slice(0, 3)} ${day}`;
}

/** "Wed Nov 25" from a date like 2026-11-25. */
function sheetDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  return `${(DAY_NAMES[weekday] ?? '').slice(0, 3)} ${shortDate(date)}`;
}

/** A mug of beer, drawn for this app. */
function BeerMug() {
  return (
    <svg class="beer-mug" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M9 13h19v20a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3Z" fill="#ffb53a" stroke="#050914" stroke-width="2" />
      <path d="M28 17h3a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-3" fill="none" stroke="#050914" stroke-width="5" />
      <path d="M28 17h3a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-3" fill="none" stroke="#ffb53a" stroke-width="2.5" />
      <path d="M13 18v13M18.5 18v13M24 18v13" stroke="#ffd98a" stroke-width="2" stroke-linecap="round" />
      <path d="M8 13a4 4 0 0 1 4-5 5 5 0 0 1 8-2 4.5 4.5 0 0 1 7 3 3.5 3.5 0 0 1 1 4Z" fill="#ffffff" stroke="#050914" stroke-width="2" stroke-linejoin="round" />
    </svg>
  );
}

/** A card in place of the day, when there is no day to log. */
function Notice(props: { title: string; children: string }) {
  return (
    <section class="today-notice">
      <h2>{props.title}</h2>
      <p>{props.children}</p>
    </section>
  );
}

/**
 * Today (SCOPE.md, "Daily play and scoring"): the day's total, the four
 * squares and beers, and yesterday until it locks at noon. The scoreboard
 * against your opponent, the power-up tray, the rest-day picker and the week
 * bars come next.
 */
export function Today(props: { me: Me; onDraft?: () => void; onWheel?: () => void; onPicks?: () => void }) {
  const now = useNow();
  // This week's picks, while they are open on its Monday (ruling R25).
  const picksDue = usePicksDue(props.me, now);
  const [picked, setPicked] = useState<'today' | 'yesterday'>('today');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const screenCard = useRef<HTMLButtonElement>(null);
  const online = useOnline();
  // The last entry this phone saved, by day. Taps build on it rather than on
  // what the screen last showed, so a quick second tap never undoes the first.
  const lastSaved = useRef<{ date: string; entry: DayEntry } | null>(null);
  // A tap that gets all three goals in plays your goal explosion.
  const [burst, setBurst] = useState(0);
  // Your opponent's day, opened from their car on the scoreboard.
  const [theirDayOpen, setTheirDayOpen] = useState(false);

  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<LeagueDoc>(leaguePath);
  const seasonId = league.data?.season ?? null;
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const season = useDoc<SeasonDoc>(seasonPath);
  const dates = season.data ? seasonDates(now, season.data) : null;
  const fast = season.data ? fastOf(season.data) : null;

  const todayCal = useDoc<CalendarDoc>(seasonPath && dates ? `${seasonPath}/calendar/${dates.today}` : null);
  const yesterdayCal = useDoc<CalendarDoc>(seasonPath && dates ? `${seasonPath}/calendar/${dates.yesterday}` : null);
  // Receipts asked of you. They count like the commish's fixes once backed down from, or failed.
  const myReceipts = useWhere<StoredReceipt>(seasonPath ? `${seasonPath}/receipts` : null, 'target', props.me.player);
  // Ruling R6: while a receipt on a day's screen time is open, that number can still be fixed, even after the day locks.
  const screenFixOn = (day: string | null) =>
    day !== null && myReceipts.docs.some((found) => found.data.date === day && found.data.square === 'screen' && receiptStatus({ ...found.data, now }) === 'pending');
  const yesterdayOpen = windowOf(yesterdayCal.data, now) === 'open';
  const yesterdayShown = yesterdayOpen || (yesterdayCal.data !== null && screenFixOn(dates?.yesterday ?? null));
  const showing = picked === 'yesterday' && yesterdayShown ? 'yesterday' : 'today';
  const date = dates ? dates[showing] : null;
  const cal = showing === 'today' ? todayCal.data : yesterdayCal.data;

  const me = props.me.player;
  const dayToday = useDoc<DayEntry>(seasonPath && dates ? `${seasonPath}/days/${me}_${dates.today}` : null);
  const dayYesterday = useDoc<DayEntry>(seasonPath && dates ? `${seasonPath}/days/${me}_${dates.yesterday}` : null);
  const day = showing === 'today' ? dayToday : dayYesterday;
  const roster = useDoc<RosterDoc>(seasonPath ? `${seasonPath}/roster/${me}` : null);
  const rest = useDoc<{ date: string }>(seasonPath && cal ? `${seasonPath}/kit/${cal.period}_${me}_rest` : null);

  // This week is the week of today's calendar day. The tray plays into it.
  const period = todayCal.data?.period ?? null;
  const nextPeriod = todayCal.data ? weekPeriod(todayCal.data.week + 1) : null;
  const week = useWhere<CalendarDoc>(seasonPath ? `${seasonPath}/calendar` : null, 'period', period);
  const nextWeek = useWhere<CalendarDoc>(seasonPath ? `${seasonPath}/calendar` : null, 'period', nextPeriod);
  const aerial = useDoc<Play>(seasonPath && period ? `${seasonPath}/kit/${period}_${me}_aerial` : null);
  const fullBoost = useDoc<Play>(seasonPath && period ? `${seasonPath}/kit/${period}_${me}_fullBoost` : null);
  // On a Monday morning, yesterday is last Sunday: it belongs to last week, and
  // so do any power-ups played on it (DECISIONS.md, call 7).
  const yesterdayPeriod = yesterdayCal.data?.period ?? null;
  const lastPeriod = yesterdayPeriod && yesterdayPeriod !== period ? yesterdayPeriod : null;
  const lastAerial = useDoc<Play>(seasonPath && lastPeriod ? `${seasonPath}/kit/${lastPeriod}_${me}_aerial` : null);
  const lastBoost = useDoc<Play>(seasonPath && lastPeriod ? `${seasonPath}/kit/${lastPeriod}_${me}_fullBoost` : null);
  const lastRest = useDoc<{ date: string }>(seasonPath && lastPeriod ? `${seasonPath}/kit/${lastPeriod}_${me}_rest` : null);
  const weekRest = useDoc<{ date: string }>(seasonPath && period ? `${seasonPath}/kit/${period}_${me}_rest` : null);
  const nextRest = useDoc<{ date: string }>(seasonPath && nextPeriod ? `${seasonPath}/kit/${nextPeriod}_${me}_rest` : null);
  const ruleOne1 = useDoc<Play>(seasonPath ? `${seasonPath}/kit/ruleOne_${me}_1` : null);
  const ruleOne2 = useDoc<Play>(seasonPath ? `${seasonPath}/kit/ruleOne_${me}_2` : null);
  const ruleOne3 = useDoc<Play>(seasonPath ? `${seasonPath}/kit/ruleOne_${me}_3` : null);
  const sealed = useWhere<Play & { period: string; target: string; kind?: string }>(seasonPath ? `${seasonPath}/sealed` : null, 'player', me);
  const weekDoc = useDoc<WeekDoc>(seasonPath && period ? `${seasonPath}/weeks/${period}` : null);
  const mode = weekDoc.data?.mode ?? 'regular';
  const paired = isPairedMode(mode as WeekMode);
  const targets = weekDoc.data?.targets?.[me] ?? [];
  // Only a 1v1 week has one opponent; in Team Week and 2v2 you may demolish anyone on the other side.
  const opponentId = paired ? (targets.find((target) => target !== 'HOUSE') ?? null) : null;
  const sideTargets = paired ? [] : targets.filter((target) => target !== 'HOUSE');
  const everyone = useAll<{ displayName?: string }>(mode !== 'regular' ? `${leaguePath}/players` : null);
  const rosters = useAll<RosterDoc>(seasonPath && sideTargets.length > 0 ? `${seasonPath}/roster` : null);
  const weekKit = useWhere<KitPlay & { player: string }>(seasonPath && sideTargets.length > 0 ? `${seasonPath}/kit` : null, 'period', period);
  const opponentProfile = useDoc<{ displayName?: string; rankHistory?: { points: number }[]; car?: Partial<CarParts>; stickers?: Partial<Record<string, { until?: unknown }>> }>(
    opponentId ? `${leaguePath}/players/${opponentId}` : null,
  );
  // Your recent weeks, for the win meter; your car, for the scoreboard and a perfect day's goal explosion; your rivalries.
  const myProfile = useDoc<{ rankHistory?: { points: number }[]; car?: Partial<CarParts>; stickers?: Partial<Record<string, { until?: unknown }>>; rivals?: Record<string, Rival> }>(`${leaguePath}/players/${me}`);
  const opponentRoster = useDoc<RosterDoc>(seasonPath && opponentId ? `${seasonPath}/roster/${opponentId}` : null);
  const opponentRest = useDoc<{ date: string }>(seasonPath && period && opponentId ? `${seasonPath}/kit/${period}_${opponentId}_rest` : null);
  const draftState = useDoc<{ step: string; votesCloseAt?: number }>(seasonPath ? `${seasonPath}/draft/state` : null);
  // The Wheel of Shame: last week's lowest scorer spins once that week is final.
  const thisWeekNumber = (todayCal.data as { week?: number } | null)?.week ?? 0;
  const prevPeriod = thisWeekNumber > 1 ? weekPeriod(thisWeekNumber - 1) : null;
  const prevWeek = useDoc<{ wheel?: Record<string, Draw> }>(seasonPath && prevPeriod ? `${seasonPath}/weeks/${prevPeriod}` : null);
  const mySpins = useWhere<{ player: string }>(seasonPath ? `${seasonPath}/spins` : null, 'player', me);
  const myDraw = Object.values(prevWeek.data?.wheel ?? {}).find((draw) => draw.player === me && now < draw.dueAt && !mySpins.docs.some((spin) => spin.id === draw.id)) ?? null;

  // Both sides of this week, for the week strip and the scoreboard.
  type Change = { date: string; amount: number; void: Square | null; receipt?: boolean };
  const myDays = useWhere<DayEntry & { date: string }>(seasonPath ? `${seasonPath}/days` : null, 'player', me);
  const myKit = useWhere<KitPlay>(seasonPath ? `${seasonPath}/kit` : null, 'player', me);
  const myChanges = useWhere<Change>(seasonPath ? `${seasonPath}/adjustments` : null, 'player', me);
  const theirDays = useWhere<DayEntry & { date: string }>(seasonPath ? `${seasonPath}/days` : null, 'player', opponentId);
  const theirKit = useWhere<KitPlay>(seasonPath ? `${seasonPath}/kit` : null, 'player', opponentId);
  const theirChanges = useWhere<Change>(seasonPath ? `${seasonPath}/adjustments` : null, 'player', opponentId);
  const theirReceipts = useWhere<StoredReceipt>(seasonPath ? `${seasonPath}/receipts` : null, 'target', opponentId);
  const myFixes: Change[] = [...myChanges.docs.map((found) => found.data), ...receiptFixes(myReceipts.docs.map((found) => found.data), now).map((fix) => ({ ...fix, receipt: true }))];
  const theirFixes: Change[] = [...theirChanges.docs.map((found) => found.data), ...receiptFixes(theirReceipts.docs.map((found) => found.data), now)];
  // A Demolition aimed at you is sealed until its day locks at noon, so look once after each noon.
  const lockedSoFar = week.docs.filter((found) => now >= found.data.lock).length;
  const demolitionOnMe = usePeek<{ target: string; date: string; lane: Lane }>(
    seasonPath && period && opponentId ? `${seasonPath}/sealed/${period}_${opponentId}_demolition` : null,
    lockedSoFar,
  );

  // The playoffs: the bracket, and the #1 seed's second Full Boost in the semifinal.
  const playoffs = weekDoc.data?.phase === 'playoff';
  const bracket = useDoc<{ seeds: string[]; outside: string[]; semis: { a: string; b: string | null }[] }>(seasonPath && playoffs ? `${seasonPath}/playoffs/bracket` : null);
  const topSeed = playoffs && period === 'p01' && bracket.data?.seeds[0] === me;
  const secondBoost = useDoc<Play>(seasonPath && topSeed ? `${seasonPath}/kit/p01_${me}_fullBoost2` : null);

  // Rumble: today's items and the Boots revealed so far.
  const rumble = useRumble({ seasonPath, active: mode === 'rumble', days: week.docs.map((found) => found.data), me, opponent: opponentId, now });

  // Once the server has every save, the screen is the truth again.
  useEffect(() => {
    if (!day.pending) lastSaved.current = null;
  }, [day.pending, day.data]);

  if (league.loading || season.loading || (seasonPath && (todayCal.loading || yesterdayCal.loading))) {
    return (
      <div class="waiting today-waiting" aria-busy="true">
        <div class="waiting-ring" />
        <p role="status">Getting your day</p>
      </div>
    );
  }

  // The draft card stays up while the draft is live, and while its votes are open.
  const draftVotesOpen = now < (draftState.data?.votesCloseAt ?? 0);
  const draftOn = draftState.data !== null && (draftState.data.step !== 'done' || draftVotesOpen);
  const draftCard = draftOn && (
    <section class="draft-card" aria-labelledby="draft-card-title">
      <h2 id="draft-card-title">The draft is on</h2>
      <p>
        {draftState.data?.step === 'goals'
          ? "Set your three goals for the season, and vote on everyone else's."
          : draftState.data?.step === 'dares'
            ? "Add your dare for the Wheel, and vote on everyone else's."
            : draftVotesOpen
            ? `Goals and votes are open for ${timeLeft((draftState.data?.votesCloseAt ?? now) - now)} more.`
            : 'Follow the draft as it happens.'}
      </p>
      <button type="button" class="btn" onClick={props.onDraft}>
        Open the draft
      </button>
    </section>
  );

  if (!seasonId || !season.data || !dates) {
    return <Notice title="No season yet">Your commish sets up the season. Logging opens on kickoff day.</Notice>;
  }

  // The season is over: the offseason, with Stay or Leave.
  if (!todayCal.data && !yesterdayOpen && season.data.status === 'finished') {
    return (
      <div class="today">
        <Offseason me={props.me} seasonId={seasonId} season={season.data} />
      </div>
    );
  }

  if (!todayCal.data && !yesterdayOpen) {
    const kickoff = season.data.kickoff;
    if (kickoff && dates.today < kickoff) {
      return (
        <div class="today">
          {draftCard}
          <Notice title="Kickoff is coming">{`The season starts ${longDate(kickoff)}. Logging opens then.`}</Notice>
        </div>
      );
    }
    return (
      <div class="today">
        {draftCard}
        <Notice title="No logging today">There is nothing to log today. Check the League tab for what is next.</Notice>
      </div>
    );
  }

  const dayWindow = windowOf(cal, now);
  const editable = dayWindow === 'open';
  const screenFix = screenFixOn(date);
  const entry: DayEntry = day.data ? { goals: { ...EMPTY.goals, ...day.data.goals }, screenMinutes: day.data.screenMinutes ?? null, beers: day.data.beers ?? 0 } : EMPTY;
  const restDay = cal ? isRestDay({ date: cal.date, calendar: cal, restDate: rest.data?.date ?? null }) : false;
  const ruleOnes = [ruleOne1.data, ruleOne2.data, ruleOne3.data].filter((play): play is Play => play !== null);
  // The power-ups of the week the shown day belongs to.
  const shownLastWeek = cal !== null && lastPeriod !== null && cal.period === lastPeriod;
  const shownBoost = shownLastWeek ? lastBoost.data : fullBoost.data;
  const shownAerial = shownLastWeek ? lastAerial.data : aerial.data;
  const boostLane = shownBoost && shownBoost.date === date ? (shownBoost.lane ?? null) : null;
  // The #1 seed's second Full Boost, in the semifinal.
  const secondLane = cal?.period === 'p01' && secondBoost.data && secondBoost.data.date === date ? (secondBoost.data.lane ?? null) : null;
  const boostLanes = [boostLane, secondLane].flatMap((lane) => (lane ? [lane] : []));
  // The day's holiday event, if the commish scheduled one.
  const holiday = holidayOf(cal?.event);
  const aerialHere = shownAerial !== null && shownAerial.date === date;
  const ruleOneHere = ruleOnes.some((play) => play.date === date);
  // Commish docks, corrections and voids on this day.
  const fixes = myFixes.filter((change) => change.date === date);
  const par = season.data.par;
  const scoreOf = (logged: DayEntry) =>
    liveDayScore({
      par,
      entry: logged,
      restDay,
      locked: dayWindow === 'locked',
      aerial: aerialHere,
      fullBoost: boostLanes,
      event: holiday,
      ruleOne: ruleOneHere,
      voided: fixes.flatMap((change) => (change.void ? [change.void] : [])),
      adjustments: fixes.map((change) => change.amount).filter((amount) => amount !== 0),
    });
  const score = scoreOf(entry);
  /** All three goals are in, on a goal day. */
  const allIn = (logged: DayEntry) => !restDay && LANES.every((lane) => GOAL_IN.has(scoreOf(logged).goals[lane]));
  /** The dial is full: all three goals in and screen time logged. Filling it plays your goal explosion. */
  const dialFull = (logged: DayEntry) => allIn(logged) && logged.screenMinutes !== null;
  const celebrate = (from: DayEntry, next: DayEntry) => {
    if (editable && !dialFull(from) && dialFull(next)) setBurst((count) => count + 1);
  };

  /** What the next save starts from: this phone's last save for the day, if the screen hasn't caught up with it yet. */
  const base = (): DayEntry => (lastSaved.current && lastSaved.current.date === date ? lastSaved.current.entry : entry);

  const save = (next: DayEntry, screenOnly = false) => {
    if (!(editable || (screenOnly && screenFix)) || !date || !seasonId) return;
    // A day is new only if neither the server nor this phone has saved it yet.
    const isNew = !day.data && !(lastSaved.current && lastSaved.current.date === date);
    lastSaved.current = { date, entry: next };
    setError(null);
    void loadData()
      .then((api) => api.saveDay({ league: props.me.league, season: seasonId, player: props.me.player, date, entry: next, isNew }))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]));
  };

  const toggleGoal = (lane: Lane) => {
    const from = base();
    const next = { ...from, goals: { ...from.goals, [lane]: !from.goals[lane] } };
    celebrate(from, next);
    save(next);
  };
  const setBeers = (change: number) => {
    const from = base();
    save({ ...from, beers: Math.min(BEERS_MAX, Math.max(0, from.beers + change)) });
  };
  const closeSheet = () => {
    setSheetOpen(false);
    screenCard.current?.focus({ preventScroll: true });
  };

  const totalNote =
    dayWindow === 'locked' ? 'Final' : score.kind === 'open' ? 'Nothing logged yet' : restDay ? 'So far, on your rest day' : 'So far';
  const status = error ?? (day.pending ? (online ? 'Saving' : 'Saved on this phone. It goes through when you are back online.') : day.data ? 'Saved' : '');
  const lateRisk = lateSyncRisk({ online, pending: day.pending, lock: cal?.lock ?? null, now });
  const logsOf = (docs: { data: DayEntry & { date: string } }[]) => Object.fromEntries(docs.map((found) => [found.data.date, found.data]));
  const weekDays = week.docs.map((found) => found.data);
  const myDemolition = sealed.docs.map((found) => found.data).find((play) => play.kind !== 'boot' && play.period === period && play.target === opponentId) ?? null;
  const myInput: WeekInput = {
    par: season.data.par,
    days: weekDays,
    logs: logsOf(myDays.docs),
    kit: myKit.docs.map((found) => found.data),
    // A 1v1 opponent's Demolition shows from the noon it unseals; in group play, once the weekly job reveals it.
    demolitionsOn: paired
      ? demolitionOnMe && demolitionOnMe.target === me
        ? [{ date: demolitionOnMe.date, lane: demolitionOnMe.lane }]
        : []
      : (weekDoc.data?.reveals ?? []).filter((hit) => hit.target === me).map((hit) => ({ date: hit.date, lane: hit.lane })),
    adjustments: myFixes,
    now,
    timeZone: season.data.timeZone,
    today: dates?.today,
  };
  const theirInput: WeekInput | null = opponentId
    ? {
        par: season.data.par,
        days: weekDays,
        logs: logsOf(theirDays.docs),
        kit: theirKit.docs.map((found) => found.data),
        demolitionsOn: myDemolition && myDemolition.lane ? [{ date: myDemolition.date, lane: myDemolition.lane }] : [],
        adjustments: theirFixes,
        now,
        timeZone: season.data.timeZone,
        today: dates?.today,
      }
    : null;
  // In Rumble both weeks are scored together, with the items played.
  const myBoots = sealed.docs.map((found) => found.data).filter((play) => play.kind === 'boot' && play.lane).map((play) => ({ date: play.date, lane: play.lane! }));
  const rumbled = mode === 'rumble' && opponentId && theirInput ? rumbleWeek(myInput, theirInput, rumbleDraws(rumble, me, opponentId, myBoots, weekDays.map((each) => each.date))) : null;
  const myWeek = rumbled?.a ?? playerWeek(myInput);
  const theirWeek = rumbled?.b ?? (theirInput ? playerWeek(theirInput) : null);
  // The day on screen, with today's items played, once the server has it.
  const shown = (rumbled && myWeek.cells.find((cell) => cell.date === date)?.score) || score;
  const screenPointsShown = entry.screenMinutes === null ? null : score.screen.points;
  // The win meter: points so far, and each side's recent pace for the days left.
  const meter =
    theirWeek && daysLeft(myWeek.cells) > 0
      ? winMeter(
          { points: myWeek.totals.points, dailyAverage: recentDailyAverage(myProfile.data?.rankHistory) ?? paceSoFar(myWeek.cells) },
          { points: theirWeek.totals.points, dailyAverage: recentDailyAverage(opponentProfile.data?.rankHistory) ?? paceSoFar(theirWeek.cells) },
          daysLeft(myWeek.cells),
        )
      : null;

  return (
    <div class="today" data-window={dayWindow}>
      {fast && (
        <p class="today-fast">
          Fast test league: each day lasts {fast.dayMinutes} minutes, so noon and midnight come round on that clock.
        </p>
      )}
      {draftCard}
      {myDraw && (
        <section class="wheel-banner" aria-labelledby="wheel-card-title">
          <h2 id="wheel-card-title">You spin the Wheel of Shame</h2>
          <p>Lowest score last week. The league is waiting: spin it live.</p>
          <button type="button" class="btn" onClick={props.onWheel}>
            Open the Wheel
          </button>
        </section>
      )}
      <ReceiptsDue me={props.me} seasonId={seasonId} now={now} receipts={myReceipts.docs} />
      {paired && opponentId && theirWeek && weekDays.length > 0 && todayCal.data ? (
        <Scoreboard
          week={todayCal.data.week}
          status={daysLeft(myWeek.cells) > 0 ? `${weekdayShort(dates.today)} \u00b7 Live` : 'Week over'}
          me={{ name: 'You', car: myProfile.data?.car, stickers: myProfile.data?.stickers, points: myWeek.totals.points, beers: myWeek.totals.beers, boost: boostOf(myWeek.cells) }}
          them={{
            name: opponentProfile.data?.displayName ?? 'Your opponent',
            car: opponentProfile.data?.car,
            stickers: opponentProfile.data?.stickers,
            points: theirWeek.totals.points,
            beers: theirWeek.totals.beers,
            boost: boostOf(theirWeek.cells),
            nemesis: nemesisOf(myProfile.data?.rivals) === opponentId,
          }}
          meter={meter}
          record={`All-time against ${opponentProfile.data?.displayName ?? 'your opponent'}: ${recordText(myProfile.data?.rivals?.[opponentId])}`}
          cells={myWeek.cells}
          onOpponent={() => setTheirDayOpen(true)}
        />
      ) : !paired ? (
        <GroupBoardFor me={props.me} />
      ) : (
        weekDays.length > 0 &&
        todayCal.data && (
          <WeekStrip
            week={todayCal.data.week}
            cells={myWeek.cells}
            me={myWeek.totals}
            opponent={theirWeek ? { ...theirWeek.totals, name: opponentProfile.data?.displayName ?? 'Your opponent' } : null}
            vsHouse={targets.includes('HOUSE')}
            meter={meter}
          />
        )
      )}

      {holiday && <EventBanner event={holiday} today={showing === 'today'} />}

      {playoffs && weekDoc.data && (
        <PlayoffBanner
          me={me}
          week={weekDoc.data}
          bracket={bracket.data}
          name={(player) => (player === me ? 'You' : (everyone.docs.find((found) => found.id === player)?.data.displayName ?? opponentProfile.data?.displayName ?? 'your opponent'))}
        />
      )}

      {mode !== 'regular' && weekDoc.data && (
        <ModeBanner
          me={me}
          week={weekDoc.data}
          name={(player) => (player === me ? 'You' : player === 'HOUSE' ? 'The House' : (everyone.docs.find((found) => found.id === player)?.data.displayName ?? 'Player'))}
        />
      )}

      <section class="checklist" aria-label="Your day">
        <div class="checklist-head">
          <div class="today-days" role="group" aria-label="Which day">
            {/* With both days up, the pills drop their dates so the row stays on one line on a small phone. */}
            <button type="button" class="today-day" aria-pressed={showing === 'today'} aria-label={`Today \u00b7 ${shortDate(dates.today)}`} onClick={() => setPicked('today')}>
              {yesterdayShown ? 'Today' : `Today \u00b7 ${shortDate(dates.today)}`}
            </button>
            {yesterdayShown && (
              <button
                type="button"
                class="today-day"
                aria-pressed={showing === 'yesterday'}
                aria-label={yesterdayOpen ? `Yesterday \u00b7 ${shortDate(dates.yesterday)}, fix until 12:00 pm` : `Yesterday \u00b7 ${shortDate(dates.yesterday)}, screen time can still be fixed for receipts`}
                onClick={() => setPicked('yesterday')}
              >
                Yesterday
              </button>
            )}
          </div>
          <p class="today-total-line">
            <span class="today-points" data-sign={shown.total > 0 ? 'up' : shown.total < 0 ? 'down' : 'zero'}>
              <span class="sr-only">Day total: </span>
              {formatPoints(shown.total)}
            </span>
            <span class="today-when">{showing === 'today' ? 'today' : 'yesterday'}</span>
            <span class="today-note">{totalNote}</span>
          </p>
        </div>
        {restDay && <p class="today-rest">Rest day</p>}
        {dayWindow === 'locked' && <p class="today-locked">This day is locked. Its score is final once the week settles.</p>}
        {dayWindow === 'before' && <p class="today-locked">This day has not started yet.</p>}
        {showing === 'yesterday' && editable && <p class="today-locked">Yesterday can be fixed until 12:00 pm today.</p>}
        <div class="checklist-rows">
          {LANES.map((lane) => {
            const goal = roster.data?.goals?.[lane]?.text ?? '';
            const hit = entry.goals[lane];
            const state = score.goals[lane];
            const counts = state === 'hit' || state === 'boosted' || state === 'swappedIn';
            return (
              <button
                type="button"
                class="check-row check-goal"
                data-lane={lane}
                data-state={state}
                aria-pressed={restDay ? undefined : hit}
                aria-label={`${LANE_NAMES[lane]}: ${goal || 'goal not set yet'}${restDay ? ', rest day' : state === 'boosted' ? ', counted by Full Boost' : ''}`}
                disabled={!editable || restDay || !goal}
                onClick={() => toggleGoal(lane)}
              >
                <span class="check-mark">
                  <GoalMark state={state} />
                </span>
                <span class="check-text">
                  <small>{LANE_NAMES[lane]}</small>
                  <span class="check-goal-text">{goal || 'Set at the draft'}</span>
                </span>
                {counts && <span class="check-chip">+1</span>}
              </button>
            );
          })}
          <button
            ref={screenCard}
            type="button"
            class="check-row check-screen"
            data-logged={entry.screenMinutes !== null}
            aria-label={`Screen time: ${formatScreen(entry.screenMinutes)}${screenPointsShown === null ? '' : `, ${pointsChip(screenPointsShown)}`}. Open screen time`}
            onClick={() => setSheetOpen(true)}
          >
            <span class="check-mark check-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="13" r="7.5" fill="none" stroke="currentColor" stroke-width="2" />
                <path d="M12 9v4l2.5 2M10 3h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </span>
            <span class="check-text">
              <small>Screen time {'\u00b7'} everyone</small>
              <span class="square-value">{formatScreenShort(entry.screenMinutes)}</span>
            </span>
            <span class="square-chip" data-sign={screenPointsShown === null ? 'none' : screenPointsShown > 0 ? 'up' : screenPointsShown < 0 ? 'down' : 'zero'}>
              {screenPointsShown === null ? (editable ? 'Log it' : 'Not logged') : pointsChip(screenPointsShown)}
            </span>
          </button>
          <section class="check-row check-beers" aria-label="Beers">
            <span class="check-mark check-icon" aria-hidden="true">
              <BeerMug />
            </span>
            <div class="beer-words">
              <h3>Beers</h3>
              <p>
                {'\u2212'}1 each {'\u00b7'} {myWeek.totals.beers} this week
              </p>
            </div>
            <div class="beer-controls">
              <button type="button" class="step" aria-label="One beer less" disabled={!editable || entry.beers === 0} onClick={() => setBeers(-1)}>
                {'\u2212'}
              </button>
              <p class="beer-count" aria-live="polite">
                <span class="sr-only">Beers: </span>
                {entry.beers}
              </p>
              <button type="button" class="step" aria-label="One beer more" disabled={!editable || entry.beers >= BEERS_MAX} onClick={() => setBeers(1)}>
                +
              </button>
            </div>
          </section>
        </div>
        <div class="today-total">
          {breakdown(shown) && <p class="today-breakdown">{breakdown(shown)}</p>}
          {ruleOneHere ? <p class="today-kit">Rule One: this day scores 0</p> : aerialHere ? <p class="today-kit">Aerial: this day counts double</p> : null}
          {fixes.map((change) =>
            change.receipt ? (
              <p class="today-fix">
                {change.amount < 0 ? 'Receipts: no proof in time' : 'Receipts: backed down'}, {change.void === 'screen' ? 'screen time' : change.void} voided
                {change.amount < 0 ? `, \u2212${-change.amount}` : ''}
              </p>
            ) : (
              <p class="today-fix">
                Commish: {change.amount > 0 ? `+${change.amount}` : `\u2212${-change.amount}`}
                {change.void ? `, ${change.void === 'screen' ? 'screen time' : change.void} voided` : ''}
              </p>
            ),
          )}
        </div>
      </section>

      {lateRisk && (
        <p class="notice today-late" role="alert">
          <strong>This day locks at 12:00 pm.</strong>
          Get a signal before then, or what you logged on this phone won't count.
        </p>
      )}
      <p class={error ? 'today-status today-status-error' : 'today-status'} role="status">
        {status}
      </p>

      {mode === 'rumble' && todayCal.data && dates && (
        <RumblePanel
          where={{ league: props.me.league, season: seasonId, player: me }}
          now={now}
          today={todayCal.data as CalendarDoc & { noon?: number }}
          vsHouse={targets.includes('HOUSE')}
          mine={rumble.items[`${dates.today}_${me}`] ?? null}
          theirs={opponentId ? (rumble.items[`${dates.today}_${opponentId}`] ?? null) : null}
          opponent={
            opponentId
              ? {
                  id: opponentId,
                  name: opponentProfile.data?.displayName ?? 'Your opponent',
                  goals: Object.fromEntries(LANES.map((lane) => [lane, opponentRoster.data?.goals?.[lane]?.text ?? ''])) as Partial<Record<Lane, string>>,
                  resting: isRestDay({ date: dates.today, calendar: todayCal.data, restDate: opponentRest.data?.date ?? null }),
                }
              : null
          }
          myBoot={myBoots.find((boot) => boot.date === dates.today)?.lane ?? null}
        />
      )}

      {period && week.docs.length > 0 && (
        <PowerUps
          where={{ league: props.me.league, season: seasonId, player: me }}
          now={now}
          week={week.docs.map((found) => found.data)}
          nextWeek={nextWeek.docs.map((found) => found.data)}
          openDays={[yesterdayOpen ? yesterdayCal.data : null, todayCal.data].filter((found): found is CalendarDoc => found !== null && windowOf(found, now) === 'open')}
          aerial={aerial.data ? { ...aerial.data, id: 'aerial' } : null}
          fullBoost={fullBoost.data ? { ...fullBoost.data, id: 'fullBoost' } : null}
          boosts={{ ...(period ? { [period]: fullBoost.data } : {}), ...(lastPeriod ? { [lastPeriod]: lastBoost.data } : {}) }}
          restByPeriod={{ ...(period ? { [period]: weekRest.data?.date ?? null } : {}), ...(lastPeriod ? { [lastPeriod]: lastRest.data?.date ?? null } : {}) }}
          rest={weekRest.data?.date ?? null}
          nextRest={nextRest.data?.date ?? null}
          ruleOnes={ruleOnes}
          ruleOneIssue={season.data.ruleOneIssue ?? []}
          demolition={sealed.docs.map((found) => found.data).find((play) => play.kind !== 'boot' && play.period === period) ?? null}
          opponents={
            opponentId
              ? [
                  {
                    id: opponentId,
                    name: opponentProfile.data?.displayName ?? 'Your opponent',
                    goals: Object.fromEntries(LANES.map((lane) => [lane, opponentRoster.data?.goals?.[lane]?.text ?? ''])) as Partial<Record<Lane, string>>,
                    rest: opponentRest.data?.date ?? null,
                  },
                ]
              : sideTargets.map((id) => ({
                  id,
                  name: everyone.docs.find((found) => found.id === id)?.data.displayName ?? 'Player',
                  goals: Object.fromEntries(LANES.map((lane) => [lane, rosters.docs.find((found) => found.id === id)?.data.goals?.[lane]?.text ?? ''])) as Partial<Record<Lane, string>>,
                  rest: weekKit.docs.find((found) => found.data.player === id && found.data.item === 'rest')?.data.date ?? null,
                }))
          }
          vsHouse={targets.includes('HOUSE')}
          hitByDay={dates ? { [dates.today]: dayToday.data?.goals ?? {}, [dates.yesterday]: dayYesterday.data?.goals ?? {} } : {}}
          secondBoost={topSeed ? { play: secondBoost.data } : null}
        />
      )}

      {/* From Match: a slim poke, then receipts from your opponent, then the rest. */}
      <MatchExtras me={props.me} />

      {/* This week's picks, while open: at the bottom, out of the way. */}
      {picksDue && picksDue.picked < picksDue.pairs.length && props.onPicks && (
        <section class="picks-banner" aria-labelledby="picks-banner-title">
          <div>
            <h2 id="picks-banner-title">Week {picksDue.week} picks</h2>
            <p>
              {picksDue.picked} of {picksDue.pairs.length} picked · closes 11:59 pm
            </p>
          </div>
          <button type="button" onClick={props.onPicks}>
            Pick
          </button>
        </section>
      )}

      {sheetOpen && date && (
        <ScreenSheet
          dateLabel={sheetDate(date)}
          minutes={entry.screenMinutes}
          par={season.data.par}
          editable={editable || screenFix}
          onSave={(minutes) => {
            const from = base();
            const next = { ...from, screenMinutes: minutes };
            celebrate(from, next);
            save(next, true);
            closeSheet();
          }}
          onClose={closeSheet}
        />
      )}

      {/* All three goals in: your goal explosion, over the whole screen. */}
      {burst > 0 &&
        createPortal(
          <div key={burst} class="today-burst" aria-hidden="true">
            <GoalExplosion kind={myProfile.data?.car?.explosion ?? 'stock'} />
          </div>,
          document.body,
        )}

      {theirDayOpen && <OpponentDay me={props.me} onClose={() => setTheirDayOpen(false)} />}
    </div>
  );
}
