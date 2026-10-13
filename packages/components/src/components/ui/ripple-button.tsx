"use client";

import {motion, type HTMLMotionProps, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./ripple-button.module.css";

interface Ripple {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/** Props accepted by {@link RippleButton}. */
export interface RippleButtonProps extends Readonly<HTMLMotionProps<"button">> {
  /** Button contents rendered above the ripple layer. @default undefined */
  readonly children: React.ReactNode;
  /** Additional CSS classes merged with each generated ripple. @default undefined */
  readonly rippleClassName?: string;
  /** Final expansion scale applied to each ripple animation. @default 10 */
  readonly scale?: number;
  /** Motion timing used for each ripple animation. @default {duration: 0.6, ease: "easeOut"} */
  readonly transition?: Transition;
}

/**
 * Renders a pressable button that emits decorative ripples from the click origin.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<button>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <RippleButton>Click me</RippleButton>
 * ```
 *
 * @see {@link RippleButtonProps} for available props
 */
const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  (
    {
      children,
      onClick,
      disabled,
      className,
      rippleClassName,
      scale = 10,
      transition = {duration: 0.6, ease: "easeOut"},
      ...props
    }: Readonly<RippleButtonProps>,
    ref,
  ) => {
    // eslint-disable-next-line sonarjs/no-unused-vars -- removing React key avoids implicit key spreading
    const {key: _ignoredKey, ...restProps} = props;
    const [ripples, setRipples] = React.useState<ReadonlyArray<Ripple>>([]);
    const nextIdRef = React.useRef(0);
    const rippleId = React.useId();

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>): void => {
        onClick?.(event);
        if (disabled || event.defaultPrevented) return;
        const id = `${rippleId}-${nextIdRef.current++}`;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.detail === 0 ? rect.width / 2 : event.clientX - rect.left;
        const y = event.detail === 0 ? rect.height / 2 : event.clientY - rect.top;
        setRipples((previousRipples) => [...previousRipples, {id, x, y}]);
      },
      [disabled, onClick, rippleId],
    );

    return (
      <motion.button
        ref={ref}
        type='button'
        disabled={disabled}
        onClick={handleClick}
        whileTap={{scale: 0.95}}
        whileHover={{scale: 1.05}}
        className={cn(styles.button, className)}
        {...restProps}>
        <span className={styles.content}>{children}</span>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            aria-hidden='true'
            data-ripple-id={ripple.id}
            initial={{x: ripple.x, y: ripple.y, scale: 0, opacity: 0.5}}
            animate={{x: ripple.x, y: ripple.y, scale, opacity: 0}}
            transition={transition}
            onAnimationComplete={() => setRipples((current) => current.filter((item) => item.id !== ripple.id))}
            className={cn(styles.ripple, rippleClassName)}
          />
        ))}
      </motion.button>
    );
  },
);

RippleButton.displayName = "RippleButton";

export {RippleButton};
