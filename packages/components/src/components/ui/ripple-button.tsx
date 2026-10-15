"use client";

import {motion, type HTMLMotionProps, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import {useVisualEffectPolicy} from "./_visual-effects";
import styles from "./ripple-button.module.css";

interface Ripple {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

const defaultTransition: Transition = {duration: 0.6, ease: "easeOut"};

/** Props accepted by {@link RippleButton}. */
export interface RippleButtonProps extends Readonly<HTMLMotionProps<"button">> {
  /** Button contents rendered above the ripple layer. @default undefined */
  readonly children: React.ReactNode;
  /** Additional CSS classes merged with each generated ripple. @default undefined */
  readonly rippleClassName?: string;
  /** Final expansion scale applied to each ripple animation. @default 10 */
  readonly scale?: number;
  /** Motion timing; every ripple is removed after at most five seconds, including custom repeats. @default {duration: 0.6, ease: "easeOut"} */
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
function RippleButton({
  ref,
  children,
  onClick,
  disabled,
  className,
  rippleClassName,
  scale = 10,
  transition = defaultTransition,
  ...props
}: Readonly<RippleButtonProps>): React.JSX.Element {
  const localRef = React.useRef<HTMLButtonElement>(null);
  const setRefs = useMergedRefs(localRef, ref);
  const {reducedMotion} = useVisualEffectPolicy(localRef, {loop: true});
  // eslint-disable-next-line sonarjs/no-unused-vars -- removing React key avoids implicit key spreading
  const {key: _ignoredKey, ...restProps} = props;
  const [ripples, setRipples] = React.useState<ReadonlyArray<Ripple>>([]);
  const timersRef = React.useRef(new Map<string, ReturnType<typeof globalThis.setTimeout>>());
  const nextIdRef = React.useRef(0);
  const rippleId = React.useId();
  const removeRipple = React.useCallback((id: string): void => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) globalThis.clearTimeout(timer);
    timersRef.current.delete(id);
    setRipples((current) => current.filter((item) => item.id !== id));
  }, []);
  React.useEffect(() => {
    const timers = timersRef.current;
    return (): void => {
      for (const timer of timers.values()) globalThis.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      onClick?.(event);
      if (disabled || event.defaultPrevented || reducedMotion) return;
      const id = `${rippleId}-${nextIdRef.current++}`;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.detail === 0 ? rect.width / 2 : event.clientX - rect.left;
      const y = event.detail === 0 ? rect.height / 2 : event.clientY - rect.top;
      setRipples((previousRipples) => [...previousRipples, {id, x, y}]);
      timersRef.current.set(
        id,
        globalThis.setTimeout(() => removeRipple(id), 5000),
      );
    },
    [disabled, onClick, reducedMotion, removeRipple, rippleId],
  );

  return (
    <motion.button
      ref={setRefs}
      type='button'
      disabled={disabled}
      onClick={handleClick}
      whileTap={reducedMotion ? undefined : {scale: 0.95}}
      whileHover={reducedMotion ? undefined : {scale: 1.05}}
      className={cn(styles.button, className)}
      {...restProps}>
      <span className={styles.content}>{children}</span>
      {!reducedMotion
        && ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            aria-hidden='true'
            data-ripple-id={ripple.id}
            initial={{x: ripple.x, y: ripple.y, scale: 0, opacity: 0.5}}
            animate={{x: ripple.x, y: ripple.y, scale, opacity: 0}}
            transition={transition}
            onAnimationComplete={() => removeRipple(ripple.id)}
            className={cn(styles.ripple, rippleClassName)}
          />
        ))}
    </motion.button>
  );
}

RippleButton.displayName = "RippleButton";

export {RippleButton};
