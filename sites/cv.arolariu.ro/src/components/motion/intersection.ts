/* eslint-disable no-unused-vars */
/* eslint-disable no-magic-numbers */

// eslint-disable-next-line functional/type-declaration-immutability -- broken, fix.
type IntersectParameters = Readonly<{
  threshold?: number | number[];
  root?: Element | Document | null;
  rootMargin?: string;
  once?: boolean;
  onEnter?: (_: IntersectionObserverEntry) => void;
  onLeave?: (_: IntersectionObserverEntry) => void;
}>;

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
        // eslint-disable-next-line functional/no-loop-statements -- readability
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

