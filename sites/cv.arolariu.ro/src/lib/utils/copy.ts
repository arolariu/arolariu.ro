import {error, ok, type Result} from "./result";

/**
 * Copy arbitrary text to the clipboard (Phase 0 utility consolidation).
 * Falls back to a temporary textarea if navigator.clipboard is unavailable or errors.
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
