/**
 * Keyboard shortcuts for the status page. Exposes a factory
 * `createKeyboardHandler` that `+page.svelte` wires into its `onMount`
 * window-keydown listener. Extracted so the switch is unit-testable
 * without a Svelte component harness.
 *
 * Consolidates `shouldIgnoreKeydown` (editable-target + modifier check)
 * into the same module — when a shortcut should be short-circuited for
 * reasons unrelated to the specific binding, it happens here in one
 * place before any binding logic runs.
 */

import {FILTER_WINDOWS, type FilterWindow} from "../types/status";

/**
 * Short-circuit keyboard shortcuts when focus is in an editable element,
 * or when any modifier is held (so we don't steal Ctrl+R / Cmd+L / etc).
 */
export function shouldIgnoreKeydown(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.matches('input, textarea, select, [contenteditable="true"]')) return true;
  return false;
}

/**
 * Bindings implemented by the host component (`+page.svelte`). Each is
 * invoked when the corresponding key triggers.
 */
export interface KeyboardBindings {
  /** Current active filter window — read once per event to compute the next one. */
  readonly getActiveWindow: () => FilterWindow;
  readonly setActiveWindow: (w: FilterWindow) => void;
  /** Whether anything (e.g. a service row) is currently expanded. */
  readonly getExpandedService: () => string | null;
  readonly setExpandedService: (s: string | null) => void;
  readonly toggleHelp: () => void;
  readonly refresh: () => void;
}

/**
 * Factory that returns the event handler. The handler:
 *  - skips when `shouldIgnoreKeydown` says so
 *  - skips when `event.defaultPrevented` (child handler already consumed)
 *  - handles `?` (toggle help), `←/→` (prev/next window), `Escape` (collapse),
 *    `r/R` (refresh), and `1..9` (jump to filter window).
 */
export function createKeyboardHandler(b: KeyboardBindings): (event: KeyboardEvent) => void {
  return function handle(event: KeyboardEvent): void {
    if (shouldIgnoreKeydown(event)) return;
    if (event.defaultPrevented) return;

    if (event.key === "?") {
      event.preventDefault();
      b.toggleHelp();
      return;
    }

    const active = b.getActiveWindow();
    const currentIdx = FILTER_WINDOWS.indexOf(active);
    const total = FILTER_WINDOWS.length;

    switch (event.key) {
      case "ArrowLeft": {
        const next = FILTER_WINDOWS[(currentIdx - 1 + total) % total];
        /* v8 ignore next */
        if (next) b.setActiveWindow(next);
        event.preventDefault();
        return;
      }
      case "ArrowRight": {
        const next = FILTER_WINDOWS[(currentIdx + 1) % total];
        /* v8 ignore next */
        if (next) b.setActiveWindow(next);
        event.preventDefault();
        return;
      }
      case "Escape": {
        if (b.getExpandedService() !== null) {
          b.setExpandedService(null);
          event.preventDefault();
        }
        return;
      }
      case "r":
      case "R": {
        b.refresh();
        event.preventDefault();
        return;
      }
      default:
        break;
    }

    if (event.key >= "1" && event.key <= "9") {
      const idx = Number(event.key) - 1;
      const next = FILTER_WINDOWS[idx];
      /* v8 ignore next 3 */
      if (next) {
        b.setActiveWindow(next);
        event.preventDefault();
      }
    }
  };
}
