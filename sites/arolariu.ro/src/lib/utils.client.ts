import "client-only";

import type {BrowserInformation} from "@/types";

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
  // eslint-disable-next-line init-declarations -- We need to declare storage outside the try block
  let storage;
  try {
    // eslint-disable-next-line security/detect-object-injection -- safe function
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
 * This function will retrieve the user's browser navigation information.
 * @returns The user's browser navigation information.
 */
export function retrieveNavigatorInformation(): Readonly<BrowserInformation["navigationInformation"]> {
  const {userAgent, language, languages, cookieEnabled, doNotTrack, hardwareConcurrency, maxTouchPoints} = globalThis.navigator;
  return {
    userAgent,
    language,
    languages,
    cookieEnabled,
    doNotTrack,
    hardwareConcurrency,
    maxTouchPoints,
  } as const;
}

/**
 * This function will retrieve the user's browser screen information.
 * @returns The user's browser screen information.
 */
export function retrieveScreenInformation(): Readonly<BrowserInformation["screenInformation"]> {
  const {width, height, availWidth, availHeight, colorDepth, pixelDepth} = globalThis.screen;
  return {
    width,
    height,
    availWidth,
    availHeight,
    colorDepth,
    pixelDepth,
  } as const;
}

/**
 * Collects and returns comprehensive information about the user's browser and environment.
 * This function gathers various browser properties and capabilities.
 * @returns A JSON string containing detailed browser and environment information.
 */
export function dumpBrowserInformation(): Readonly<string> {
  const navigationInformation = retrieveNavigatorInformation();
  const screenInformation = retrieveScreenInformation();
  const returnValue: BrowserInformation = {
    navigationInformation,
    screenInformation,
  };

  return JSON.stringify(returnValue);
}
