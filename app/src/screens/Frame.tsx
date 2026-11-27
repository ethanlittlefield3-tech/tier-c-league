import { useEffect, useRef, useState } from 'preact/hooks';
import type { Rank } from '@tcl/engine';
import { CarArt } from '../art/car/CarArt.tsx';
import type { CarParts } from '../art/car/draw.ts';
import { TAB_ICONS, type Tab } from '../art/tabIcons.tsx';
import type { Me } from '../data/identity.ts';
import { useDoc, useLatest, useNow } from '../data/hooks.ts';
import { loadData } from '../data/load.ts';
import { AuditLog } from './AuditLog.tsx';
import { Ideas } from './Ideas.tsx';
import { Commish } from './Commish.tsx';
import { Draft } from './Draft.tsx';
import { Feed } from './Feed.tsx';
import { Garage } from './Garage.tsx';
import { League } from './League.tsx';
import { MondayPicks } from './Picks.tsx';
import { PlayerDay } from './PlayerDay.tsx';
import { RankUp, useRankScene, type RankEntry } from './Rank.tsx';
import { WinScene, useWinScene } from './Win.tsx';
import { Profile } from './Profile.tsx';
import { Today } from './Today.tsx';
import { Wheel } from './Wheel.tsx';
import { useOnline } from '../ui/online.ts';
import { SPOTS, isNew, lastSeen, markSeen, newestFromOthers, startSeen, type Spot } from '../ui/seen.ts';
import { useOpponent } from './useOpponent.ts';
import './frame.css';

interface TabInfo {
  id: Tab;
  label: string;
  /** What the tab will hold, in a line, until it is built. */
  soon: string;
}

// SCOPE.md, "Screens", with Today and Match combined into Game Day (the
// commish's request, 2026-11-27): four bottom tabs cover the whole game.
const TABS: readonly TabInfo[] = [
  { id: 'today', label: 'Game Day', soon: 'Your matchup, your day, your power-ups and your opponent.' },
  { id: 'feed', label: 'Feed', soon: 'The live feed and the wall: taunts, brags, comments and reactions.' },
  { id: 'league', label: 'League', soon: 'Standings, the schedule, results, the playoff bracket and the trophy case.' },
  { id: 'garage', label: 'Garage', soon: 'Build your car on a turntable. Every badge you earn unlocks a part.' },
];

/** What a tab's dot tells a screen reader. */
const DOT_NOTES: Record<Spot, string> = {
  feed: 'New posts since you last looked',
  match: 'Your opponent has logged since you last looked',
  league: 'New results since you last looked',
  garage: 'New parts since you last looked',
};

/** The place a tab's dot reports on: Game Day's is your opponent, as Match's was. */
const spotOf = (tab: Tab): Spot | null => (tab === 'today' ? 'match' : tab === 'feed' || tab === 'league' || tab === 'garage' ? tab : null);

const seenNow = (me: Me) => Object.fromEntries(SPOTS.map((spot) => [spot, lastSeen(me, spot)])) as Record<Spot, number | null>;

/**
 * The five tabs along the bottom. A dot marks what is new since you last
 * opened a tab: a post by someone else on Feed, your opponent logging today on
 * Match, a week going final on League, a part unlocked in the Garage. Opening
 * the tab clears it.
 */
