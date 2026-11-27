import { useState } from 'preact/hooks';
import { LANES, type Lane } from '@tcl/engine';
import type { Trouble } from '../data/identity.ts';
import type { Where } from '../data/kit.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { aerialDays, boostDays, canCancelAerial, canTakeBack, demolitionDays, restDays, ruleOneCount, ruleOneDays, type CalDay } from '../today/kit.ts';
import './power.css';

/** A played power-up, as its document says. */
export interface Play {
  date: string;
  lane?: Lane;
  number?: number;
}

export interface Opponent {
  id: string;
  name: string;
  goals: Partial<Record<Lane, string>>;
  /** The day their rest day was moved to this week, or `null` for Sunday. */
  rest: string | null;
}

type Item = 'aerial' | 'demolition' | 'fullBoost' | 'ruleOne' | 'rest';

const LANE_NAMES: Record<Lane, string> = { mind: 'Mind', body: 'Body', wildcard: 'Wildcard' };
const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. It goes through when the signal is back.',
  refused: 'The league did not accept that. The time for it may have passed.',
};

function weekday(date: string, names: string[]): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return names[(new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7] ?? date;
}
const shortDay = (date: string) => weekday(date, SHORT);
const longDay = (date: string) => weekday(date, LONG);

/** The small pictures on the tiles, drawn for this app. */
function Glyph(props: { item: Item }) {
  const line = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;
  const paths: Record<Item, preact.JSX.Element> = {
    // A car's nose lifting off: up and away.
    aerial: <path {...line} d="M4 17c4-1 7-4 9-8l3-5M16 4l-1 4 4-1M7 20h4" />,
    // A burst.
    demolition: <path {...line} d="M12 3l1.8 5.2L19 6l-2.6 4.8L21 13l-5.2.9L17 19l-5-3-5 3 1.2-5.1L3 13l4.6-2.2L5 6l5.2 2.2Z" />,
    // A bolt.
    fullBoost: <path {...line} d="M13 3 6 13h5l-1 8 7-10h-5Z" />,
    // A shield with a 1.
    ruleOne: <path {...line} d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6ZM11 9l2-1v8" />,
    // A moon: the day off.
    rest: <path {...line} d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />,
  };
  return (
    <svg class="power-glyph" viewBox="0 0 24 24" aria-hidden="true">
      {paths[props.item]}
    </svg>
  );
}

/**
 * The power-up tray and the rest-day picker (SCOPE.md, "Power-ups").
 * Every choice offered here comes from the same calendar times the security
 * rules use, so a choice the phone offers is one the server accepts.
 */
