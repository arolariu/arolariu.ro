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
