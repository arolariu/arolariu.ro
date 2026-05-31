/**
 * Theme persistence + application. The status page supports three modes:
 *  - `"light"` / `"dark"` — explicit user choice.
 *  - `"auto"` — follow the system `prefers-color-scheme` media query.
 *
 * The module is a pure function exposure (no Svelte runes) — callers (the
 * ThemeToggle component) read/write via `getTheme` / `setTheme`, and
 * `applyTheme` flips `<html data-theme>` which CSS hooks read. Keeping this
 * non-reactive keeps it trivially SSR-safe (every API early-returns without
 * `localStorage` / `document`).
 */

/** User-facing theme mode — includes `"auto"` (follow OS). */
export type Theme = "light" | "dark" | "auto";

/** Concrete rendered theme after resolving `"auto"` against the OS. */
export type ResolvedTheme = "light" | "dark";

/** LocalStorage key for the persisted theme selection. */
const STORAGE_KEY = "status-theme";

/** Allowed theme values - used by the runtime guard. */
const VALID_THEMES: readonly Theme[] = ["light", "dark", "auto"];

/** True when `value` is one of the three valid theme literals. */
function isValidTheme(value: unknown): value is Theme {
  return typeof value === "string" && (VALID_THEMES as readonly string[]).includes(value);
}

/**
 * Current persisted theme, or `"auto"` when nothing is stored.
 * SSR-safe — returns `"auto"` when `localStorage` is unavailable.
 */
export function getTheme(): Theme {
  const storage = globalThis.localStorage as Storage | undefined;
  if (storage === undefined) return "auto";
  const stored = storage.getItem(STORAGE_KEY);
  return isValidTheme(stored) ? stored : "auto";
}

/**
 * Resolve a theme (including `"auto"`) to its concrete rendered form.
 * Under SSR, `"auto"` resolves to `"dark"` as a safe default (matches the
 * production initial paint preference).
 */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "auto") return theme;
  const browserWindow = globalThis.window as Window | undefined;
  if (browserWindow === undefined) return "dark";
  return browserWindow.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Apply `resolveTheme(theme)` to the document root via `data-theme`.
 * No-op under SSR. CSS selectors keyed on `[data-theme="dark"]` etc. re-evaluate.
 */
export function applyTheme(theme: Theme): void {
  const pageDocument = globalThis.document as Document | undefined;
  if (pageDocument === undefined) return;
  pageDocument.documentElement.dataset.theme = resolveTheme(theme);
}

/**
 * Persist the theme selection and immediately apply it to the document.
 * No-op under SSR.
 */
export function setTheme(theme: Theme): void {
  const storage = globalThis.localStorage as Storage | undefined;
  if (storage === undefined) return;
  storage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}
