import { useState } from 'preact/hooks';
import { useAll, useDoc, useLatest, useNow } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import type { PostKind, Reaction } from '../data/wall.ts';
import { whyOf } from '../data/why.ts';
import { POST_MAX, QUICK_CHAT, SAVED_TAUNTS_MAX, TAUNT_MAX, fillName } from '../feed/words.ts';
import { Field } from '../ui/parts.tsx';
import { ago } from '../ui/when.ts';
import { useOpponent } from './useOpponent.ts';
import './feed.css';

interface Post {
  by: string;
  kind: PostKind;
  text: string;
  to: string | null;
  at: number | null;
  deleted: boolean;
  reactions?: Record<string, Reaction>;
}

interface Comment {
  by: string;
  text: string;
  at: number | null;
  deleted: boolean;
}

const KIND: Record<PostKind, string> = { quick: 'Quick chat', taunt: 'Taunt', brag: 'Brag' };

const REACTIONS: { key: keyof Reaction; label: string; glyph: string }[] = [
  { key: 'fire', label: 'Fire', glyph: '🔥' },
  { key: 'skull', label: 'Skull', glyph: '💀' },
  { key: 'beer', label: 'Beer', glyph: '🍺' },
];

const TROUBLE: Record<Trouble, string> = {
  'not-open': 'The league is not open yet.',
  offline: 'No answer from the league. Check your signal and try again.',
  refused: 'The league did not accept that.',
};

/** The people in the league, by id, with a name for anyone who has left. */
type Names = (player: string) => string;

/**
 * Feed (SCOPE.md, "Live rivalry and social"): this week's opponent is one tap
 * from a taunt, brags get comments, and every post takes fire, skull and beer
 * reactions. The newest 50 posts, live.
 */
export function Feed(props: { me: Me }) {
  const now = useNow();
  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<{ commish?: string; coCommish?: string | null }>(leaguePath);
  const players = useAll<{ displayName?: string; taunts?: string[] }>(`${leaguePath}/players`);
  const posts = useLatest<Post>(`${leaguePath}/wall`, 'at', 50);
  const opponent = useOpponent(props.me, now);
  const isCommish = league.data?.commish === props.me.player || league.data?.coCommish === props.me.player;

  const realName: Names = (player) => players.docs.find((found) => found.id === player)?.data.displayName ?? 'a former player';
  const name: Names = (player) => (player === props.me.player ? 'You' : realName(player));
  const saved = players.docs.find((found) => found.id === props.me.player)?.data.taunts ?? [];
  const shown = posts.docs.filter((post) => !post.data.deleted);

  return (
    <div class="feed">
      <Talk me={props.me} opponent={opponent} saved={saved} />
      <Brag me={props.me} />
      <section class="feed-wall" aria-label="The wall">
        {shown.length === 0 && !posts.loading && <p class="fine-print">Nothing on the wall yet. Start something.</p>}
        {shown.map((post) => (
          <PostCard key={post.id} me={props.me} id={post.id} post={post.data} now={now} name={name} realName={realName} isCommish={isCommish} />
        ))}
      </section>
    </div>
  );
}

