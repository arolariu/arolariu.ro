/**
 * @fileoverview Service Worker for CV site with stale-while-revalidate caching.
 * @module service-worker
 *
 * @remarks
 * **Execution Context**: Runs in a dedicated Service Worker thread, separate from main thread.
 *
 * **Caching Strategy**: Implements stale-while-revalidate pattern:
 * - Serves cached content immediately for fast response
 * - Fetches fresh content in background to update cache
 * - Falls back to network when cache miss occurs
 *
 * **Scope**: Handles all same-origin GET requests except:
 * - API routes (`/api/`, `/rest/`)
 * - Cross-origin requests
 * - Non-GET methods
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API}
 */

/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import {build, files, version} from "$service-worker";

declare let self: ServiceWorkerGlobalScope;

/**
 * Versioned cache name for cache invalidation on deployments.
 *
 * @remarks
 * Uses SvelteKit's build version to ensure cache is refreshed when app updates.
 * Old caches are automatically cleaned up during the activate event.
 */
const CACHE_NAME = `cv-cache-${version}`;

/**
 * Static assets to pre-cache during service worker installation.
 *
 * @remarks
 * Combines SvelteKit's build output and static files for complete offline support.
 * - `build`: Generated JS/CSS chunks from the build process
 * - `files`: Static assets from the `static/` directory
 */
const STATIC_ASSETS = [...build, ...files];

/**
 * Handles service worker installation by pre-caching static assets.
 *
 * @remarks
 * **Lifecycle Phase**: Install event fires when a new service worker is registered.
 *
 * **Behavior**:
 * 1. Opens (or creates) versioned cache
 * 2. Pre-caches all static assets for offline availability
 * 3. Calls `skipWaiting()` to immediately activate (skip waiting phase)
 *
 * **Why skipWaiting?** Ensures users get the latest version immediately
 * without needing to close all tabs.
 *
 * @param event - ExtendableEvent allowing async operations before install completes
 */
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

/**
 * Handles service worker activation by cleaning up stale caches.
 *
 * @remarks
 * **Lifecycle Phase**: Activate event fires after installation when SW becomes active.
 *
 * **Cache Cleanup**: Deletes all caches that don't match the current version.
 * This prevents storage bloat from accumulating old cached assets.
 *
 * **Client Claiming**: Calls `clients.claim()` to take control of all open pages
 * immediately, rather than waiting for navigation.
 *
 * @param event - ExtendableEvent allowing async cleanup before activation completes
 */
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Intercepts fetch requests and serves from cache with network fallback.
 *
 * @remarks
 * **Caching Strategy**: Stale-while-revalidate (SWR)
 * - Returns cached response immediately for speed
 * - Fetches fresh content in background to update cache
 * - Network-first for cache misses
 *
 * **Request Filtering**:
 * - Skips non-GET requests (POST, PUT, DELETE, etc.)
 * - Skips cross-origin requests (CDNs, external APIs)
 * - Skips API routes (`/api/`, `/rest/`) to ensure fresh data
 *
 * **Offline Fallback**: Returns root page for HTML requests when offline,
 * enabling basic offline navigation within the cached shell.
 *
 * @param event - FetchEvent containing the intercepted request
 */
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
                caches
                  .open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, networkResponse);
                    return networkResponse;
                  })
                  .catch(() => {
                    // Caching failed
                  });
              }

              return networkResponse;
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
          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
              return responseToCache;
            })
            .catch(() => {
              // Caching failed
            });
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

/**
 * Handles messages from the main thread for service worker control.
 *
 * @remarks
 * **Supported Messages**:
 * - `SKIP_WAITING`: Forces the waiting service worker to activate immediately
 *
 * **Use Case**: Allows the main thread to trigger SW updates programmatically,
 * typically after prompting the user to refresh for a new version.
 *
 * @param event - ExtendableMessageEvent containing the message data
 *
 * @example
 * ```typescript
 * // From main thread:
 * navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
 * ```
 */
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
