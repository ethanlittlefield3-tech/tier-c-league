import { useState } from 'preact/hooks';
import { GROUP_MODES, MODE_BLURBS, MODE_NAMES, groupWeekModes, modeStandings, validRanking, type GroupMode } from '@tcl/engine';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The group-play vote has closed.',
};

/** The live tally: which mode each group-play week gets, if the vote closed now. */
export function GroupWeeks(props: { groupWeeks: number[]; rankings: Record<string, unknown>; commish: string | null; label: string }) {
  const weeks = groupWeekModes(props.groupWeeks, modeStandings(props.rankings, props.commish));
  const listed = Object.entries(weeks);
  if (listed.length === 0) return null;
  return (
    <ul class="draft-modes" aria-label={props.label}>
      {listed.map(([week, mode]) => (
        <li key={week}>
          Week {week}: <strong>{MODE_NAMES[mode]}</strong>
        </li>
      ))}
    </ul>
  );
}

/**
 * The group-play vote (SCOPE.md, draft step 3): rank the six modes, most
 * wanted first. The top-ranked fill the season's group-play weeks, the top
 * one first; a tie goes to the commish's own ranking.
 */
export function ModeVote(props: { me: Me; seasonId: string; groupWeeks: number[]; rankings: Record<string, unknown>; commish: string | null }) {
  const saved = props.rankings[props.me.player];
  const [draft, setDraft] = useState<GroupMode[] | null>(null);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);
  const ranking: GroupMode[] = draft ?? (validRanking(saved) ? saved : [...GROUP_MODES]);

  const save = (next: GroupMode[]) => {
    setDraft(next);
    setNote(null);
    void loadData()
      .then((api) => api.voteModes(props.me, props.seasonId, next))
      .then(() => setNote({ error: false, text: 'Your ranking is in.' }))
      .catch((failure: unknown) => {
        setDraft(null);
        setNote({ error: true, text: TROUBLE[whyOf(failure)] });
      });
  };
  const move = (at: number, by: number) => {
    const next = [...ranking];
    const [mode] = next.splice(at, 1);
    next.splice(at + by, 0, mode!);
    save(next);
  };

  return (
    <section class="panel draft-mode-vote" aria-labelledby="mode-vote-title">
      <h2 id="mode-vote-title">Group play</h2>
      <p class="panel-text">
        Rank the six modes, most wanted first. The top-ranked fill {props.groupWeeks.length === 1 ? `Week ${props.groupWeeks[0]}` : `Weeks ${props.groupWeeks.join(' and ')}`}, the top one first; the commish's ranking breaks a tie.
      </p>
      <ol class="mode-ranking" aria-label="Your ranking">
        {ranking.map((mode, at) => (
          <li key={mode}>
            <span class="mode-place" aria-hidden="true">
              {at + 1}
            </span>
            <span class="mode-words">
              <strong>{MODE_NAMES[mode]}</strong>
              <span>{MODE_BLURBS[mode]}</span>
            </span>
            <span class="mode-moves">
              <button type="button" class="mode-move" aria-label={`Move ${MODE_NAMES[mode]} up`} disabled={at === 0} onClick={() => move(at, -1)}>
                ▲
              </button>
              <button type="button" class="mode-move" aria-label={`Move ${MODE_NAMES[mode]} down`} disabled={at === ranking.length - 1} onClick={() => move(at, 1)}>
                ▼
              </button>
            </span>
          </li>
        ))}
      </ol>
      {!validRanking(saved) && !draft && (
        <button type="button" class="btn btn-second" onClick={() => save(ranking)}>
          Keep this order
        </button>
      )}
      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
      <h3 class="mode-leading">If the vote closed now</h3>
      <GroupWeeks groupWeeks={props.groupWeeks} rankings={props.rankings} commish={props.commish} label="Leading modes" />
    </section>
  );
}
