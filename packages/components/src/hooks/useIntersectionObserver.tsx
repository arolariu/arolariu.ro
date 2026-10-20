"use client";

import * as React from "react";

interface Observation {
  readonly element: Element;
  readonly thresholdKey: string;
  readonly root: IntersectionObserverInit["root"];
  readonly rootMargin: string | undefined;
  readonly disconnect: () => void;
}

/**
 * Observes element visibility using the Intersection Observer API.
 *
 * @remarks
 * This hook creates an IntersectionObserver that watches the provided element
 * reference and returns the latest `IntersectionObserverEntry`. It's useful
 * for implementing lazy loading, infinite scroll, animations on scroll, and
 * tracking element visibility.
 *
 * The observer automatically disconnects when the component unmounts or when
 * the actual target changes on a component commit, even when its ref object is
 * retained. Replacing the target clears the previous entry and ignores queued
 * deliveries from the old observer. The hook is SSR-safe and returns `null` when
 * running on the server or when the observer is not yet initialized.
 *
 * @param ref - A React ref object pointing to the element to observe.
 * @param options - Optional IntersectionObserver configuration (threshold, root, rootMargin).
 * @returns The latest IntersectionObserverEntry or null if not intersecting yet.
 *
 * @example
 * ```tsx
 * function LazyImage({src, alt}: {src: string; alt: string}) {
 *   const imageRef = useRef<HTMLImageElement>(null);
 *   const entry = useIntersectionObserver(imageRef, {threshold: 0.1});
 *
 *   return (
 *     <img
 *       ref={imageRef}
 *       src={entry?.isIntersecting ? src : undefined}
 *       alt={alt}
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function AnimateOnScroll({children}: {children: React.ReactNode}) {
 *   const ref = useRef<HTMLDivElement>(null);
 *   const entry = useIntersectionObserver(ref, {threshold: 0.5});
 *   const isVisible = entry?.isIntersecting ?? false;
 *
 *   return (
 *     <div ref={ref} className={isVisible ? "fade-in" : "hidden"}>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element | null>,
  options?: IntersectionObserverInit,
): IntersectionObserverEntry | null {
  const [entry, setEntry] = React.useState<IntersectionObserverEntry | null>(null);

  const threshold = options?.threshold;
  const thresholdKey = String(threshold ?? 0);
  const root = options?.root;
  const rootMargin = options?.rootMargin;
  const observationRef = React.useRef<Observation | null>(null);

  React.useEffect(() => {
    const element = ref.current;
    const {current} = observationRef;
    if (
      current?.element === element
      && current.thresholdKey === thresholdKey
      && current.root === root
      && current.rootMargin === rootMargin
      && globalThis.IntersectionObserver !== undefined
    ) {
      return;
    }
    current?.disconnect();
    observationRef.current = null;
    setEntry(null);

    if (globalThis.IntersectionObserver === undefined || !element) {
      return;
    }

    let active = true;
    const observer = new globalThis.IntersectionObserver(
      ([observerEntry]) => {
        if (active && observerEntry) {
          setEntry(observerEntry);
        }
      },
      {threshold, root, rootMargin},
    );

    observationRef.current = {
      element,
      thresholdKey,
      root,
      rootMargin,
      disconnect: () => {
        active = false;
        observer.disconnect();
      },
    };
    observer.observe(element);
  });

  React.useEffect(
    () => () => {
      observationRef.current?.disconnect();
      observationRef.current = null;
    },
    [],
  );

  return entry;
}
