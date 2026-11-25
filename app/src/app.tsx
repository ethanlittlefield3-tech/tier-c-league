import { useState } from 'preact/hooks';
import { Home } from './screens/Home.tsx';
import { Title } from './screens/Title.tsx';

/** The app shell: the intro and title first, then the app itself. */
export function App() {
  const [entered, setEntered] = useState(false);
  return entered ? <Home /> : <Title onEnter={() => setEntered(true)} />;
}
