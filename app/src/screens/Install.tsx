import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { AddGlyph, MenuGlyph, MoreGlyph, ShareGlyph } from '../art/glyphs.tsx';
import { Lockup } from '../art/Lockup.tsx';
import scene from '../art/title-scene.svg';
import { acceptInstallOffer, hasInstallOffer, onInstallOffer } from '../install/prompt.ts';
import type { Device, Guide } from '../install/state.ts';
import './install.css';

// The same picture the phone puts on the Home Screen.
const ICON = `${import.meta.env.BASE_URL}icons/icon-192.png`;

/** One numbered step: what to tap, a line of help, and a picture of the button. */
function Step(props: { n: number; picture: ComponentChildren; title: string; children: ComponentChildren }) {
  return (
    <li class="install-step">
      <span class="install-step-n" aria-hidden="true">
        {props.n}
      </span>
      <div class="install-step-words">
        <strong>{props.title}</strong>
        <span>{props.children}</span>
      </div>
      <span class="install-step-picture" aria-hidden="true">
        {props.picture}
      </span>
    </li>
  );
}

const AppIcon = () => <img src={ICON} alt="" width="44" height="44" />;

/** Safari on an iPhone or iPad: the three taps that put the app on the Home Screen. */
function AddToHomeScreen(props: { device: Device }) {
  return (
    <>
      <h1>Add Tier C to your Home Screen</h1>
      <p class="install-lead">It runs as its own app from there. Three taps:</p>
      <ol class="install-steps">
        <Step n={1} picture={<ShareGlyph />} title="Tap Share">
          {props.device === 'ipad' ? (
            'It is at the top of the screen.'
          ) : (
            <>
              It is in Safari's toolbar. If you only see{' '}
              <span class="install-inline">
                <MoreGlyph />
                <span class="sr-only">the three dots</span>
              </span>{' '}
              there, tap that first.
            </>
          )}
        </Step>
        <Step n={2} picture={<AddGlyph />} title="Tap Add to Home Screen">
          Scroll down the list if you don't see it.
        </Step>
        <Step n={3} picture={<AppIcon />} title="Tap Add, then open Tier C">
          It is a new icon on your Home Screen. If you see "Open as Web App", leave it on.
        </Step>
      </ol>
      <p class="install-help">No "Add to Home Screen" in the list? Another app has opened this page. Open it in Safari and try again.</p>
    </>
  );
}

/** Another iPhone browser, or a page opened inside another app: send them to Safari with the link. */
function OpenInSafari(props: { device: Device }) {
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('yes');
    } catch {
      setCopied('failed');
    }
  };
  const address = `${window.location.host}${window.location.pathname}`;
  return (
    <>
      <h1>Open this page in Safari</h1>
      <p class="install-lead">On an {props.device === 'ipad' ? 'iPad' : 'iPhone'}, Tier C League is set up from Safari.</p>
      <p class="install-link">{address}</p>
      <button class="btn" type="button" onClick={copy}>
        {copied === 'yes' ? 'Copied' : 'Copy the link'}
      </button>
      <p class="install-help" role="status">
        {copied === 'failed' ? 'That did not work here. Press and hold the address above to copy it. ' : ''}
        Then open Safari and paste it into the address bar.
      </p>
    </>
  );
}

/** Android: install with one tap when the browser offers it, or from the browser's menu. */
function InstallOnAndroid(props: { onSkip?: () => void }) {
  const [offered, setOffered] = useState(hasInstallOffer);
  const [installed, setInstalled] = useState(false);

  useEffect(() => onInstallOffer(() => setOffered(true)), []);
  useEffect(() => {
    const done = () => setInstalled(true);
    window.addEventListener('appinstalled', done);
    return () => window.removeEventListener('appinstalled', done);
  }, []);

  const install = async () => {
    const accepted = await acceptInstallOffer();
    setOffered(hasInstallOffer());
    if (accepted) setInstalled(true);
  };

  if (installed) {
    return (
      <>
        <h1>Tier C is installed</h1>
        <p class="install-lead" role="status">
          Open it from your Home screen.
        </p>
        <div class="install-done">
          <AppIcon />
          <span>Tier C</span>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Install Tier C</h1>
      <p class="install-lead">It runs as its own app from your Home screen.</p>
      {offered && (
        <button class="btn" type="button" onClick={install}>
          Install
        </button>
      )}
      <p class="install-how">{offered ? "Or use your browser's menu:" : "Use your browser's menu:"}</p>
      <ol class="install-steps">
        <Step n={1} picture={<MenuGlyph />} title="Tap the menu">
          The three dots at the top of your browser.
        </Step>
        <Step n={2} picture={<AddGlyph />} title="Tap Add to Home screen">
          Some browsers call it Install app.
        </Step>
        <Step n={3} picture={<AppIcon />} title="Open Tier C">
          It is a new icon on your Home screen.
        </Step>
      </ol>
      <button class="btn-quiet" type="button" onClick={props.onSkip}>
        Not now
      </button>
    </>
  );
}

/**
 * Shown in place of the app when it is opened in a phone's browser instead of
 * from its own icon (PHASE1.md, "iPhone install").
 */
export function Install(props: { device: Device; guide: Exclude<Guide, 'none'>; onSkip?: () => void }) {
  return (
    <main class="install" data-guide={props.guide} data-device={props.device}>
      <div class="install-art" aria-hidden="true">
        <img src={scene} alt="" />
      </div>
      <div class="install-body">
        <Lockup class="install-logo" />
        {props.guide === 'add-to-home-screen' && <AddToHomeScreen device={props.device} />}
        {props.guide === 'open-in-safari' && <OpenInSafari device={props.device} />}
        {props.guide === 'install' && <InstallOnAndroid onSkip={props.onSkip} />}
      </div>
    </main>
  );
}
