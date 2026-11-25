import { useState } from 'preact/hooks';
import { receiptStatus, type Square, type StoredReceipt } from '@tcl/engine';
import { useDoc } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';
import { weekday } from '../feed/events.ts';
import { shrinkPhoto } from '../receipts/photo.ts';
import { timeLeft } from '../ui/when.ts';
import './receipts.css';

const WHAT: Record<Square, string> = { screen: 'your screen time', mind: 'your Mind goal', body: 'your Body goal', wildcard: 'your Wildcard goal' };

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'That was not accepted. The deadline may have passed.',
};

type Asked = { id: string; data: StoredReceipt & { by?: string } };

/**
 * Receipts asked of you (SCOPE.md, "Receipts on demand"): prove the square
 * with a photo before the deadline, or back down for free (ruling R4).
 * No answer in time voids the square and costs 1 more point.
 */
export function ReceiptsDue(props: { me: Me; seasonId: string; now: number; receipts: Asked[] }) {
  const pending = props.receipts.filter((found) => receiptStatus({ ...found.data, now: props.now }) === 'pending');
  if (pending.length === 0) return null;
  return (
    <section class="receipts-due" aria-labelledby="receipts-due-title">
      <h2 id="receipts-due-title" class="sr-only">
        Receipts asked of you
      </h2>
      {pending.map((found) => (
        <DueCard key={found.id} me={props.me} seasonId={props.seasonId} now={props.now} id={found.id} receipt={found.data} />
      ))}
    </section>
  );
}

function DueCard(props: { me: Me; seasonId: string; now: number; id: string; receipt: StoredReceipt & { by?: string } }) {
  const asker = useDoc<{ displayName?: string }>(props.receipt.by ? `leagues/${props.me.league}/players/${props.receipt.by}` : null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);
  const { receipt } = props;

  const upload = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || busy) return;
    setBusy(true);
    setNote({ error: false, text: 'Shrinking the photo and sending it…' });
    void shrinkPhoto(file)
      .then((photo) => loadData().then((api) => api.proveReceipt(props.me, props.seasonId, props.id, photo)))
      .then(() => setNote({ error: false, text: 'Proof sent.' }))
      .catch((failure: unknown) => setNote({ error: true, text: failure instanceof Error && !('why' in failure) ? failure.message : TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  const backDown = () => {
    setBusy(true);
    void loadData()
      .then((api) => api.backDown(props.me, props.seasonId, props.id))
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  return (
    <div class="receipt-due" role="group" aria-label={`Receipts on ${WHAT[receipt.square]}`}>
      <p class="receipt-due-text">
        <strong>{asker.data?.displayName ?? 'Someone'}</strong> wants proof of {WHAT[receipt.square]} for {weekday(receipt.date)}. Due in{' '}
        <strong>{timeLeft(receipt.deadline - props.now)}</strong>.
      </p>
      {receipt.square === 'screen' && <p class="receipt-due-hint">If the number is off, fix it first: tap Screen time.</p>}
      {confirm ? (
        <div class="receipt-due-buttons">
          <p class="receipt-due-hint">Back down? The square stops counting, and you lose nothing more.</p>
          <button type="button" class="btn btn-danger" disabled={busy} onClick={backDown}>
            Back down
          </button>
          <button type="button" class="btn-quiet" onClick={() => setConfirm(false)}>
            Keep it
          </button>
        </div>
      ) : (
        <div class="receipt-due-buttons">
          <label class="btn receipt-upload" data-busy={busy}>
            Upload proof
            <input type="file" accept="image/*" class="sr-only" disabled={busy} onChange={upload} />
          </label>
          <button type="button" class="btn-quiet" disabled={busy} onClick={() => setConfirm(true)}>
            Back down
          </button>
        </div>
      )}
      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
    </div>
  );
}
