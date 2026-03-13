"use client";

import {type HTMLMotionProps, motion, type Transition, type Variant} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./flip-button.module.css";

/** Supported flip origins for the button animation. */
export type FlipDirection = "top" | "bottom" | "left" | "righ";

/** Props accepted by {@link FlipButton}. */
export interface FlipButtonProps extends HTMLMotionProps<"button"> {
  /** Label rendered on the default face of the button. @default undefined */
  frontText: string;
  /** Label revealed after the flip animation completes. @default undefined */
  backText: string;
  /** Motion transition applied to both button faces. @default {type: "spring", stiffness: 280, damping: 20} */
  transition?: Transition;
  /** Additional CSS classes merged with the front face. @default undefined */
  frontClassName?: string;
  /** Additional CSS classes merged with the back face. @default undefined */
  backClassName?: string;
  /** Direction from which the back face flips into view. @default "top" */
  from?: FlipDirection;
}

/**
 * Renders a two-sided button that flips between front and back labels on hover.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<button>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <FlipButton frontText="Learn more" backText="Open" />
 * ```
 *
 * @see {@link FlipButtonProps} for available props
 */
const FlipButton = React.forwardRef<HTMLButtonElement, FlipButtonProps>(
  (
    {
      frontText,
      backText,
      transition = {type: "spring", stiffness: 280, damping: 20},
      className,
      frontClassName,
      backClassName,
      from = "top",
      ...props
    },
    ref,
  ) => {
    // eslint-disable-next-line sonarjs/no-unused-vars -- removing React key avoids implicit key spreading
    const {key: _ignoredKey, ...restProps} = props;
    const isVertical = from === "top" || from === "bottom";
    const rotateAxis = isVertical ? "rotateX" : "rotateY";

    const frontOffset = from === "top" || from === "left" ? "50%" : "-50%";
    const backOffset = from === "top" || from === "left" ? "-50%" : "50%";

    const buildVariant = React.useCallback(
      (opacity: number, rotation: number, offset: string | null = null): Variant => ({
        opacity,
        [rotateAxis]: rotation,
        ...(isVertical && offset !== null ? {y: offset} : {}),
        ...(!isVertical && offset !== null ? {x: offset} : {}),
      }),
      [isVertical, rotateAxis],
    );

    const frontVariants = React.useMemo(
      () => ({
        initial: buildVariant(1, 0, "0%"),
        hover: buildVariant(0, 90, frontOffset),
      }),
      [buildVariant, frontOffset],
    );

    const backVariants = React.useMemo(
      () => ({
        initial: buildVariant(0, 90, backOffset),
        hover: buildVariant(1, 0, "0%"),
      }),
      [backOffset, buildVariant],
    );

    return (
      <motion.button
        ref={ref}
        initial='initial'
        whileHover='hover'
        whileTap={{scale: 0.95}}
        className={cn(styles.button, className)}
        {...restProps}>
        <motion.span
          variants={frontVariants}
          transition={transition}
          className={cn(styles.face, styles.front, frontClassName)}>
          {frontText}
        </motion.span>
        <motion.span
          variants={backVariants}
          transition={transition}
          className={cn(styles.face, styles.back, backClassName)}>
          {backText}
        </motion.span>
        <span className={styles.measure}>{frontText}</span>
      </motion.button>
    );
  },
);

FlipButton.displayName = "FlipButton";

export {FlipButton};
