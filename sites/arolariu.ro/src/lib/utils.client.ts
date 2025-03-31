/** @format */

/**
 * Extracts a Base64-encoded string from a Blob object.
 *
 * @param {Blob} blob - The Blob object to extract the Base64 string from.
 * @returns {Promise<string>} A promise that resolves to the Base64-encoded string.
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
 */
export function isBrowserStorageAvailable(type: "localStorage" | "sessionStorage"): boolean {
  let storage;
  try {
    storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException
      && e.name === "QuotaExceededError"
      // acknowledge QuotaExceededError only if there's something already stored
      && storage !== undefined
      && storage.length !== 0
    );
  }
}

/**
 * Collects and returns comprehensive information about the user's browser and environment.
 * This function gathers various browser properties and capabilities including:
 * - Browser identification (userAgent, platform, vendor)
 * - Language settings
 * - Privacy settings (cookieEnabled, doNotTrack)
 * - Screen dimensions
 * - Current location data
 * - Performance metrics
 * - Memory usage (if available)
 * - Network information (if available)
 * - Device capabilities
 * - Supported features
 * - Navigation history length
 * - Referrer information
 * @returns A JSON string containing detailed browser and environment information
 */
export function dumpBrowserInformation(): string {
  const {userAgent, platform, vendor, language, languages, cookieEnabled, doNotTrack} = globalThis.navigator;
  const {width, height} = globalThis.screen;
  const {href, host, hostname, pathname} = globalThis.location;

  // Collect browser performance metrics
  const performance = globalThis.performance || {};
  const timing = performance.timing
    ? {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd,
        domComplete: performance.timing.domComplete,
        responseEnd: performance.timing.responseEnd,
        responseStart: performance.timing.responseStart,
        requestStart: performance.timing.requestStart,
      }
    : null;

  // Get memory info if available
  const memory = (performance as any).memory
    ? {
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      }
    : null;

  // Get network information if available
  const connection = (navigator as any).connection
    ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
        saveData: (navigator as any).connection.saveData,
      }
    : null;

  // Get device info
  const devicePixelRatio = globalThis.devicePixelRatio;
  const hardwareConcurrency = globalThis.navigator.hardwareConcurrency;
  const maxTouchPoints = globalThis.navigator.maxTouchPoints;

  // Browser features detection
  const features = {
    localStorage: !!globalThis.localStorage,
    sessionStorage: !!globalThis.sessionStorage,
    cookies: globalThis.navigator.cookieEnabled,
    serviceWorker: "serviceWorker" in globalThis.navigator,
    webGL: !!globalThis.document.createElement("canvas").getContext("webgl"),
  };

  // Browser history length (without exposing actual URLs for privacy)
  const historyLength = globalThis.history.length;

  // Get referrer information
  const referrer = globalThis.document.referrer;

  return JSON.stringify(
    {
      userAgent,
      platform,
      vendor,
      language,
      languages,
      cookieEnabled,
      doNotTrack,
      screen: {
        width,
        height,
      },
      location: {
        href,
        host,
        hostname,
        pathname,
      },
      performance: {
        timing,
        memory,
      },
      connection,
      devicePixelRatio,
      hardwareConcurrency,
      maxTouchPoints,

      referrer,
      historyLength,
      features,
    },
    null,
    4,
  );
}
