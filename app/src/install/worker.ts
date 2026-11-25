/**
 * The service worker (`public/sw.js`): it keeps the app's files on the phone,
 * so the app opens with no signal, and it shows the league's alerts. Only the
 * built app has one; the dev server never does, so a change shows at once.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {
      // No worker means no offline start and no alerts. The app still works.
    });
  });
}
