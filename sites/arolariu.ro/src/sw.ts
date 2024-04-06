import {type SerwistGlobalConfig} from "@serwist/core";
import {defaultCache} from "@serwist/next/worker";
import {PrecacheController, type PrecacheEntry} from "@serwist/precaching";
import {Serwist, type SerwistInstallOptions, type SerwistOptions} from "@serwist/sw";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope;

// Anything random.
const revision = crypto.randomUUID();

const serwist = new Serwist({
  precacheController: new PrecacheController({
    concurrentPrecaching: 10,
  }),
} satisfies SerwistOptions);

serwist.install({
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
        matcher({request}) {
          return request.destination === "document";
        },
      },
    ],
  },
} satisfies SerwistInstallOptions);
