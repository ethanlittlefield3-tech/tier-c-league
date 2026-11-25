import { useState } from 'preact/hooks';
import { localDate, type Square } from '@tcl/engine';
import { useAll } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league did not accept that.',
};

type Kind = 'dock' | 'void' | 'correct';
const SQUARES: { id: Square; name: string }[] = [
  { id: 'screen', name: 'Screen time' },
  { id: 'mind', name: 'Mind' },
  { id: 'body', name: 'Body' },
  { id: 'wildcard', name: 'Wildcard' },
];

/**
 * Fix a score (SCOPE.md, "Commish tools"): dock a point, void a square, or
 * enter a correction. The commish never edits a player's day: each fix is
 * its own record with a reason, in the league log, and can't be changed
 * afterwards. Undoing one means entering the opposite correction.
 */
export function CommishScores(props: { me: Me; seasonId: string; timeZone: string; members: string[] }) {
  const players = useAll<{ displayName?: string }>(`leagues/${props.me.league}/players`);
  const roster = players.docs.filter((found) => props.members.includes(found.id));
  const [player, setPlayer] = useState('');
  const [date, setDate] = useState(() => localDate(Date.now(), props.timeZone));
  const [kind, setKind] = useState<Kind>('dock');
  const [square, setSquare] = useState<Square>('screen');
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);

  const save = (event: Event) => {
    event.preventDefault();
    if (busy) return;
    if (!player) return setNote({ error: true, text: 'Pick a player first.' });
    if (reason.trim().length === 0) return setNote({ error: true, text: 'A reason is required. The whole league sees it.' });
    const points = kind === 'dock' ? -1 : kind === 'void' ? -1 : amount;
    setBusy(true);
    setNote(null);
    void loadData()
      .then((api) => api.adjustScore(props.me, props.seasonId, { player, date, amount: points, void: kind === 'void' ? square : null, reason }))
      .then(() => {
        setNote({ error: false, text: 'Saved, and in the league log.' });
        setReason('');
      })
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  return (
    <form class="panel" onSubmit={save} noValidate aria-labelledby="scores-title">
      <h2 id="scores-title">Fix a score</h2>
      <p class="panel-text">Each fix is its own record with a reason. It can't be changed later; to undo one, enter the opposite correction.</p>

      <p class="setup-label">
        <label for="fix-player">Player</label>
      </p>
      <select id="fix-player" class="setup-select" value={player} onChange={(event) => setPlayer(event.currentTarget.value)}>
        <option value="">Pick a player</option>
        {roster.map(({ id, data }) => (
          <option value={id}>{data.displayName ?? 'Player'}</option>
        ))}
      </select>

      <p class="setup-label">
        <label for="fix-date">Day</label>
      </p>
      <input id="fix-date" class="setup-input" type="date" value={date} onInput={(event) => setDate(event.currentTarget.value)} />

      <p class="setup-label">What to do</p>
      <div class="choice" role="group" aria-label="What to do">
        {(
          [
            ['dock', 'Dock 1 point'],
            ['void', 'Void a square'],
            ['correct', 'Correction'],
          ] as const
        ).map(([id, name]) => (
          <button type="button" class="choice-option" aria-pressed={kind === id} onClick={() => setKind(id)}>
            {name}
          </button>
        ))}
      </div>

      {kind === 'void' && (
        <>
          <p class="panel-text">The square counts as missed (screen time as not logged), and the player loses 1 more point.</p>
          <div class="choice choice-wrap" role="group" aria-label="Square">
            {SQUARES.map((option) => (
              <button type="button" class="choice-option" aria-pressed={square === option.id} onClick={() => setSquare(option.id)}>
                {option.name}
              </button>
            ))}
          </div>
        </>
      )}

      {kind === 'correct' && (
        <div class="stepper" role="group" aria-label="Points">
          <button type="button" class="step" aria-label="Points: less" disabled={amount <= -20} onClick={() => setAmount((value) => (value - 1 === 0 ? -1 : value - 1))}>
            {'−'}
          </button>
          <p class="stepper-value" aria-live="polite">
            {amount > 0 ? `+${amount}` : `−${-amount}`} <span>points</span>
          </p>
          <button type="button" class="step" aria-label="Points: more" disabled={amount >= 20} onClick={() => setAmount((value) => (value + 1 === 0 ? 1 : value + 1))}>
            +
          </button>
        </div>
      )}

      <p class="setup-label">
        <label for="fix-reason">Reason</label>
      </p>
      <input id="fix-reason" class="setup-input" type="text" maxLength={300} value={reason} onInput={(event) => setReason(event.currentTarget.value)} placeholder="Everyone sees this" />

      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
      <button class="btn" type="submit" disabled={busy}>
        {busy ? 'Saving' : 'Save the fix'}
      </button>
    </form>
  );
}
