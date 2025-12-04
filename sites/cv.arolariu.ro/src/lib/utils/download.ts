/**
 * @fileoverview Browser-based file download utilities for the CV site.
 * @module download
 *
 * @remarks
 * Provides type-safe download functions that return `Result<void>` instead of
 * throwing exceptions. All functions gracefully handle SSR environments where
 * `window` is unavailable.
 *
 * **Rendering Context**: Client-side only. SSR calls return error results.
 *
 * **Memory Management**: Object URLs are created and revoked synchronously
 * to prevent memory leaks.
 *
 * @see {@link Result} for the unified error handling pattern
 */

import {error, ok, type Result} from "./result";

/**
 * Creates an object URL from a Blob and triggers a browser download.
 *
 * @remarks
 * **Implementation Details:**
 * - Creates a temporary anchor element to trigger the native download dialog
 * - Immediately revokes the object URL after click to prevent memory leaks
 * - Removes the anchor from DOM after triggering download
 *
 * **Thread-safety**: Not applicable (single-threaded browser environment).
 *
 * **Side Effects**: Briefly mutates DOM by appending/removing an anchor element.
 *
 * @param blob - The binary data to download. Must be a valid Blob instance.
 * @param filename - The suggested filename for the download dialog.
 *   Should include appropriate file extension (e.g., "data.json").
 * @returns `Result<void>` - `ok()` on success, or `error(Error)` if
 *   URL creation or DOM manipulation fails.
 *
 * @example
 * ```typescript
 * const blob = new Blob(["Hello"], { type: "text/plain" });
 * const result = triggerDownload(blob, "greeting.txt");
 * if (!result.ok) console.error(result.error);
 * ```
 */
function triggerDownload(blob: Blob, filename: string): Result<void> {
  try {
    const url = URL.createObjectURL(blob);
    const anchorTag = document.createElement("a");
    anchorTag.href = url;
    anchorTag.download = filename;
    document.body.appendChild(anchorTag);
    anchorTag.click();
    anchorTag.remove();
    URL.revokeObjectURL(url);
    return ok();
  } catch (error_: unknown) {
    return error(error_ instanceof Error ? error_ : new Error(String(error_)));
  }
}

/**
 * Downloads arbitrary text content as a file with configurable MIME type.
 *
 * @remarks
 * **Rendering Context**: Client-side only. Returns error in SSR environments.
 *
 * **Use Cases:**
 * - Downloading plain text files (.txt)
 * - Exporting CSV data
 * - Saving HTML/XML content
 * - Any text-based format with custom MIME type
 *
 * **Character Encoding**: Uses UTF-8 encoding via Blob constructor.
 *
 * @param text - The string content to download. Can be empty string.
 * @param filename - The suggested filename including extension (e.g., "export.csv").
 * @param mime - The MIME type for the Blob. Defaults to "text/plain".
 *   Common values: "text/csv", "text/html", "application/xml".
 * @returns `Result<void>` - `ok()` on success, or `error(Error)` if:
 *   - Called during SSR (window unavailable)
 *   - Blob creation fails
 *   - Download trigger fails
 *
 * @example
 * ```typescript
 * // Download plain text
 * const result = downloadText("Hello, World!", "greeting.txt");
 *
 * // Download CSV with explicit MIME type
 * const csvResult = downloadText("name,age\nJohn,30", "users.csv", "text/csv");
 * ```
 *
 * @see {@link downloadJSON} for JSON-specific downloads
 * @see {@link downloadBlob} for pre-existing Blob downloads
 */
export function downloadText(text: string, filename: string, mime = "text/plain"): Result<void> {
  if (!globalThis.window) return error(new Error("download not available (SSR)"));
  try {
    const blob = new Blob([text], {type: mime});
    return triggerDownload(blob, filename);
  } catch (error_: unknown) {
    return error(error_ instanceof Error ? error_ : new Error(String(error_)));
  }
}

/**
 * Downloads a JSON-serializable object as a prettified JSON file.
 *
 * @remarks
 * **Serialization**: Uses `JSON.stringify` with 2-space indentation for
 * human-readable output.
 *
 * **Rendering Context**: Client-side only (delegates to `downloadText`).
 *
 * **Circular References**: Will fail if data contains circular references,
 * as `JSON.stringify` throws on circular structures.
 *
 * **Use Cases:**
 * - Exporting application state
 * - Downloading API responses
 * - Saving user-generated configuration
 *
 * @param data - Any JSON-serializable value (object, array, primitive).
 *   Must not contain circular references, BigInt, undefined, functions,
 *   or Symbol values (these are omitted or cause errors per JSON spec).
 * @param filename - The suggested filename, should end with ".json"
 *   (e.g., "config.json", "export.json").
 * @returns `Result<void>` - `ok()` on success, or `error(Error)` if:
 *   - Data cannot be serialized (circular refs, BigInt, etc.)
 *   - Called during SSR
 *   - Download trigger fails
 *
 * @example
 * ```typescript
 * const userData = { name: "John", preferences: { theme: "dark" } };
 * const result = downloadJSON(userData, "user-data.json");
 *
 * if (!result.ok) {
 *   console.error("Download failed:", result.error.message);
 * }
 * ```
 *
 * @see {@link downloadText} for raw text downloads
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
 * Downloads an existing Blob instance with a specified filename.
 *
 * @remarks
 * **Rendering Context**: Client-side only. Returns error in SSR environments.
 *
 * **Use Cases:**
 * - Downloading files from fetch responses (`response.blob()`)
 * - Re-downloading user-uploaded files
 * - Saving canvas content as images
 * - Downloading any pre-constructed binary data
 *
 * **Performance**: No data transformation or copying occurs; the Blob
 * is used directly for the object URL.
 *
 * @param blob - The Blob to download. MIME type should be set on the Blob
 *   itself (e.g., `new Blob([data], { type: "image/png" })`).
 * @param filename - The suggested filename including appropriate extension
 *   matching the Blob's MIME type (e.g., "image.png", "document.pdf").
 * @returns `Result<void>` - `ok()` on success, or `error(Error)` if:
 *   - Called during SSR (window unavailable)
 *   - Download trigger fails
 *
 * @example
 * ```typescript
 * // Download from fetch response
 * const response = await fetch("/api/report.pdf");
 * const blob = await response.blob();
 * const result = downloadBlob(blob, "report.pdf");
 *
 * // Download canvas as image
 * canvas.toBlob((blob) => {
 *   if (blob) downloadBlob(blob, "canvas-export.png");
 * });
 * ```
 *
 * @see {@link downloadText} for string content downloads
 * @see {@link downloadJSON} for JSON object downloads
 */
export function downloadBlob(blob: Blob, filename: string): Result<void> {
  if (!globalThis.window) return error(new Error("download not available (SSR)"));
  return triggerDownload(blob, filename);
}
