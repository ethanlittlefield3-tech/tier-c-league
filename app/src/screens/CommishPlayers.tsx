import { useState } from 'preact/hooks';
import { useAll } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league did not accept that.',
};

type Confirm = { kind: 'reissue' | 'handOver' | 'remove'; player: string } | null;

type Joining = 'open' | 'approval' | 'closed';

const JOINING: Record<Joining, { label: string; reason: string; done: string }> = {
  open: { label: 'Open', reason: 'Opened the league to new players', done: 'The league is open.' },
  approval: { label: 'With my approval', reason: 'Made new players ask to join', done: 'New players ask you first. Let them in below.' },
  closed: { label: 'Closed', reason: 'Closed the league to new players', done: 'The league is closed to new players.' },
};

interface JoinRequest {
  displayName?: string;
  at?: number;
  approved?: boolean;
  declined?: boolean;
}

/**
 * Players and recovery keys (SCOPE.md, "Commish tools"): see a key, reissue
 * one (which also signs out a lost phone), name a co-commish, hand over the
 * role, and remove a player. Each goes in the league log.
 */
export function CommishPlayers(props: { me: Me; league: { commish?: string; coCommish?: string | null; members?: Record<string, boolean>; former?: Record<string, string>; joining?: string; season?: string | null } }) {
  const players = useAll<{ displayName?: string }>(`leagues/${props.me.league}/players`);
  const requests = useAll<JoinRequest>(`leagues/${props.me.league}/joinRequests`);
  const [open, setOpen] = useState<string | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);

  const members = Object.keys(props.league.members ?? {});
  const roster = players.docs.filter((found) => members.includes(found.id)).sort((a, b) => (a.data.displayName ?? '').localeCompare(b.data.displayName ?? ''));
  const nameOf = (player: string) => players.docs.find((found) => found.id === player)?.data.displayName ?? 'Player';
  const waiting = requests.docs.filter((found) => found.data.approved !== true && found.data.declined !== true).sort((a, b) => (a.data.at ?? 0) - (b.data.at ?? 0));
  const full = members.length >= 12;
  // Players who left in an offseason: their profile stays, and they can come back.
  const former = Object.entries(props.league.former ?? {}).filter(([player]) => !members.includes(player));

  const run = (work: (api: Awaited<ReturnType<typeof loadData>>) => Promise<unknown>, done: string) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    void loadData()
      .then(work)
      .then(() => {
        setNote({ error: false, text: done });
        setConfirm(null);
      })
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  const showKey = (player: string) =>
    run(async (api) => {
      const key = await api.keyOf(props.me, player);
      setKeys((before) => ({ ...before, [player]: key }));
    }, '');

  return (
    <>
      <section class="panel" aria-labelledby="joining-title">
        <h2 id="joining-title">Joining</h2>
        <p class="panel-text">Who can join with the league code. With your approval, each new player asks first and you let them in.</p>
        <div class="choice" role="group" aria-label="Joining">
          {(['open', 'approval', 'closed'] as const).map((value) => (
            <button
              type="button"
              class="choice-option"
              aria-pressed={props.league.joining === value}
              disabled={busy}
              onClick={() => run((api) => api.editLeague(props.me, { joining: value }, JOINING[value].reason), JOINING[value].done)}
            >
              {JOINING[value].label}
            </button>
          ))}
        </div>
      </section>

      {waiting.length > 0 && (
        <section class="panel" aria-labelledby="waiting-title">
          <h2 id="waiting-title">Waiting to join</h2>
          <p class="panel-text">
            {props.league.joining === 'closed'
              ? 'The league is closed, so nobody gets in. Open it, or switch to With my approval, to let them in.'
              : full
                ? 'The league is full (12 players), so nobody else can join.'
                : 'They typed the league code and a name. Let in only people you know.'}
          </p>
          <ul class="people">
            {waiting.map(({ id, data }) => (
              <li key={id} class="join-request">
                <p class="join-request-name">{data.displayName ?? 'Someone'}</p>
                <div class="person-actions">
                  <button
                    type="button"
                    class="btn"
                    disabled={busy || props.league.joining === 'closed' || full}
                    aria-label={`Let ${data.displayName ?? 'them'} in`}
                    onClick={() => run((api) => api.answerJoin(props.me, id, data.displayName ?? 'Someone', true), `${data.displayName ?? 'They'} can join now. Their phone finishes it.`)}
                  >
                    Let in
                  </button>
                  <button
                    type="button"
                    class="btn-quiet person-remove"
                    disabled={busy}
                    aria-label={`Turn ${data.displayName ?? 'them'} away`}
                    onClick={() => run((api) => api.answerJoin(props.me, id, data.displayName ?? 'Someone', false), `Turned ${data.displayName ?? 'them'} away.`)}
                  >
                    Turn away
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section class="panel" aria-labelledby="players-title">
        <h2 id="players-title">Players and keys</h2>
        <p class="panel-text">Tap a player for their recovery key and the commish tools.</p>
        <ul class="people">
          {roster.map(({ id, data }) => {
            const role = id === props.league.commish ? 'Commish' : id === props.league.coCommish ? 'Co-commish' : '';
            return (
              <li key={id}>
                <button type="button" class="person" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
                  <span>{data.displayName ?? 'Player'}</span>
                  {role && <span class="person-role">{role}</span>}
                </button>
                {open === id && (
                  <div class="person-tools">
                    {keys[id] ? (
                      <p class="commish-key" aria-label={`Recovery key: ${keys[id]!.split('').join(' ')}`}>
                        {keys[id]}
                      </p>
                    ) : (
                      <button type="button" class="btn btn-second" disabled={busy} onClick={() => showKey(id)}>
                        Show key
                      </button>
                    )}
                    {confirm?.player === id ? (
                      <div class="person-confirm">
                        <p class="panel-text">
                          {confirm.kind === 'reissue' && <><strong>Reissue {data.displayName}'s key?</strong> Every phone they are on is signed out, a lost one included. They get back in with the new key.</>}
                          {confirm.kind === 'handOver' && <><strong>Hand the commish role to {data.displayName}?</strong> You become co-commish.</>}
                          {confirm.kind === 'remove' && <><strong>Mark {data.displayName} as left?</strong> Their phones are signed out at once. Their matchups stay and score as if they did nothing, so their opponents win, and they're out of MVP, the Bust and the Wheel. You can bring them back from Former players.</>}
                        </p>
                        <button
                          type="button"
                          class={confirm.kind === 'remove' ? 'btn btn-danger' : 'btn'}
                          disabled={busy}
                          onClick={() => {
                            if (confirm.kind === 'reissue') {
                              run(async (api) => {
                                const key = await api.reissueKey(props.me, id, `Reissued ${nameOf(id)}'s recovery key`);
                                setKeys((before) => ({ ...before, [id]: key }));
                              }, `${data.displayName} has a new key, shown above. Send it to them.`);
                            }
                            if (confirm.kind === 'handOver') run((api) => api.editLeague(props.me, { commish: id, coCommish: props.me.player }, `Handed the commish role to ${nameOf(id)}`), `${data.displayName} is now the commish.`);
                            if (confirm.kind === 'remove') run((api) => api.removePlayer(props.me, id, `Marked ${nameOf(id)} as left`, props.league.season ?? null), `${data.displayName} is marked as left.`);
                          }}
                        >
                          {confirm.kind === 'reissue' ? 'Reissue the key' : confirm.kind === 'handOver' ? 'Hand it over' : 'Mark as left'}
                        </button>
                        <button type="button" class="btn-quiet" onClick={() => setConfirm(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div class="person-actions">
                        <button type="button" class="btn btn-second" disabled={busy} onClick={() => setConfirm({ kind: 'reissue', player: id })}>
                          Reissue key
                        </button>
                        {id !== props.league.commish && (
                          <>
                            <button
                              type="button"
                              class="btn btn-second"
                              disabled={busy}
                              onClick={() =>
                                run(
                                  (api) => api.editLeague(props.me, { coCommish: id === props.league.coCommish ? null : id }, id === props.league.coCommish ? `${nameOf(id)} is no longer co-commish` : `Named ${nameOf(id)} co-commish`),
                                  id === props.league.coCommish ? `${data.displayName} is no longer co-commish.` : `${data.displayName} is co-commish.`,
                                )
                              }
                            >
                              {id === props.league.coCommish ? 'Remove as co-commish' : 'Make co-commish'}
                            </button>
                            {props.me.player === props.league.commish && (
                              <button type="button" class="btn btn-second" disabled={busy} onClick={() => setConfirm({ kind: 'handOver', player: id })}>
                                Hand over the commish role
                              </button>
                            )}
                            <button type="button" class="btn-quiet person-remove" disabled={busy} onClick={() => setConfirm({ kind: 'remove', player: id })}>
                              Mark as left
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {former.length > 0 && (
          <>
            <p class="setup-label">Former players</p>
            <ul class="people" aria-label="Former players">
              {former.map(([id, season]) => (
                <li key={id} class="person-former">
                  <span>
                    {nameOf(id)} <small>{season ? `left in Season ${season.replace(/^s/, '')}` : 'left the league'}</small>
                  </span>
                  <button
                    type="button"
                    class="btn btn-second"
                    disabled={busy || full}
                    onClick={() =>
                      run(async (api) => {
                        const key = await api.bringBack(props.me, id, nameOf(id));
                        setKeys((before) => ({ ...before, [id]: key }));
                        setOpen(id);
                      }, `${nameOf(id)} is back in the league, with a new key, shown above. Send it to them.`)
                    }
                  >
                    Bring back
                  </button>
                </li>
              ))}
            </ul>
            {full && <p class="fine-print">The league is full at 12 players.</p>}
          </>
        )}
        {note && note.text && (
          <p class={note.error ? 'field-error' : 'panel-ok'} role="status">
            {note.text}
          </p>
        )}
      </section>
    </>
  );
}
