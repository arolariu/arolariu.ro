/** @format */

import {ok, err} from "./result";
import type {Result} from "./result";

/**
 * Create an object URL and trigger a download, ensuring cleanup.
 */
function triggerDownload(blob: Blob, filename: string): Result<void> {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return ok(undefined);
  } catch (e: any) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Download arbitrary text content as a file.
 */
export function downloadText(text: string, filename: string, mime = "text/plain"): Result<void> {
  if (typeof window === "undefined") return err(new Error("download not available (SSR)"));
  const blob = new Blob([text], {type: mime});
  return triggerDownload(blob, filename);
}

/**
 * Download a JSON-serializable object as prettified JSON.
 */
export function downloadJSON(data: unknown, filename: string): Result<void> {
  try {
    const json = JSON.stringify(data, null, 2);
    return downloadText(json, filename, "application/json");
  } catch (e: any) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Download an existing Blob with a given filename.
 */
export function downloadBlob(blob: Blob, filename: string): Result<void> {
  if (typeof window === "undefined") return err(new Error("download not available (SSR)"));
  return triggerDownload(blob, filename);
}
