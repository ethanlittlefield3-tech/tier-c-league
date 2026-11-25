import type { Bracket, BracketGame } from '@tcl/engine';
import { useDoc } from '../data/hooks.ts';
import { score } from '../group/words.ts';

type RoundResults = Record<string, { points: number; opponentPoints: number; outcome: string }>;

/** One game: both players with their seeds and, once settled, the score, the winner first. */
function Game(props: { game: BracketGame; seed: (player: string) => string; name: (player: string) => string; results?: RoundResults; me: string }) {
  const { game } = props;
  const mine = game.a === props.me || game.b === props.me;
  if (game.b === null) {
    return (
      <li data-me={mine}>
        {props.seed(game.a)} {props.name(game.a)} <span>has a bye</span>
      </li>
    );
  }
  const result = props.results?.[game.a];
  const [first, second] = game.winner === game.b ? [game.b, game.a] : [game.a, game.b];
  const firstScore = result ? (first === game.a ? result.points : result.opponentPoints) : null;
  const secondScore = result ? (first === game.a ? result.opponentPoints : result.points) : null;
  return (
    <li data-me={mine}>
      {props.seed(first)} {props.name(first)} {firstScore !== null && <strong>{score(firstScore)}</strong>} <span>{game.winner ? (game.decidedBy === 'suddenDeath' ? 'won in sudden death over' : 'beat') : 'vs'}</span> {props.seed(second)} {props.name(second)}{' '}
      {secondScore !== null && <strong>{score(secondScore)}</strong>}
    </li>
  );
}

/**
 * The playoffs on League (SCOPE.md, "Playoffs"): the champion on the league
 * banner, the bracket as it stands, and the Whiff Bowl, for "not last".
 */
export function Playoffs(props: { league: string; seasonPath: string; me: string; name: (player: string) => string; banner: { player: string; season: string } | null }) {
  const bracket = useDoc<Bracket>(`${props.seasonPath}/playoffs/bracket`);
  const semis = useDoc<{ results?: RoundResults }>(`${props.seasonPath}/weeks/p01`);
  const final = useDoc<{ results?: RoundResults }>(`${props.seasonPath}/weeks/p02`);
  const sudden = useDoc<{ results?: RoundResults }>(`${props.seasonPath}/weeks/p03`);
  const dare = useDoc<{ text?: string }>(`${props.seasonPath}/config/seasonDare`);
  const data = bracket.data;
  if (!data && !props.banner) return null;
  const seed = (player: string) => {
    const at = data?.seeds.indexOf(player) ?? -1;
    return at >= 0 ? `${at + 1}` : '';
  };
  const finalResults = sudden.data?.results && Object.keys(sudden.data.results).length > 0 ? sudden.data.results : final.data?.results;
  return (
    <section class="panel league-panel playoffs" aria-labelledby="playoffs-title">
      <h2 id="playoffs-title">Playoffs</h2>
      {props.banner && (
        <p class="playoffs-banner" role="note">
          Champion: <strong>{props.name(props.banner.player)}</strong>
        </p>
      )}
      {data && (
        <>
          {data.semis.length > 0 && (
            <>
              <p class="result-head">Semifinals</p>
              <ul class="pairs" aria-label="Semifinals">
                {data.semis.map((game) => (
                  <Game game={game} seed={seed} name={props.name} results={semis.data?.results} me={props.me} />
                ))}
              </ul>
            </>
          )}
          <p class="result-head">Final</p>
          {data.final ? (
            <ul class="pairs" aria-label="Final">
              <Game game={data.final} seed={seed} name={props.name} results={finalResults} me={props.me} />
            </ul>
          ) : (
            <p class="panel-text">The semifinal winners meet here, once the semifinals settle.</p>
          )}
          {data.suddenDeath && !data.champion && <p class="panel-text">The final was level: sudden death decides it. The first to miss any goal loses.</p>}
          {data.whiff && (
            <>
              <p class="result-head">Whiff Bowl</p>
              <ul class="pairs" aria-label="Whiff Bowl">
                {data.whiff.pairs.map((game) => (
                  <Game game={game} seed={() => ''} name={props.name} results={semis.data?.results} me={props.me} />
                ))}
                {data.whiff.safe.map((player) => (
                  <li data-me={player === props.me}>
                    {props.name(player)} <span>is safe</span>
                  </li>
                ))}
                {data.whiff.racers.length > 1 && !data.whiff.loser && (
                  <li data-me={data.whiff.racers.includes(props.me)}>
                    {data.whiff.racers.map(props.name).join(', ')} <span>race on the final's days: the fewest points is last</span>
                  </li>
                )}
                {data.whiff.loser && (
                  <li data-me={data.whiff.loser === props.me}>
                    {props.name(data.whiff.loser)} <span>is last{dare.data?.text ? `, and does the Season Dare: ${dare.data.text}` : ''}</span>
                  </li>
                )}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
