"use client";

import {motion, useInView, type HTMLMotionProps, type Transition, type UseInViewOptions} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./highlight-text.module.css";

/** Props accepted by {@link HighlightText}. */
export interface HighlightTextProps extends HTMLMotionProps<"span"> {
  /** Inline text content that receives the animated highlight sweep. @default undefined */
  text: string;
  /** Delays the highlight animation until the text enters the viewport. @default false */
  inView?: boolean;
  /** Margin passed to the in-view observer when `inView` is enabled. @default "0px" */
  inViewMargin?: UseInViewOptions["margin"];
  /** Prevents the in-view animation from replaying after the first reveal. @default true */
  inViewOnce?: boolean;
  /** Motion timing used for the highlight fill animation. @default {duration: 2, ease: "easeInOut"} */
  transition?: Transition;
}

const animation = {backgroundSize: "100% 100%"};

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
const HighlightText = React.forwardRef<HTMLSpanElement, HighlightTextProps>(
  (
    {text, className, inView = false, inViewMargin = "0px", inViewOnce = true, transition = {duration: 2, ease: "easeInOut"}, ...props},
    ref,
  ) => {
    // eslint-disable-next-line sonarjs/no-unused-vars -- removing React key avoids implicit key spreading
    const {key: _ignoredKey, ...restProps} = props;
    const localRef = React.useRef<HTMLSpanElement>(null);

    React.useImperativeHandle(ref, () => localRef.current!, []);

    const inViewResult = useInView(localRef, {
      once: inViewOnce,
      margin: inViewMargin,
    });
    const isInView = !inView || inViewResult;

    return (
      <motion.span
        ref={localRef}
        initial={{
          backgroundSize: "0% 100%",
        }}
        animate={isInView ? animation : undefined}
        transition={transition}
        className={cn(styles.highlight, className)}
        {...restProps}>
        {text}
      </motion.span>
    );
  },
);

HighlightText.displayName = "HighlightText";

export {HighlightText};
