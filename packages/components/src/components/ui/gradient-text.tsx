"use client";

import {motion, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import styles from "./gradient-text.module.css";
import {useVisualEffectPolicy, type VisualEffectOptions} from "./_visual-effects";

/** Props accepted by {@link GradientText}. */
export interface GradientTextProps extends React.ComponentPropsWithRef<"span">, VisualEffectOptions {
  /** Caller styles are merged at the root; this custom property overrides the gradient prop. */
  readonly style?: React.CSSProperties & {readonly "--ac-gradient-text-background"?: string};
  /** Text content rendered with the animated gradient fill. @default undefined */
  readonly text: string;
  /** Custom gradient; verify every stop against the actual backdrop. Defaults to theme-aware darker/lighter blue/purple/pink. */
  readonly gradient?: string;
  /** Adds a blurred neon duplicate behind the primary text layer. @default false */
  readonly neon?: boolean;
  /** Motion timing used for the animated gradient background. @default {duration: 50, repeat: Infinity, ease: "linear"} */
  readonly transition?: Transition;
}

type GradientStyleProperties = React.CSSProperties & {
  "--ac-gradient-text-background"?: string;
};

const defaultTransition: Transition = {duration: 50, repeat: Infinity, ease: "linear"};

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
function GradientText({
  ref,
  loop,
  motionPaused,
  text,
  className,
  children,
  style,
  gradient,
  neon = false,
  transition = defaultTransition,
  ...props
}: Readonly<GradientTextProps>): React.JSX.Element {
  const localRef = React.useRef<HTMLSpanElement>(null);
  const {paused} = useVisualEffectPolicy(localRef, {loop, motionPaused});
  const setRefs = useMergedRefs(localRef, ref);
  const baseStyle: GradientStyleProperties = {
    ...style,
    "--ac-gradient-text-background": style?.["--ac-gradient-text-background"] ?? gradient,
  };

  return (
    <span
      ref={setRefs}
      className={cn(styles.root, className)}
      style={baseStyle}
      data-motion={paused ? "paused" : "running"}
      {...props}>
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
}

GradientText.displayName = "GradientText";

export {GradientText};
