import {error, ok, type Result} from "./result";

/**
 * Copies arbitrary text to the system clipboard with graceful fallback.
 *
 * @remarks
 * **Execution Context**: Browser-only. Returns error Result in SSR environments.
 *
 * **Clipboard Strategy**:
 * 1. Attempts modern `navigator.clipboard.writeText()` API first (async, secure context)
 * 2. Falls back to hidden textarea + `execCommand('copy')` for legacy browsers
 *
 * **Why Result Pattern?**
 * - Avoids throwing exceptions for expected failure cases (SSR, permissions)
 * - Caller can handle clipboard unavailability gracefully without try/catch
 *
 * **Security Considerations**:
 * - Modern clipboard API requires secure context (HTTPS) in some browsers
 * - User gesture may be required depending on browser security policies
 *
 * @param text - The string content to copy. Empty string is a no-op returning `ok()`.
 * @returns `Result<void>` - `ok()` on success, `error(Error)` on failure or SSR context.
 *
 * @example
 * ```typescript
 * import { copyText } from "@/lib/utils/copy";
 *
 * const result = await copyText("Hello, clipboard!");
 * if (result.ok) {
 *   console.log("Copied successfully");
 * } else {
 *   console.error("Copy failed:", result.error);
 * }
 * ```
 *
 * @see {@link Result} for the Result type pattern used
 */
export async function copyText(text: string): Promise<Result<void>> {
  // SSR / non-browser guard
  if (!globalThis.window) return error(new Error("Clipboard not available (SSR)"));
  if (!text) return ok();

  // Prefer modern async clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return ok();
    } catch (error_: unknown) {
      console.error(">>> Error when trying to use modern navigation clipboard API:", error_);
    }
  }

  // Fallback: hidden textarea selection method
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    // eslint-disable-next-line sonarjs/deprecation -- fallback for old browsers
    document.execCommand("copy");
    document.body.removeChild(ta);
    return ok();
  } catch (error_: unknown) {
    return error(error_ instanceof Error ? error_ : new Error(String(error_)));
  }
}
