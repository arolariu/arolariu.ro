"use client";

import {type HTMLMotionProps, motion, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface RippleButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  rippleClassName?: string;
  scale?: number;
  transition?: Transition;
}

const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({children, onClick, className, rippleClassName, scale = 10, transition = {duration: 0.6, ease: "easeOut"}, ...props}, ref) => {
    const [ripples, setRipples] = React.useState<Ripple[]>([]);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    React.useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement);

    const createRipple = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newRipple: Ripple = {
        id: Date.now(),
        x,
        y,
      };

      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    }, []);

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        createRipple(event);
        if (onClick) {
          onClick(event);
        }
      },
      [createRipple, onClick],
    );

    return (
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        whileTap={{scale: 0.95}}
        whileHover={{scale: 1.05}}
        className={cn(
          "text-primary-foreground bg-primary relative h-10 cursor-pointer overflow-hidden rounded-lg px-4 py-2 text-sm font-medium focus:outline-none",
          className,
        )}
        {...props}>
        {children}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{scale: 0, opacity: 0.5}}
            animate={{scale, opacity: 0}}
            transition={transition}
            className={cn("bg-primary-foreground pointer-events-none absolute size-5 rounded-full", rippleClassName)}
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

export {RippleButton, type RippleButtonProps};