function Tabs(props: { me: Me; tab: Tab; onTab: (tab: Tab) => void; newestBadge: number | null }) {
  const now = useNow();
  const opponent = useOpponent(props.me, now);
  const wall = useLatest<{ by?: string; at?: number; deleted?: boolean }>(`leagues/${props.me.league}/wall`, 'at', 6);
  const finals = useLatest<{ finalAt?: number }>(opponent.seasonPath ? `${opponent.seasonPath}/weeks` : null, 'finalAt', 1);
  const theirDay = useDoc<{ updatedAt?: number }>(opponent.seasonPath && opponent.id && opponent.today ? `${opponent.seasonPath}/days/${opponent.id}_${opponent.today}` : null);
  const [seen, setSeen] = useState(() => {
    startSeen(props.me);
    return seenNow(props.me);
  });
  const latest: Record<Spot, number | null | undefined> = {
    feed: newestFromOthers(wall.docs.map((post) => post.data), props.me.player),
    match: theirDay.data?.updatedAt,
    league: finals.docs[0]?.data.finalAt,
    garage: props.newestBadge,
  };
  const shown = useRef(latest);
  shown.current = latest;
  // Opening a tab counts as a look, and so does leaving it. A look covers
  // everything it could show, even if this phone's clock runs a little behind.
  useEffect(() => {
    const spot = spotOf(props.tab);
    if (!spot) return undefined;
    const look = () => markSeen(props.me, spot, Math.max(Date.now(), shown.current[spot] ?? 0));
    look();
    setSeen(seenNow(props.me));
    return look;
  }, [props.tab]);
  const dotted = (tab: Tab) => {
    const spot = spotOf(tab);
    return tab !== props.tab && spot !== null && isNew(latest[spot], seen[spot]);
  };
  return (
    <nav class="frame-tabs" aria-label="Main">
      {TABS.map((info) => {
        const Icon = TAB_ICONS[info.id];
        const dot = dotted(info.id);
        return (
          <button
            class="frame-tab"
            type="button"
            aria-current={info.id === props.tab ? 'page' : undefined}
            aria-describedby={dot ? `frame-dot-${spotOf(info.id)}` : undefined}
            onClick={() => props.onTab(info.id)}
          >
            <Icon />
            <span>{info.label}</span>
            {dot && <span class="frame-dot" aria-hidden="true" />}
          </button>
        );
      })}
      {SPOTS.map((spot) => (
        <span id={`frame-dot-${spot}`} hidden>
          {DOT_NOTES[spot]}
        </span>
      ))}
    </nav>
  );
}

/**
 * True once the page has scrolled down a little, so the header can shrink to
 * a slim bar. It switches back near the top, a little lower than it switched
 * on, so it never flickers at the edge.
 */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const page = document.getElementById('app');
    if (!page) return undefined;
    const look = () => setScrolled((was) => (was ? page.scrollTop > 12 : page.scrollTop > 56));
    look();
    page.addEventListener('scroll', look, { passive: true });
    return () => page.removeEventListener('scroll', look);
  }, []);
  return scrolled;
}

/** A tab's page until it is built: what it will hold. */
function Soon(props: { tab: TabInfo }) {
  const Icon = TAB_ICONS[props.tab.id];
  return (
    <section class="soon" aria-labelledby="soon-title">
      <div class="soon-icon">
        <Icon />
      </div>
      <p class="soon-chip">Coming soon</p>
      <h2 id="soon-title">{props.tab.label}</h2>
      <p class="soon-text">{props.tab.soon}</p>
    </section>
  );
}

/**
 * The app itself, once a phone is in a league: a header with the tab's name
 * and your badge, the tab's page, and five tabs along the bottom. Your badge
 * opens your Profile.
 */
