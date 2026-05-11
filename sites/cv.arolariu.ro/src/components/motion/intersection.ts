/**
 * @fileoverview Svelte action that wraps `IntersectionObserver` for
 * use as `use:intersect={{...}}` on any element.
 *
 * Hot-swaps callbacks on parameter change so a parent re-render doesn't
 * miss the initial entry. Used by `AnimatedSection` to fire its scroll-in
 * animation only when the wrapped section enters the viewport.
 *
 * @see {@link https://svelte.dev/docs/svelte/use} for Svelte action semantics.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver}
 */

/* eslint-disable no-unused-vars */
/* eslint-disable no-magic-numbers */

/** Parameters accepted by the `intersect` Svelte action. */
type IntersectParameters = Readonly<{
  /** IntersectionObserver `threshold` (single or array). Default `0.1`. */
  threshold?: number | number[];
  /** Observer `root`. `null` means viewport (default). */
  root?: Element | Document | null;
  /** Observer `rootMargin` shorthand. Default `"0px"`. */
  rootMargin?: string;
  /**
   * Disconnect after the first viewport entry. Default `true`
   * (scroll-in animations only need to fire once).
   */
  once?: boolean;
  /** Fired when the element enters the viewport. */
  onEnter?: (_: IntersectionObserverEntry) => void;
  /** Fired when the element leaves the viewport. */
  onLeave?: (_: IntersectionObserverEntry) => void;
}>;

/**
 * Svelte action that observes `node` with an `IntersectionObserver` and
 * fires `onEnter` / `onLeave` callbacks.
 *
 * @example
 * ```svelte
 * <section use:intersect={{threshold: 0.2, onEnter: runAnimation}} />
 * ```
 */
export function intersect(node: HTMLElement, parameters: IntersectParameters = {}) {
  // Keep a stable observer and hot-swap callbacks to avoid missing initial entries
  let observer: IntersectionObserver | null = null;

  // Current effective options (with defaults applied)
  let current = {
    threshold: parameters.threshold ?? 0.1,
    root: parameters.root ?? (null as Element | Document | null),
    rootMargin: parameters.rootMargin ?? "0px",
    once: parameters.once ?? true,
  };

  // Hot-swappable callbacks
  let onEnterCallback: ((entry: IntersectionObserverEntry) => void) | undefined = parameters.onEnter;
  let onLeaveCallback: ((entry: IntersectionObserverEntry) => void) | undefined = parameters.onLeave;

  function cleanup() {
    observer?.disconnect();
    observer = null;
  }

  function optionsChanged(next: IntersectParameters) {
    return (
      (current.threshold ?? 0.1) !== (next.threshold ?? 0.1)
      || current.root !== (next.root ?? null)
      || current.rootMargin !== (next.rootMargin ?? "0px")
      || current.once !== (next.once ?? true)
    );
  }

  function initObserver() {
    cleanup();
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== node) continue;
          if (entry.isIntersecting) {
            onEnterCallback?.(entry);
            if (current.once) observer?.unobserve(node);
          } else {
            onLeaveCallback?.(entry);
          }
        }
      },
      {threshold: current.threshold, root: current.root, rootMargin: current.rootMargin},
    );
    observer.observe(node);
  }

  // Initialize once
  initObserver();

  return {
    update(next: IntersectParameters) {
      // Update callbacks without recreating observer
      onEnterCallback = next.onEnter;
      onLeaveCallback = next.onLeave;

      // Recreate observer only if structural options changed
      if (optionsChanged(next)) {
        current = {
          threshold: next.threshold ?? 0.1,
          root: next.root ?? null,
          rootMargin: next.rootMargin ?? "0px",
          once: next.once ?? true,
        };
        initObserver();
      }
    },
    destroy() {
      cleanup();
    },
  };
}
