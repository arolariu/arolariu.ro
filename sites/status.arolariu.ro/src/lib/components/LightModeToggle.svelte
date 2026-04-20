<script lang="ts">
  import {onMount} from "svelte";
  import {applyTheme, getTheme, setTheme, type Theme} from "../stores/themeStore.svelte";

  let theme: Theme = $state("auto");

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

  function cycle() {
    const next: Theme = theme === "dark" ? "light" : theme === "light" ? "auto" : "dark";
    theme = next;
    setTheme(next);
  }

  const label = $derived(theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Auto");
  const icon = $derived(theme === "dark" ? "🌙" : theme === "light" ? "☀" : "◐");
</script>

<button
  class="theme-toggle"
  type="button"
  onclick={cycle}
  aria-label="Toggle color theme (currently {label})"
  title="Theme: {label}"
>
  <span aria-hidden="true">{icon}</span>
  <span class="label">{label}</span>
</button>

<style>
  .theme-toggle {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 4px 10px;
    border-radius: var(--radius-sm, 4px);
    font-size: var(--fs-xs);
    font-family: inherit;
    display: inline-flex;
    gap: 6px;
    align-items: center;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .theme-toggle:hover {
    background: var(--surface-hover, var(--surface-raised, rgba(255, 255, 255, 0.05)));
    border-color: var(--border-strong, var(--border));
  }
  .theme-toggle:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .label {
    font-weight: 500;
  }
</style>
