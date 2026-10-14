"use client";

import {isMotionValue, motion, useInView, type HTMLMotionProps, type Transition, type UseInViewOptions} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import styles from "./highlight-text.module.css";
import {useVisualEffectPolicy, type VisualEffectOptions} from "./_visual-effects";

/** Props accepted by {@link HighlightText}. */
export interface HighlightTextProps extends HTMLMotionProps<"span">, VisualEffectOptions {
  /** Inline text content that receives the animated highlight sweep. @default undefined */
  readonly text: string;
  /** Delays the highlight animation until the text enters the viewport. @default false */
  readonly inView?: boolean;
  /** Margin passed to the in-view observer when `inView` is enabled. @default "0px" */
  readonly inViewMargin?: UseInViewOptions["margin"];
  /** Prevents the in-view animation from replaying after the first reveal. @default true */
  readonly inViewOnce?: boolean;
  /** Motion timing used for the highlight fill animation. @default {duration: 2, ease: "easeInOut"} */
  readonly transition?: Transition;
}

const animation = {backgroundSize: "100% 100%"};
const defaultTransition: Transition = {duration: 2, ease: "easeInOut"};

function isHighlightMotionChild(value: HighlightTextProps["children"]): value is Exclude<HighlightTextProps["children"], React.ReactNode> {
  return isMotionValue(value);
}

/**
 * Animates a gradient highlight fill behind inline text content.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<span>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <HighlightText text="Highlighted copy" />
 * ```
 *
 * @see {@link HighlightTextProps} for available props
 */
function HighlightText({
  ref,
  loop,
  motionPaused,
  text,
  children,
  className,
  inView = false,
  inViewMargin = "0px",
  inViewOnce = true,
  transition = defaultTransition,
  animate,
  initial,
  ...props
}: Readonly<HighlightTextProps>): React.JSX.Element {
  const localRef = React.useRef<HTMLSpanElement>(null);
  const {paused, reducedMotion, visible} = useVisualEffectPolicy(localRef, {loop, motionPaused});
  const setRefs = useMergedRefs(localRef, ref);

  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin,
  });
  const revealed = inView ? inViewResult : visible || inViewResult;
  const staticTarget = reducedMotion || revealed ? animation : {backgroundSize: "0% 100%"};

  return (
    <motion.span
      {...props}
      ref={setRefs}
      data-motion={paused ? "paused" : "running"}
      initial={paused ? false : (initial ?? {backgroundSize: "0% 100%"})}
      animate={paused ? staticTarget : (animate ?? staticTarget)}
      transition={paused ? {duration: 0} : transition}
      className={cn(styles.highlight, className)}>
      {text}
      {isHighlightMotionChild(children) ? <motion.span>{children}</motion.span> : children}
    </motion.span>
  );
}

HighlightText.displayName = "HighlightText";

export {HighlightText};
