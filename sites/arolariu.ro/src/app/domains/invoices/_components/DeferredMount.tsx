"use client";

/**
 * @fileoverview Reusable IntersectionObserver-driven deferred mount wrapper.
 * @module sites/arolariu.ro/src/app/domains/invoices/_components/DeferredMount
 *
 * @remarks
 * Renders {@link Props.placeholder} until its container intersects (or
 * approaches) the viewport, then swaps to {@link Props.children} and
 * disconnects the observer. Once activated, stays mounted for the rest of the
 * page's lifetime (no re-shimmer on scroll-out) — appropriate for bounded
 * lists where memory cost is acceptable in exchange for stable UX.
 *
 * Falls back to immediate activation when {@link IntersectionObserver} is
 * unavailable (graceful degradation for ancient WebViews); the primary
 * browser matrix targeted by Next.js 16 ships it natively.
 */

import {useEffect, useRef, useState} from "react";

/**
 * Props for the DeferredMount component.
 */
type Props = Readonly<{
  /** Rendered until the container intersects the viewport. */
  placeholder: React.ReactNode;
  /** Rendered after the first intersection. */
  children: React.ReactNode;
  /**
   * Optional class applied to the wrapper element so callers can size the
   * placeholder and final children identically to avoid scroll jump.
   */
  className?: string;
}>;

// One viewport-worth of prefetch ahead of the scroll position — cards
// activate before the user actually sees them, so the swap is invisible.
const ROOT_MARGIN = "200px";

/**
 * Defers mounting of its children until the wrapper enters the viewport.
 *
 * @param props - {@link Props}
 * @returns A wrapper element rendering either the placeholder or the children.
 */
export default function DeferredMount({placeholder, children, className}: Props): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  // When IntersectionObserver is unavailable (very old WebViews), activate
  // immediately via the initializer so the effect never has to setState
  // synchronously — keeps react-hooks/set-state-in-effect happy and avoids
  // an unnecessary first-render → effect → re-render cycle in the fallback path.
  const [activated, setActivated] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (activated) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActivated(true);
            observer.disconnect();
            return;
          }
        }
      },
      {rootMargin: ROOT_MARGIN},
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [activated]);

  return (
    <div
      ref={ref}
      className={className}>
      {activated ? children : placeholder}
    </div>
  );
}
