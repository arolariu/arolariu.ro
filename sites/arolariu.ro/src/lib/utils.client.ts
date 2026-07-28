/**
 * @fileoverview Client-only browser utility helpers.
 * @module sites/arolariu.ro/src/lib/utils.client
 *
 * @remarks
 * Intended for code that relies on browser-only APIs such as `FileReader`, `window`, and `screen`.
 */

// eslint-disable-next-line n/no-extraneous-import -- client-only is a Next.js build-time marker, not a runtime import
import "client-only";

import type {BrowserInformation} from "@/types";

/**
 * Reads a browser `Blob` as a Base64 data URL.
 *
 * @remarks
 * This helper is browser-only because it depends on `FileReader`. It resolves
 * only when the browser returns a string data URL and rejects FileReader errors
 * explicitly so upload fallback paths can surface real read failures.
 *
 * @param blob - Blob or File object to encode.
 * @returns Base64 data URL.
 * @throws {Error} When FileReader fails or returns a non-string result.
 */
export async function extractBase64FromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Unable to read blob as base64"));
        }
      },
      {once: true},
    );
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Unable to read file")), {once: true});
    reader.readAsDataURL(blob);
  });
}

// #region Browser API Functions (storage, navigator, screen)

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
  } catch (error: unknown) {
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

// #endregion
