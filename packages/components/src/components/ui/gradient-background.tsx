"use client";

import {motion, type HTMLMotionProps, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./gradient-background.module.css";

/** Props accepted by {@link GradientBackground}. */
export interface GradientBackgroundProps extends HTMLMotionProps<"div"> {
  /** Motion timing used for the animated background-position sweep. @default {duration: 15, ease: "easeInOut", repeat: Infinity} */
  transition?: Transition;
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
  ({className, transition = {duration: 15, ease: "easeInOut", repeat: Infinity}, ...props}, ref) => {
    // eslint-disable-next-line sonarjs/no-unused-vars -- removing React key avoids implicit key spreading
    const {key: _ignoredKey, ...restProps} = props;

    return (
      <motion.div
        ref={ref}
        className={cn(styles.root, className)}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={transition}
        {...restProps}
      />
    );
  },
);

GradientBackground.displayName = "GradientBackground";

export {GradientBackground};
