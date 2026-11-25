import { useEffect, useState } from 'preact/hooks';
import { installState, shouldSuggestInstall, type Guide } from './install/state.ts';
import { surroundings } from './install/surroundings.ts';
import { deviceDay } from './intro/mode.ts';
import { Install } from './screens/Install.tsx';
import { Session, loadData } from './screens/Session.tsx';
import { Title } from './screens/Title.tsx';
import { recall, remember } from './storage.ts';

/** The day "Not now" was last tapped on Android's install steps. */
const LATER_KEY = 'tcl.install.later';

/**
 * The app shell. A phone's browser gets the install guide. Everywhere else it
 * is the intro and title first, then the way into a league, then the app.
 */
export function App() {
  const [install] = useState(() => installState(surroundings()));
  const [guide, setGuide] = useState<Guide>(() => {
    if (install.guide !== 'install') return install.guide;
    // Android can carry on in the browser, so its steps step aside for a week after "Not now".
    return shouldSuggestInstall({ skippedOn: recall(LATER_KEY), today: deviceDay(new Date()) }) ? 'install' : 'none';
  });
  const [entered, setEntered] = useState(false);

  // Fetch the database code while the intro plays, so it is ready by "Tap to enter".
  useEffect(() => {
    if (guide === 'none') void loadData().catch(() => undefined);
  }, [guide]);

  if (guide !== 'none') {
    const later = () => {
      remember(LATER_KEY, deviceDay(new Date()));
      setGuide('none');
    };
    return <Install device={install.device} guide={guide} onSkip={later} />;
  }
  return entered ? <Session /> : <Title onEnter={() => setEntered(true)} />;
}
