export interface IntersectParams {
  threshold?: number | number[];
  root?: Element | Document | null;
  rootMargin?: string;
  once?: boolean;
  onEnter?: (entry: IntersectionObserverEntry) => void;
  onLeave?: (entry: IntersectionObserverEntry) => void;
}

export function intersect(node: HTMLElement, params: IntersectParams = {}) {
  // Keep a stable observer and hot-swap callbacks to avoid missing initial entries
  let observer: IntersectionObserver | null = null;

  // Current effective options (with defaults applied)
  let current = {
    threshold: params.threshold ?? 0.1,
    root: params.root ?? (null as Element | Document | null),
    rootMargin: params.rootMargin ?? "0px",
    once: params.once ?? true,
  };

  // Hot-swappable callbacks
  let onEnterCb: ((entry: IntersectionObserverEntry) => void) | undefined = params.onEnter;
  let onLeaveCb: ((entry: IntersectionObserverEntry) => void) | undefined = params.onLeave;

  function cleanup() {
    observer?.disconnect();
    observer = null;
  }

  function optionsChanged(next: IntersectParams) {
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
            onEnterCb?.(entry);
            if (current.once) observer?.unobserve(node);
          } else {
            onLeaveCb?.(entry);
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
    update(next: IntersectParams) {
      // Update callbacks without recreating observer
      onEnterCb = next.onEnter;
      onLeaveCb = next.onLeave;

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
