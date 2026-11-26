import { useEffect, useState } from 'preact/hooks';
import { formatLeagueCode, localDate, toLocal, wallTimeToInstant } from '@tcl/engine';
import { defaultDraftAt, defaultSettings, settingsProblems, timeZoneChoices, type SeasonSettings } from '../commish/season.ts';
import { useDoc } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { Back, Field, Heading } from '../ui/parts.tsx';
import { CommishGroupPlay } from './CommishGroupPlay.tsx';
import { CommishHolidays } from './CommishHolidays.tsx';
import { CommishOffseason } from './CommishOffseason.tsx';
import { useOffseason } from './useOffseason.ts';
import { CommishSeasonDare } from './CommishSeasonDare.tsx';
import { CommishPlayers } from './CommishPlayers.tsx';
import { CommishModeration } from './CommishModeration.tsx';
import { CommishScores } from './CommishScores.tsx';
import { DraftControls } from './DraftControls.tsx';
import './commish.css';

interface LeagueDoc {
  name?: string;
  code?: string;
  season?: string | null;
  commish?: string;
  coCommish?: string | null;
  members?: Record<string, boolean>;
  former?: Record<string, string>;
  joining?: string;
}

interface SeasonDoc extends Omit<SeasonSettings, 'draftAt'> {
  status: string;
  draftAt: number | null;
}

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league did not accept that. Only the commish can change settings, and only before the draft.',
};

const PLAYOFFS: { id: SeasonSettings['playoffs']; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'oneWeek', name: '1 week' },
  { id: 'twoWeeks', name: '2 weeks' },
];

/** A number with − and + buttons. */
function Stepper(props: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  return (
    <div class="stepper" role="group" aria-label={props.label}>
      <button type="button" class="step" aria-label={`${props.label}: less`} disabled={props.value <= props.min} onClick={() => props.onChange(props.value - 1)}>
        {'−'}
      </button>
      <p class="stepper-value" aria-live="polite">
        {props.value} <span>{props.unit}</span>
      </p>
      <button type="button" class="step" aria-label={`${props.label}: more`} disabled={props.value >= props.max} onClick={() => props.onChange(props.value + 1)}>
        +
      </button>
    </div>
  );
}

/** A row of buttons where one is chosen. */
function Choice<T extends string | number | boolean>(props: { label: string; value: T; options: { id: T; name: string }[]; onChange: (value: T) => void }) {
  return (
    <div class="choice" role="group" aria-label={props.label}>
      {props.options.map((option) => (
        <button type="button" class="choice-option" aria-pressed={props.value === option.id} onClick={() => props.onChange(option.id)}>
          {option.name}
        </button>
      ))}
    </div>
  );
}

