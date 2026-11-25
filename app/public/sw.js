// Tier C League's service worker. Two jobs:
//
//   1. Opening with no signal. The app's own files are kept on the phone as
//      they load: files with a fingerprint in their name never change, so the
//      kept copy is used; the page itself is fetched fresh when there is a
//      signal, and the kept copy is used when there isn't.
//   2. Alerts. The league's pushes arrive here and are shown, and a tap opens
//      the app at the right screen.
//
// It only ever handles the app's own address. The database and sign-in are
// on other addresses, and their offline copy is the database library's own.

const CACHE = 'tcl-app-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

/** True for a file whose name carries a fingerprint, like assets/index-3f9a1c.js. */
const fingerprinted = (url) => /\/assets\//.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (fingerprinted(url)) {
    event.respondWith(
      (async () => {
        const kept = await caches.match(request);
        if (kept) return kept;
        const fresh = await fetch(request);
        if (fresh.ok) (await caches.open(CACHE)).put(request, fresh.clone());
        return fresh;
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) (await caches.open(CACHE)).put(request, fresh.clone());
        return fresh;
      } catch (offline) {
        const kept = (await caches.match(request)) ?? (request.mode === 'navigate' ? await caches.match(self.registration.scope) : undefined);
        if (kept) return kept;
        throw offline;
      }
    })(),
  );
});

// An alert. The league sends a title, a line of text, the screen to open,
// and a tag, so a newer alert of the same kind replaces an older one.
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { data: { body: event.data ? event.data.text() : '' } };
  }
  const fields = { ...(message.notification ?? {}), ...(message.data ?? {}) };
  const title = fields.title || 'Tier C League';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: fields.body || '',
      tag: fields.tag || undefined,
      icon: new URL('icons/icon-192.png', self.registration.scope).href,
      badge: new URL('icons/icon-192.png', self.registration.scope).href,
      data: { screen: fields.screen || '' },
    }),
  );
});

// A tap on an alert opens the app, or brings it forward, at that screen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const screen = event.notification.data?.screen || '';
  const target = new URL(screen ? `./#${screen}` : './', self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const app = open.find((client) => client.url.startsWith(self.registration.scope));
      if (app) {
        await app.focus();
        if (screen) app.postMessage({ type: 'open', screen });
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
