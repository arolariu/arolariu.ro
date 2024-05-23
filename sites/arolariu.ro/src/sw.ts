/** @format */
// eslint-disable

import {defaultCache} from "@serwist/next/worker";
import {Serwist, type PrecacheEntry, type SerwistGlobalConfig, type SerwistOptions} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  clientsClaim: true,
  disableDevLogs: false,
  fallbacks: {
    entries: [
      {
        matcher({request}) {
          return request.destination === "document";
        },
        url: "/~offline",
      },
    ],
  },
  navigationPreload: true,
  offlineAnalyticsConfig: false,
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    concurrency: 12,
    fallbackToNetwork: true,
  },
  runtimeCaching: defaultCache,
  skipWaiting: true,
} satisfies SerwistOptions);

serwist.addEventListeners();
