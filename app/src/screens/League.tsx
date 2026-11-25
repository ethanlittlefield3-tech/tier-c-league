import { useAll, useDoc, useNow } from '../data/hooks.ts';
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

interface Result {
  player: string;
  opponent: string;
  points: number;
  opponentPoints: number;
  outcome: 'win' | 'draw' | 'loss';
  seasonPoints: number;
}

interface WeekDoc {
  week: number;
  pairs?: { a: string; b: string }[];
  status?: 'provisional' | 'final';
  results?: Record<string, Result>;
  awards?: { mvp: string[]; bust: string[]; wheel: string[] };
}

const TIEBREAK: Record<string, string> = {
  headToHead: 'ahead on head-to-head',
  beers: 'ahead on fewer beers',
  perfectDays: 'ahead on perfect days',
  coinFlip: 'ahead on the sealed coin flip',
};

const points = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

function Notice(props: { title: string; children: string }) {
  return (
    <section class="today-notice">
      <h2>{props.title}</h2>
      <p>{props.children}</p>
    </section>
  );
}

/**
 * League (SCOPE.md, "Screens"): the standings, this week's matchups, results
 * and the schedule. The standings come from the weekly job, once each week
 * settles at noon on the Monday after.
 */
export function League(props: { me: Me; onPlayer?: (player: string) => void }) {
  const now = useNow();
  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<{ season?: string | null }>(leaguePath);
  const seasonId = league.data?.season ?? null;
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const season = useDoc<{ timeZone: string; regularWeeks: number }>(seasonPath);
  const standings = useDoc<{ rows?: Row[] }>(seasonPath ? `${seasonPath}/standings/current` : null);
  const weeks = useAll<WeekDoc>(seasonPath ? `${seasonPath}/weeks` : null);
  const players = useAll<{ displayName?: string }>(`${leaguePath}/players`);
  const dates = season.data ? seasonDates(now, season.data) : null;
  const today = useDoc<{ period: string }>(seasonPath && dates ? `${seasonPath}/calendar/${dates.today}` : null);

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
  const settled = sorted.filter((week) => week.data.results).reverse();
  const thisWeek = sorted.find((week) => week.id === today.data?.period) ?? null;
  const upcoming = sorted.filter((week) => !week.data.results && week.id !== thisWeek?.id);
  const record = (player: string) => {
    const tally = { win: 0, draw: 0, loss: 0 };
    for (const week of sorted) {
      const result = week.data.results?.[player];
      if (result) tally[result.outcome] += 1;
    }
    return `${tally.win}–${tally.draw}–${tally.loss}`;
  };
  const rows = standings.data?.rows ?? [];

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
                  <button key={found.id} type="button" class="feed-chip" aria-label={`${found.data.displayName ?? 'Player'}'s day`} onClick={() => props.onPlayer?.(found.id)}>
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
                  <td>
                    {row.player === props.me.player ? (
                      name(row.player)
                    ) : (
                      <button type="button" class="standings-name" aria-label={`${name(row.player)}'s day`} onClick={() => props.onPlayer?.(row.player)}>
                        {name(row.player)}
                      </button>
                    )}
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
        <p class="panel-text">Season Points are every point you score, plus 5 for a win and 2 for a draw.</p>
      </section>

      {thisWeek?.data.pairs && (
        <section class="panel league-panel" aria-labelledby="this-week-title">
          <h2 id="this-week-title">Week {thisWeek.data.week}</h2>
          <ul class="pairs">
            {thisWeek.data.pairs.map((pair) => (
              <li data-me={pair.a === props.me.player || pair.b === props.me.player}>
                {name(pair.a)} <span>vs</span> {name(pair.b)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {settled.length > 0 && (
        <section class="panel league-panel" aria-labelledby="results-title">
          <h2 id="results-title">Results</h2>
          {settled.map((week) => {
            const results = week.data.results ?? {};
            const seen = new Set<string>();
            return (
              <div class="result-week">
                <p class="result-head">
                  Week {week.data.week} <span>{week.data.status === 'final' ? 'Final' : 'Provisional'}</span>
                </p>
                <ul class="pairs">
                  {Object.values(results)
                    .filter((result) => {
                      if (seen.has(result.player)) return false;
                      seen.add(result.player);
                      seen.add(result.opponent);
                      return true;
                    })
                    .map((result) => (
                      <li data-me={result.player === props.me.player || result.opponent === props.me.player}>
                        {name(result.player)} <strong>{points(result.points)}</strong> <span>{result.outcome === 'draw' ? 'drew' : result.outcome === 'win' ? 'beat' : 'lost to'}</span> {name(result.opponent)}{' '}
                        <strong>{points(result.opponentPoints)}</strong>
                      </li>
                    ))}
                </ul>
                {week.data.awards && (
                  <p class="result-awards">
                    {week.data.awards.mvp.length > 0 && <>MVP: {week.data.awards.mvp.map(name).join(', ')}. </>}
                    {week.data.awards.bust.length > 0 && <>Bust: {week.data.awards.bust.map(name).join(', ')}. </>}
                    {week.data.awards.wheel.length > 0 && <>Spins the Wheel: {week.data.awards.wheel.map(name).join(', ')}.</>}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {upcoming.length > 0 && (
        <section class="panel league-panel" aria-labelledby="schedule-title">
          <h2 id="schedule-title">Schedule</h2>
          {upcoming.map((week) => (
            <div class="result-week">
              <p class="result-head">Week {week.data.week}</p>
              <ul class="pairs">
                {(week.data.pairs ?? []).map((pair) => (
                  <li data-me={pair.a === props.me.player || pair.b === props.me.player}>
                    {name(pair.a)} <span>vs</span> {name(pair.b)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {!thisWeek?.data.pairs && settled.length === 0 && upcoming.length === 0 && <p class="fine-print">The schedule appears after the draft.</p>}
    </div>
  );
}
