import { TROPHIES, type TrophyId } from '@tcl/engine';
import { useAll } from '../data/hooks.ts';
import type { Me } from '../data/identity.ts';

interface Case {
  season: string;
  name: string;
  trophies: Partial<Record<TrophyId, { winners: string[]; value: number }>>;
}

/** "1 h 20m a day", "45 min a day". */
const screen = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60}m a day` : `${minutes} min a day`);

/** The trophies the playoffs decide. */
const PLAYOFF_TROPHIES: TrophyId[] = ['champion', 'finalist', 'whiffBowl'];

const VALUE: Record<TrophyId, (value: number) => string> = {
  champion: () => '',
  finalist: () => '',
  whiffBowl: () => '',
  leader: (value) => `${value} Season Points`,
  screenTimeKing: screen,
  ironStreak: (value) => `${value} days in a row`,
  demolitionDerby: (value) => `${value} landed`,
  brewmaster: (value) => `${value} beers`,
  prophet: (value) => `${value} right`,
  mvp: (value) => `${value} MVPs`,
};

/** A small gold cup, drawn for this app. */
function Cup() {
  return (
    <svg class="trophy-cup" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3H17V9Q17 14 12 14Q7 14 7 9Z" fill="#ffcf3f" stroke="#050914" stroke-width="1.4" stroke-linejoin="round" />
      <path d="M7 5H4Q4 10 8 10M17 5H20Q20 10 16 10" fill="none" stroke="#050914" stroke-width="1.4" />
      <path d="M10 14H14V17H10ZM8 20Q8 17 12 17Q16 17 16 20Z" fill="#b07d00" stroke="#050914" stroke-width="1.4" stroke-linejoin="round" />
    </svg>
  );
}

/**
 * The trophy case (SCOPE.md, "Season trophy case"): every season's awards,
 * newest first, kept for good. The playoff trophies join once the playoffs decide them.
 */
export function TrophyCase(props: { me: Me; name: (player: string) => string; /** The season whose playoffs are still to come or under way. */ playoffsPending?: string | null }) {
  const seasons = useAll<Case>(`leagues/${props.me.league}/trophies`);
  const sorted = [...seasons.docs].sort((a, b) => Number(b.id.replace(/\D/g, '')) - Number(a.id.replace(/\D/g, '')));
  return (
    <section class="panel league-panel" aria-labelledby="trophies-title">
      <h2 id="trophies-title">Trophy case</h2>
      {sorted.length === 0 ? (
        <p class="panel-text">Each season's trophies land here once its last regular week is final, and stay for good.</p>
      ) : (
        sorted.map(({ id, data }) => (
          <div key={id} class="trophy-season">
            <h3>{data.name}</h3>
            <ul class="trophies" aria-label={`${data.name} trophies`}>
              {TROPHIES.map((trophy) => {
                const won = data.trophies[trophy.id];
                return (
                  <li key={trophy.id} data-later={trophy.later ? 'true' : undefined}>
                    <Cup />
                    <span class="trophy-name">{trophy.name}</span>
                    <span class="trophy-who">
                      {won ? `${won.winners.map(props.name).join(' and ')}${VALUE[trophy.id](won.value) ? `, ${VALUE[trophy.id](won.value)}` : ''}` : PLAYOFF_TROPHIES.includes(trophy.id) && props.playoffsPending === id ? 'Decided in the playoffs' : 'Nobody this season'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
