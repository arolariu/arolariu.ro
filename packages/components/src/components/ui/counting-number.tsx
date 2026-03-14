"use client";

import {useInView, useMotionValue, useSpring, type SpringOptions, type UseInViewOptions} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./counting-number.module.css";

/** Props accepted by {@link CountingNumber}. */
export interface CountingNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Final numeric value to animate toward. @default undefined */
  number: number;
  /** Initial numeric value used before the spring animation starts. @default 0 */
  fromNumber?: number;
  /** Pads the integer portion so it matches the target value width. @default false */
  padStart?: boolean;
  /** Delays the animation until the element enters the viewport. @default false */
  inView?: boolean;
  /** Margin passed to the in-view observer when `inView` is enabled. @default "0px" */
  inViewMargin?: UseInViewOptions["margin"];
  /** Prevents the in-view animation from replaying after the first reveal. @default true */
  inViewOnce?: boolean;
  /** Character used between the integer and decimal portions. @default "." */
  decimalSeparator?: string;
  /** Spring physics applied to the counting animation. @default {stiffness: 90, damping: 50} */
  transition?: SpringOptions;
  /** Number of decimal places rendered during the animation. @default 0 */
  decimalPlaces?: number;
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
    },
    ref,
  ) => {
    const localRef = React.useRef<HTMLSpanElement>(null);

    React.useImperativeHandle(ref, () => localRef.current!, []);

    const numberStr = number.toString();
    const decimals = numberStr.includes(".") ? (numberStr.split(".")[1]?.length ?? 0) : 0;
    const resolvedDecimalPlaces = typeof decimalPlaces === "number" ? decimalPlaces : decimals;

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

    React.useEffect(() => {
      const unsubscribe = springValue.on("change", (latest) => {
        if (!localRef.current) {
          return;
        }

        let formatted = resolvedDecimalPlaces > 0 ? latest.toFixed(resolvedDecimalPlaces) : Math.round(latest).toString();

        if (resolvedDecimalPlaces > 0) {
          formatted = formatted.replace(".", decimalSeparator);
        }

        if (padStart) {
          const finalIntegerLength = Math.floor(Math.abs(number)).toString().length;
          const [integerPart, fractionPart] = formatted.split(decimalSeparator);
          const paddedInteger = integerPart.padStart(finalIntegerLength, "0");
          formatted = fractionPart ? `${paddedInteger}${decimalSeparator}${fractionPart}` : paddedInteger;
        }

        localRef.current.textContent = formatted;
      });

      return () => {
        unsubscribe();
      };
    }, [decimalSeparator, number, padStart, resolvedDecimalPlaces, springValue]);

    const finalIntegerLength = Math.floor(Math.abs(number)).toString().length;
    const suffix = resolvedDecimalPlaces > 0 ? `${decimalSeparator}${"0".repeat(resolvedDecimalPlaces)}` : "";
    const initialText = padStart ? `${"0".padStart(finalIntegerLength, "0")}${suffix}` : `0${suffix}`;

    return (
      <span
        ref={localRef}
        className={cn(styles.countingNumber, className)}
        {...props}>
        {initialText}
      </span>
    );
  },
);

CountingNumber.displayName = "CountingNumber";

export {CountingNumber};