export function Frame(props: { me: Me; onRenamed: (me: Me) => void; onSignedOut: () => void }) {
  const [tab, setTab] = useState<Tab>('today');
  const [profileOpen, setProfileOpen] = useState(false);
  const [commishOpen, setCommishOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [dayOf, setDayOf] = useState<string | null>(null);
  const [picksOpen, setPicksOpen] = useState(false);
  const [backFromProfile, setBackFromProfile] = useState(false);
  const meButton = useRef<HTMLButtonElement>(null);
  const online = useOnline();
  // A rank change since this phone last showed one plays its scene as the app
  // opens: decided on the server's answer, not the phone's own older copy.
  const profile = useDoc<{ rank?: Rank; rankHistory?: RankEntry[]; car?: Partial<CarParts>; stickers?: Partial<Record<string, { until?: unknown }>>; badges?: Record<string, { at?: number }> }>(
    `leagues/${props.me.league}/players/${props.me.player}`,
  );
  const scrolled = useScrolled();
  const settled = !profile.loading && !profile.fromCache;
  const rankScene = useRankScene(props.me.league, props.me.player, settled ? (profile.data?.rank ?? null) : undefined);
  // A week you won, since this phone last looked, plays your goal explosion first.
  const winScene = useWinScene(props.me.league, props.me.player, settled ? (profile.data?.rankHistory?.at(-1) ?? null) : undefined);

  // An alert opens the app at its screen: by a link when the app wasn't open,
  // or by a message from the service worker when it was.
  useEffect(() => {
    const open = (screen: string) => {
      if (screen === 'wheel') setWheelOpen(true);
      else if (screen === 'draft') setDraftOpen(true);
      // Match is part of Game Day now: an alert for it opens there.
      else if (screen === 'match') setTab('today');
      else if (TABS.some((info) => info.id === screen)) setTab(screen as Tab);
    };
    const fromLink = location.hash.slice(1);
    if (fromLink) {
      open(fromLink);
      history.replaceState(null, '', location.pathname + location.search);
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; screen?: string } | null;
      if (data?.type === 'open') open(String(data.screen ?? ''));
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, []);

  // A phone's push token can lapse, so it is fetched again on every open.
  useEffect(() => {
    void loadData()
      .then((api) => api.refreshAlerts(props.me))
      .catch(() => undefined);
  }, [props.me.player]);

  // Coming back from Profile, the focus returns to the badge that opened it.
  useEffect(() => {
    if (!profileOpen && backFromProfile) meButton.current?.focus({ preventScroll: true });
  }, [profileOpen, backFromProfile]);

  if (winScene) {
    return <WinScene week={winScene.week} car={profile.data?.car} onDone={winScene.done} />;
  }

  if (rankScene) {
    return <RankUp from={rankScene.from} to={rankScene.to} car={profile.data?.car} onDone={rankScene.done} />;
  }

  if (dayOf) {
    return <PlayerDay me={props.me} player={dayOf} onBack={() => setDayOf(null)} />;
  }

  if (wheelOpen) {
    return <Wheel me={props.me} onBack={() => setWheelOpen(false)} />;
  }

  if (draftOpen) {
    return <Draft me={props.me} onBack={() => setDraftOpen(false)} />;
  }

  if (logOpen) {
    return <AuditLog me={props.me} onBack={() => setLogOpen(false)} />;
  }

  if (ideasOpen) {
    return <Ideas me={props.me} onBack={() => setIdeasOpen(false)} />;
  }

  if (commishOpen) {
    return <Commish me={props.me} onBack={() => setCommishOpen(false)} />;
  }

  if (profileOpen) {
    return (
      <Profile
        onCommish={() => setCommishOpen(true)}
        onLog={() => setLogOpen(true)}
        onIdeas={() => setIdeasOpen(true)}
        me={props.me}
        onBack={() => {
          setBackFromProfile(true);
          setProfileOpen(false);
        }}
        onRenamed={props.onRenamed}
        onSignedOut={props.onSignedOut}
      />
    );
  }

  const current = TABS.find((info) => info.id === tab) ?? TABS[0]!;
  const newestBadge = Math.max(0, ...Object.values(profile.data?.badges ?? {}).map((badge) => badge.at ?? 0)) || null;
  return (
    <div class="frame" data-tab={tab}>
      <header class="frame-top" data-compact={scrolled}>
        <div class="frame-titles">
          <p class="frame-league">{props.me.leagueName}</p>
          <h1 class="frame-title">{current.label}</h1>
        </div>
        <button ref={meButton} class="frame-me" type="button" aria-label={`Your profile, ${props.me.displayName}`} onClick={() => setProfileOpen(true)}>
          {/* Your car is your icon across the app (SCOPE.md, "Garage and achievements"). */}
          <CarArt parts={profile.data?.car} stickers={profile.data?.stickers} bare class="frame-car" />
        </button>
      </header>
      {!online && (
        <p class="offline" role="status">
          No signal. What you log is kept on this phone and goes through when you're back online.
        </p>
      )}
      <main class="frame-body" key={tab}>
        {tab === 'today' ? <Today me={props.me} onDraft={() => setDraftOpen(true)} onWheel={() => setWheelOpen(true)} onPicks={() => setPicksOpen(true)} /> : tab === 'feed' ? <Feed me={props.me} onWheel={() => setWheelOpen(true)} /> : tab === 'league' ? <League me={props.me} onPlayer={setDayOf} /> : tab === 'garage' ? <Garage me={props.me} /> : <Soon tab={current} />}
      </main>
      <Tabs me={props.me} tab={tab} onTab={setTab} newestBadge={newestBadge} />
      {/* Monday's picks pop up once, over whichever tab is open (ruling R25). */}
      <MondayPicks me={props.me} open={picksOpen} onOpen={() => setPicksOpen(true)} onClose={() => setPicksOpen(false)} />
    </div>
  );
}
