import { render } from 'preact';
import { App } from './app.tsx';
import { watchForInstallOffer } from './install/prompt.ts';
import './fonts.css';
import './theme.css';
import './ui/ui.css';

// Android can offer to install the app before any screen is up, so listen from the start.
watchForInstallOffer();

render(<App />, document.getElementById('app') as HTMLElement);
