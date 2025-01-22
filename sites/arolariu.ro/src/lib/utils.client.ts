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
      e instanceof DOMException &&
      e.name === "QuotaExceededError" &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage !== undefined &&
      storage.length !== 0
    );
  }
}
