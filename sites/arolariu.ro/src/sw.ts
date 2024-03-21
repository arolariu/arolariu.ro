import type { PrecacheEntry } from "@serwist/precaching";
import { SerwistOptions, installSerwist } from "@serwist/sw";
import { defaultCache } from "@serwist/next/worker";

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
  // Change this attribute's name to your `injectionPoint`.
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

// Anything random.
const revision = crypto.randomUUID();

installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  cleanupOutdatedCaches: true,
  disableDevLogs: false,
  offlineAnalyticsConfig: false,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
   entries: [
        {
          url: "/~offline",
          revision,
          matcher({ request }) {
            return request.destination === "document";
          },
        },
    ],
  },
} satisfies SerwistOptions);
