"use client";

import {motion, useInView, type HTMLMotionProps, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {useReducedMotion} from "@/hooks/useReducedMotion";
import styles from "./gradient-background.module.css";

/** Props accepted by {@link GradientBackground}. */
export interface GradientBackgroundProps extends HTMLMotionProps<"div"> {
  /** Motion timing used for the animated background-position sweep. @default {duration: 15, ease: "easeInOut", repeat: Infinity} */
  readonly transition?: Transition;
}

const defaultTransition: Transition = {duration: 15, ease: "easeInOut", repeat: Infinity};
const backgroundSweep = {backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]};

function useMotionPaused(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const reduced = useReducedMotion();
  const preference = React.useMemo(() => {
    const media = typeof window === "undefined" ? null : globalThis.matchMedia("(prefers-reduced-motion: reduce)");
    return {
      subscribe(notify: () => void): () => void {
        media?.addEventListener("change", notify);
        document.addEventListener("visibilitychange", notify);
        return (): void => {
          media?.removeEventListener("change", notify);
          document.removeEventListener("visibilitychange", notify);
        };
      },
      snapshot: (): boolean => (media?.matches ?? reduced !== false) || document.visibilityState === "hidden",
    };
  }, [reduced]);
  const paused = React.useSyncExternalStore(preference.subscribe, preference.snapshot, () => true);
  const visible = useInView(ref, {initial: true});
  return paused || !visible;
}

/**
 * Renders a continuously shifting multicolor gradient background.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <GradientBackground />
 * ```
 *
 * @see {@link GradientBackgroundProps} for available props
 */
const GradientBackground = React.forwardRef<HTMLDivElement, GradientBackgroundProps>(
  (
    {className, transition = defaultTransition, animate = backgroundSweep, initial = false, ...props}: Readonly<GradientBackgroundProps>,
    ref,
  ): React.JSX.Element => {
    const localRef = React.useRef<HTMLDivElement>(null);
    const paused = useMotionPaused(localRef);
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null): void | (() => void) => {
        localRef.current = node;
        if (typeof ref === "function") {
          const callback: React.RefCallback<HTMLDivElement> = ref;
          const cleanup = callback(node);
          if (typeof cleanup === "function")
            return (): void => {
              localRef.current = null;
              cleanup();
            };
        } else if (ref) ref.current = node;
      },
      [ref],
    );

    return (
      <motion.div
        {...props}
        ref={setRefs}
        className={cn(styles.root, className)}
        data-motion={paused ? "paused" : "running"}
        initial={paused ? false : initial}
        animate={paused ? {backgroundPosition: "0% 50%"} : animate}
        transition={paused ? {duration: 0} : transition}
      />
    );
  },
);

GradientBackground.displayName = "GradientBackground";

export {GradientBackground};
