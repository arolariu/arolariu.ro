"use client";

import {useInView, useSpring, type SpringOptions, type UseInViewOptions} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import styles from "./counting-number.module.css";
import {useVisualEffectPolicy} from "./_visual-effects";
import {VisuallyHidden} from "./visually-hidden";

const defaultTransition: SpringOptions = {stiffness: 90, damping: 50};

/** Props accepted by {@link CountingNumber}. */
export interface CountingNumberProps extends Readonly<React.ComponentPropsWithRef<"span">> {
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
function CountingNumber({
  ref,
  number,
  fromNumber = 0,
  padStart = false,
  inView = false,
  inViewMargin = "0px",
  inViewOnce = true,
  decimalSeparator = ".",
  transition = defaultTransition,
  decimalPlaces = 0,
  className,
  ...props
}: Readonly<CountingNumberProps>): React.JSX.Element {
  const localRef = React.useRef<HTMLSpanElement>(null);

  const setRefs = useMergedRefs(localRef, ref);
  const {paused, reducedMotion, settled} = useVisualEffectPolicy(localRef);
  const [displayedNumber, setDisplayedNumber] = React.useState(fromNumber);

  const springValue = useSpring(fromNumber, transition);
  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin,
  });
  const isInView = !inView || inViewResult;

  React.useEffect(() => springValue.on("change", setDisplayedNumber), [springValue]);

  React.useEffect(() => {
    if (reducedMotion || settled) springValue.jump(number);
    else if (paused) springValue.stop();
    else if (isInView) springValue.set(number);
  }, [isInView, number, paused, reducedMotion, settled, springValue]);

  const visualValue = reducedMotion || settled ? number : displayedNumber;
  const formatted = decimalPlaces > 0 ? visualValue.toFixed(decimalPlaces) : Math.round(visualValue).toString();
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
      <span
        aria-hidden='true'
        data-slot='counting-number-visual'>
        {text}
      </span>
      <VisuallyHidden>
        {(decimalPlaces > 0 ? number.toFixed(decimalPlaces) : Math.round(number).toString()).replace(".", decimalSeparator)}
      </VisuallyHidden>
    </span>
  );
}

CountingNumber.displayName = "CountingNumber";

export {CountingNumber};
