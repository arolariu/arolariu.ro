"use client";

import {type HTMLMotionProps, motion, type Transition, type Variant} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import {useReducedMotionPreference} from "./_visual-effects";
import styles from "./flip-button.module.css";

const defaultTransition: Transition = {type: "spring", stiffness: 280, damping: 20};

/** Supported flip origins for the button animation. */
export type FlipDirection = "top" | "bottom" | "left" | "right";

/** Props accepted by {@link FlipButton}. */
export interface FlipButtonProps extends Readonly<HTMLMotionProps<"button">> {
  /** Required label on the resting face; part of the generated accessible name. */
  readonly frontText: string;
  /** Required label revealed on hover or keyboard focus; part of the generated accessible name. */
  readonly backText: string;
  /** Motion transition applied to both button faces. @default {type: "spring", stiffness: 280, damping: 20} */
  readonly transition?: Transition;
  /** Additional CSS classes merged with the front face. @default undefined */
  readonly frontClassName?: string;
  /** Additional CSS classes merged with the back face. @default undefined */
  readonly backClassName?: string;
  /** Direction from which the back face flips into view. @default "top" */
  readonly from?: FlipDirection;
}

/**
 * Renders a two-sided button that flips between front and back labels on hover or keyboard focus.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - The flip is user-initiated motion (hover or focus): under `prefers-reduced-motion: reduce` (tracked live after hydration)
 *   the faces swap instantly and the press scaling is off. The button observes only that preference: no viewport or document
 *   visibility observer per instance
 * - Renders a `<button>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 * - The stable generated accessible name includes both action-face labels.
 *   Caller-supplied names must also agree with each visible label.
 *
 * @example
 * ```tsx
 * <FlipButton frontText="Show details" backText="Open details" />
 * ```
 *
 * @see {@link FlipButtonProps} for available props
 */
function FlipButton({
  ref,
  frontText,
  backText,
  transition = defaultTransition,
  className,
  frontClassName,
  backClassName,
  from = "top",
  ...props
}: Readonly<FlipButtonProps>): React.JSX.Element {
  // Motion's DOM ref callback is stable and ignores a replaced `ref` prop; the merged ref re-synchronizes replacements and
  // React 19 callback-ref cleanups.
  const setRefs = useMergedRefs(ref);
  const reducedMotion = useReducedMotionPreference();
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
      ref={setRefs}
      type='button'
      aria-label={frontText === backText ? frontText : `${frontText} / ${backText}`}
      initial='initial'
      whileHover='hover'
      whileFocus='hover'
      whileTap={reducedMotion ? undefined : {scale: 0.95}}
      className={cn(styles.button, className)}
      {...restProps}>
      <motion.span
        aria-hidden='true'
        variants={frontVariants}
        transition={reducedMotion ? {duration: 0} : transition}
        className={cn(styles.face, styles.front, frontClassName)}>
        {frontText}
      </motion.span>
      <motion.span
        aria-hidden='true'
        variants={backVariants}
        transition={reducedMotion ? {duration: 0} : transition}
        className={cn(styles.face, styles.back, backClassName)}>
        {backText}
      </motion.span>
      <span
        aria-hidden='true'
        className={styles.measure}>
        {frontText}
      </span>
    </motion.button>
  );
}

FlipButton.displayName = "FlipButton";

export {FlipButton};
