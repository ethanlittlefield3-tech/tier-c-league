import { useEffect, useRef, useState } from 'preact/hooks';
import { PlayerBadge } from '../art/PlayerBadge.tsx';
import { TAB_ICONS, type Tab } from '../art/tabIcons.tsx';
import type { Me } from '../data/identity.ts';
import { loadData } from '../data/load.ts';
import { initialOf } from '../join/name.ts';
import { AuditLog } from './AuditLog.tsx';
import { Commish } from './Commish.tsx';
import { Draft } from './Draft.tsx';
import { Feed } from './Feed.tsx';
import { League } from './League.tsx';
import { Match } from './Match.tsx';
import { PlayerDay } from './PlayerDay.tsx';
import { Profile } from './Profile.tsx';
import { Today } from './Today.tsx';
import { Wheel } from './Wheel.tsx';
import { useOnline } from '../ui/online.ts';
import './frame.css';

interface TabInfo {
  id: Tab;
  label: string;
  /** What the tab will hold, in a line, until it is built. */
  soon: string;
}

// SCOPE.md, "Screens": five bottom tabs cover the whole game.
const TABS: readonly TabInfo[] = [
  { id: 'today', label: 'Today', soon: 'Your scoreboard, the four squares, beers, your power-ups and the day total.' },
  { id: 'match', label: 'Match', soon: "This week's matchup: your opponent's live day, and the group-play modes." },
  { id: 'feed', label: 'Feed', soon: 'The live feed and the wall: taunts, brags, comments and reactions.' },
  { id: 'league', label: 'League', soon: 'Standings, the schedule, results, the playoff bracket and the trophy case.' },
  { id: 'garage', label: 'Garage', soon: 'Build your car on a turntable. Every badge you earn unlocks a part.' },
];

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
  const [draftOpen, setDraftOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [dayOf, setDayOf] = useState<string | null>(null);
  const [backFromProfile, setBackFromProfile] = useState(false);
  const meButton = useRef<HTMLButtonElement>(null);
  const online = useOnline();

  // An alert opens the app at its screen: by a link when the app wasn't open,
  // or by a message from the service worker when it was.
  useEffect(() => {
    const open = (screen: string) => {
      if (screen === 'wheel') setWheelOpen(true);
      else if (screen === 'draft') setDraftOpen(true);
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

  if (commishOpen) {
    return <Commish me={props.me} onBack={() => setCommishOpen(false)} />;
  }

  if (profileOpen) {
    return (
      <Profile
        onCommish={() => setCommishOpen(true)}
        onLog={() => setLogOpen(true)}
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
  return (
    <div class="frame" data-tab={tab}>
      <header class="frame-top">
        <div class="frame-titles">
          <p class="frame-league">{props.me.leagueName}</p>
          <h1 class="frame-title">{current.label}</h1>
        </div>
        <button ref={meButton} class="frame-me" type="button" aria-label={`Your profile, ${props.me.displayName}`} onClick={() => setProfileOpen(true)}>
          <PlayerBadge initial={initialOf(props.me.displayName)} />
        </button>
      </header>
      {!online && (
        <p class="offline" role="status">
          No signal. What you log is kept on this phone and goes through when you're back online.
        </p>
      )}
      <main class="frame-body" key={tab}>
        {tab === 'today' ? <Today me={props.me} onDraft={() => setDraftOpen(true)} onWheel={() => setWheelOpen(true)} /> : tab === 'match' ? <Match me={props.me} /> : tab === 'feed' ? <Feed me={props.me} onWheel={() => setWheelOpen(true)} /> : tab === 'league' ? <League me={props.me} onPlayer={setDayOf} /> : <Soon tab={current} />}
      </main>
      <nav class="frame-tabs" aria-label="Main">
        {TABS.map((info) => {
          const Icon = TAB_ICONS[info.id];
          return (
            <button class="frame-tab" type="button" aria-current={info.id === tab ? 'page' : undefined} onClick={() => setTab(info.id)}>
              <Icon />
              <span>{info.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
