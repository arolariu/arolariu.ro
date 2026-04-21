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

/** localStorage key for the persisted theme selection. */
const STORAGE_KEY = "status-theme";

/** Allowed theme values — used by the runtime guard. */
const VALID: readonly Theme[] = ["light", "dark", "auto"];

/** True when `v` is one of the three valid theme literals. */
function isValidTheme(v: unknown): v is Theme {
  return typeof v === "string" && (VALID as readonly string[]).includes(v);
}

/**
 * Current persisted theme, or `"auto"` when nothing is stored.
 * SSR-safe — returns `"auto"` when `localStorage` is unavailable.
 */
export function getTheme(): Theme {
  if (typeof localStorage === "undefined") return "auto";
  const stored = localStorage.getItem(STORAGE_KEY);
  return isValidTheme(stored) ? stored : "auto";
}

/**
 * Persist the theme selection and immediately apply it to the document.
 * No-op under SSR.
 */
export function setTheme(theme: Theme): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

/**
 * Resolve a theme (including `"auto"`) to its concrete rendered form.
 * Under SSR, `"auto"` resolves to `"dark"` as a safe default (matches the
 * production initial paint preference).
 */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "auto") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Apply `resolveTheme(theme)` to the document root via `data-theme`.
 * No-op under SSR. CSS selectors keyed on `[data-theme="dark"]` etc. re-evaluate.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolveTheme(theme));
}
