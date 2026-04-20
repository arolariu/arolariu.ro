export type Theme = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "status-theme";
const VALID: readonly Theme[] = ["light", "dark", "auto"];

function isValidTheme(v: unknown): v is Theme {
  return typeof v === "string" && (VALID as readonly string[]).includes(v);
}

export function getTheme(): Theme {
  if (typeof localStorage === "undefined") return "auto";
  const stored = localStorage.getItem(STORAGE_KEY);
  return isValidTheme(stored) ? stored : "auto";
}

export function setTheme(theme: Theme): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "auto") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolveTheme(theme));
}
