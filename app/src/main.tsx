// The shared styles load first, so each screen's own styles can build on them.
import './fonts.css';
import './theme.css';
import './ui/ui.css';
import { render } from 'preact';
import { App } from './app.tsx';
import { watchForInstallOffer } from './install/prompt.ts';
import { registerServiceWorker } from './install/worker.ts';
import { keepViewportSteady } from './ui/viewport.ts';

// Android can offer to install the app before any screen is up, so listen from the start.
watchForInstallOffer();
keepViewportSteady();
registerServiceWorker();

render(<App />, document.getElementById('app') as HTMLElement);
