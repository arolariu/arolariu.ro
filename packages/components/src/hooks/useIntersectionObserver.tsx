"use client";

import * as React from "react";

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
 * the element reference changes. The hook is SSR-safe and returns `null` when
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

  React.useEffect(() => {
    const element = ref.current;

    // SSR safety: IntersectionObserver is not available on server
    if (typeof globalThis.IntersectionObserver === "undefined" || !element) {
      return;
    }

    const observer = new globalThis.IntersectionObserver(([observerEntry]) => {
      if (observerEntry) {
        setEntry(observerEntry);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options?.threshold, options?.root, options?.rootMargin]);

  return entry;
}
