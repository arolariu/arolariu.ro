"use client";

import {motion, type HTMLMotionProps, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./ripple-button.module.css";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

/** Props accepted by {@link RippleButton}. */
export interface RippleButtonProps extends HTMLMotionProps<"button"> {
  /** Button contents rendered above the ripple layer. @default undefined */
  children: React.ReactNode;
  /** Additional CSS classes merged with each generated ripple. @default undefined */
  rippleClassName?: string;
  /** Final expansion scale applied to each ripple animation. @default 10 */
  scale?: number;
  /** Motion timing used for each ripple animation. @default {duration: 0.6, ease: "easeOut"} */
  transition?: Transition;
}

/**
 * Renders a pressable button that emits animated ripples from the click position.
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
  ({children, onClick, className, rippleClassName, scale = 10, transition = {duration: 0.6, ease: "easeOut"}, ...props}, ref) => {
    // eslint-disable-next-line sonarjs/no-unused-vars -- removing React key avoids implicit key spreading
    const {key: _ignoredKey, ...restProps} = props;
    const [ripples, setRipples] = React.useState<ReadonlyArray<Ripple>>([]);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const timeoutIdsRef = React.useRef<ReadonlyArray<number>>([]);

    React.useImperativeHandle(ref, () => buttonRef.current!, []);

    React.useEffect(
      () => () => {
        timeoutIdsRef.current.forEach((timeoutId) => {
          globalThis.window.clearTimeout(timeoutId);
        });
      },
      [],
    );

    const createRipple = React.useCallback((event: React.MouseEvent<HTMLButtonElement>): void => {
      const button = buttonRef.current;
      if (!button) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newRipple: Ripple = {
        id: Date.now(),
        x,
        y,
      };

      setRipples((previousRipples) => [...previousRipples, newRipple]);

      const timeoutId = globalThis.window.setTimeout(() => {
        setRipples((previousRipples) => previousRipples.filter((ripple) => ripple.id !== newRipple.id));
      }, 600);

      timeoutIdsRef.current = [...timeoutIdsRef.current, timeoutId];
    }, []);

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>): void => {
        createRipple(event);
        onClick?.(event);
      },
      [createRipple, onClick],
    );

    return (
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        whileTap={{scale: 0.95}}
        whileHover={{scale: 1.05}}
        className={cn(styles.button, className)}
        {...restProps}>
        <span className={styles.content}>{children}</span>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{scale: 0, opacity: 0.5}}
            animate={{scale, opacity: 0}}
            transition={transition}
            className={cn(styles.ripple, rippleClassName)}
            style={{
              top: ripple.y - 10,
              left: ripple.x - 10,
            }}
          />
        ))}
      </motion.button>
    );
  },
);

RippleButton.displayName = "RippleButton";

export {RippleButton};
