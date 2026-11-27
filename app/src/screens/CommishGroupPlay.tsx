import { useState } from 'preact/hooks';
import { LANES, MODE_NAMES, WEEKDAYS, addDays, bountyMax, bountyText, defaultBounty, validBounty, type BountyTarget, type Lane } from '@tcl/engine';
import { useAll, useDoc, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';

interface WeekDoc {
  week: number;
  mode?: string;
  monday?: string;
  roster?: string[];
  bounty?: BountyTarget | null;
  pairing?: 'random' | 'frenemies';
}

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no: this week may have started already.',
};
const LANE_NAMES: Record<Lane | 'any', string> = { any: 'Any goal', mind: 'Mind', body: 'Body', wildcard: 'Wildcard' };
const LIMITS = [60, 90, 120, 150, 180, 240];
const hours = (minutes: number) => `${Math.floor(minutes / 60)}${minutes % 60 ? '½' : ''} hour${minutes === 60 ? '' : 's'}`;

/** One Bounty Week: its target, which the commish can set until the week starts. */
function BountyWeek(props: { me: Me; seasonId: string; id: string; week: WeekDoc; open: boolean }) {
  const players = (props.week.roster ?? []).length;
  const current = props.week.bounty ?? null;
  const dates = props.week.monday ? [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(props.week.monday!, offset)) : [];
  const [kind, setKind] = useState<BountyTarget['kind']>(current?.kind ?? 'hits');
  const [lane, setLane] = useState<Lane | 'any'>(current?.kind === 'hits' ? current.lane : 'body');
  const [count, setCount] = useState(String(current?.kind === 'hits' ? current.count : bountyMax('body', players)));
  const [date, setDate] = useState(current && current.kind !== 'hits' ? current.date : (dates[4] ?? ''));
  const [minutes, setMinutes] = useState(current?.kind === 'screen' ? current.minutes : 120);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);
  const target: BountyTarget = kind === 'hits' ? { kind, lane, count: Number(count) } : kind === 'dry' ? { kind, date } : { kind, date, minutes };
  const valid = validBounty(target, dates);

  const save = (event: Event) => {
    event.preventDefault();
    if (busy || !valid) return;
    setBusy(true);
    setNote(null);
    void loadData()
      .then((api) => api.setGroupPlay(props.me, props.seasonId, props.id, { bounty: target }))
      .then(() => setNote({ error: false, text: 'Saved. Everyone sees it on Game Day.' }))
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  return (
    <form class="group-setting" onSubmit={save} aria-label={`Week ${props.week.week}: Bounty Week`}>
      <h3>Week {props.week.week}: Bounty Week</h3>
      <p class="panel-text">
        {current ? 'The target' : 'No target set yet, so it is'}: <strong>{bountyText(current ?? defaultBounty(players))}</strong>.
      </p>
      {props.open ? (
        <>
          <p class="setup-label">
            <label for={`bounty-kind-${props.id}`}>Target</label>
          </p>
          <select id={`bounty-kind-${props.id}`} class="setup-select" value={kind} onChange={(event) => setKind(event.currentTarget.value as BountyTarget['kind'])}>
            <option value="hits">Goals hit across the league</option>
            <option value="dry">No beers league-wide on a day</option>
            <option value="screen">Everyone under a screen-time limit on a day</option>
          </select>
          {kind === 'hits' ? (
            <>
              <p class="setup-label">
                <label for={`bounty-lane-${props.id}`}>Goal</label>
              </p>
              <select id={`bounty-lane-${props.id}`} class="setup-select" value={lane} onChange={(event) => setLane(event.currentTarget.value as Lane | 'any')}>
                {(['any', ...LANES] as const).map((each) => (
                  <option value={each}>{LANE_NAMES[each]}</option>
                ))}
              </select>
              <p class="setup-label">
                <label for={`bounty-count-${props.id}`}>How many</label>
              </p>
              <input id={`bounty-count-${props.id}`} class="setup-input" type="number" inputMode="numeric" min={1} value={count} onInput={(event) => setCount(event.currentTarget.value)} />
              <p class="fine-print">The most the league can reach, with one rest day each: {bountyMax(lane, players)}.</p>
            </>
          ) : (
            <>
              <p class="setup-label">
                <label for={`bounty-day-${props.id}`}>Day</label>
              </p>
              <select id={`bounty-day-${props.id}`} class="setup-select" value={date} onChange={(event) => setDate(event.currentTarget.value)}>
                {dates.map((each, index) => (
                  <option value={each}>{WEEKDAYS[index]}</option>
                ))}
              </select>
              {kind === 'screen' && (
                <>
                  <p class="setup-label">
                    <label for={`bounty-limit-${props.id}`}>Under</label>
                  </p>
                  <select id={`bounty-limit-${props.id}`} class="setup-select" value={String(minutes)} onChange={(event) => setMinutes(Number(event.currentTarget.value))}>
                    {LIMITS.map((each) => (
                      <option value={String(each)}>{hours(each)}</option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}
          {note && (
            <p class={note.error ? 'field-error' : 'panel-ok'} role="status">
              {note.text}
            </p>
          )}
          <button type="submit" class="btn" disabled={busy || !valid}>
            {busy ? 'Saving' : 'Set the target'}
          </button>
        </>
      ) : (
        <p class="fine-print">The week has started, so the target is fixed.</p>
      )}
    </form>
  );
}

/** One 2v2 week: drawn at random, or as frenemies, until the week starts. */
function DuoWeek(props: { me: Me; seasonId: string; id: string; week: WeekDoc; open: boolean }) {
  const pairing = props.week.pairing ?? 'random';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choose = (next: 'random' | 'frenemies') => {
    if (busy || next === pairing) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.setGroupPlay(props.me, props.seasonId, props.id, { pairing: next }))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };
  return (
    <div class="group-setting" role="group" aria-label={`Week ${props.week.week}: 2v2`}>
      <h3>Week {props.week.week}: 2v2</h3>
      <p class="panel-text">The duos are drawn when the week starts, at 12:00 am on Monday.</p>
      {props.open ? (
        <div class="choice">
          <button type="button" class="choice-option" aria-pressed={pairing === 'random'} disabled={busy} onClick={() => choose('random')}>
            Drawn at random
          </button>
          <button type="button" class="choice-option" aria-pressed={pairing === 'frenemies'} disabled={busy} onClick={() => choose('frenemies')}>
            Frenemies: your Week 1 rival
          </button>
        </div>
      ) : (
        <p class="fine-print">The week has started: {pairing === 'frenemies' ? 'frenemies' : 'drawn at random'}.</p>
      )}
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** One group-play week, open until its Monday starts by the calendar. */
function GroupWeek(props: { me: Me; seasonId: string; id: string; week: WeekDoc; now: number }) {
  const monday = useDoc<{ start: number }>(props.week.monday ? `leagues/${props.me.league}/seasons/${props.seasonId}/calendar/${props.week.monday}` : null);
  if (monday.loading) return null;
  const open = monday.data !== null && props.now < monday.data.start;
  return props.week.mode === 'bounty' ? <BountyWeek {...props} open={open} /> : <DuoWeek {...props} open={open} />;
}

/**
 * Commish tools, group play (SCOPE.md, "Commish tools": Bounty targets):
 * each Bounty Week's target and each 2v2 week's pairing, until the week
 * starts. The other modes need nothing from the commish.
 */
export function CommishGroupPlay(props: { me: Me; seasonId: string }) {
  const now = useNow();
  const weeks = useAll<WeekDoc>(`leagues/${props.me.league}/seasons/${props.seasonId}/weeks`);
  const settable = weeks.docs.filter((found) => (found.data.mode === 'bounty' || found.data.mode === 'twoVTwo') && !(found.data as { results?: unknown }).results).sort((a, b) => a.data.week - b.data.week);
  if (weeks.loading || settable.length === 0) return null;
  return (
    <section class="panel" aria-labelledby="group-play-title">
      <h2 id="group-play-title">Group play</h2>
      <p class="panel-text">
        Set each {MODE_NAMES.bounty}'s target and each {MODE_NAMES.twoVTwo} week's duos before the week starts. Everyone gets a push about the mode at 7 pm the Sunday before.
      </p>
      {settable.map((found) => (
        <GroupWeek me={props.me} seasonId={props.seasonId} id={found.id} week={found.data} now={now} />
      ))}
    </section>
  );
}
