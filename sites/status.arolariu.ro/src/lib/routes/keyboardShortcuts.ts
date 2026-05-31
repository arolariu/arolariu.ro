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
  const {target} = event;
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
  // eslint-disable-next-line no-unused-vars -- Interface callback names document host binding contracts.
  readonly setActiveWindow: (windowFilter: FilterWindow) => void;
  /** Whether anything (e.g. a service row) is currently expanded. */
  readonly getExpandedService: () => string | null;
  // eslint-disable-next-line no-unused-vars -- Interface callback names document host binding contracts.
  readonly setExpandedService: (service: string | null) => void;
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
// eslint-disable-next-line no-unused-vars -- Return type documents the DOM event handler contract.
export function createKeyboardHandler(bindings: KeyboardBindings): (event: KeyboardEvent) => void {
  return function handle(event: KeyboardEvent): void {
    if (shouldIgnoreKeydown(event)) return;
    if (event.defaultPrevented) return;

    if (event.key === "?") {
      event.preventDefault();
      bindings.toggleHelp();
      return;
    }

    const active = bindings.getActiveWindow();
    const currentIndex = FILTER_WINDOWS.indexOf(active);
    const total = FILTER_WINDOWS.length;

    switch (event.key) {
      case "ArrowLeft": {
        const nextWindow = FILTER_WINDOWS.at((currentIndex - 1 + total) % total);
        // eslint-disable-next-line capitalized-comments -- v8 ignore directive is case-sensitive.
        /* v8 ignore next */
        if (nextWindow) bindings.setActiveWindow(nextWindow);
        event.preventDefault();
        return;
      }
      case "ArrowRight": {
        const nextWindow = FILTER_WINDOWS.at((currentIndex + 1) % total);
        // eslint-disable-next-line capitalized-comments -- v8 ignore directive is case-sensitive.
        /* v8 ignore next */
        if (nextWindow) bindings.setActiveWindow(nextWindow);
        event.preventDefault();
        return;
      }
      case "Escape": {
        if (bindings.getExpandedService() !== null) {
          bindings.setExpandedService(null);
          event.preventDefault();
        }
        return;
      }
      case "r":
      case "R": {
        bindings.refresh();
        event.preventDefault();
        return;
      }
      default: {
        break;
      }
    }

    if (event.key >= "1" && event.key <= "9") {
      const windowIndex = Number(event.key) - 1;
      const nextWindow = FILTER_WINDOWS.at(windowIndex);
      // eslint-disable-next-line capitalized-comments -- v8 ignore directive is case-sensitive.
      /* v8 ignore next 3 */
      if (nextWindow) {
        bindings.setActiveWindow(nextWindow);
        event.preventDefault();
      }
    }
  };
}
