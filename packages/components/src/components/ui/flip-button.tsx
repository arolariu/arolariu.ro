"use client";

import {type HTMLMotionProps, motion, type Transition, type Variant} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./flip-button.module.css";

/** Supported flip origins for the button animation. */
export type FlipDirection = "top" | "bottom" | "left" | "righ";

/** Props accepted by {@link FlipButton}. */
export interface FlipButtonProps extends HTMLMotionProps<"button"> {
  frontText: string;
  backText: string;
  transition?: Transition;
  frontClassName?: string;
  backClassName?: string;
  from?: FlipDirection;
}

/**
 * Renders a two-sided button that flips between front and back labels on hover.
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
