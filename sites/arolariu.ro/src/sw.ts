import {defaultCache} from "@serwist/next/worker";
import type {PrecacheEntry, SerwistGlobalConfig, SerwistOptions} from "serwist";
import {Serwist} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
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
        matcher({request}) {
          return request.destination === "document";
        },
      },
    ],
  },
} satisfies SerwistOptions);

serwist.addEventListeners();
