<script lang="ts">
  /**
   * Three-state theme toggle chip (dark → light → auto → dark …) shown in
   * the masthead. The initial state is read from `themeStore` (persisted in
   * localStorage with SSR-safe guards), and when in "auto" we subscribe to
   * the OS `prefers-color-scheme` media query so the page re-themes live
   * as the user flips their system appearance. Takes no props.
   */
  import {onMount} from "svelte";
  import {applyTheme, getTheme, setTheme, type Theme} from "../../stores/themeStore.svelte";

  /** Currently-selected theme token; mirrored from the store on mount. */
  let theme = $state<Theme>("auto");

  onMount(() => {
    theme = getTheme();

    // When the user has theme="auto", track the OS-level preference live so
    // the page re-themes as the user flips their system appearance without
    // reloading. applyTheme re-evaluates matchMedia each call.
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (theme === "auto") applyTheme("auto"); };
    // addEventListener is the modern API; fall back silently if unavailable.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    return;
  });

  /** Advance through the dark → light → auto cycle and persist via the store. */
  function cycle() {
    const next: Theme = theme === "dark" ? "light" : theme === "light" ? "auto" : "dark";
    theme = next;
    setTheme(next);
  }

  /** Visible text label for the current theme. */
  const label = $derived(theme === "dark" ? "dark" : theme === "light" ? "light" : "auto");
  /** Decorative glyph mirroring the theme state (filled / outline / half). */
  const icon = $derived(theme === "dark" ? "●" : theme === "light" ? "○" : "◐");
</script>

<button
  class="theme-toggle"
  type="button"
  onclick={cycle}
  aria-label="Toggle color theme (currently {label})"
  title="Theme: {label}"
>
  <span class="icon" aria-hidden="true">{icon}</span>
  <span class="label">{label}</span>
</button>

<style>
  .theme-toggle {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: 0;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.02em;
    display: inline-flex;
    gap: 6px;
    align-items: center;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .theme-toggle:hover {
    color: var(--text);
    border-color: var(--border-strong);
  }
  .theme-toggle:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }
  .theme-toggle .icon {
    color: var(--accent);
    font-size: 10px;
    line-height: 1;
  }
  .label { font-weight: 400; }
</style>
