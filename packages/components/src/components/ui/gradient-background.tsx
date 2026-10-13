"use client";

import {motion, type HTMLMotionProps, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import styles from "./gradient-background.module.css";
import {useVisualEffectPolicy} from "./_visual-effects";

/** Props accepted by {@link GradientBackground}. */
export interface GradientBackgroundProps extends HTMLMotionProps<"div"> {
  /** Motion timing used for the animated background-position sweep. @default {duration: 15, ease: "easeInOut", repeat: Infinity} */
  readonly transition?: Transition;
}

const defaultTransition: Transition = {duration: 15, ease: "easeInOut", repeat: Infinity};
const backgroundSweep = {backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]};

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
    const {paused} = useVisualEffectPolicy(localRef);
    const setRefs = useMergedRefs(localRef, ref);

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
