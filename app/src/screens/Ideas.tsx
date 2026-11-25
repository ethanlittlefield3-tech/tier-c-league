import { useState } from 'preact/hooks';
import { useAll, useDoc, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import type { IdeaTag } from '../data/suggestions.ts';
import { whyOf } from '../data/why.ts';
import { Back, Field, Heading } from '../ui/parts.tsx';
import { ago } from '../ui/when.ts';
import './commish.css';
import './profile.css';
import './ideas.css';

interface Idea {
  by: string;
  text: string;
  at: number | null;
  tag: IdeaTag | null;
  votes?: Record<string, boolean>;
  deleted: boolean;
}

const TAGS: Record<IdeaTag, string> = { planned: 'Planned', maybe: 'Maybe', no: 'No' };

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league said no to that.',
};

/**
 * The suggestion box (SCOPE.md, "Suggestion box"): ideas for the league, the
 * most upvoted first. Anyone posts one; the others upvote; the commish tags
 * each Planned, Maybe or No. The top ideas get a look every offseason.
 */
export function Ideas(props: { me: Me; onBack: () => void }) {
  const now = useNow();
  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<{ commish?: string; coCommish?: string | null }>(leaguePath);
  const isCommish = league.data?.commish === props.me.player || league.data?.coCommish === props.me.player;
  const ideas = useAll<Idea>(`${leaguePath}/suggestions`);
  const players = useAll<{ displayName?: string }>(`${leaguePath}/players`);
  const name = (player: string) => (player === props.me.player ? 'You' : (players.docs.find((found) => found.id === player)?.data.displayName ?? 'A former player'));
  const [text, setText] = useState('');
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const votes = (idea: Idea) => Object.values(idea.votes ?? {}).filter(Boolean).length;
  const shown = ideas.docs.filter((found) => !found.data.deleted).sort((a, b) => votes(b.data) - votes(a.data) || (b.data.at ?? now) - (a.data.at ?? now));

  const act = (work: (api: Awaited<ReturnType<typeof loadData>>) => Promise<unknown>) => {
    void loadData()
      .then(work)
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }));
  };

  const post = (event: Event) => {
    event.preventDefault();
    const words = text.trim();
    if (!words) return setNote({ error: true, text: 'Type your idea first.' });
    if (words.length > 280) return setNote({ error: true, text: 'That is too long. An idea can be up to 280 characters.' });
    if (busy) return;
    setBusy(true);
    setNote(null);
    void loadData()
      .then((api) => api.postIdea(props.me, words))
      .then(() => {
        setText('');
        setNote({ error: false, text: 'Posted. Thanks for the idea.' });
      })
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  return (
    <main class="screen profile ideas">
      <div class="screen-body">
        <Back onBack={props.onBack} />
        <Heading>Suggestion box</Heading>
        <p class="lead">Ideas for the league. Upvote the ones you like. The commish tags each one Planned, Maybe or No, and the top ideas get a look every offseason.</p>

        <form class="panel" onSubmit={post} noValidate>
          <Field id="idea-text" label="Your idea" value={text} onInput={setText} maxLength={300} help="Up to 280 characters." />
          <button class="btn" type="submit" disabled={busy}>
            {busy ? 'Posting' : 'Post it'}
          </button>
          {note && (
            <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
              {note.text}
            </p>
          )}
        </form>

        {ideas.loading ? null : shown.length === 0 ? (
          <p class="fine-print">No ideas yet. Be the first.</p>
        ) : (
          <ul class="ideas-list" aria-label="Ideas">
            {shown.map(({ id, data }) => {
              const own = data.by === props.me.player;
              const mine = data.votes?.[props.me.player] === true;
              const count = votes(data);
              return (
                <li key={id} class="idea">
                  <article aria-label={`Idea from ${name(data.by)}`}>
                    <p class="idea-text">{data.text}</p>
                    <p class="idea-meta">
                      {name(data.by)} · {data.at === null ? 'now' : ago(now - data.at)}
                      {data.tag && (
                        <span class="idea-tag" data-tag={data.tag}>
                          {TAGS[data.tag]}
                        </span>
                      )}
                    </p>
                    <div class="idea-actions">
                      <button
                        type="button"
                        class="idea-vote"
                        aria-pressed={mine}
                        disabled={own}
                        aria-label={own ? `Your idea, ${count} upvote${count === 1 ? '' : 's'}` : `Upvote, ${count}`}
                        onClick={() => act((api) => api.upvoteIdea(props.me, id, !mine))}
                      >
                        <span aria-hidden="true">▲</span> {count}
                      </button>
                      {(own || isCommish) && (
                        <button type="button" class="feed-link feed-link-quiet" onClick={() => act((api) => api.takeDownIdea(props.me, id, own))}>
                          Take down
                        </button>
                      )}
                    </div>
                    {isCommish && (
                      <div class="choice idea-tags" role="group" aria-label="Tag">
                        {(Object.keys(TAGS) as IdeaTag[]).map((tag) => (
                          <button key={tag} type="button" class="choice-option" aria-pressed={data.tag === tag} onClick={() => act((api) => api.tagIdea(props.me, id, data.tag === tag ? null : tag))}>
                            {TAGS[tag]}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
