import { useState } from 'preact/hooks';
import { CarArt } from '../art/car/CarArt.tsx';
import type { CarParts } from '../art/car/draw.ts';
import { RankBadge } from '../art/RankBadge.tsx';
import { RANK_NAMES, nemesisOf, recordText, type Rank, type Rival } from '@tcl/engine';
import { useAll, useDoc, useNow } from '../data/hooks.ts';
import { Picks } from './Picks.tsx';
import { PlayerCard } from './PlayerCard.tsx';
import { Schedule, type WeekDoc } from './Schedule.tsx';
import { Playoffs } from './Playoffs.tsx';
import { TrophyCase } from './Trophies.tsx';
import type { Me } from '../data/identity.ts';
import { seasonDates } from '../today/model.ts';
import './feed.css';
import './league.css';

interface Row {
  player: string;
  rank: number;
  seasonPoints: number;
  beers: number;
  perfectDays: number;
  tieBreak: 'headToHead' | 'beers' | 'perfectDays' | 'coinFlip' | null;
}

const TIEBREAK: Record<string, string> = {
  headToHead: 'ahead on head-to-head',
  beers: 'ahead on fewer beers',
  perfectDays: 'ahead on perfect days',
  coinFlip: 'ahead on the sealed coin flip',
};


function Notice(props: { title: string; children: string }) {
  return (
    <section class="today-notice">
      <h2>{props.title}</h2>
      <p>{props.children}</p>
    </section>
  );
}

/**
 * League (SCOPE.md, "Screens"): the standings, with each player's rank
 * emblem and a card a tap away, then the schedule, one week at a time. The
 * standings come from the weekly job, once each week settles at noon on the
 * Monday after.
 */
