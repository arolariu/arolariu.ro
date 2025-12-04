/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import {build, files, version} from "$service-worker";

declare let self: ServiceWorkerGlobalScope;

const CACHE_NAME = `cv-cache-${version}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  ...build, // Built app files
  ...files, // Static files from /static
];

// Install: Cache all static assets
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: Clean up old caches
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Fetch: Serve from cache, fallback to network
self.addEventListener("fetch", (event: FetchEvent) => {
  const {request} = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Skip API routes and server-side rendered pages that need fresh data
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/rest/")) return;

  event.respondWith(
    (async (): Promise<Response> => {
      const cachedResponse = await caches.match(request);

      // Return cached response if available
      if (cachedResponse) {
        // Fetch in background to update cache (stale-while-revalidate)
        event.waitUntil(
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {
              // Network failed, cached version will be used
            }),
        );
        return cachedResponse;
      }

      // No cache, fetch from network
      try {
        const networkResponse = await fetch(request);
        // Cache successful responses
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      } catch {
        // Network failed, return offline fallback for HTML requests
        if (request.headers.get("Accept")?.includes("text/html")) {
          const fallback = await caches.match("/");
          return fallback ?? new Response("Offline", {status: 503});
        }
        return new Response("Offline", {status: 503});
      }
    })(),
  );
});

// Handle messages from the main thread
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
