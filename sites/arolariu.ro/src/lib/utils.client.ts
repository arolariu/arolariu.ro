/** @format */

/**
 * Extracts a Base64-encoded string from a Blob object.
 * @param blob The Blob object to extract the Base64 string from.
 * @returns A promise that resolves to the Base64-encoded string.
 */
export async function extractBase64FromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        const base64 = reader.result as string;
        resolve(base64);
      },
      {once: true},
    ); // Add { once: true } to remove the event listener after it is triggered
    reader.readAsDataURL(blob);
  });
}

/**
 * This function checks if the browser storage is available.
 * This function is extracted from the MDN Web Docs regarding the Web Storage API.
 * @returns True if the storage is available, false otherwise.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Storage
 */
export function isBrowserStorageAvailable(type: "localStorage" | "sessionStorage"): boolean {
  // eslint-disable-next-line functional/no-let -- We need to declare storage outside the try block
  let storage;
  try {
    storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (error) {
    return (
      error instanceof DOMException
      && error.name === "QuotaExceededError"
      // acknowledge QuotaExceededError only if there's something already stored
      && storage !== undefined
      && storage.length > 0
    );
  }
}

/**
 * Collects and returns comprehensive information about the user's browser and environment.
 * This function gathers various browser properties and capabilities.
 * @returns A JSON string containing detailed browser and environment information.
 */
export function dumpBrowserInformation(): string {
  const {userAgent, language, languages, cookieEnabled, doNotTrack, hardwareConcurrency, maxTouchPoints} = globalThis.navigator;
  const {width: screenWidth, height: screenHeight, availWidth, availHeight, colorDepth, pixelDepth} = globalThis.screen;

  // Collect browser performance metrics using Navigation Timing API
  // eslint-disable-next-line functional/no-let -- readability
  let navigationTiming: Record<string, any> | null = null;
  if (globalThis.performance && typeof globalThis.performance.getEntriesByType === "function") {
    const navigationEntries = globalThis.performance.getEntriesByType("navigation");
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
      navigationTiming = {
        entryType: navEntry.entryType,
        name: navEntry.name,
        startTime: navEntry.startTime,
        duration: navEntry.duration,
        initiatorType: navEntry.initiatorType,
        nextHopProtocol: navEntry.nextHopProtocol,
        workerStart: navEntry.workerStart,
        redirectStart: navEntry.redirectStart,
        redirectEnd: navEntry.redirectEnd,
        fetchStart: navEntry.fetchStart,
        domainLookupStart: navEntry.domainLookupStart,
        domainLookupEnd: navEntry.domainLookupEnd,
        connectStart: navEntry.connectStart,
        connectEnd: navEntry.connectEnd,
        secureConnectionStart: navEntry.secureConnectionStart,
        requestStart: navEntry.requestStart,
        responseStart: navEntry.responseStart,
        responseEnd: navEntry.responseEnd,
        domInteractive: navEntry.domInteractive,
        domContentLoadedEventStart: navEntry.domContentLoadedEventStart,
        domContentLoadedEventEnd: navEntry.domContentLoadedEventEnd,
        domComplete: navEntry.domComplete,
        loadEventStart: navEntry.loadEventStart,
        loadEventEnd: navEntry.loadEventEnd,
        type: navEntry.type,
        redirectCount: navEntry.redirectCount,
        transferSize: navEntry.transferSize,
        encodedBodySize: navEntry.encodedBodySize,
        decodedBodySize: navEntry.decodedBodySize,
        serverTiming: navEntry.serverTiming,
        unloadEventStart: navEntry.unloadEventStart,
        unloadEventEnd: navEntry.unloadEventEnd,
        // You can add more properties from PerformanceNavigationTiming if needed
      };
    }
  }

  // Get memory info if available (Chromium-specific)
  const memory = (globalThis.performance as any).memory
    ? {
        jsHeapSizeLimit: (globalThis.performance as any).memory.jsHeapSizeLimit,
        totalJSHeapSize: (globalThis.performance as any).memory.totalJSHeapSize,
        usedJSHeapSize: (globalThis.performance as any).memory.usedJSHeapSize,
      }
    : null;

  // Get network information if available
  const connection = (globalThis.navigator as any).connection
    ? {
        effectiveType: (globalThis.navigator as any).connection.effectiveType,
        downlink: (globalThis.navigator as any).connection.downlink,
        rtt: (globalThis.navigator as any).connection.rtt,
        saveData: (globalThis.navigator as any).connection.saveData,
        type: (globalThis.navigator as any).connection.type, // Added connection type
      }
    : null;

  // Get device info
  const devicePixelRatio = globalThis.devicePixelRatio;

  // Browser features detection
  const features = {
    localStorage: globalThis.localStorage != undefined,
    sessionStorage: globalThis.sessionStorage != undefined,
    cookies: cookieEnabled, // Use the destructured variable here
    serviceWorker: "serviceWorker" in globalThis.navigator,
    webGL: !!globalThis.document.createElement("canvas").getContext("webgl"),
    indexedDB: globalThis.indexedDB != undefined,
    webSockets: globalThis.WebSocket != undefined,
    geolocation: "geolocation" in globalThis.navigator,
  };

  // Browser history length
  const historyLength = globalThis.history.length;

  // Get referrer information
  const referrer = globalThis.document.referrer;

  // Timezone
  const timezoneOffset = new Date().getTimezoneOffset();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      userAgent,
      language,
      languages,
      cookieEnabled,
      doNotTrack, // Added doNotTrack
      screen: {
        width: screenWidth,
        height: screenHeight,
        availWidth,
        availHeight,
        colorDepth,
        pixelDepth,
      },
      window: {
        innerWidth: globalThis.innerWidth,
        innerHeight: globalThis.innerHeight,
        outerWidth: globalThis.outerWidth,
        outerHeight: globalThis.outerHeight,
      },
      location: {
        href: globalThis.location.href,
        protocol: globalThis.location.protocol,
        host: globalThis.location.host,
        hostname: globalThis.location.hostname,
        port: globalThis.location.port,
        pathname: globalThis.location.pathname,
        search: globalThis.location.search,
        hash: globalThis.location.hash,
      },
      performance: {
        navigationTiming,
        memory, // Note: Chromium-specific
      },
      connection, // Note: Experimental, not fully supported
      devicePixelRatio,
      hardwareConcurrency,
      maxTouchPoints,
      timezoneOffset,
      timezone,
      referrer,
      historyLength,
      features,
    },
    null,
    2, // Using 2 spaces for indentation for better readability in some contexts
  );
}
