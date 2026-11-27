import { useState } from 'preact/hooks';
import { GROUP_MODES, HOUSE, MODE_NAMES, RUMBLE_NAMES, RUMBLE_TEXT, type DayLog, type GroupMode, type Lane } from '@tcl/engine';
import type { Me } from '../data/identity.ts';
import { groupLines } from '../group/words.ts';
import { PREVIEW_DAYS, PREVIEW_PLAYERS, itemOn, nowOn, previewBoard, previewSettle, previewWeek, sampleLogs, type PreviewLogs } from '../group/preview.ts';
import { formatPoints, formatScreenShort } from '../today/model.ts';
import { Back, Heading } from '../ui/parts.tsx';
import { DropShotFloors, GroupBoard } from './GroupBoard.tsx';
import { ModeBanner } from './ModeBanner.tsx';
import './preview.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LONG_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LANES: { lane: Lane; name: string }[] = [
  { lane: 'mind', name: 'Mind' },
  { lane: 'body', name: 'Body' },
  { lane: 'wildcard', name: 'Wildcard' },
];

/** In the preview, the phone is "you". */
const ME = { league: 'preview', player: 'you', displayName: 'You' } as Me;
const PLAYERS = Object.fromEntries(PREVIEW_PLAYERS.map((player) => [player.id, { id: player.id, name: player.name, car: player.car }]));
const nameOf = (id: string) => (id === HOUSE ? 'The House' : (PLAYERS[id]?.name ?? 'Player'));

/** A 1v1 mode's matchups, as a line each: names and the week so far. */
function Pairs(props: { pairs: { a: string; b: string }[]; totals: Record<string, { points: number }> }) {
  return (
    <ul class="preview-pairs">
      {props.pairs.map((pair) => (
        <li data-me={pair.a === 'you' || pair.b === 'you'}>
          {nameOf(pair.a)} <strong>{formatPoints(props.totals[pair.a]?.points ?? 0)}</strong> <span>vs</span> {nameOf(pair.b)} <strong>{formatPoints(props.totals[pair.b]?.points ?? 0)}</strong>
        </li>
      ))}
    </ul>
  );
}

/**
 * The group play preview (the commish's request, 2026-11-27), from Commish
 * tools: every group-play mode in a made-up league of six, on the real
 * boards, scored and settled by the real engine. Pick a mode and a day, log
 * your own day, shuffle everyone else's, and see how the week settles.
 * Nothing here is saved, and the league never sees it.
 */