/** Taunts for this week's opponent: quick chat, your saved taunts, or a new one. */
function Talk(props: { me: Me; opponent: { id: string | null; name: string; vsHouse: boolean }; saved: string[] }) {
  const [text, setText] = useState('');
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);
  const to = props.opponent.id;

  if (!to) {
    return (
      <section class="panel feed-talk" aria-labelledby="talk-title">
        <h2 id="talk-title">Talk trash</h2>
        <p class="panel-text">{props.opponent.vsHouse ? 'You face The House this week. Taunts wait for a real opponent.' : 'Taunts open once you have an opponent, after the draft.'}</p>
      </section>
    );
  }

  const send = (kind: PostKind, words: string, alsoSave = false) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    void loadData()
      .then(async (api) => {
        await api.postToWall(props.me, { kind, text: words, to });
        if (alsoSave && !props.saved.includes(words)) await api.saveTaunts(props.me, [words, ...props.saved].slice(0, SAVED_TAUNTS_MAX));
      })
      .then(() => {
        setNote({ error: false, text: `Sent to ${props.opponent.name}.` });
        if (kind === 'taunt') {
          setText('');
          setKeep(false);
        }
      })
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  const sendOwn = (event: Event) => {
    event.preventDefault();
    const words = text.trim();
    if (words.length === 0) return setNote({ error: true, text: 'Type a taunt first.' });
    if (words.length > TAUNT_MAX) return setNote({ error: true, text: `A taunt can be up to ${TAUNT_MAX} characters.` });
    send('taunt', words, keep);
  };

  const forget = (taunt: string) => {
    void loadData()
      .then((api) => api.saveTaunts(props.me, props.saved.filter((found) => found !== taunt)))
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }));
  };

  return (
    <section class="panel feed-talk" aria-labelledby="talk-title">
      <h2 id="talk-title">Talk to {props.opponent.name}</h2>
      <div class="feed-chips" role="group" aria-label="Quick chat">
        {QUICK_CHAT.map((line) => (
          <button key={line} type="button" class="feed-chip" disabled={busy} onClick={() => send('quick', line)}>
            {fillName(line, props.opponent.name)}
          </button>
        ))}
      </div>
      {props.saved.length > 0 && (
        <div class="feed-chips" role="group" aria-label="Your saved taunts">
          {props.saved.map((taunt) => (
            <span key={taunt} class="feed-saved">
              <button type="button" class="feed-chip feed-chip-saved" disabled={busy} onClick={() => send('taunt', taunt)}>
                {fillName(taunt, props.opponent.name)}
              </button>
              <button type="button" class="feed-forget" aria-label={`Forget "${taunt}"`} onClick={() => forget(taunt)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <form class="feed-own" onSubmit={sendOwn} noValidate>
        <Field
          id="feed-taunt"
          label="Your own taunt"
          value={text}
          onInput={(value) => {
            setNote(null);
            setText(value);
          }}
          maxLength={TAUNT_MAX + 20}
          help="{name} becomes whoever you face."
        />
        <div class="feed-own-row">
          <button type="button" class="feed-keep" aria-pressed={keep} onClick={() => setKeep(!keep)}>
            {keep ? 'Saving it for later' : 'Save it for later'}
          </button>
          <button class="btn feed-send" type="submit" disabled={busy}>
            Send
          </button>
        </div>
      </form>
      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
    </section>
  );
}

/** A win from outside the game, for everyone to comment on and react to. */
function Brag(props: { me: Me }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);

  const post = (event: Event) => {
    event.preventDefault();
    if (busy) return;
    const words = text.trim();
    if (words.length === 0) return setNote({ error: true, text: 'Type your brag first.' });
    if (words.length > POST_MAX) return setNote({ error: true, text: `A brag can be up to ${POST_MAX} characters.` });
    setBusy(true);
    setNote(null);
    void loadData()
      .then((api) => api.postToWall(props.me, { kind: 'brag', text: words, to: null }))
      .then(() => {
        setText('');
        setNote({ error: false, text: 'Posted.' });
      })
      .catch((failure: unknown) => setNote({ error: true, text: TROUBLE[whyOf(failure)] }))
      .finally(() => setBusy(false));
  };

  return (
    <form class="panel feed-brag" onSubmit={post} noValidate aria-labelledby="brag-title">
      <h2 id="brag-title">Brag</h2>
      <Field
        id="feed-brag"
        label="Your brag"
        hideLabel
        value={text}
        onInput={(value) => {
          setNote(null);
          setText(value);
        }}
        maxLength={POST_MAX + 20}
        placeholder="A bench PR, a passed exam…"
      />
      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
      <button class="btn btn-second" type="submit" disabled={busy}>
        Post it
      </button>
    </form>
  );
}

/** One post on the wall: who, what, reactions, comments on a brag, and taking it down. */
function PostCard(props: { me: Me; id: string; post: Post; now: number; name: Names; realName: Names; isCommish: boolean }) {
  const { post } = props;
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = post.reactions?.[props.me.player] ?? { fire: false, skull: false, beer: false };
  const count = (key: keyof Reaction) => Object.values(post.reactions ?? {}).filter((reaction) => reaction[key]).length;
  const ownPost = post.by === props.me.player;
  const text = post.to ? fillName(post.text, props.realName(post.to)) : post.text;

  const toggle = (key: keyof Reaction) => {
    void loadData()
      .then((api) => api.react(props.me, props.id, { ...mine, [key]: !mine[key] }))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]));
  };

  const takeDown = () => {
    void loadData()
      .then((api) => api.takeDown(props.me, { post: props.id, mine: ownPost }))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]));
  };

  return (
    <article class="feed-post" data-kind={post.kind} aria-label={`${KIND[post.kind]} from ${props.name(post.by)}`}>
      <header class="feed-post-head">
        <span class="feed-who">
          {props.name(post.by)}
          {post.to && (
            <>
              {' '}
              <span class="feed-to">to</span> {props.name(post.to)}
            </>
          )}
        </span>
        <span class="feed-meta">
          {KIND[post.kind]} · {post.at === null ? 'now' : ago(props.now - post.at)}
        </span>
      </header>
      <p class="feed-text">{text}</p>
      <footer class="feed-post-foot">
        {REACTIONS.map((reaction) => (
          <button key={reaction.key} type="button" class="feed-react" aria-pressed={mine[reaction.key]} aria-label={`${reaction.label}, ${count(reaction.key)}`} onClick={() => toggle(reaction.key)}>
            <span aria-hidden="true">{reaction.glyph}</span> {count(reaction.key)}
          </button>
        ))}
        {post.kind === 'brag' && (
          <button type="button" class="feed-link" aria-expanded={open} onClick={() => setOpen(!open)}>
            Comments
          </button>
        )}
        {(ownPost || props.isCommish) && !confirm && (
          <button type="button" class="feed-link feed-link-quiet" onClick={() => setConfirm(true)}>
            Take down
          </button>
        )}
      </footer>
      {confirm && (
        <div class="feed-confirm">
          <p>{ownPost ? 'Take your post down? Its words are gone for good.' : 'Take this post down? It goes in the league log.'}</p>
          <button type="button" class="btn btn-danger" onClick={takeDown}>
            Take it down
          </button>
          <button type="button" class="btn-quiet" onClick={() => setConfirm(false)}>
            Keep it
          </button>
        </div>
      )}
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
      {open && <Comments me={props.me} post={props.id} now={props.now} name={props.name} isCommish={props.isCommish} />}
    </article>
  );
}