export function League(props: { me: Me; onPlayer?: (player: string) => void }) {
  const now = useNow();
  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<{ season?: string | null; banner?: { player: string; season: string } | null }>(leaguePath);
  const seasonId = league.data?.season ?? null;
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const season = useDoc<{ timeZone: string; regularWeeks: number; playoffs?: string }>(seasonPath);
  const bracket = useDoc<{ champion?: string | null }>(seasonPath ? `${seasonPath}/playoffs/bracket` : null);
  const standings = useDoc<{ rows?: Row[] }>(seasonPath ? `${seasonPath}/standings/current` : null);
  const weeks = useAll<WeekDoc>(seasonPath ? `${seasonPath}/weeks` : null);
  const players = useAll<{ displayName?: string; car?: Partial<CarParts>; rivals?: Record<string, Rival>; stickers?: Partial<Record<string, { until?: unknown }>>; rank?: Rank; badges?: Record<string, unknown> }>(`${leaguePath}/players`);
  const [card, setCard] = useState<string | null>(null);
  const dates = season.data ? seasonDates(now, season.data) : null;
  const today = useDoc<{ period: string; date: string; week: number; dayIndex: number }>(seasonPath && dates ? `${seasonPath}/calendar/${dates.today}` : null);

  if (league.loading || season.loading || weeks.loading) {
    return (
      <div class="waiting today-waiting" aria-busy="true">
        <div class="waiting-ring" />
        <p role="status">Getting the league</p>
      </div>
    );
  }
  if (!seasonId) return <Notice title="No season yet">Your commish sets up the season. The standings start once the first week settles.</Notice>;

  const name = (player: string) => (player === 'HOUSE' ? 'The House' : player === props.me.player ? 'You' : (players.docs.find((found) => found.id === player)?.data.displayName ?? 'Player'));
  const sorted = [...weeks.docs].sort((a, b) => a.data.week - b.data.week);
  const record = (player: string) => {
    const tally = { win: 0, draw: 0, loss: 0 };
    for (const week of sorted) {
      const result = week.data.results?.[player];
      if (result && result.outcome !== 'none') tally[result.outcome] += 1;
    }
    return `${tally.win}–${tally.draw}–${tally.loss}`;
  };
  const rows = standings.data?.rows ?? [];
  const lookOf = (player: string) => players.docs.find((found) => found.id === player)?.data;
  // Your all-time record against each player you have met, most meetings first.
  const myRivals = players.docs.find((found) => found.id === props.me.player)?.data.rivals ?? {};
  const nemesis = nemesisOf(myRivals);
  const rivals = Object.entries(myRivals).sort(([a, x], [b, y]) => y.win + y.draw + y.loss - (x.win + x.draw + x.loss) || name(a).localeCompare(name(b)));
  const skull = <span class="nemesis" role="img" aria-label="your nemesis" title="Your nemesis">💀</span>;

  return (
    <div class="league">
      <section class="panel league-panel" aria-labelledby="standings-title">
        <h2 id="standings-title">Standings</h2>
        {rows.length === 0 ? (
          <>
            <p class="panel-text">The standings start once Week 1 settles, at noon on the Monday after it ends.</p>
            <div class="league-people" role="group" aria-label="Everyone in the league">
              {players.docs
                .filter((found) => found.id !== props.me.player)
                .map((found) => (
                  <button key={found.id} type="button" class="feed-chip" onClick={() => setCard(found.id)}>
                    {found.data.displayName ?? 'Player'}
                  </button>
                ))}
            </div>
          </>
        ) : (
          <table class="standings">
            <thead>
              <tr>
                <th scope="col">
                  <span class="sr-only">Place</span>
                </th>
                <th scope="col">Player</th>
                <th scope="col" class="num">
                  <abbr title="Season Points">Pts</abbr>
                </th>
                <th scope="col" class="num">
                  <abbr title="Wins, draws and losses">W–D–L</abbr>
                </th>
                <th scope="col" class="num">
                  <abbr title="Beers this season">Beers</abbr>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr data-me={row.player === props.me.player}>
                  <td class="standings-rank">{row.rank}</td>
                  <td class="standings-who">
                    {lookOf(row.player)?.rank ? (
                      <RankBadge rank={lookOf(row.player)!.rank!} class="standings-rank-badge" />
                    ) : (
                      <span class="standings-rank-badge standings-unranked" aria-hidden="true" />
                    )}
                    <CarArt parts={lookOf(row.player)?.car} stickers={lookOf(row.player)?.stickers} rank={lookOf(row.player)?.rank} bare class="standings-car" />
                    <button
                      type="button"
                      class="standings-name"
                      aria-label={`${name(row.player)}, ${lookOf(row.player)?.rank ? RANK_NAMES[lookOf(row.player)!.rank!] : 'unranked'}`}
                      onClick={() => setCard(row.player)}
                    >
                      {name(row.player)}
                    </button>
                    {row.player === nemesis && skull}
                    {row.tieBreak && <span class="standings-tie">{TIEBREAK[row.tieBreak]}</span>}
                  </td>
                  <td class="num standings-points">{row.seasonPoints}</td>
                  <td class="num">{record(row.player)}</td>
                  <td class="num">{row.beers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p class="panel-text">Season Points are every point you score, plus 5 for a 1v1 win and 2 for a draw, and group play's bonuses.</p>
      </section>

      <Schedule weeks={weeks.docs} currentPeriod={today.data?.period ?? null} me={props.me.player} name={name} />

      {seasonPath && <Playoffs league={props.me.league} seasonPath={seasonPath} me={props.me.player} name={name} banner={league.data?.banner ?? null} />}

      {today.data && (
        <Picks
          me={props.me}
          seasonId={seasonId}
          today={today.data}
          weeks={weeks.docs as { id: string; data: { week: number; pairs?: { a: string; b: string }[] } }[]}
          name={(player) => (player === props.me.player ? 'You' : name(player))}
          now={now}
        />
      )}

      <TrophyCase me={props.me} name={name} playoffsPending={season.data && season.data.playoffs !== 'none' && !bracket.data?.champion ? seasonId : null} />

      <section class="panel league-panel" aria-labelledby="rivals-title">
        <h2 id="rivals-title">Your rivalries</h2>
        {rivals.length === 0 ? (
          <p class="panel-text">Your all-time record against each player shows here once a week you played them is final.</p>
        ) : (
          <ul class="rivals">
            {rivals.map(([player, rival]) => (
              <li key={player} data-nemesis={player === nemesis}>
                <CarArt parts={lookOf(player)?.car} stickers={lookOf(player)?.stickers} bare class="standings-car" />
                <span class="rivals-name">
                  {name(player)}
                  {player === nemesis && skull}
                </span>
                <span class="rivals-record" aria-label={`${rival.win} won, ${rival.draw} drawn, ${rival.loss} lost`}>
                  {recordText(rival)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p class="panel-text">Wins, draws and losses, every season. The skull marks your nemesis: whoever has beaten you most.</p>
      </section>

      {card && (
        <PlayerCard
          stats={(() => {
            const row = rows.find((each) => each.player === card) ?? null;
            const look = lookOf(card);
            return {
              name: card === props.me.player ? 'You' : name(card),
              rank: look?.rank ?? null,
              car: look?.car,
              stickers: look?.stickers,
              place: row?.rank ?? null,
              seasonPoints: row?.seasonPoints ?? null,
              record: record(card),
              perfectDays: row?.perfectDays ?? null,
              beers: row?.beers ?? null,
              badges: Object.keys(look?.badges ?? {}).length,
              rival: card === props.me.player ? null : (myRivals[card] ?? null),
            };
          })()}
          onDay={card === props.me.player ? undefined : () => {
            const player = card;
            setCard(null);
            props.onPlayer?.(player);
          }}
          onClose={() => setCard(null)}
        />
      )}
    </div>
  );
}
