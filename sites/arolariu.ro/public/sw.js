// Tombstone service worker.
//
// Earlier builds of arolariu.ro shipped a Workbox-built service worker. The
// current codebase no longer registers one, but service workers persist on
// devices until explicitly unregistered. On mobile, the stale Workbox SW kept
// intercepting blob-URL fetches and returning no-response errors, which
// saturated the main thread on view-scans (reproducing the freeze; incognito,
// where no SW runs, was clean).
//
// This file exists only to clear those stale registrations. Browsers fetch it
// during their normal SW update check, byte-compare against the previously
// installed script, see new bytes, and run install -> activate. Activate then
// drops caches, unregisters, and reloads open tabs so they make uncached,
// un-intercepted requests.
//
// Devices that never registered a service worker for this origin are
// unaffected: nothing fetches this file unless an existing registration
// triggers an update check.

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      await self.registration.unregister();

      const clients = await self.clients.matchAll({type: "window"});
      for (const client of clients) {
        client.navigate(client.url);
      }
    })(),
  );
});
