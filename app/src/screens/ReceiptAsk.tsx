import { useState } from 'preact/hooks';
import { canRequestReceipt, isRestDay, receiptDue, receiptStatus, type Lane, type Square, type StoredReceipt } from '@tcl/engine';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { formatScreenShort } from '../today/model.ts';
import type { KitPlay } from '../today/week.ts';
import { timeLeft } from '../ui/when.ts';
import type { ReceiptDay } from './useMatchup.ts';
import './receipts.css';

const SQUARES: Square[] = ['screen', 'mind', 'body', 'wildcard'];
const NAME: Record<Square, string> = { screen: 'Screen time', mind: 'Mind', body: 'Body', wildcard: 'Wildcard' };

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'That request was not accepted. The day may have locked, or the square changed.',
};

type Asked = { id: string; data: StoredReceipt & { by?: string; slot?: string; target?: string } };
type Log = { goals?: Partial<Record<Lane, boolean>>; screenMinutes?: number | null };

/**
 * Receipts? (SCOPE.md, "Receipts on demand"): ask your opponent to prove a
 * square they claimed, today or yesterday until it locks at noon. 3 requests
 * a week. On Game Day it folds into a slim bar until tapped (the commish's
 * request, 2026-11-27); from League, it is open.
 */
export function ReceiptAsk(props: {
  me: Me;
  seasonId: string;
  now: number;
  timeZone: string;
  today: string;
  them: { id: string; name: string; goals: Partial<Record<Lane, { text?: string }>>; kit: KitPlay[] };
  days: ReceiptDay[];
  logs: Record<string, Log>;
  theirReceipts: Asked[];
  myRequests: Asked[];
  /** Start folded into a slim bar that opens on a tap. */
  folded?: boolean;
}) {
  const [open, setOpen] = useState(!props.folded);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);
  // `url` is null while loading, and 'gone' once the photo has been deleted after 14 days.
  const [photo, setPhoto] = useState<{ id: string; url: string | null } | null>(null);

  const used = (period: string) =>
    props.myRequests.map((found) => found.data.slot ?? '').filter((slot) => slot.startsWith(`${period}_${props.me.player}_`)).map((slot) => Number(slot.slice(slot.lastIndexOf('_') + 1)));
  const freeSlot = (period: string) => [1, 2, 3].find((n) => !used(period).includes(n)) ?? null;
  const thisPeriod = props.days.find((day) => day.date === props.today)?.period ?? props.days[0]?.period ?? null;

  const ask = (day: ReceiptDay, square: Square) => {
    const slot = freeSlot(day.period);
    if (busy || slot === null) return;
    setBusy(true);
    setNote(null);
    const deadline = receiptDue(day, Date.now());
    void loadData()
      .then((api) => api.askForReceipts(props.me, props.seasonId, { target: props.them.id, date: day.date, square, period: day.period, slot, deadline }))
      .then(() => setNote({ error: false, text: `Asked. ${props.them.name} has ${timeLeft(deadline - Date.now())} to prove it.` }))
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  const seeProof = (id: string) => {
    setPhoto({ id, url: null });
    void loadData()
      .then((api) => api.peekDoc(`leagues/${props.me.league}/seasons/${props.seasonId}/proofs/${id}`))
      .then((found) => setPhoto({ id, url: typeof found?.photo === 'string' ? found.photo : 'gone' }));
  };

  const label = (square: Square, log: Log) => (square === 'screen' ? `Screen time · ${formatScreenShort(log.screenMinutes ?? null)}` : `${NAME[square]} · ${props.them.goals[square]?.text ?? 'goal'}`);

  const left = thisPeriod ? 3 - used(thisPeriod).length : null;
  const waiting = props.theirReceipts.filter((found) => receiptStatus({ ...found.data, now: props.now }) === 'pending').length;

  return (
    <section class="panel receipts" data-folded={props.folded ? !open : undefined} aria-labelledby="receipts-title">
      {props.folded ? (
        <h2 class="receipts-head">
          <button type="button" class="receipts-bar" aria-expanded={open} aria-controls="receipts-body" onClick={() => setOpen(!open)}>
            <span id="receipts-title">Receipts?</span>
            <span class="receipts-bar-note">
              Ask {props.them.name} for proof{left !== null ? ` \u00b7 ${left} of 3 left` : ''}
              {waiting > 0 ? ` \u00b7 ${waiting} waiting` : ''}
            </span>
            <svg class="receipts-chevron" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </h2>
      ) : (
        <>
          <h2 id="receipts-title">Receipts?</h2>
          <p class="panel-text">
            Ask {props.them.name} to prove a square. {left !== null ? `You have ${left} of 3 requests left this week.` : ''}
          </p>
        </>
      )}
      {open && (
      <div id="receipts-body" class="receipts-body">
      {props.days.length === 0 && <p class="panel-text">No day is open to receipts right now.</p>}
      {props.days.map((day) => {
        const log = props.logs[day.date] ?? {};
        const restPlay = props.them.kit.find((play) => play.item === 'rest' && play.period === day.period);
        const rest = isRestDay({ date: day.date, calendar: day, restDate: restPlay?.date ?? null });
        const claimed = SQUARES.filter((square) => (square === 'screen' ? log.screenMinutes !== null && log.screenMinutes !== undefined : log.goals?.[square] === true));
        return (
          <div class="receipt-day" key={day.date}>
            <h3>{day.date === props.today ? 'Today' : 'Yesterday, until noon'}</h3>
            {claimed.length === 0 && <p class="panel-text">Nothing claimed yet.</p>}
            {claimed.map((square) => {
              const id = `${props.them.id}_${day.date}_${square}`;
              const asked = props.theirReceipts.find((found) => found.id === id);
              if (asked) {
                const status = receiptStatus({ ...asked.data, now: props.now });
                return (
                  <div class="receipt-row" key={square} data-status={status}>
                    <span class="receipt-what">{label(square, log)}</span>
                    <span class="receipt-state">
                      {status === 'pending' ? `Asked · due in ${timeLeft(asked.data.deadline - props.now)}` : status === 'proven' ? 'Proven' : status === 'backedDown' ? 'Backed down: voided' : 'No proof: voided, −1'}
                    </span>
                    {status === 'proven' && (
                      <button type="button" class="feed-link" onClick={() => seeProof(id)}>
                        See proof
                      </button>
                    )}
                  </div>
                );
              }
              const verdict = canRequestReceipt({
                target: day.date,
                square,
                timeZone: props.timeZone,
                now: props.now,
                ownDay: false,
                restDay: rest,
                claimed: true,
                alreadyRequested: false,
                usedThisWeek: used(day.period).length,
                // The day's own times, which a fast test league's days only have.
                window: { start: day.start, lock: day.lock },
              });
              return (
                <div class="receipt-row" key={square}>
                  <span class="receipt-what">{label(square, log)}</span>
                  <button type="button" class="receipt-ask" disabled={busy || !verdict.ok} aria-label={`Ask for receipts: ${label(square, log)}`} onClick={() => ask(day, square)}>
                    Receipts?
                  </button>
                  {!verdict.ok && <span class="receipt-why">{verdict.reason}</span>}
                </div>
              );
            })}
          </div>
        );
      })}
      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
      {photo && (
        <figure class="receipt-proof">
          {photo.url === 'gone' ? (
            <p class="panel-text">The photo is gone: proof photos are deleted after 14 days.</p>
          ) : photo.url ? (
            <img src={photo.url} alt={`${props.them.name}'s proof`} />
          ) : (
            <p class="panel-text">Getting the photo…</p>
          )}
          <button type="button" class="btn-quiet" onClick={() => setPhoto(null)}>
            Close
          </button>
        </figure>
      )}
      </div>
      )}
    </section>
  );
}