export function GroupPreview(props: { onBack: () => void }) {
  const [mode, setMode] = useState<GroupMode>('teamWeek');
  const [day, setDay] = useState<number | 'final'>(3);
  const [seed, setSeed] = useState(1);
  const [logs, setLogs] = useState<PreviewLogs>(() => sampleLogs(1));

  const now = nowOn(day);
  const week = previewWeek(mode);
  const board = previewBoard(mode, logs, now);
  const settled = day === 'final' ? previewSettle(mode, logs) : null;
  const today = day === 'final' ? null : PREVIEW_DAYS[day]!;
  const mine: DayLog | null = today ? (logs.you?.[today.date] ?? { goals: {}, screenMinutes: null, beers: 0 }) : null;

  const changeMine = (change: (log: DayLog) => DayLog) => {
    if (!today || !mine) return;
    setLogs((before) => ({ ...before, you: { ...before.you, [today.date]: change(mine) } }));
  };
  const shuffle = () => {
    const next = seed + 1;
    setSeed(next);
    // Everyone else's week is new; yours stays as you logged it.
    setLogs((before) => ({ ...sampleLogs(next), you: before.you ?? {} }));
  };

  return (
    <main class="screen preview">
      <div class="screen-body">
        <Back onBack={props.onBack} />
        <Heading>Group play preview</Heading>
        <p class="lead">A made-up league of six to try every mode. Nothing here is saved or seen by your league.</p>

        <section class="panel preview-controls" aria-label="What to show">
          <div class="choice choice-wrap" role="group" aria-label="Mode">
            {GROUP_MODES.map((each) => (
              <button type="button" class="choice-option" aria-pressed={each === mode} onClick={() => setMode(each)}>
                {MODE_NAMES[each]}
              </button>
            ))}
          </div>
          <p class="preview-label">It is</p>
          <div class="choice choice-wrap" role="group" aria-label="Day of the week">
            {DAY_NAMES.map((label, index) => (
              <button type="button" class="choice-option" aria-pressed={day === index} onClick={() => setDay(index)}>
                {label}
              </button>
            ))}
            <button type="button" class="choice-option" aria-pressed={day === 'final'} onClick={() => setDay('final')}>
              Final
            </button>
          </div>
        </section>

        <ModeBanner me="you" week={{ ...week, teams: week.teams ?? undefined, duos: week.duos ?? undefined, roster: week.roster ?? undefined }} name={nameOf} />

        {mode === 'teamWeek' || mode === 'twoVTwo' || mode === 'bounty' || mode === 'alley' ? (
          <GroupBoard me={ME} week={week} ids={board.ids} weeks={board.weeks} totals={board.totals} players={PLAYERS} />
        ) : (
          <section class="panel group-board" aria-labelledby="preview-board-title">
            <h2 id="preview-board-title">Week 1: {MODE_NAMES[mode]}</h2>
            <Pairs pairs={week.pairs} totals={board.totals} />
            {mode === 'dropShot' && board.weeks.you && board.weeks.maya && <DropShotFloors mine={board.weeks.you} theirs={board.weeks.maya} name="Maya" />}
            {mode === 'rumble' && today && (
              <ul class="preview-items" aria-label="Today's items">
                {(['you', 'maya'] as const).map((id) => {
                  const item = itemOn(day as number, id);
                  return (
                    item && (
                      <li>
                        <strong>
                          {id === 'you' ? 'Your item' : "Maya's item"}: {RUMBLE_NAMES[item]}
                        </strong>{' '}
                        {RUMBLE_TEXT[item]}
                      </li>
                    )
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {today && mine && (
          <section class="panel preview-day" aria-labelledby="preview-day-title">
            <h2 id="preview-day-title">Your {LONG_DAYS[day as number]}</h2>
            <p class="panel-text">Log it here and watch the board move. Days after today haven't started.</p>
            <div class="choice" role="group" aria-label="Your goals">
              {LANES.map(({ lane, name }) => (
                <button type="button" class="choice-option" aria-pressed={Boolean(mine.goals[lane])} onClick={() => changeMine((log) => ({ ...log, goals: { ...log.goals, [lane]: !log.goals[lane] } }))}>
                  {name}
                </button>
              ))}
            </div>
            <div class="preview-steps">
              <span>Screen time: {formatScreenShort(mine.screenMinutes)}</span>
              <button type="button" class="step" aria-label="30 minutes less" onClick={() => changeMine((log) => ({ ...log, screenMinutes: log.screenMinutes === null || log.screenMinutes <= 30 ? 0 : log.screenMinutes - 30 }))}>
                {'−'}
              </button>
              <button type="button" class="step" aria-label="30 minutes more" onClick={() => changeMine((log) => ({ ...log, screenMinutes: (log.screenMinutes ?? 0) + 30 }))}>
                +
              </button>
            </div>
            <div class="preview-steps">
              <span>Beers: {mine.beers}</span>
              <button type="button" class="step" aria-label="One beer less" disabled={mine.beers === 0} onClick={() => changeMine((log) => ({ ...log, beers: Math.max(0, log.beers - 1) }))}>
                {'−'}
              </button>
              <button type="button" class="step" aria-label="One beer more" onClick={() => changeMine((log) => ({ ...log, beers: log.beers + 1 }))}>
                +
              </button>
            </div>
          </section>
        )}

        {settled && (
          <section class="panel" aria-labelledby="preview-result-title">
            <h2 id="preview-result-title">How the week settles</h2>
            <ul class="preview-pairs">
              {(groupLines(settled.group, nameOf) ?? []).map((line) => (
                <li data-me={line.players.includes('you')}>{line.text}</li>
              ))}
            </ul>
            <ul class="preview-results" aria-label="Season Points">
              {PREVIEW_PLAYERS.map((player) => {
                const result = settled.results[player.id];
                return (
                  <li data-me={player.id === 'you'}>
                    <span>{player.name}</span>
                    <span>{formatPoints(result?.points ?? 0)} this week</span>
                    <strong>{formatPoints(result?.seasonPoints ?? 0)} SP</strong>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div class="preview-actions">
          <button type="button" class="btn btn-second" onClick={shuffle}>
            Shuffle everyone else's week
          </button>
        </div>
      </div>
    </main>
  );
}
