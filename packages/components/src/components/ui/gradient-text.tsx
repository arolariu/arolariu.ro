"use client";

import {motion, useInView, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {useReducedMotion} from "@/hooks/useReducedMotion";
import styles from "./gradient-text.module.css";

/** Props accepted by {@link GradientText}. */
export interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Caller styles are merged at the root; this custom property overrides the gradient prop. */
  readonly style?: React.CSSProperties & {readonly "--ac-gradient-text-background"?: string};
  /** Text content rendered with the animated gradient fill. @default undefined */
  readonly text: string;
  /** CSS gradient string assigned to the animated text fill. @default "linear-gradient(90deg, #3b82f6 0%, #a855f7 20%, #ec4899 50%, #a855f7 80%, #3b82f6 100%)" */
  readonly gradient?: string;
  /** Adds a blurred neon duplicate behind the primary text layer. @default false */
  readonly neon?: boolean;
  /** Motion timing used for the animated gradient background. @default {duration: 50, repeat: Infinity, ease: "linear"} */
  readonly transition?: Transition;
}

type GradientStyleProperties = React.CSSProperties & {
  "--ac-gradient-text-background": string;
};

const defaultTransition: Transition = {duration: 50, repeat: Infinity, ease: "linear"};

function useMotionPaused(ref: React.RefObject<HTMLSpanElement | null>): boolean {
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
 * Renders animated gradient-filled text with an optional neon glow layer.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<span>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <GradientText text="Launch ready" />
 * ```
 *
 * @see {@link GradientTextProps} for available props
 */
const GradientText = React.forwardRef<HTMLSpanElement, GradientTextProps>(
  (
    {
      text,
      className,
      children,
      style,
      gradient = "linear-gradient(90deg, #3b82f6 0%, #a855f7 20%, #ec4899 50%, #a855f7 80%, #3b82f6 100%)",
      neon = false,
      transition = defaultTransition,
      ...props
    }: Readonly<GradientTextProps>,
    ref,
  ): React.JSX.Element => {
    const localRef = React.useRef<HTMLSpanElement>(null);
    const paused = useMotionPaused(localRef);
    const setRefs = React.useCallback(
      (node: HTMLSpanElement | null): void | (() => void) => {
        localRef.current = node;
        if (typeof ref === "function") {
          const callback: React.RefCallback<HTMLSpanElement> = ref;
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
    const baseStyle: GradientStyleProperties = {
      ...style,
      "--ac-gradient-text-background": style?.["--ac-gradient-text-background"] ?? gradient,
    };

    return (
      <span
        ref={setRefs}
        className={cn(styles.root, className)}
        style={baseStyle}
        {...props}
        data-motion={paused ? "paused" : "running"}>
        <motion.span
          className={styles.text}
          initial={paused ? false : {backgroundPosition: "0% 0%"}}
          animate={{backgroundPosition: paused ? "0% 0%" : "500% 100%"}}
          transition={paused ? {duration: 0} : transition}>
          {text}
        </motion.span>

        {neon ? (
          <motion.span
            aria-hidden='true'
            className={styles.neon}
            initial={paused ? false : {backgroundPosition: "0% 0%"}}
            animate={{backgroundPosition: paused ? "0% 0%" : "500% 100%"}}
            transition={paused ? {duration: 0} : transition}>
            {text}
          </motion.span>
        ) : null}
        {children}
      </span>
    );
  },
);

GradientText.displayName = "GradientText";

export {GradientText};