/** The comments on a brag, oldest first, and a box to add one. */
function Comments(props: { me: Me; post: string; now: number; name: Names; isCommish: boolean }) {
  const comments = useAll<Comment>(`leagues/${props.me.league}/wall/${props.post}/comments`);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = comments.docs.filter((found) => !found.data.deleted).sort((a, b) => (a.data.at ?? Infinity) - (b.data.at ?? Infinity));

  const add = (event: Event) => {
    event.preventDefault();
    const words = text.trim();
    if (busy || words.length === 0) return;
    if (words.length > POST_MAX) return setError(`A comment can be up to ${POST_MAX} characters.`);
    setBusy(true);
    setError(null);
    void loadData()
      .then((api) => api.commentOn(props.me, props.post, words))
      .then(() => setText(''))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]))
      .finally(() => setBusy(false));
  };

  const takeDown = (id: string, by: string) => {
    void loadData()
      .then((api) => api.takeDown(props.me, { post: props.post, comment: id, mine: by === props.me.player }))
      .catch((failure: unknown) => setError(TROUBLE[whyOf(failure)]));
  };

  return (
    <div class="feed-comments">
      {shown.map((found) => (
        <p key={found.id} class="feed-comment">
          <strong>{props.name(found.data.by)}</strong> {found.data.text}
          <span class="feed-meta"> · {found.data.at === null ? 'now' : ago(props.now - found.data.at)}</span>
          {(found.data.by === props.me.player || props.isCommish) && (
            <button type="button" class="feed-link feed-link-quiet" onClick={() => takeDown(found.id, found.data.by)}>
              Take down
            </button>
          )}
        </p>
      ))}
      <form class="feed-comment-form" onSubmit={add} noValidate>
        <Field
          id={`comment-${props.post}`}
          label="Add a comment"
          hideLabel
          value={text}
          onInput={(value) => {
            setError(null);
            setText(value);
          }}
          maxLength={POST_MAX + 20}
          placeholder="Add a comment"
        />
        <button class="btn btn-second feed-send" type="submit" disabled={busy}>
          Comment
        </button>
      </form>
      {error && (
        <p class="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
