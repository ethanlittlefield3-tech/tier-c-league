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

/**
 * Players and recovery keys (SCOPE.md, "Commish tools"): see a key, reissue
 * one (which also signs out a lost phone), name a co-commish, hand over the
 * role, and remove a player. Each goes in the league log.
 */
export function CommishPlayers(props: { me: Me; league: { commish?: string; coCommish?: string | null; members?: Record<string, boolean>; joining?: string } }) {
  const players = useAll<{ displayName?: string }>(`leagues/${props.me.league}/players`);
  const [open, setOpen] = useState<string | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);

  const members = Object.keys(props.league.members ?? {});
  const roster = players.docs.filter((found) => members.includes(found.id)).sort((a, b) => (a.data.displayName ?? '').localeCompare(b.data.displayName ?? ''));
  const nameOf = (player: string) => players.docs.find((found) => found.id === player)?.data.displayName ?? 'Player';

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
        <p class="panel-text">Whether new players can join with the league code.</p>
        <div class="choice" role="group" aria-label="Joining">
          {(['open', 'closed'] as const).map((value) => (
            <button
              type="button"
              class="choice-option"
              aria-pressed={props.league.joining === value}
              disabled={busy}
              onClick={() => run((api) => api.editLeague(props.me, { joining: value }, value === 'open' ? 'Opened the league to new players' : 'Closed the league to new players'), value === 'open' ? 'The league is open.' : 'The league is closed to new players.')}
            >
              {value === 'open' ? 'Open' : 'Closed'}
            </button>
          ))}
        </div>
      </section>

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
                          {confirm.kind === 'remove' && <><strong>Remove {data.displayName} from the league?</strong> Their phones are signed out at once. Their history stays.</>}
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
                            if (confirm.kind === 'remove') run((api) => api.removePlayer(props.me, id, `Removed ${nameOf(id)} from the league`), `${data.displayName} is out of the league.`);
                          }}
                        >
                          {confirm.kind === 'reissue' ? 'Reissue the key' : confirm.kind === 'handOver' ? 'Hand it over' : 'Remove'}
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
                              Remove from the league
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
        {note && note.text && (
          <p class={note.error ? 'field-error' : 'panel-ok'} role="status">
            {note.text}
          </p>
        )}
      </section>
    </>
  );
}
