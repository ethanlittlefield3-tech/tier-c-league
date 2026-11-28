import { useState } from 'preact/hooks';
import { useDoc, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { SeasonWrapped } from './SeasonWrapped.tsx';
import { deadlineWords } from './useOffseason.ts';
import './commish.css';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no: answers close at the deadline.',
};

/**
 * Today, once the season is over (SCOPE.md, "Seasons"): the champion, and
 * Stay or Leave for the next season, by the commish's deadline. Leaving keeps
 * your car, badges and history, and you can come back in a later season.
 * Below it, your season, wrapped, to share.
 */
export function Offseason(props: { me: Me; seasonId: string; season: { name?: string; timeZone: string; champion?: string | null; par: number; kickoff: string; regularWeeks: number } }) {
  const now = useNow();
  const leaguePath = `leagues/${props.me.league}`;
  const seasonPath = `${leaguePath}/seasons/${props.seasonId}`;
  const league = useDoc<{ commish?: string }>(leaguePath);
  const config = useDoc<{ deadline?: number }>(`${seasonPath}/config/offseason`);
  const mine = useDoc<{ choice?: string }>(`${seasonPath}/stays/${props.me.player}`);
  const champion = useDoc<{ displayName?: string }>(props.season.champion ? `${leaguePath}/players/${props.season.champion}` : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (config.loading || mine.loading || league.loading) return null;
  const name = props.season.name ?? 'The season';
  const deadline = config.data?.deadline ?? null;
  const open = deadline !== null && now < deadline;
  const commish = league.data?.commish === props.me.player;
  const choice = mine.data?.choice ?? null;
  const answer = (pick: 'stay' | 'leave') => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.answerStay(props.me, props.seasonId, pick))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };
  return (
    <>
      <section class="today-notice offseason" aria-labelledby="offseason-card-title">
        <h2 id="offseason-card-title">{name} is over</h2>
        {props.season.champion && (
          <p>
            Champion: <strong>{props.season.champion === props.me.player ? 'You' : (champion.data?.displayName ?? 'a former player')}</strong>
          </p>
        )}
        {deadline === null ? (
          <p>Your commish will ask everyone whether they're staying for the next season.</p>
        ) : open ? (
          <>
            <p>
              Staying for the next season? Tap by <strong>{deadlineWords(deadline, props.season.timeZone)}</strong>. No answer counts as staying.
            </p>
            <div class="choice" role="group" aria-label="Stay or leave">
              <button type="button" class="choice-option" aria-pressed={choice === 'stay'} disabled={busy} onClick={() => answer('stay')}>
                Stay
              </button>
              <button type="button" class="choice-option" aria-pressed={choice === 'leave'} disabled={busy || commish} onClick={() => answer('leave')}>
                Leave
              </button>
            </div>
            <p class="fine-print">
              {commish
                ? 'You run the league, so you stay. To leave, hand the commish role to someone first, in Commish tools.'
                : 'Leaving keeps your car, badges and history, and the commish can bring you back in a later season.'}
            </p>
          </>
        ) : (
          <p>Stay or Leave has closed{choice === 'leave' ? ', and you chose to leave' : ''}. The commish is setting up the next season.</p>
        )}
        {error && (
          <p class="field-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <SeasonWrapped me={props.me} seasonId={props.seasonId} season={props.season} />
    </>
  );
}
