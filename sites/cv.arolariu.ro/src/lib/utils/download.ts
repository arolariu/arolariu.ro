import {error, ok, type Result} from "./result";

/**
 * Create an object URL and trigger a download, ensuring cleanup.
 */
function triggerDownload(blob: Blob, filename: string): Result<void> {
  try {
    const url = URL.createObjectURL(blob);
    const anchorTag = document.createElement("a");
    anchorTag.href = url;
    anchorTag.download = filename;
    document.body.appendChild(anchorTag);
    anchorTag.click();
    document.body.removeChild(anchorTag);
    URL.revokeObjectURL(url);
    return ok();
  } catch (error_: unknown) {
    return error(error_ instanceof Error ? error_ : new Error(String(error_)));
  }
}

/**
 * Download arbitrary text content as a file.
 */
export function downloadText(text: string, filename: string, mime = "text/plain"): Result<void> {
  if (!globalThis.window) return error(new Error("download not available (SSR)"));
  const blob = new Blob([text], {type: mime});
  return triggerDownload(blob, filename);
}

/**
 * Download a JSON-serializable object as prettified JSON.
 */
export function downloadJSON(data: unknown, filename: string): Result<void> {
  try {
    const json = JSON.stringify(
      data,
      null,
      // eslint-disable-next-line no-magic-numbers -- pretty print with 2 spaces
      2,
    );
    return downloadText(json, filename, "application/json");
  } catch (error_: unknown) {
    return error(error_ instanceof Error ? error_ : new Error(String(error_)));
  }
}

/**
 * Download an existing Blob with a given filename.
 */
export function downloadBlob(blob: Blob, filename: string): Result<void> {
  if (!globalThis.window) return error(new Error("download not available (SSR)"));
  return triggerDownload(blob, filename);
}
