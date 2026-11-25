import { useState } from 'preact/hooks';
import { STARTER_DARES } from '@tcl/engine';
import { useAll, useDoc } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { whyOf } from '../data/why.ts';

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no: the Season Dare is fixed once the playoffs are seeded.',
};

/**
 * Commish tools, the Season Dare (SCOPE.md, "Playoffs"): before the playoffs,
 * the commish picks the dare the Whiff Bowl's loser does, from the pool:
 * the starter dares still on the Wheel and the draft's dares. Left unpicked,
 * the Whiff Bowl's loser spins the Wheel as usual.
 */
export function CommishSeasonDare(props: { me: Me; seasonId: string }) {
  const seasonPath = `leagues/${props.me.league}/seasons/${props.seasonId}`;
  const picked = useDoc<{ text?: string }>(`${seasonPath}/config/seasonDare`);
  const bracket = useDoc<{ seeds?: string[] }>(`${seasonPath}/playoffs/bracket`);
  const wheel = useDoc<{ removedStarters?: number[] }>(`${seasonPath}/config/wheel`);
  const dares = useAll<{ text?: string; removed?: boolean }>(`${seasonPath}/dares`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (picked.loading || bracket.loading) return null;
  const removed = wheel.data?.removedStarters ?? [];
  const pool = [
    ...STARTER_DARES.filter((_, at) => !removed.includes(at)),
    ...dares.docs.filter((found) => !found.data.removed && found.data.text).map((found) => found.data.text!),
  ];
  const fixed = bracket.data !== null;
  const pick = (text: string) => {
    if (busy || fixed) return;
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.setSeasonDare(props.me, props.seasonId, text))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };
  return (
    <section class="panel" aria-labelledby="season-dare-title">
      <h2 id="season-dare-title">Season Dare</h2>
      <p class="panel-text">
        {picked.data?.text ? (
          <>
            The Whiff Bowl's loser does: <strong>{picked.data.text}</strong>
          </>
        ) : (
          "Pick the dare the Whiff Bowl's loser does. Left unpicked, they spin the Wheel as usual."
        )}
      </p>
      {fixed ? (
        <p class="fine-print">The playoffs are seeded, so the Season Dare is fixed.</p>
      ) : (
        <div class="choice choice-wrap" role="group" aria-label="The dare pool">
          {pool.map((text) => (
            <button type="button" class="choice-option" aria-pressed={picked.data?.text === text} disabled={busy} onClick={() => pick(text)}>
              {text}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
