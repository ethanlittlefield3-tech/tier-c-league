import { useEffect, useRef, useState } from 'preact/hooks';
import { PlayerBadge } from '../art/PlayerBadge.tsx';
import { TAB_ICONS, type Tab } from '../art/tabIcons.tsx';
import type { Me } from '../data/identity.ts';
import { initialOf } from '../join/name.ts';
import { AuditLog } from './AuditLog.tsx';
import { Commish } from './Commish.tsx';
import { League } from './League.tsx';
import { Match } from './Match.tsx';
import { Profile } from './Profile.tsx';
import { Today } from './Today.tsx';
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
  const [backFromProfile, setBackFromProfile] = useState(false);
  const meButton = useRef<HTMLButtonElement>(null);

  // Coming back from Profile, the focus returns to the badge that opened it.
  useEffect(() => {
    if (!profileOpen && backFromProfile) meButton.current?.focus({ preventScroll: true });
  }, [profileOpen, backFromProfile]);

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
  const online = useOnline();
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
        {tab === 'today' ? <Today me={props.me} /> : tab === 'match' ? <Match me={props.me} /> : tab === 'league' ? <League me={props.me} /> : <Soon tab={current} />}
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