export function PowerUps(props: {
  where: Where;
  now: number;
  /** This week's seven calendar days. */
  week: CalDay[];
  /** Next week's, for setting next week's rest day early. */
  nextWeek: CalDay[];
  /** Today, and yesterday while it can still be fixed. */
  openDays: CalDay[];
  aerial: (Play & { id: string }) | null;
  /** This week's Full Boost, for the tile. */
  fullBoost: (Play & { id: string }) | null;
  /** Full Boost by week, for the open days: on a Monday morning, yesterday belongs to last week. */
  boosts: Record<string, Play | null>;
  /** Your rest day by week (`null` for Sunday). */
  restByPeriod: Record<string, string | null>;
  rest: string | null;
  nextRest: string | null;
  ruleOnes: Play[];
  ruleOneIssue: number[];
  demolition: (Play & { target: string }) | null;
  /** Who you may demolish: your opponent, or in Team Week and 2v2 anyone on the other side. */
  opponents: Opponent[];
  /** True when this week's opponent is The House. */
  vsHouse: boolean;
  /** The #1 seed's second Full Boost in a playoff semifinal, when it is yours: played or not. */
  secondBoost?: { play: Play | null } | null;
  /** The goals you have already marked hit, by day, so Full Boost offers only the ones you missed. */
  hitByDay: Record<string, Partial<Record<Lane, boolean>>>;
}) {
  const [open, setOpen] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoWho, setDemoWho] = useState<string | null>(null);
  const [demoDay, setDemoDay] = useState<string | null>(null);
  const [demoLane, setDemoLane] = useState<Lane | null>(null);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [restWeek, setRestWeek] = useState<'this' | 'next'>('this');

  const { now, week } = props;
  const period = week[0]?.period ?? '';
  const nextPeriod = props.nextWeek[0]?.period ?? '';
  const kit = week[0]?.kit ?? [];
  const dayOf = (date: string) => [...week, ...props.nextWeek, ...props.openDays].find((day) => day.date === date) ?? null;

  const act = (work: (api: Awaited<ReturnType<typeof loadData>>) => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then(work)
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };

  // ---- What each tile says -------------------------------------------------
  const aerialChoices = aerialDays(week, now);
  const aerialSetDay = props.aerial ? dayOf(props.aerial.date) : null;
  const aerialLocked = props.aerial !== null && aerialSetDay !== null && !canCancelAerial(aerialSetDay, now);
  const aerialStatus = !kit.includes('aerial')
    ? 'Not this week'
    : props.aerial
      ? aerialLocked
        ? `Used: ${shortDay(props.aerial.date)}`
        : `Set: ${shortDay(props.aerial.date)}`
      : aerialChoices.length > 0
        ? 'Ready'
        : 'No days left';

  // With one opponent it is them; with a side to aim at, whoever is picked.
  const target = props.opponents.length === 1 ? props.opponents[0]! : (props.opponents.find((opponent) => opponent.id === demoWho) ?? null);
  const demoChoices = target ? demolitionDays(week, now, target.rest) : [];
  const anyDays = props.opponents.some((opponent) => demolitionDays(week, now, opponent.rest).length > 0);
  const demoStatus = !kit.includes('demolition')
    ? 'Not this week'
    : props.demolition
      ? `Set: ${shortDay(props.demolition.date)}`
      : props.vsHouse
        ? 'Bye week'
        : props.opponents.length === 0
          ? 'No opponent yet'
          : anyDays
            ? 'Ready'
            : 'No days left';
  const demolished = props.demolition ? (props.opponents.find((opponent) => opponent.id === props.demolition!.target)?.name ?? null) : null;

  // Each open day uses its own week's Full Boost and rest day.
  const boostChoices = props.openDays
    .filter((day) => boostDays([day], now, props.restByPeriod[day.period] ?? null).length > 0)
    .filter((day) => !props.boosts[day.period])
    .map((day) => day.date);
  const boostHere = props.openDays.map((day) => ({ day, play: props.boosts[day.period] ?? null })).filter((found) => found.play !== null && found.play.date === found.day.date && canTakeBack(found.day, now));
  const boostSetDay = props.fullBoost ? dayOf(props.fullBoost.date) : null;
  const boostLocked = props.fullBoost !== null && (boostSetDay === null || !canTakeBack(boostSetDay, now));
  const boostStatus = !kit.includes('fullBoost')
    ? 'Not this week'
    : props.fullBoost
      ? `${boostLocked ? 'Used' : 'On'}: ${shortDay(props.fullBoost.date)}, ${LANE_NAMES[props.fullBoost.lane ?? 'mind']}`
      : boostChoices.length > 0
        ? 'Ready'
        : 'Saved';

  const usedNumbers = props.ruleOnes.map((play) => play.number ?? 0);
  const ones = ruleOneCount(props.ruleOneIssue, usedNumbers, now);
  const ruleOneOpen = ruleOneDays(props.openDays, now);
  const ruleOneHere = props.ruleOnes.filter((play) => ruleOneOpen.includes(play.date));
  const ruleOneStatus = ones.arrived === 0 ? 'None yet' : `${ones.arrived - ones.used} left`;

  const restNow = restWeek === 'this' ? props.rest : props.nextRest;
  const restPeriodWeek = restWeek === 'this' ? week : props.nextWeek;
  const restCurrentDay = restNow ? dayOf(restNow) : (restPeriodWeek.find((day) => day.dayIndex === 6) ?? null);
  const restMovable = restCurrentDay !== null && now < restCurrentDay.start;
  const restChoices = restMovable ? restDays(restPeriodWeek, now, restNow !== null).filter((date) => date !== (restNow ?? restCurrentDay?.date)) : [];

  const tiles: { item: Item; name: string; status: string }[] = [
    { item: 'aerial', name: 'Aerial', status: aerialStatus },
    { item: 'demolition', name: 'Demolition', status: demoStatus },
    { item: 'fullBoost', name: 'Full Boost', status: boostStatus },
    { item: 'ruleOne', name: 'Rule One', status: ruleOneStatus },
  ];

  const toggle = (item: Item) => {
    setError(null);
    setConfirmDemo(false);
    setOpen(open === item ? null : item);
  };

  const dayButtons = (dates: string[], chosen: string | null, onPick: (date: string) => void, label: (date: string) => string) => (
    <div class="power-days">
      {dates.map((date) => (
        <button type="button" class="power-choice" aria-pressed={chosen === date} disabled={busy} onClick={() => onPick(date)} aria-label={label(date)}>
          {shortDay(date)}
        </button>
      ))}
    </div>
  );

  return (
    <section class="power" aria-labelledby="power-title">
      <h2 id="power-title">Power-ups</h2>
      <div class="power-grid">
        {tiles.map((tile) => (
          <button
            type="button"
            class="power-tile"
            data-item={tile.item}
            data-ready={tile.status === 'Ready' || (tile.item === 'ruleOne' && ones.arrived > ones.used)}
            aria-expanded={open === tile.item}
            aria-controls={`power-${tile.item}`}
            onClick={() => toggle(tile.item)}
          >
            <span class="power-ring">
              <Glyph item={tile.item} />
            </span>
            <span class="power-name">{tile.name}</span>
            <span class="power-status">{tile.status}</span>
          </button>
        ))}
      </div>

      {open === 'aerial' && (
        <div class="power-panel" id="power-aerial">
          <p>Doubles one day's points, negatives too. Set it before the day starts. You can cancel it until then.</p>
          {aerialLocked ? (
            <p class="power-done">Used on {longDay(props.aerial!.date)}.</p>
          ) : (
            <>
              {aerialChoices.length > 0 ? (
                dayButtons(aerialChoices, props.aerial?.date ?? null, (date) => act((api) => api.playAerial(props.where, period, date)), (date) => `Aerial on ${longDay(date)}`)
              ) : (
                <p class="power-done">No days left this week.</p>
              )}
              {props.aerial && (
                <button type="button" class="btn-quiet" disabled={busy} onClick={() => act((api) => api.cancelAerial(props.where, period))}>
                  Cancel Aerial
                </button>
              )}
            </>
          )}
        </div>
      )}

      {open === 'demolition' && (
        <div class="power-panel" id="power-demolition">
          {props.demolition ? (
            <p class="power-done">
              Set on {longDay(props.demolition.date)}, against {demolished && props.opponents.length > 1 ? `${demolished}'s` : 'their'} {LANE_NAMES[props.demolition.lane ?? 'mind']} goal. Only you can see it until noon the next day.
            </p>
          ) : props.vsHouse ? (
            <p>You face The House this week, so there is nobody to demolish.</p>
          ) : props.opponents.length === 0 ? (
            <p>Your opponent for this week isn't set yet.</p>
          ) : !target ? (
            <>
              <p>Pick who to demolish: anyone on the other side. Then one of their goals on a day. If they miss it, they lose 2.</p>
              <div class="power-lanes" role="group" aria-label="Who to demolish">
                {props.opponents.map((opponent) => (
                  <button type="button" class="power-choice power-lane" disabled={busy} onClick={() => setDemoWho(opponent.id)}>
                    <span>{opponent.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p>
                Pick one of {target.name}'s goals on a day. If they miss it, they lose 2. Hidden from everyone, the commish too, until noon the next day. It can't be changed once set.
              </p>
              {props.opponents.length > 1 && (
                <button
                  type="button"
                  class="btn-quiet"
                  onClick={() => {
                    setDemoWho(null);
                    setDemoDay(null);
                    setDemoLane(null);
                    setConfirmDemo(false);
                  }}
                >
                  Someone else
                </button>
              )}
              {demoChoices.length > 0 ? (
                <>
                  {dayButtons(demoChoices, demoDay, (date) => setDemoDay(date), (date) => `Demolition on ${longDay(date)}`)}
                  <div class="power-lanes">
                    {LANES.map((lane) => (
                      <button type="button" class="power-choice power-lane" aria-pressed={demoLane === lane} disabled={busy} onClick={() => setDemoLane(lane)}>
                        <span>{LANE_NAMES[lane]}</span>
                        <small>{target.goals[lane] ?? 'Not set yet'}</small>
                      </button>
                    ))}
                  </div>
                  {confirmDemo ? (
                    <>
                      <p class="power-warn">
                        <strong>This is final.</strong> {target.name}'s {LANE_NAMES[demoLane!]} goal on {longDay(demoDay!)}.
                      </p>
                      <button
                        type="button"
                        class="btn btn-danger"
                        disabled={busy}
                        onClick={() => {
                          const day = dayOf(demoDay!);
                          if (!day || !demoLane) return;
                          act((api) => api.setDemolition(props.where, { period, target: target.id, date: day.date, lane: demoLane, lock: day.lock }));
                        }}
                      >
                        Demolish
                      </button>
                      <button type="button" class="btn-quiet" onClick={() => setConfirmDemo(false)}>
                        Not yet
                      </button>
                    </>
                  ) : (
                    <button type="button" class="btn" disabled={!demoDay || !demoLane} onClick={() => setConfirmDemo(true)}>
                      Set Demolition
                    </button>
                  )}
                </>
              ) : (
                <p class="power-done">No days left this week.</p>
              )}
            </>
          )}
        </div>
      )}

      {open === 'fullBoost' && (
        <div class="power-panel" id="power-fullBoost">
          <p>One goal you missed counts as hit. Use it by noon the next day. You can take it back until then. It also blocks a Demolition on that goal.</p>
          {boostHere.map(({ day, play }) => (
            <>
              <p class="power-done">
                On {longDay(day.date)}: {LANE_NAMES[play!.lane ?? 'mind']} counts as hit.
              </p>
              <button type="button" class="btn-quiet" disabled={busy} onClick={() => act((api) => api.takeBackFullBoost(props.where, day.period))}>
                Take back Full Boost
              </button>
            </>
          ))}
          {boostChoices.map((date) => {
            const missed = LANES.filter((lane) => props.hitByDay[date]?.[lane] !== true);
            const day = dayOf(date)!;
            return (
              <div class="power-boost-day">
                <p class="power-day-name">{longDay(date)}</p>
                {missed.length === 0 ? (
                  <p class="power-done">Every goal is already hit.</p>
                ) : (
                  <div class="power-lanes">
                    {missed.map((lane) => (
                      <button type="button" class="power-choice power-lane" disabled={busy} onClick={() => act((api) => api.playFullBoost(props.where, day.period, date, lane))}>
                        <span>Count {LANE_NAMES[lane]}</span>
                        <small>on {shortDay(date)}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {boostHere.length === 0 && boostChoices.length === 0 && (
            <p class="power-done">{props.fullBoost ? `Used on ${longDay(props.fullBoost.date)}.` : 'Nothing to boost right now. It keeps until the end of the week.'}</p>
          )}
          {props.secondBoost && (
            <div class="power-second" role="group" aria-label="Your second Full Boost">
              <p>As the #1 seed, you have a second Full Boost this round.</p>
              {(() => {
                const second = props.secondBoost.play;
                const open = props.openDays.filter((day) => day.period === period);
                const here = second ? open.find((day) => day.date === second.date && canTakeBack(day, now)) : null;
                if (second && here) {
                  return (
                    <>
                      <p class="power-done">
                        On {longDay(here.date)}: {LANE_NAMES[second.lane ?? 'mind']} counts as hit.
                      </p>
                      <button type="button" class="btn-quiet" disabled={busy} onClick={() => act((api) => api.takeBackFullBoost(props.where, period, true))}>
                        Take back your second Full Boost
                      </button>
                    </>
                  );
                }
                if (second) return <p class="power-done">Used on {longDay(second.date)}.</p>;
                return open.map((day) => {
                  const first = props.boosts[day.period];
                  const missed = LANES.filter((lane) => props.hitByDay[day.date]?.[lane] !== true && !(first && first.date === day.date && first.lane === lane));
                  return missed.length === 0 ? null : (
                    <div class="power-lanes">
                      {missed.map((lane) => (
                        <button type="button" class="power-choice power-lane" disabled={busy} onClick={() => act((api) => api.playFullBoost(props.where, period, day.date, lane, true))}>
                          <span>Count {LANE_NAMES[lane]}</span>
                          <small>on {shortDay(day.date)}</small>
                        </button>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {open === 'ruleOne' && (
        <div class="power-panel" id="power-ruleOne">
          <p>A grace day: the day scores 0, whatever happened. Declare it by noon the next day. You can take it back until then.</p>
          <p class="power-done">
            {ones.arrived} arrived so far, {ones.used} used.
          </p>
          {ruleOneHere.map((play) => (
            <button type="button" class="btn-quiet" disabled={busy} onClick={() => act((api) => api.takeBackRuleOne(props.where, play.number ?? 0))}>
              Take back Rule One on {longDay(play.date)}
            </button>
          ))}
          {ones.next !== null &&
            ruleOneOpen
              .filter((date) => !props.ruleOnes.some((play) => play.date === date))
              .map((date) => (
                <button type="button" class="btn btn-second" disabled={busy} onClick={() => act((api) => api.declareRuleOne(props.where, ones.next!, date))}>
                  Use Rule One on {longDay(date)}
                </button>
              ))}
        </div>
      )}

      <div class="power-rest">
        <button type="button" class="power-rest-row" aria-expanded={open === 'rest'} aria-controls="power-rest" onClick={() => toggle('rest')}>
          <Glyph item="rest" />
          <span>
            Rest day: <strong>{longDay(props.rest ?? week.find((day) => day.dayIndex === 6)?.date ?? '')}</strong>
          </span>
          <span class="power-rest-change">Change</span>
        </button>
        {open === 'rest' && (
          <div class="power-panel" id="power-rest">
            <p>Your goals take the day off; screen time and beers still count. Move it while both days are still ahead.</p>
            {props.nextWeek.length > 0 && (
              <div class="power-weeks" role="group" aria-label="Which week">
                <button type="button" class="power-choice" aria-pressed={restWeek === 'this'} onClick={() => setRestWeek('this')}>
                  This week
                </button>
                <button type="button" class="power-choice" aria-pressed={restWeek === 'next'} onClick={() => setRestWeek('next')}>
                  Next week
                </button>
              </div>
            )}
            <p class="power-done">
              {restWeek === 'this' ? 'This week' : 'Next week'}: {restCurrentDay ? longDay(restCurrentDay.date) : 'Sunday'}.
            </p>
            {restChoices.length > 0 ? (
              dayButtons(restChoices, null, (date) => act((api) => api.moveRestDay(props.where, restWeek === 'this' ? period : nextPeriod, date)), (date) => `Rest on ${longDay(date)}`)
            ) : (
              <p class="power-done">It can't move now: {restMovable ? 'no days left to move it to.' : 'that day has already started.'}</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p class="power-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
