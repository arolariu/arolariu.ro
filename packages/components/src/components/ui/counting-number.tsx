"use client";

import {useInView, useMotionValue, useSpring, type SpringOptions, type UseInViewOptions} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./counting-number.module.css";

/** Props accepted by {@link CountingNumber}. */
export interface CountingNumberProps extends Readonly<React.ComponentPropsWithoutRef<"span">> {
  /** Final numeric value to animate toward. @default undefined */
  readonly number: number;
  /** Initial numeric value used before the spring animation starts. @default 0 */
  readonly fromNumber?: number;
  /** Pads the integer portion so it matches the target value width. @default false */
  readonly padStart?: boolean;
  /** Delays the animation until the element enters the viewport. @default false */
  readonly inView?: boolean;
  /** Margin passed to the in-view observer when `inView` is enabled. @default "0px" */
  readonly inViewMargin?: UseInViewOptions["margin"];
  /** Prevents the in-view animation from replaying after the first reveal. @default true */
  readonly inViewOnce?: boolean;
  /** Character used between the integer and decimal portions. @default "." */
  readonly decimalSeparator?: string;
  /** Spring physics applied to the counting animation. @default {stiffness: 90, damping: 50} */
  readonly transition?: SpringOptions;
  /** Number of decimal places rendered during the animation. @default 0 */
  readonly decimalPlaces?: number;
}

/**
 * Animates a number value with a spring and writes the formatted value into a span.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<span>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <CountingNumber number={1250} />
 * ```
 *
 * @see {@link CountingNumberProps} for available props
 */
const CountingNumber = React.forwardRef<HTMLSpanElement, CountingNumberProps>(
  (
    {
      number,
      fromNumber = 0,
      padStart = false,
      inView = false,
      inViewMargin = "0px",
      inViewOnce = true,
      decimalSeparator = ".",
      transition = {stiffness: 90, damping: 50},
      decimalPlaces = 0,
      className,
      ...props
    }: Readonly<CountingNumberProps>,
    ref,
  ) => {
    const localRef = React.useRef<HTMLSpanElement>(null);

    const setRefs = React.useCallback(
      (node: HTMLSpanElement | null): void | (() => void) => {
        localRef.current = node;
        if (typeof ref === "function") {
          const callback: React.RefCallback<HTMLSpanElement> = ref;
          const cleanup = callback(node);
          if (typeof cleanup === "function")
            return () => {
              localRef.current = null;
              cleanup();
            };
        } else if (ref) ref.current = node;
      },
      [ref],
    );
    const [displayedNumber, setDisplayedNumber] = React.useState(fromNumber);

    const motionValue = useMotionValue(fromNumber);
    const springValue = useSpring(motionValue, transition);
    const inViewResult = useInView(localRef, {
      once: inViewOnce,
      margin: inViewMargin,
    });
    const isInView = !inView || inViewResult;

    React.useEffect(() => {
      if (isInView) {
        motionValue.set(number);
      }
    }, [isInView, motionValue, number]);

    React.useEffect(() => springValue.on("change", setDisplayedNumber), [springValue]);
    const formatted = decimalPlaces > 0 ? displayedNumber.toFixed(decimalPlaces) : Math.round(displayedNumber).toString();
    const negative = formatted.startsWith("-");
    const unsigned = negative ? formatted.slice(1) : formatted;
    const [integerPart = "0", fractionPart] = unsigned.split(".");
    const finalIntegerLength = Math.floor(Math.abs(number)).toString().length;
    const integer = padStart ? integerPart.padStart(finalIntegerLength, "0") : integerPart;
    const fraction = fractionPart === undefined ? "" : decimalSeparator + fractionPart;
    const text = `${negative ? "-" : ""}${integer}${fraction}`;

    return (
      <span
        ref={setRefs}
        className={cn(styles.countingNumber, className)}
        {...props}>
        {text}
      </span>
    );
  },
);

CountingNumber.displayName = "CountingNumber";

export {CountingNumber};
