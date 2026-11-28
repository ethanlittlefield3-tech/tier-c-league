import { useState } from 'preact/hooks';
import { MODE_BLURBS, PRACTICE_DAY_MINUTES, PRACTICE_LEADS, PRACTICE_MODES, PRACTICE_RESULTS_MINUTES, practiceLength, practiceWindow, type GroupMode, type PracticeMode } from '@tcl/engine';
import { useDoc, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { practiceModeName, practiceOf, type PracticeMark } from '../practice/play.ts';
import { clockTime } from '../ui/when.ts';

const MIN = 60_000;

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no: practice is only before the season, and over before the draft or kickoff.',
};

const clock = clockTime;

interface Request {
  status: 'requested' | 'live' | 'ending' | 'done' | 'clearing' | 'failed';
  dayMinutes: number;
  startsAt: number;
  reason?: string;
}

/**
 * Commish tools, the practice week (the commish's request, 2026-11-28):
 * before the season, the commish picks how long each day lasts and when it
 * starts. GitHub's practice job sets it up and runs it; everyone in the
 * league plays it on Game Day, and nothing in it counts. Only shown before
 * the season starts.
 */
export function CommishPractice(props: { me: Me; seasonId: string | null; season: { status: string; draftAt: number | null; kickoff: string } | null }) {
  const now = useNow(15_000);
  const league = useDoc<{ practice?: Partial<PracticeMark> | null }>(`leagues/${props.me.league}`);
  const request = useDoc<Request>(`leagues/${props.me.league}/practice/request`);
  const kickoffDay = useDoc<{ start: number }>(props.seasonId && props.season?.kickoff ? `leagues/${props.me.league}/seasons/${props.seasonId}/calendar/${props.season.kickoff}` : null);
  const [dayMinutes, setDayMinutes] = useState<number>(PRACTICE_DAY_MINUTES.standard);
  const [lead, setLead] = useState<number>(15);
  const [mode, setMode] = useState<PracticeMode>('regular');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (league.loading || request.loading || kickoffDay.loading) return null;
  const mark = practiceOf(league.data);
  const asked = request.data;
  const kickoffStart = kickoffDay.data?.start ?? null;
  const preseason = !props.season || props.season.status === 'setup' || (props.season.status === 'active' && kickoffStart !== null && now < kickoffStart);
  if (!mark && !asked && !preseason) return null;

  const act = (work: (api: Awaited<ReturnType<typeof loadData>>) => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then(work)
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };

  const startsAt = now + lead * MIN;
  const check = practiceWindow({ season: props.season, kickoffStart, startsAt, dayMinutes, now });

  return (
    <section class="panel practice-panel" aria-labelledby="practice-title">
      <h2 id="practice-title">Practice week</h2>
      {mark ? (
        <>
          <p class="panel-text">
            {mark.status === 'done'
              ? `Its results are up. It clears itself at ${clock(mark.clearAt ?? mark.finalAt + PRACTICE_RESULTS_MINUTES * MIN)}.`
              : now < mark.startsAt
                ? `${practiceModeName(mark.mode)}. It starts at ${clock(mark.startsAt)}, with days of ${mark.dayMinutes} minutes. Results at ${clock(mark.finalAt)}.`
                : `${practiceModeName(mark.mode)}, on now with days of ${mark.dayMinutes} minutes. Results at ${clock(mark.finalAt)}.`}
          </p>
          {asked?.status === 'ending' || asked?.status === 'clearing' ? (
            <p class="fine-print" role="status">
              Clearing it away. That takes a minute or two.
            </p>
          ) : (
            <button type="button" class="btn btn-second" disabled={busy} onClick={() => act((api) => api.stopPractice(props.me, mark.status === 'done' ? 'clearing' : 'ending'))}>
              {mark.status === 'done' ? 'Clear it now' : 'End it now'}
            </button>
          )}
        </>
      ) : asked?.status === 'failed' ? (
        <>
          <p class="panel-text">It couldn't run: {asked.reason ?? 'the season had moved on.'}</p>
          <button type="button" class="btn btn-second" disabled={busy} onClick={() => act((api) => api.cancelPractice(props.me))}>
            Dismiss
          </button>
        </>
      ) : asked ? (
        <>
          <p class="panel-text">
            Asked for: {practiceModeName((asked as { mode?: string }).mode)}, starting at {clock(asked.startsAt)}, with days of {asked.dayMinutes} minutes. GitHub's practice job sets it up about 20 minutes before
            {now > asked.startsAt ? ', and is on its way: it can run a few minutes late' : ''}.
          </p>
          {asked.status === 'requested' && (
            <button type="button" class="btn btn-second" disabled={busy} onClick={() => act((api) => api.cancelPractice(props.me))}>
              Call it off
            </button>
          )}
        </>
      ) : (
        <>
          <p class="panel-text">
            Everyone plays one quick week, a 1v1 or any group-play mode: the real game, every screen and power-up, on a fast clock. Nothing counts: no Season Points, ranks, badges or
            rivalry records, and it all clears after. Goals the draft has set carry over; everyone else gets quick stand-ins.
          </p>
          <p class="setup-label">The mode</p>
          <div class="choice choice-wrap" role="group" aria-label="The mode">
            {PRACTICE_MODES.map((each) => (
              <button type="button" class="choice-option" aria-pressed={mode === each} disabled={busy} onClick={() => setMode(each)}>
                {practiceModeName(each)}
              </button>
            ))}
          </div>
          <p class="fine-print">{mode === 'regular' ? 'Everyone paired off, the odd one out against The House.' : MODE_BLURBS[mode as GroupMode]}</p>
          <p class="setup-label">
            <label for="practice-minutes">Each day lasts</label>
          </p>
          <select id="practice-minutes" class="setup-select" value={dayMinutes} disabled={busy} onChange={(event) => setDayMinutes(Number(event.currentTarget.value))}>
            {Array.from({ length: PRACTICE_DAY_MINUTES.max - PRACTICE_DAY_MINUTES.min + 1 }, (_, index) => PRACTICE_DAY_MINUTES.min + index).map((minutes) => (
              <option value={minutes}>{minutes} minutes</option>
            ))}
          </select>
          <p class="setup-label">It starts in</p>
          <div class="choice choice-wrap" role="group" aria-label="It starts in">
            {PRACTICE_LEADS.map((minutes) => (
              <button type="button" class="choice-option" aria-pressed={lead === minutes} disabled={busy} onClick={() => setLead(minutes)}>
                {minutes < 60 ? `${minutes} min` : '1 hour'}
              </button>
            ))}
          </div>
          <p class="fine-print practice-plan">
            Starts about {clock(startsAt)}. Seven days of {dayMinutes} minutes, results by {clock(startsAt + practiceLength(dayMinutes))}, then it clears {PRACTICE_RESULTS_MINUTES} minutes later.
          </p>
          {!check.ok && (
            <p class="field-error" role="alert">
              {check.reason}
            </p>
          )}
          <button type="button" class="btn" disabled={busy || !check.ok} onClick={() => act((api) => api.schedulePractice(props.me, dayMinutes, startsAt, mode))}>
            Schedule the practice week
          </button>
        </>
      )}
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
