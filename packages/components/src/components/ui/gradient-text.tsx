"use client";

import {motion, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./gradient-text.module.css";

/** Props accepted by {@link GradientText}. */
export interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Text content rendered with the animated gradient fill. @default undefined */
  text: string;
  /** CSS gradient string assigned to the animated text fill. @default "linear-gradient(90deg, #3b82f6 0%, #a855f7 20%, #ec4899 50%, #a855f7 80%, #3b82f6 100%)" */
  gradient?: string;
  /** Adds a blurred neon duplicate behind the primary text layer. @default false */
  neon?: boolean;
  /** Motion timing used for the animated gradient background. @default {duration: 50, repeat: Infinity, ease: "linear"} */
  transition?: Transition;
}

type GradientStyleProperties = React.CSSProperties & {
  "--ac-gradient-text-background": string;
};

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
      gradient = "linear-gradient(90deg, #3b82f6 0%, #a855f7 20%, #ec4899 50%, #a855f7 80%, #3b82f6 100%)",
      neon = false,
      transition = {duration: 50, repeat: Infinity, ease: "linear"},
      ...props
    },
    ref,
  ) => {
    const baseStyle: GradientStyleProperties = {
      "--ac-gradient-text-background": gradient,
    };

    return (
      <span
        ref={ref}
        className={cn(styles.root, className)}
        {...props}>
        <motion.span
          className={styles.text}
          style={baseStyle}
          initial={{backgroundPosition: "0% 0%"}}
          animate={{backgroundPosition: "500% 100%"}}
          transition={transition}>
          {text}
        </motion.span>

        {neon ? (
          <motion.span
            aria-hidden='true'
            className={styles.neon}
            style={baseStyle}
            initial={{backgroundPosition: "0% 0%"}}
            animate={{backgroundPosition: "500% 100%"}}
            transition={transition}>
            {text}
          </motion.span>
        ) : null}
      </span>
    );
  },
);

GradientText.displayName = "GradientText";

export {GradientText};
