import { useState } from 'preact/hooks';
import { LANES, weekPeriod, type Lane } from '@tcl/engine';
import { useDoc, useNow, useWhere } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import {
  BEERS_MAX,
  SCREEN_STEP,
  formatPoints,
  formatScreen,
  isRestDay,
  leagueDates,
  liveDayScore,
  stepScreen,
  windowOf,
  type DayEntry,
} from '../today/model.ts';
import type { CalDay } from '../today/kit.ts';
import { PowerUps, type Play } from './PowerUps.tsx';
import './today.css';

interface LeagueDoc {
  season?: string | null;
}

interface SeasonDoc {
  name?: string;
  par: number;
  timeZone: string;
  kickoff: string;
  ruleOneIssue?: number[];
}

interface WeekDoc {
  targets?: Record<string, string[]>;
}

type CalendarDoc = CalDay;

interface RosterDoc {
  goals?: Partial<Record<Lane, { text?: string }>>;
}

const LANE_NAMES: Record<Lane, string> = { mind: 'Mind', body: 'Body', wildcard: 'Wildcard' };
const EMPTY: DayEntry = { goals: { mind: false, body: false, wildcard: false }, screenMinutes: null, beers: 0 };
/** The slider covers the first 8 hours, where nearly every day falls. The + button goes on to 24. */
const SLIDER_MAX = 480;

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
export function Today(props: { me: Me }) {
  const now = useNow();
  const [picked, setPicked] = useState<'today' | 'yesterday'>('today');
  const [draftMinutes, setDraftMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<LeagueDoc>(leaguePath);
  const seasonId = league.data?.season ?? null;
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const season = useDoc<SeasonDoc>(seasonPath);
  const dates = season.data ? leagueDates(now, season.data.timeZone) : null;

  const todayCal = useDoc<CalendarDoc>(seasonPath && dates ? `${seasonPath}/calendar/${dates.today}` : null);
  const yesterdayCal = useDoc<CalendarDoc>(seasonPath && dates ? `${seasonPath}/calendar/${dates.yesterday}` : null);
  const yesterdayOpen = windowOf(yesterdayCal.data, now) === 'open';
  const showing = picked === 'yesterday' && yesterdayOpen ? 'yesterday' : 'today';
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
  const sealed = useWhere<Play & { period: string; target: string }>(seasonPath ? `${seasonPath}/sealed` : null, 'player', me);
  const weekDoc = useDoc<WeekDoc>(seasonPath && period ? `${seasonPath}/weeks/${period}` : null);
  const targets = weekDoc.data?.targets?.[me] ?? [];
  const opponentId = targets.find((target) => target !== 'HOUSE') ?? null;
  const opponentProfile = useDoc<{ displayName?: string }>(opponentId ? `${leaguePath}/players/${opponentId}` : null);
  const opponentRoster = useDoc<RosterDoc>(seasonPath && opponentId ? `${seasonPath}/roster/${opponentId}` : null);
  const opponentRest = useDoc<{ date: string }>(seasonPath && period && opponentId ? `${seasonPath}/kit/${period}_${opponentId}_rest` : null);

  if (league.loading || season.loading || (seasonPath && (todayCal.loading || yesterdayCal.loading))) {
    return (
      <div class="waiting today-waiting" aria-busy="true">
        <div class="waiting-ring" />
        <p role="status">Getting your day</p>
      </div>
    );
  }

  if (!seasonId || !season.data || !dates) {
    return <Notice title="No season yet">Your commish sets up the season. Logging opens on kickoff day.</Notice>;
  }

  if (!todayCal.data && !yesterdayOpen) {
    const kickoff = season.data.kickoff;
    if (kickoff && dates.today < kickoff) {
      return <Notice title="Kickoff is coming">{`The season starts ${longDate(kickoff)}. Logging opens then.`}</Notice>;
    }
    return <Notice title="No logging today">There is nothing to log today. Check the League tab for what is next.</Notice>;
  }

  const dayWindow = windowOf(cal, now);
  const editable = dayWindow === 'open';
  const entry: DayEntry = day.data ? { goals: { ...EMPTY.goals, ...day.data.goals }, screenMinutes: day.data.screenMinutes ?? null, beers: day.data.beers ?? 0 } : EMPTY;
  const restDay = cal ? isRestDay({ date: cal.date, calendar: cal, restDate: rest.data?.date ?? null }) : false;
  const ruleOnes = [ruleOne1.data, ruleOne2.data, ruleOne3.data].filter((play): play is Play => play !== null);
  // The power-ups of the week the shown day belongs to.
  const shownLastWeek = cal !== null && lastPeriod !== null && cal.period === lastPeriod;
  const shownBoost = shownLastWeek ? lastBoost.data : fullBoost.data;
  const shownAerial = shownLastWeek ? lastAerial.data : aerial.data;
  const boostLane = shownBoost && shownBoost.date === date ? (shownBoost.lane ?? null) : null;
  const aerialHere = shownAerial !== null && shownAerial.date === date;
  const ruleOneHere = ruleOnes.some((play) => play.date === date);
  const score = liveDayScore({ par: season.data.par, entry, restDay, locked: dayWindow === 'locked', aerial: aerialHere, fullBoost: boostLane, ruleOne: ruleOneHere });
  const shownMinutes = draftMinutes ?? entry.screenMinutes;

  const save = (next: DayEntry) => {
    if (!editable || !date || !seasonId) return;
    setError(null);
    void loadData()
      .then((api) => api.saveDay({ league: props.me.league, season: seasonId, player: props.me.player, date, entry: next, isNew: !day.data }))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]));
  };

  const toggleGoal = (lane: Lane) => save({ ...entry, goals: { ...entry.goals, [lane]: !entry.goals[lane] } });
  const setScreen = (minutes: number | null) => {
    setDraftMinutes(null);
    save({ ...entry, screenMinutes: minutes });
  };
  const setBeers = (beers: number) => save({ ...entry, beers: Math.min(BEERS_MAX, Math.max(0, beers)) });

  const totalNote =
    dayWindow === 'locked' ? 'Final' : score.kind === 'open' ? 'Nothing logged yet' : restDay ? 'So far, on your rest day' : 'So far';
  const status = error ?? (day.pending ? 'Saving' : day.data ? 'Saved' : '');

  return (
    <div class="today" data-window={dayWindow}>
      {yesterdayOpen && (
        <div class="today-days" role="group" aria-label="Which day">
          <button type="button" class="today-day" aria-pressed={showing === 'today'} onClick={() => setPicked('today')}>
            Today
          </button>
          <button type="button" class="today-day" aria-pressed={showing === 'yesterday'} onClick={() => setPicked('yesterday')}>
            Yesterday
            <span>Fix until 12:00 pm</span>
          </button>
        </div>
      )}

      <section class="today-total" aria-label="Day total">
        <p class="today-date">
          {cal ? longDate(cal.date) : ''}
          {cal ? ` · Week ${cal.week}` : ''}
          {restDay && <span class="today-rest">Rest day</span>}
        </p>
        <p class="today-points" data-sign={score.total > 0 ? 'up' : score.total < 0 ? 'down' : 'zero'}>
          <span class="sr-only">Day total: </span>
          {formatPoints(score.total)}
        </p>
        <p class="today-note">{totalNote}</p>
        {ruleOneHere ? (
          <p class="today-kit">Rule One: this day scores 0</p>
        ) : aerialHere ? (
          <p class="today-kit">Aerial: this day counts double</p>
        ) : null}
      </section>

      {dayWindow === 'locked' && <p class="today-locked">This day is locked. Its score is final once the week settles.</p>}
      {dayWindow === 'before' && <p class="today-locked">This day has not started yet.</p>}

      <section class="squares" aria-label="Your squares">
        <div class="square square-screen" data-logged={shownMinutes !== null}>
          <div class="square-head">
            <h3>Screen time</h3>
            <span class="square-points">{entry.screenMinutes === null ? '—' : formatPoints(score.screen.points)}</span>
          </div>
          <p class="square-value" aria-live="polite">
            {formatScreen(shownMinutes)}
          </p>
          <div class="screen-controls">
            <button type="button" class="step" aria-label="15 minutes less" disabled={!editable || (shownMinutes ?? 0) === 0} onClick={() => setScreen(stepScreen(entry.screenMinutes, -SCREEN_STEP))}>
              {'−'}
            </button>
            <input
              type="range"
              min={0}
              max={SLIDER_MAX}
              step={SCREEN_STEP}
              value={Math.min(SLIDER_MAX, shownMinutes ?? 0)}
              aria-label="Screen time"
              aria-valuetext={formatScreen(shownMinutes)}
              disabled={!editable}
              onInput={(event) => setDraftMinutes(Number(event.currentTarget.value))}
              onChange={(event) => setScreen(Number(event.currentTarget.value))}
            />
            <button type="button" class="step" aria-label="15 minutes more" disabled={!editable} onClick={() => setScreen(stepScreen(entry.screenMinutes, SCREEN_STEP))}>
              +
            </button>
          </div>
          <p class="square-help">
            Social, entertainment and games, from your phone's Screen Time. Par is {season.data.par} hours.
            {entry.screenMinutes !== null && editable && (
              <button type="button" class="square-clear" onClick={() => setScreen(null)}>
                Clear
              </button>
            )}
          </p>
        </div>

        {LANES.map((lane) => {
          const goal = roster.data?.goals?.[lane]?.text ?? '';
          const hit = entry.goals[lane];
          const state = score.goals[lane];
          return (
            <button
              type="button"
              class="square square-goal"
              data-lane={lane}
              data-state={state}
              aria-pressed={restDay ? undefined : hit}
              aria-label={`${LANE_NAMES[lane]}: ${goal || 'goal not set yet'}${restDay ? ', rest day' : state === 'boosted' ? ', counted by Full Boost' : ''}`}
              disabled={!editable || restDay || !goal}
              onClick={() => toggleGoal(lane)}
            >
              <span class="square-lane">{LANE_NAMES[lane]}</span>
              <span class="square-goal-text">{goal || 'Set at the draft'}</span>
              <span class="square-check" aria-hidden="true">
                {restDay ? 'Rest' : state === 'boosted' ? 'Boost' : hit ? '✓' : ''}
              </span>
              <span class="square-points">{state === 'hit' || state === 'boosted' ? '+1' : '0'}</span>
            </button>
          );
        })}

        <div class="square square-beers">
          <div class="square-head">
            <h3>Beers</h3>
            <span class="square-points">{formatPoints(score.beerPoints)}</span>
          </div>
          <div class="beer-controls">
            <button type="button" class="step" aria-label="One beer less" disabled={!editable || entry.beers === 0} onClick={() => setBeers(entry.beers - 1)}>
              {'−'}
            </button>
            <p class="beer-count" aria-live="polite">
              <span class="sr-only">Beers: </span>
              {entry.beers}
            </p>
            <button type="button" class="step" aria-label="One beer more" disabled={!editable || entry.beers >= BEERS_MAX} onClick={() => setBeers(entry.beers + 1)}>
              +
            </button>
          </div>
          <p class="square-help">Any alcoholic drink. Each one is {'−'}1.</p>
        </div>
      </section>

      <p class={error ? 'today-status today-status-error' : 'today-status'} role="status">
        {status}
      </p>

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
          demolition={sealed.docs.map((found) => found.data).find((play) => play.period === period) ?? null}
          opponent={
            opponentId
              ? {
                  id: opponentId,
                  name: opponentProfile.data?.displayName ?? 'Your opponent',
                  goals: Object.fromEntries(LANES.map((lane) => [lane, opponentRoster.data?.goals?.[lane]?.text ?? ''])) as Partial<Record<Lane, string>>,
                  rest: opponentRest.data?.date ?? null,
                }
              : null
          }
          vsHouse={targets.includes('HOUSE')}
          hitByDay={dates ? { [dates.today]: dayToday.data?.goals ?? {}, [dates.yesterday]: dayYesterday.data?.goals ?? {} } : {}}
        />
      )}
    </div>
  );
}
