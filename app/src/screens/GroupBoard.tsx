import { HOUSE, MODE_BLURBS, MODE_NAMES, RULES, alleyBonus, alleyRace, bountyProgress, bountyText, decideSides, defaultBounty, dropShotFloors, kitForMode, tilesBroken, winMeter, type DayCell, type GroupMode } from '@tcl/engine';
import { CarArt } from '../art/car/CarArt.tsx';
import { ItemIcon } from '../art/itemIcons.tsx';
import { ordinal, score } from '../group/words.ts';
import type { Me } from '../data/identity.ts';
import type { BoardPlayer, BoardWeekDoc } from './useWeekBoard.ts';
import { youLine } from './ModeBanner.tsx';
import { DayDial, boostOf, dayWords } from './Scoreboard.tsx';
import './group.css';

type Totals = Record<string, { points: number; beers: number }>;

interface BoardProps {
  me: Me;
  week: BoardWeekDoc;
  ids: string[];
  weeks: Record<string, DayCell[]>;
  totals: Totals;
  players: Record<string, BoardPlayer>;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** "You" for this phone's player, otherwise their name. */
function nameOf(props: BoardProps, player: string): string {
  if (player === props.me.player) return 'You';
  if (player === HOUSE) return 'The House';
  return props.players[player]?.name ?? 'Player';
}

/** A side's average, as things stand. */
function average(players: string[], totals: Totals): { points: number; beers: number; size: number } {
  return {
    points: sum(players.map((player) => totals[player]?.points ?? 0)),
    beers: sum(players.map((player) => totals[player]?.beers ?? 0)),
    size: Math.max(1, players.length),
  };
}

/** A player's day so far, on a small dial: goals in and screen time. */
function PlayerDial(props: { board: BoardProps; player: string }) {
  const cells = props.board.weeks[props.player];
  if (!cells || props.player === HOUSE) return <span class="group-dial-gap" aria-hidden="true" />;
  const boost = boostOf(cells);
  return <DayDial boost={boost} label={`${nameOf(props.board, props.player)} today: ${dayWords(boost)}`} />;
}

/** A small car for a player in a list. */
function MiniCar(props: { board: BoardProps; player: string; team?: 'blue' | 'orange' }) {
  if (props.player === HOUSE) return <span class="group-mini-car group-house" aria-hidden="true" />;
  return <CarArt parts={props.board.players[props.player]?.car ?? undefined} team={props.team} bare class="group-mini-car" />;
}

/** One side of a Team Week or 2v2: its cars, its average, and each player's day and week. */
function Side(props: { board: BoardProps; title: string; team: 'blue' | 'orange'; players: string[]; side: { points: number; size: number }; mine: boolean }) {
  return (
    <div class="group-side" data-team={props.team} data-mine={props.mine}>
      <div class="group-side-cars" aria-hidden="true">
        {props.players.slice(0, 3).map((player) => (
          <MiniCar board={props.board} player={player} team={props.team} />
        ))}
      </div>
      <p class="group-side-head">
        <span>{props.title}</span>
        <strong>{score(props.side.points / props.side.size)}</strong>
      </p>
      <ul class="group-side-list" aria-label={props.title}>
        {props.players.map((player) => (
          <li data-me={player === props.board.me.player}>
            <span>{nameOf(props.board, player)}</span>
            <PlayerDial board={props.board} player={player} />
            <strong>{player === HOUSE ? '' : score(props.board.totals[player]?.points ?? 0)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Who is ahead in a sides matchup, in words. */
function leadWords(mine: { points: number; beers: number; size: number }, theirs: { points: number; beers: number; size: number }): string {
  const decision = decideSides(mine, theirs);
  if (decision.a === 'draw') return 'Level on average so far.';
  const ahead = decision.a === 'win';
  return decision.decidedBy === 'beers' ? `Level on average; ${ahead ? 'you lead' : 'they lead'} on fewer beers.` : ahead ? 'Your side leads on average.' : 'Your side trails on average.';
}

/** Days still to score, from a player's week: whole days to come, and half of today. */
function daysToGo(board: BoardProps): number {
  const cells = board.weeks[board.me.player] ?? Object.values(board.weeks)[0] ?? [];
  return cells.reduce((total, cell) => total + (cell.state === 'future' ? 1 : cell.state === 'open' ? 0.5 : 0), 0);
}

/** Blue against orange as a bar: who the averages favor, with the days left to swing it. */
function SidesMeter(props: { board: BoardProps; blue: { points: number; size: number }; orange: { points: number; size: number }; blueName: string; orangeName: string }) {
  const left = daysToGo(props.board);
  if (left <= 0) return null;
  const share = winMeter({ points: props.blue.points / props.blue.size, dailyAverage: null }, { points: props.orange.points / props.orange.size, dailyAverage: null }, left);
  const percent = Math.round(share * 100);
  const words = percent >= 55 ? `${props.blueName} favored, ${percent}%` : percent <= 45 ? `${props.orangeName} favored, ${100 - percent}%` : 'Too close to call';
  return (
    <div class="meter group-meter" role="meter" aria-label="Who's favored" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={words}>
      <div class="meter-bar" aria-hidden="true">
        <span class="meter-me" style={{ transform: `scaleX(${share.toFixed(3)})` }} />
      </div>
      <p class="meter-text" aria-hidden="true">
        {words}
      </p>
    </div>
  );
}

/** Team Week: blue against orange, by average points per player. */
function TeamBoard(props: BoardProps) {
  const teams = props.week.teams ?? { blue: [], orange: [] };
  const blue = average(teams.blue, props.totals);
  const orange = average(teams.orange, props.totals);
  const mine = teams.blue.includes(props.me.player) ? 'blue' : teams.orange.includes(props.me.player) ? 'orange' : null;
  return (
    <>
      <div class="group-sides">
        <Side board={props} title="Blue" team="blue" players={teams.blue} side={blue} mine={mine === 'blue'} />
        <span class="board-vs group-vs" aria-hidden="true">
          VS
        </span>
        <Side board={props} title="Orange" team="orange" players={teams.orange} side={orange} mine={mine === 'orange'} />
      </div>
      {mine && <p class="group-lead">{leadWords(mine === 'blue' ? blue : orange, mine === 'blue' ? orange : blue)}</p>}
      <SidesMeter board={props} blue={blue} orange={orange} blueName="Blue" orangeName="Orange" />
      <p class="fine-print">Squads compare average points per player, so a bigger squad has no edge. The winning squad gets +{RULES.sideBonus} each.</p>
    </>
  );
}

/** 2v2: your duo's matchup big, then every other matchup in a line. */
function DuoBoard(props: BoardProps) {
  const duos = props.week.duos ?? [];
  if (duos.length === 0) {
    return <p class="panel-text">The duos are drawn when the week starts, at 12:00 am on Monday{props.week.pairing === 'frenemies' ? ': frenemies, so each of you plays alongside your Week 1 rival' : ''}.</p>;
  }
  const everyone = props.ids;
  const order = [...duos].sort((x, y) => Number([...y.a, ...y.b].includes(props.me.player)) - Number([...x.a, ...x.b].includes(props.me.player)));
  const sides = (match: (typeof duos)[number]) => {
    const house = match.b.includes(HOUSE);
    // The House duo scores the average of everyone outside the duo it faces.
    const others = everyone.filter((player) => !match.a.includes(player));
    return { house, a: average(match.a, props.totals), b: house ? average(others, props.totals) : average(match.b, props.totals) };
  };
  return (
    <>
      {order.map((match, at) => {
        const { house, a, b } = sides(match);
        const mineA = match.a.includes(props.me.player);
        const mineB = match.b.includes(props.me.player);
        const mineHere = mineA || mineB;
        if (at > 0 && !mineHere) {
          // The other matchups, a line each.
          return (
            <div class="group-match group-match-line">
              <ul class="group-side-list group-line" aria-label={`${match.a.map((player) => nameOf(props, player)).join(' and ')} against ${house ? 'the House duo' : match.b.map((player) => nameOf(props, player)).join(' and ')}`}>
                <li>
                  <span>{match.a.map((player) => nameOf(props, player)).join(' & ')}</span>
                  <strong>{score(a.points / a.size)}</strong>
                  <span class="group-line-vs">vs</span>
                  <strong>{score(b.points / b.size)}</strong>
                  <span>{house ? 'The House duo' : match.b.map((player) => nameOf(props, player)).join(' & ')}</span>
                </li>
              </ul>
            </div>
          );
        }
        return (
          <div class="group-match">
            <div class="group-sides">
              <Side board={props} title={mineA ? 'Your duo' : 'Duo'} team="blue" players={match.a} side={a} mine={mineA} />
              <span class="board-vs group-vs" aria-hidden="true">
                VS
              </span>
              <Side board={props} title={house ? 'The House duo' : mineB ? 'Your duo' : 'Duo'} team="orange" players={match.b} side={b} mine={mineB} />
            </div>
            {mineHere && <p class="group-lead">{mineA ? leadWords(a, b) : leadWords(b, a)}</p>}
            {mineHere && <SidesMeter board={props} blue={a} orange={b} blueName={mineA ? 'Your duo' : 'Their duo'} orangeName={mineB ? 'Your duo' : 'Their duo'} />}
          </div>
        );
      })}
      <p class="fine-print">Duos compare average points per player. The winning duo gets +{RULES.sideBonus} each.</p>
    </>
  );
}

/** Bounty Week: the league's one target, a live bar toward it, and who has added what. */
function BountyBoard(props: BoardProps) {
  const target = props.week.bounty ?? defaultBounty(props.ids.length);
  const progress = bountyProgress(target, props.weeks);
  const share = Math.max(0, Math.min(1, progress.needed > 0 ? progress.total / progress.needed : 0));
  const rows = [...props.ids].sort((a, b) => (progress.contributions[b] ?? 0) - (progress.contributions[a] ?? 0) || nameOf(props, a).localeCompare(nameOf(props, b)));
  const most = Math.max(1, ...rows.map((player) => progress.contributions[player] ?? 0));
  return (
    <>
      <p class="group-target">{bountyText(target)}</p>
      <div class="group-bounty">
        <div class="group-bar" data-broken={progress.broke.length > 0} role="progressbar" aria-label="The Bounty" aria-valuemin={0} aria-valuemax={progress.needed} aria-valuenow={progress.total} aria-valuetext={`${progress.total} of ${progress.needed}`}>
          <span style={{ transform: `scaleX(${share})` }} />
        </div>
        <strong class="group-bounty-share">{Math.round(share * 100)}%</strong>
      </div>
      <p class="group-lead">
        {target.kind === 'hits'
          ? progress.hit
            ? `Hit: ${progress.total} of ${progress.needed}. +${RULES.bountyBonus} for everyone.`
            : `${progress.total} of ${progress.needed} so far.`
          : progress.broke.length > 0
            ? `Broken by ${progress.broke.map((player) => nameOf(props, player)).join(', ')}.`
            : `Nobody has broken it so far: ${progress.total} of ${progress.needed} holding.`}
      </p>
      {target.kind === 'hits' && (
        <ul class="group-list group-adds" aria-label="Who has added what">
          {rows.map((player) => (
            <li data-me={player === props.me.player}>
              <MiniCar board={props} player={player} team={player === props.me.player ? 'blue' : 'orange'} />
              <span>{nameOf(props, player)}</span>
              <span class="group-add-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${((progress.contributions[player] ?? 0) / most).toFixed(3)})` }} />
              </span>
              <PlayerDial board={props} player={player} />
              <strong>{progress.contributions[player] ?? 0}</strong>
            </li>
          ))}
        </ul>
      )}
      <p class="fine-print">
        Hit it and everyone gets +{RULES.bountyBonus}. Miss it and {target.kind === 'hits' ? 'the lowest contributor' : 'whoever broke it'} spins the Wheel. No Demolition this week: it's co-op.
      </p>
    </>
  );
}

/** The Alley: one absurdly long, skinny lane, everyone single file, with the podium places marked. */
function AlleyBoard(props: BoardProps) {
  const race = alleyRace(props.weeks);
  // The back car sits at the start and the front car near the finish: race points can be negative.
  const back = Math.min(0, ...race.map((row) => row.race));
  const front = Math.max(back + 1, ...race.map((row) => row.race));
  const last = Math.max(...race.map((row) => row.place));
  return (
    <>
      <div class="alley" role="img" aria-label={`The Alley: ${race.map((row) => `${nameOf(props, row.player)} ${row.race}`).join(', ')}`}>
        <div class="alley-lane" />
        {[...race].reverse().map((row, at) => (
          // Cars level on race points sit nose to tail, a little apart up and down so each shows.
          <div class="alley-car" data-me={row.player === props.me.player} style={{ left: `${((row.race - back) / (front - back)) * 84}%`, top: `${at % 2 === 0 ? 4 : 12}px` }}>
            <CarArt parts={props.players[row.player]?.car ?? undefined} team={row.player === props.me.player ? 'blue' : 'orange'} class="alley-car-art" />
          </div>
        ))}
        <span class="alley-finish" aria-hidden="true" />
      </div>
      <ol class="group-list alley-places" aria-label="The race">
        {race.map((row) => (
          <li data-me={row.player === props.me.player} data-place={row.place}>
            <span>
              {ordinal(row.place)} {nameOf(props, row.player)}
              {row.walls > 0 && <small> · {row.walls === 1 ? '1 wall' : `${row.walls} walls`}</small>}
            </span>
            {alleyBonus(row.place) > 0 ? <span class="group-medal">+{alleyBonus(row.place)}</span> : row.place === last ? <span class="group-medal group-medal-wheel">Wheel</span> : <span class="group-medal-gap" />}
            <PlayerDial board={props} player={row.player} />
            <strong>{score(row.race)}</strong>
          </li>
        ))}
      </ol>
      <p class="fine-print">
        Your points move your car; a day with no goals hits the wall for {Math.abs(RULES.alleyWall)} race points, except your rest day. 1st, 2nd and 3rd get +{alleyBonus(1)}, +{alleyBonus(2)} and +{alleyBonus(3)}; last place spins the Wheel.
      </p>
    </>
  );
}

const POWERS = [
  { item: 'aerial', name: 'Aerial' },
  { item: 'demolition', name: 'Demolition' },
  { item: 'fullBoost', name: 'Full Boost' },
] as const;

/** The week's power-ups, as icons: the ones it offers lit, the rest crossed out. Rule One works every week. */
function PowerRow(props: { mode: GroupMode }) {
  const kit = kitForMode(props.mode);
  return (
    <ul class="group-powers" aria-label="Power-ups this week">
      {POWERS.map(({ item, name }) => (
        <li data-on={kit.includes(item)}>
          <ItemIcon item={item} />
          <span>
            {name}
            {!kit.includes(item) && <span class="sr-only">: not this week</span>}
          </span>
        </li>
      ))}
      <li data-on="true">
        <ItemIcon item="ruleOne" />
        <span>Rule One</span>
      </li>
    </ul>
  );
}

/** A Drop Shot floor: 20 hex tiles, cracked on the first hit and broken on the second. */
function Floor(props: { label: string; hits: number; team: 'blue' | 'orange' }) {
  const broken = tilesBroken(props.hits);
  const cracked = props.hits % RULES.dropShotHitsPerTile === 1 && broken < RULES.dropShotTiles ? 1 : 0;
  const tiles = Array.from({ length: RULES.dropShotTiles }, (_, at) => (at < broken ? 'broken' : at < broken + cracked ? 'cracked' : 'intact'));
  // 4 rows of 5, every other row shifted half a tile.
  const hex = (x: number, y: number) => {
    const r = 10;
    return Array.from({ length: 6 }, (_, k) => {
      const angle = (Math.PI / 3) * k + Math.PI / 6;
      return `${(x + r * Math.cos(angle)).toFixed(2)},${(y + r * Math.sin(angle)).toFixed(2)}`;
    }).join(' ');
  };
  return (
    <figure class="floor" data-team={props.team}>
      <svg viewBox="0 0 106 72" role="img" aria-label={`${props.label}: ${broken} of ${RULES.dropShotTiles} tiles broken`}>
        {tiles.map((state, at) => {
          const row = Math.floor(at / 5);
          const col = at % 5;
          const x = 12 + col * 18.5 + (row % 2) * 9.25;
          const y = 12 + row * 16;
          return (
            <g data-tile={state}>
              <polygon class="floor-tile" points={hex(x, y)} />
              {state === 'cracked' && <path class="floor-crack" d={`M${x - 5} ${y - 3} L${x - 1} ${y} L${x - 3} ${y + 4} M${x - 1} ${y} L${x + 5} ${y - 2}`} />}
            </g>
          );
        })}
      </svg>
      <figcaption>
        {props.label}: <strong>{broken}</strong> broken
      </figcaption>
    </figure>
  );
}

/** Drop Shot, under a 1v1: both floors, from the days so far. */
export function DropShotFloors(props: { mine: DayCell[]; theirs: DayCell[]; name: string }) {
  // Only a locked day has landed its hits; today shows what it would land as things stand.
  const days = (cells: DayCell[]) => cells.map((cell) => (cell.state === 'locked' && cell.score ? cell.score.total : null));
  const landed = dropShotFloors(days(props.mine), days(props.theirs));
  const today = props.mine.findIndex((cell) => cell.state === 'open' && cell.today);
  const live = today >= 0 ? dropShotFloors([props.mine[today]?.score?.total ?? null], [props.theirs[today]?.score?.total ?? null]) : null;
  const mine = sum(landed.a);
  const theirs = sum(landed.b);
  return (
    <section class="panel group-board" aria-labelledby="floors-title">
      <h2 id="floors-title">Drop Shot</h2>
      <div class="floors">
        <Floor label={`${props.name}'s floor`} hits={mine} team="orange" />
        <Floor label="Your floor" hits={theirs} team="blue" />
      </div>
      <p class="group-lead">
        You've landed {mine} hit{mine === 1 ? '' : 's'}; {props.name} has landed {theirs}.
        {live && (live.a[0]! > 0 || live.b[0]! > 0) ? ` As today stands, ${live.a[0]! > 0 ? `you land ${live.a[0]}` : `${props.name} lands ${live.b[0]}`} more at the lock.` : ''}
      </p>
      <p class="fine-print">
        Each day the higher score lands hits on the other floor equal to the margin, up to {RULES.dropShotDailyHits}. Each tile takes 2 hits. Most tiles broken by Sunday wins, then most hits, then fewer beers.
      </p>
    </section>
  );
}

/**
 * Game Day in a group-play week with no single opponent (the commish's
 * request, 2026-11-27): one card in the scoreboard's place, with the mode,
 * where you stand, everyone's cars, today's dials and week points, and the
 * week's power-ups as icons.
 */
export function GroupBoard(props: BoardProps & { status?: string }) {
  const mode = (props.week.mode ?? 'regular') as GroupMode;
  const title = MODE_NAMES[mode] ?? 'Group play';
  // Your squad or duo, in a line; the Bounty's target and the Alley's power-ups show on the card already.
  const you = mode === 'teamWeek' || mode === 'twoVTwo' ? youLine({ me: props.me.player, week: props.week, name: (player) => nameOf(props, player) }) : '';
  return (
    <section class="week board group-board" aria-labelledby="group-title" data-mode={mode}>
      <div class="board-head">
        <h2 id="group-title">
          Week {props.week.week}: {title}
        </h2>
        {props.status && <span class="board-status">{props.status}</span>}
      </div>
      <p class="group-blurb">{MODE_BLURBS[mode]}</p>
      {you && <p class="group-you">{you}</p>}
      {mode === 'teamWeek' && <TeamBoard {...props} />}
      {mode === 'twoVTwo' && <DuoBoard {...props} />}
      {mode === 'bounty' && <BountyBoard {...props} />}
      {mode === 'alley' && <AlleyBoard {...props} />}
      <PowerRow mode={mode} />
    </section>
  );
}
