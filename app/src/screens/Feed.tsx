import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { CarArt } from '../art/car/CarArt.tsx';
import type { CarParts } from '../art/car/draw.ts';
import { useAll, useDoc, useLatest, useNow, useWhere } from '../data/hooks.ts';
import type { Me, Trouble } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import type { PostKind, Reaction } from '../data/wall.ts';
import { whyOf } from '../data/why.ts';
import { feedEvents, type FeedEvent, type FeedInput } from '../feed/events.ts';
import { drawReel, reelCard } from '../reel/card.ts';
import { Reel } from './Reel.tsx';
import { POST_MAX, QUICK_CHAT, SAVED_TAUNTS_MAX, TAUNT_MAX, fillName } from '../feed/words.ts';
import { Field } from '../ui/parts.tsx';
import { ago } from '../ui/when.ts';
import { useOpponent } from './useOpponent.ts';
import { latestWheel, type Draw, type ProofVote, type Spin } from './Wheel.tsx';
import './wheel.css';
import './feed.css';
import { playSeasonOf, practiceOf } from '../practice/play.ts';

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
 * reactions. Mixed in, newest first: check-ins, power-ups, revealed
 * Demolitions, docks and results, all live.
 */
export function Feed(props: { me: Me; onWheel?: () => void }) {
  const now = useNow();
  const leaguePath = `leagues/${props.me.league}`;
  const league = useDoc<{ season?: string | null; commish?: string; coCommish?: string | null; members?: Record<string, boolean> }>(leaguePath);
  // The practice week while one is on (the commish's request, 2026-11-28).
  const playSeason = playSeasonOf(league.data);
  const seasonPath = playSeason ? `${leaguePath}/seasons/${playSeason}` : null;
  const players = useAll<{ displayName?: string; taunts?: string[]; car?: Partial<CarParts>; stickers?: Partial<Record<string, { until?: unknown }>> }>(`${leaguePath}/players`);
  const posts = useLatest<Post>(`${leaguePath}/wall`, 'at', 50);
  const checkIns = useLatest<FeedInput['checkIns'][number]['data']>(seasonPath ? `${seasonPath}/days` : null, 'firstAt', 20);
  const kit = useLatest<FeedInput['kit'][number]['data']>(seasonPath ? `${seasonPath}/kit` : null, 'at', 20);
  const docks = useLatest<FeedInput['adjustments'][number]['data']>(seasonPath ? `${seasonPath}/adjustments` : null, 'at', 10);
  const weeks = useAll<FeedInput['weeks'][number]['data']>(seasonPath ? `${seasonPath}/weeks` : null);
  const receipts = useLatest<NonNullable<FeedInput['receipts']>[number]['data']>(seasonPath ? `${seasonPath}/receipts` : null, 'requestedAt', 20);
  // The jobs' news: badges earned and rank changes.
  const news = useLatest<NonNullable<FeedInput['news']>[number]['data']>(`${leaguePath}/feed`, 'at', 20);
  const spins = useAll<Spin>(seasonPath ? `${seasonPath}/spins` : null);
  const rematches = useAll<NonNullable<FeedInput['rematches']>[number]['data']>(seasonPath ? `${seasonPath}/rematches` : null);
  const proofVotes = useWhere<ProofVote & { at?: number | null }>(seasonPath ? `${seasonPath}/votes` : null, 'kind', 'proof');
  const opponent = useOpponent(props.me, now);
  const isCommish = league.data?.commish === props.me.player || league.data?.coCommish === props.me.player;

  const realName: Names = (player) => (player === 'HOUSE' ? 'The House' : (players.docs.find((found) => found.id === player)?.data.displayName ?? 'a former player'));
  const name: Names = (player) => (player === props.me.player ? 'You' : realName(player));
  const carOf: Cars = (player) => players.docs.find((found) => found.id === player)?.data ?? null;
  const saved = players.docs.find((found) => found.id === props.me.player)?.data.taunts ?? [];
  const wheel = latestWheel(weeks.docs as { id: string; data: { week: number; wheel?: Record<string, Draw> } }[]);
  const events = feedEvents({
    name,
    checkIns: checkIns.docs,
    kit: kit.docs,
    adjustments: docks.docs,
    weeks: weeks.docs,
    receipts: receipts.docs,
    news: news.docs,
    rematches: rematches.docs,
    now,
    wheel: wheel
      ? {
          eligible: Math.max(0, Object.keys(league.data?.members ?? {}).length - 1),
          draws: wheel.draws,
          spins: Object.fromEntries(spins.docs.map((found) => [found.id, { at: found.data.at, proofAt: found.data.proofAt }])),
          votes: proofVotes.docs.map((found) => found.data),
        }
      : undefined,
  });
  const timeline: ({ post: { id: string; data: Post }; at: number } | { event: FeedEvent; at: number })[] = [
    ...posts.docs.filter((post) => !post.data.deleted).map((post) => ({ post, at: post.data.at ?? now })),
    ...events.map((event) => ({ event, at: event.at })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 80);

  // A week's highlight reel, when one is open.
  const [reelWeek, setReelWeek] = useState<number | null>(null);
  const reel =
    reelWeek === null
      ? null
      : reelCard({
          league: props.me.leagueName,
          weeks: weeks.docs.map((found) => ({ week: found.data.week, results: found.data.results, awards: found.data.awards, group: found.data.group ?? null })),
          week: reelWeek,
          name: realName,
          carOf: (player) => carOf(player)?.car ?? null,
        });

  // The Wheel of Shame, while its dares are still due.
  const wheelLive = wheel !== null && wheel.draws.some((draw) => now < draw.dueAt);
  const waiting = wheel ? wheel.draws.filter((draw) => !spins.docs.some((spin) => spin.id === draw.id)).map((draw) => name(draw.player)) : [];

  return (
    <div class="feed">
      {wheel && wheelLive && (
        <section class="wheel-banner wheel-banner-slim" aria-labelledby="wheel-banner-title">
          <div>
            <h2 id="wheel-banner-title">The Wheel of Shame</h2>
            <p>{waiting.length > 0 ? `Week ${wheel.week}: ${waiting.join(' and ')} ${waiting.length === 1 && waiting[0] !== 'You' ? 'spins' : 'spin'} live.` : `Week ${wheel.week}: see the dares.`}</p>
          </div>
          <button type="button" class="feed-small-btn" onClick={props.onWheel}>
            Open the Wheel
          </button>
        </section>
      )}
      <Compose me={props.me} opponent={opponent} saved={saved} practice={practiceOf(league.data) !== null} />
      <section class="feed-wall" aria-label="The feed">
        {timeline.length === 0 && !posts.loading && <p class="fine-print">Nothing on the wall yet. Start something.</p>}
        {timeline.map((item, at) => {
          // A heading each time the day changes: Today, Yesterday, then the day.
          const day = dayLabel(item.at, now);
          const heading = at === 0 || dayLabel(timeline[at - 1]!.at, now) !== day ? <h3 class="feed-day">{day}</h3> : null;
          return (
            <Fragment key={'post' in item ? item.post.id : item.event.id}>
              {heading}
              {'post' in item ? (
                <PostCard me={props.me} id={item.post.id} post={item.post.data} now={now} name={name} realName={realName} carOf={carOf} isCommish={isCommish} />
              ) : (
                <EventRow event={item.event} now={now} name={name} carOf={carOf} onReel={setReelWeek} />
              )}
            </Fragment>
          );
        })}
      </section>
      {reel && <Reel title={`Week ${reel.week} highlights`} text={reel.text} file={`tier-c-week-${reel.week}.png`} draw={() => drawReel(reel)} onClose={() => setReelWeek(null)} />}
    </div>
  );
}

/** A player's car and stickers, for their icon; `null` for someone unknown (the starter car is drawn). */
type Cars = (player: string) => { car?: Partial<CarParts>; stickers?: Partial<Record<string, { until?: unknown }>> } | null;

/** A game event in the feed: who did what, and when. A week's results put its MVP and Bust in the spotlight. */
function EventRow(props: { event: FeedEvent; now: number; name: Names; carOf: Cars; onReel?: (week: number) => void }) {
  const { event } = props;
  return (
    <div class="feed-event" data-kind={event.kind}>
      <p class="feed-event-text">
        {event.text}
        {event.outcome && (
          <>
            {': '}
            <strong class="feed-outcome" data-outcome={(event.outcome.split(/[ :,]/)[0] ?? '').toLowerCase()}>
              {event.outcome}
            </strong>
          </>
        )}
        <span class="feed-meta"> · {ago(props.now - event.at)}</span>
      </p>
      {event.detail && <p class="feed-event-detail">{event.detail}</p>}
      {event.headlines && (
        <ul class="feed-headlines" aria-label="Storylines">
          {event.headlines.map((headline) => (
            <li key={headline}>{headline}</li>
          ))}
        </ul>
      )}
      {event.spotlight && (
        <ul class="feed-spotlight" aria-label="Spotlight">
          {[...event.spotlight.mvp.map((player) => ({ player, award: 'MVP' })), ...event.spotlight.bust.map((player) => ({ player, award: 'Bust' }))].map(({ player, award }) => (
            <li key={`${award}-${player}`} data-award={award}>
              <CarArt parts={props.carOf(player)?.car} stickers={props.carOf(player)?.stickers} class="feed-spotlight-car" />
              <span class="feed-spotlight-award">{award}</span>
              <span class="feed-spotlight-name">{props.name(player)}</span>
            </li>
          ))}
        </ul>
      )}
      {event.kind === 'results' && event.week !== undefined && (
        <button type="button" class="btn btn-second feed-reel" onClick={() => props.onReel?.(event.week!)}>
          Highlight reel
        </button>
      )}
    </div>
  );
}

/** "Today", "Yesterday", the weekday for this week, else the date, on the phone's own calendar. */
function dayLabel(at: number, now: number): string {
  const day = (time: number) => {
    const date = new Date(time);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };
  const back = Math.round((day(now) - day(at)) / 86_400_000);
  if (back <= 0) return 'Today';
  if (back === 1) return 'Yesterday';
  if (back < 7) return new Date(at).toLocaleDateString('en-US', { weekday: 'long' });
  return new Date(at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * One place to post: just two buttons, Trash talk and Brag, until you tap
 * one, which opens it. Tapping the open one again folds it away.
 */
function Compose(props: { me: Me; opponent: { id: string | null; name: string; vsHouse: boolean }; saved: string[]; practice: boolean }) {
  const [mode, setMode] = useState<'talk' | 'brag' | null>(null);
  const pick = (next: 'talk' | 'brag') => setMode(mode === next ? null : next);
  return (
    <section class="panel feed-compose" data-open={mode !== null} aria-label="Post to the feed">
      <div class="feed-switch" role="group" aria-label="Trash talk or brag">
        <button type="button" aria-pressed={mode === 'talk'} aria-expanded={mode === 'talk'} onClick={() => pick('talk')}>
          {props.opponent.id ? `Trash talk ${props.opponent.name}` : 'Trash talk'}
        </button>
        <button type="button" aria-pressed={mode === 'brag'} aria-expanded={mode === 'brag'} onClick={() => pick('brag')}>
          Brag
        </button>
      </div>
      {mode === 'talk' && <Talk me={props.me} opponent={props.opponent} saved={props.saved} practice={props.practice} />}
      {mode === 'brag' && <Brag me={props.me} />}
    </section>
  );
}

/** Taunts for this week's opponent: quick chat, your saved taunts, or a new one. */
function Talk(props: { me: Me; opponent: { id: string | null; name: string; vsHouse: boolean }; saved: string[]; practice: boolean }) {
  const [text, setText] = useState('');
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(null);
  const to = props.opponent.id;

  if (!to) {
    return (
      <div class="feed-talk">
        <p class="panel-text">{props.opponent.vsHouse ? 'You face The House this week. Taunts wait for a real opponent.' : 'Taunts open once you have an opponent, after the draft.'}</p>
      </div>
    );
  }

  const send = (kind: PostKind, words: string, alsoSave = false) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    void loadData()
      .then(async (api) => {
        await api.postToWall(props.me, { kind, text: words, to, practice: props.practice });
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
    <div class="feed-talk">
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
        <div class="feed-own-line">
          <Field
            id="feed-taunt"
            label="Your own taunt"
            hideLabel
            placeholder="Your own taunt"
            value={text}
            onInput={(value) => {
              setNote(null);
              setText(value);
            }}
            maxLength={TAUNT_MAX + 20}
          />
          <button class="feed-small-btn feed-send" type="submit" disabled={busy}>
            Send
          </button>
        </div>
        <button type="button" class="feed-keep" aria-pressed={keep} onClick={() => setKeep(!keep)}>
          {keep ? 'Saving it for later' : 'Save it for later'}
        </button>
      </form>
      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
    </div>
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
    <form class="feed-brag" onSubmit={post} noValidate aria-label="Brag">
      <div class="feed-own-line">
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
        <button class="feed-small-btn feed-send" type="submit" disabled={busy}>
          Post it
        </button>
      </div>
      {note && (
        <p class={note.error ? 'field-error' : 'panel-ok'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
    </form>
  );
}

/** One post on the wall: who, what, reactions, comments on a brag, and taking it down. */
function PostCard(props: { me: Me; id: string; post: Post; now: number; name: Names; realName: Names; carOf: Cars; isCommish: boolean }) {
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
          <CarArt parts={props.carOf(post.by)?.car} stickers={props.carOf(post.by)?.stickers} bare class="feed-car" />
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
