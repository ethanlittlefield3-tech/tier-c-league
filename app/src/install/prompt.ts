/**
 * Android's own "Install app" prompt.
 *
 * Chrome on Android tells the page when it is willing to show the prompt, and
 * lets the page show it later from a button. The offer can arrive before any
 * screen is on show, so `watchForInstallOffer` is called as the app starts and
 * holds on to it.
 */
interface InstallOffer extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let offer: InstallOffer | null = null;
const listeners = new Set<() => void>();

export function watchForInstallOffer(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Stop the browser's own banner: the install screen has a button for this.
    event.preventDefault();
    offer = event as InstallOffer;
    for (const listener of listeners) listener();
  });
}

export function hasInstallOffer(): boolean {
  return offer !== null;
}

/** Calls `listener` when an offer arrives. Returns a function that stops listening. */
export function onInstallOffer(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Shows the phone's install prompt. Resolves to true if the app was installed. */
export async function acceptInstallOffer(): Promise<boolean> {
  if (!offer) return false;
  const current = offer;
  // An offer can be used once.
  offer = null;
  await current.prompt();
  const choice = await current.userChoice;
  return choice.outcome === 'accepted';
}
