import { useState } from 'preact/hooks';
import { HOLIDAY_EVENTS, holidayOf, type HolidayEvent } from '@tcl/engine';
import { useAll, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';

const NAMES: Record<HolidayEvent, string> = { double: 'Double Points Day', dry: 'Dry Day', pass: 'Holiday Pass' };

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no: an event can only change before its day starts.',
};

/** "Friday, Jan 15". */
const dayWords = (date: string) => {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

interface Day {
  date: string;
  phase: string;
  kind?: string;
  start: number;
  event?: string | null;
}

/**
 * Commish tools, holiday events (SCOPE.md, "Holiday events"): the commish
 * puts a special on a regular-season day before it starts, or takes it off.
 * Each change goes in the audit log.
 */
export function CommishHolidays(props: { me: Me; seasonId: string }) {
  const calendar = useAll<Day>(`leagues/${props.me.league}/seasons/${props.seasonId}/calendar`);
  const now = useNow();
  const [date, setDate] = useState<string | null>(null);
  const [pick, setPick] = useState<HolidayEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  if (calendar.loading) return null;
  const days = calendar.docs.map((found) => found.data).sort((a, b) => (a.date < b.date ? -1 : 1));
  const upcoming = days.filter((day) => day.phase === 'regular' && (day.kind ?? 'play') === 'play' && now < day.start);
  if (upcoming.length === 0 && !days.some((day) => holidayOf(day.event))) return null;
  const scheduled = days.filter((day) => holidayOf(day.event) !== null);
  const chosen = date && upcoming.some((day) => day.date === date) ? date : (upcoming[0]?.date ?? null);
  const save = (on: string, event: HolidayEvent | null) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    const words = event ? `${NAMES[event]} on ${dayWords(on)}` : `No holiday event on ${dayWords(on)}`;
    void loadData()
      .then((api) => api.setHolidayEvent(props.me, props.seasonId, on, event, words))
      .then(() => {
        setDone(event ? `${NAMES[event]} is on for ${dayWords(on)}.` : `${dayWords(on)} is a normal day again.`);
        setPick(null);
      })
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };
  return (
    <section class="panel" aria-labelledby="holiday-title">
      <h2 id="holiday-title">Holiday events</h2>
      <p class="panel-text">Put a special on a day before it starts: Double Points Day, Dry Day (+2 for 0 beers) or Holiday Pass (a no-show scores 0, not −5).</p>
      {scheduled.length > 0 && (
        <ul class="holiday-list" aria-label="Scheduled">
          {scheduled.map((day) => (
            <li>
              <span>
                {dayWords(day.date)}: <strong>{NAMES[holidayOf(day.event)!]}</strong>
              </span>
              {now < day.start && (
                <button type="button" class="btn-quiet" disabled={busy} onClick={() => save(day.date, null)} aria-label={`Take ${NAMES[holidayOf(day.event)!]} off ${dayWords(day.date)}`}>
                  Take it off
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {chosen && (
        <>
          <p class="setup-label">
            <label for="holiday-day">Day</label>
          </p>
          <select id="holiday-day" class="setup-select" value={chosen} disabled={busy} onChange={(event) => setDate(event.currentTarget.value)}>
            {upcoming.map((day) => (
              <option value={day.date}>{dayWords(day.date)}</option>
            ))}
          </select>
          <div class="choice choice-wrap" role="group" aria-label="The event">
            {HOLIDAY_EVENTS.map((event) => (
              <button type="button" class="choice-option" aria-pressed={pick === event} disabled={busy} onClick={() => setPick(event)}>
                {NAMES[event]}
              </button>
            ))}
          </div>
          <button type="button" class="btn" disabled={busy || !pick} onClick={() => pick && save(chosen, pick)}>
            Schedule it
          </button>
        </>
      )}
      {done && (
        <p class="fine-print" role="status">
          {done}
        </p>
      )}
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