/** "2027-01-17T19:00" for a date-and-time field, in the league's time zone. */
function toFieldTime(instant: number | null, timeZone: string): string {
  if (instant === null) return '';
  const local = toLocal(instant, timeZone);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${local.date}T${pad(local.hour)}:${pad(local.minute)}`;
}

function fromFieldTime(value: string, timeZone: string): number | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return wallTimeToInstant(match[1]!, Number(match[2]), Number(match[3]), timeZone);
}

/** Season setup: the shape of the season, before the draft. */
function SeasonSetup(props: { me: Me; seasonId: string | null; season: SeasonDoc | null; seasons: number; onNote: (note: { error: boolean; text: string } | null) => void }) {
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = localDate(Date.now(), deviceZone);
  const editable = props.season === null || props.season.status === 'setup';
  const [settings, setSettings] = useState<SeasonSettings>(() =>
    props.season
      ? {
          name: props.season.name,
          regularWeeks: props.season.regularWeeks,
          playoffs: props.season.playoffs,
          playoffSize: props.season.playoffSize,
          par: props.season.par,
          groupWeeks: props.season.groupWeeks ?? [],
          timeZone: props.season.timeZone,
          kickoff: props.season.kickoff,
          draftAt: props.season.draftAt ?? null,
          joinMidSeason: props.season.joinMidSeason,
          holidayEvents: props.season.holidayEvents,
        }
      : defaultSettings({ today, seasons: props.seasons }),
  );
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const setNote = props.onNote;

  const change = (changes: Partial<SeasonSettings>) => {
    setNote(null);
    setProblems([]);
    setSettings((before) => {
      const next = { ...before, ...changes };
      // A new kickoff or time zone moves the draft along with it, if it was on its default.
      const draftWasDefault = before.draftAt === defaultDraftAt(before.kickoff, before.timeZone);
      if (draftWasDefault && (changes.kickoff !== undefined || changes.timeZone !== undefined)) {
        try {
          next.draftAt = defaultDraftAt(next.kickoff, next.timeZone);
        } catch {
          // A half-typed kickoff: leave the draft where it was.
        }
      }
      // Group-play weeks past the end of a shorter season drop off.
      next.groupWeeks = next.groupWeeks.filter((week) => week <= next.regularWeeks);
      return next;
    });
  };

  const save = async (event: Event) => {
    event.preventDefault();
    if (saving) return;
    const found = settingsProblems(settings, today);
    setProblems(found);
    if (found.length > 0) return;
    setSaving(true);
    setNote(null);
    try {
      const data = await loadData();
      await data.saveSeason(props.me, { seasonId: props.seasonId, settings });
      setNote({ error: false, text: props.seasonId ? 'Saved.' : `${settings.name.trim()} is set up. Everyone sees the kickoff date now.` });
    } catch (failure) {
      setNote({ error: true, text: TROUBLE[whyOf(failure)] });
    } finally {
      setSaving(false);
    }
  };

  if (!editable) {
    return (
      <section class="panel" aria-labelledby="setup-title">
        <h2 id="setup-title">{props.season?.name}</h2>
        <p class="panel-text">The draft has started, so this season's settings are fixed: {props.season?.regularWeeks} weeks at par {props.season?.par}, kickoff {props.season?.kickoff}.</p>
      </section>
    );
  }

  const zones = timeZoneChoices(deviceZone);
  const weeks = Array.from({ length: settings.regularWeeks - 1 }, (_, index) => index + 2);

  return (
    <form class="setup" onSubmit={save} noValidate>
      <section class="panel">
        <h2>{props.seasonId ? 'Season setup' : 'Start a season'}</h2>
        <p class="panel-text">The shape of the season. It can change until the draft starts.</p>
        <Field id="setup-name" label="Name" value={settings.name} onInput={(name) => change({ name })} maxLength={40} />

        <p class="setup-label">Regular season</p>
        <Stepper label="Regular season" value={settings.regularWeeks} min={3} max={12} unit={settings.regularWeeks === 1 ? 'week' : 'weeks'} onChange={(regularWeeks) => change({ regularWeeks })} />

        <p class="setup-label">Playoffs</p>
        <Choice label="Playoffs" value={settings.playoffs} options={PLAYOFFS} onChange={(playoffs) => change({ playoffs })} />
        {settings.playoffs !== 'none' && (
          <Choice
            label="Playoff size"
            value={settings.playoffSize}
            options={[
              { id: 2 as const, name: 'Top 2' },
              { id: 4 as const, name: 'Top 4' },
            ]}
            onChange={(playoffSize) => change({ playoffSize })}
          />
        )}

        <p class="setup-label">Screen time par</p>
        <Stepper label="Screen time par" value={settings.par} min={1} max={6} unit={settings.par === 1 ? 'hour' : 'hours'} onChange={(par) => change({ par })} />

        <p class="setup-label">Group-play weeks</p>
        <div class="choice choice-wrap" role="group" aria-label="Group-play weeks">
          {weeks.map((week) => (
            <button
              type="button"
              class="choice-option"
              aria-pressed={settings.groupWeeks.includes(week)}
              aria-label={`Week ${week}`}
              onClick={() => change({ groupWeeks: settings.groupWeeks.includes(week) ? settings.groupWeeks.filter((other) => other !== week) : [...settings.groupWeeks, week] })}
            >
              {week}
            </button>
          ))}
        </div>
        <p class="panel-text">On draft day, the league's vote gives each of these weeks a mode.</p>
      </section>

      <section class="panel">
        <h2>Dates</h2>
        <p class="setup-label">
          <label for="setup-zone">League time zone</label>
        </p>
        <select id="setup-zone" class="setup-select" value={settings.timeZone} onChange={(event) => change({ timeZone: event.currentTarget.value })}>
          {zones.map((zone) => (
            <option value={zone.id}>{zone.name}</option>
          ))}
        </select>

        <p class="setup-label">
          <label for="setup-kickoff">Kickoff (a Monday)</label>
        </p>
        <input id="setup-kickoff" class="setup-input" type="date" value={settings.kickoff} onInput={(event) => change({ kickoff: event.currentTarget.value })} />

        <p class="setup-label">
          <label for="setup-draft">Draft day</label>
        </p>
        <input
          id="setup-draft"
          class="setup-input"
          type="datetime-local"
          value={toFieldTime(settings.draftAt, settings.timeZone)}
          onInput={(event) => change({ draftAt: fromFieldTime(event.currentTarget.value, settings.timeZone) })}
        />
        <p class="panel-text">In league time. The default is 7 pm the Sunday before kickoff.</p>
      </section>

      <section class="panel">
        <h2>League rules</h2>
        <p class="setup-label">Joining mid-season</p>
        <Choice
          label="Joining mid-season"
          value={settings.joinMidSeason}
          options={[
            { id: false, name: 'Off' },
            { id: true, name: 'With my approval' },
          ]}
          onChange={(joinMidSeason) => change({ joinMidSeason })}
        />
        <p class="setup-label">Holiday events</p>
        <Choice
          label="Holiday events"
          value={settings.holidayEvents}
          options={[
            { id: true, name: 'On' },
            { id: false, name: 'Off' },
          ]}
          onChange={(holidayEvents) => change({ holidayEvents })}
        />
      </section>

      {problems.length > 0 && (
        <div class="notice setup-problems" role="alert">
          <strong>Fix these first:</strong>
          <ul>
            {problems.map((problem) => (
              <li>{problem}</li>
            ))}
          </ul>
        </div>
      )}
      <button class="btn setup-save" type="submit" disabled={saving}>
        {saving ? 'Saving' : props.seasonId ? 'Save settings' : 'Start the season'}
      </button>
      <p class="panel-text setup-fine">Every change goes in the league's audit log, which everyone can see.</p>
    </form>
  );
}

/**
 * Commish tools (SCOPE.md, "Commish tools"), for the commish only. For now:
 * the league code to share, and season setup. The audit log, keys and player
 * tools come next.
 */
export function Commish(props: { me: Me; onBack: () => void }) {
  const league = useDoc<LeagueDoc>(`leagues/${props.me.league}`);
  const seasonId = league.data?.season ?? null;
  const season = useDoc<SeasonDoc>(seasonId ? `leagues/${props.me.league}/seasons/${seasonId}` : null);
  const [version, setVersion] = useState(0);
  // Kept here, so it survives the form starting again from a new season.
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);

  // When the league moves to a new season, start the form again from it.
  useEffect(() => setVersion((value) => value + 1), [seasonId]);

  // Once the season is over, the offseason runs, and the next season can be
  // set up when it is done. Until then the season's settings are only shown.
  const finished = season.data?.status === 'finished';
  const off = useOffseason(`leagues/${props.me.league}`, seasonId ? `leagues/${props.me.league}/seasons/${seasonId}` : null, finished);
  const loading = league.loading || season.loading || (finished && off.loading);

  return (
    <main class="screen commish">
      <div class="screen-body">
        <Back onBack={props.onBack} />
        <Heading>Commish tools</Heading>
        <p class="lead">For the commish only.</p>

        {league.data?.code && (
          <section class="panel">
            <h2>League code</h2>
            <p class="panel-text">New players join with this. Share it only with people you want in.</p>
            <p class="commish-code">{formatLeagueCode(league.data.code)}</p>
          </section>
        )}

        {loading ? (
          <div class="waiting commish-waiting" aria-busy="true">
            <div class="waiting-ring" />
          </div>
        ) : (
          (!finished || off.ready) && <SeasonSetup
            key={`${seasonId ?? 'new'}-${finished ? 'next' : 'this'}-${version}`}
            me={props.me}
            seasonId={finished ? null : seasonId}
            season={finished ? null : season.data}
            seasons={seasonId ? Number(seasonId.replace(/^s/, '')) || 1 : 0}
            onNote={setNote}
          />
        )}
        {note && (
          <p class={note.error ? 'field-error setup-note' : 'panel-ok setup-note'} role="status">
            {note.text}
          </p>
        )}

        {league.data && seasonId && season.data && <DraftControls me={props.me} seasonId={seasonId} status={season.data.status} members={Object.keys(league.data.members ?? {})} joiningOpen={league.data.joining !== 'closed'} groupWeeks={season.data.groupWeeks ?? []} />}

        {finished && seasonId && season.data && <CommishOffseason me={props.me} seasonId={seasonId} seasonName={season.data.name} timeZone={season.data.timeZone} off={off} />}
        {league.data && seasonId && season.data?.status === 'active' && <CommishGroupPlay me={props.me} seasonId={seasonId} />}
        {league.data && seasonId && season.data?.status === 'active' && season.data.playoffs !== 'none' && <CommishSeasonDare me={props.me} seasonId={seasonId} />}
        {league.data && seasonId && season.data?.status === 'active' && season.data.holidayEvents && <CommishHolidays me={props.me} seasonId={seasonId} />}

        {league.data && <CommishPlayers me={props.me} league={league.data} />}
        {league.data && seasonId && season.data && (
          <CommishScores me={props.me} seasonId={seasonId} timeZone={season.data.timeZone} members={Object.keys(league.data.members ?? {})} />
        )}
        {league.data && seasonId && season.data && <CommishModeration me={props.me} seasonId={seasonId} />}
      </div>
    </main>
  );
}
