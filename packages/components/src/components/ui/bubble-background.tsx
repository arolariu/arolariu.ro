"use client";

import {motion, type SpringOptions, type Transition, useMotionValue, useSpring} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import styles from "./bubble-background.module.css";
import {useVisualEffectPolicy, type VisualEffectOptions} from "./_visual-effects";

/** Configurable bubble color channels consumed by the CSS module. */
export interface BubbleBackgroundColors {
  /** Primary bubble RGB triplet. @default "18,113,255" */
  readonly first: string;
  /** Secondary bubble RGB triplet. @default "221,74,255" */
  readonly second: string;
  /** Tertiary bubble RGB triplet. @default "0,220,255" */
  readonly third: string;
  /** Fourth bubble RGB triplet. @default "200,50,50" */
  readonly fourth: string;
  /** Fifth bubble RGB triplet. @default "180,180,50" */
  readonly fifth: string;
  /** Sixth bubble RGB triplet used by the interactive layer. @default "140,100,255" */
  readonly sixth: string;
}

/** Props accepted by {@link BubbleBackground}. */
export interface BubbleBackgroundProps extends React.ComponentPropsWithRef<"div">, VisualEffectOptions {
  /** Ordinary caller styles are merged with normalized palette overrides. */
  readonly style?: React.CSSProperties
    & Partial<{
      readonly "--ac-bubble-first-color": string;
      readonly "--ac-bubble-second-color": string;
      readonly "--ac-bubble-third-color": string;
      readonly "--ac-bubble-fourth-color": string;
      readonly "--ac-bubble-fifth-color": string;
      readonly "--ac-bubble-sixth-color": string;
    }>;
  /** Enables mouse-following motion for the interactive bubble layer. @default false */
  readonly interactive?: boolean;
  /** Spring configuration applied to the interactive bubble motion. @default {stiffness: 100, damping: 20} */
  readonly transition?: SpringOptions;
  /** Overrides the CSS custom property color palette for the bubbles. @default {first: "18,113,255", second: "221,74,255", third: "0,220,255", fourth: "200,50,50", fifth: "180,180,50", sixth: "140,100,255"} */
  readonly colors?: BubbleBackgroundColors;
}

type BubbleStyleProperties = React.CSSProperties & {
  "--ac-bubble-first-color": string;
  "--ac-bubble-second-color": string;
  "--ac-bubble-third-color": string;
  "--ac-bubble-fourth-color": string;
  "--ac-bubble-fifth-color": string;
  "--ac-bubble-sixth-color": string;
  "--ac-bubble-filter": string;
};

const defaultTransition: SpringOptions = {stiffness: 100, damping: 20};
const defaultColors: BubbleBackgroundColors = {
  first: "18,113,255",
  second: "221,74,255",
  third: "0,220,255",
  fourth: "200,50,50",
  fifth: "180,180,50",
  sixth: "140,100,255",
};

function bubbleTransition(
  paused: boolean,
  duration: number,
  ease: "linear" | "easeInOut",
  repeatType: "loop" | "reverse" = "loop",
): Transition {
  return paused ? {duration: 0} : {duration, ease, repeat: Infinity, repeatType};
}

function normalizeRGB(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("BubbleBackground RGB channels must be strings.");
  const channels = value.trim().includes(",") ? value.split(",").map((channel) => channel.trim()) : value.trim().split(/\s+/u);
  if (channels.length !== 3) throw new RangeError("BubbleBackground RGB colors require three channels.");
  return channels
    .map((channel) => {
      const percentage = channel.endsWith("%");
      const token = percentage ? channel.slice(0, -1) : channel;
      const number = Number(token);
      if (!/^[\d.eE+-]+$/u.test(token) || !Number.isFinite(number) || number < 0 || number > (percentage ? 100 : 255)) {
        throw new RangeError("BubbleBackground RGB colors require finite channels in 0–255 (or 0–100%).");
      }
      return `${number}${percentage ? "%" : ""}`;
    })
    .join(" ");
}

function createBubbleStyle(
  colors: Readonly<BubbleBackgroundColors>,
  callerStyle: BubbleBackgroundProps["style"],
  id: string,
): BubbleStyleProperties {
  return {
    ...callerStyle,
    "--ac-bubble-first-color": normalizeRGB(callerStyle?.["--ac-bubble-first-color"] ?? colors.first),
    "--ac-bubble-second-color": normalizeRGB(callerStyle?.["--ac-bubble-second-color"] ?? colors.second),
    "--ac-bubble-third-color": normalizeRGB(callerStyle?.["--ac-bubble-third-color"] ?? colors.third),
    "--ac-bubble-fourth-color": normalizeRGB(callerStyle?.["--ac-bubble-fourth-color"] ?? colors.fourth),
    "--ac-bubble-fifth-color": normalizeRGB(callerStyle?.["--ac-bubble-fifth-color"] ?? colors.fifth),
    "--ac-bubble-sixth-color": normalizeRGB(callerStyle?.["--ac-bubble-sixth-color"] ?? colors.sixth),
    "--ac-bubble-filter": `url("#${id}-goo") blur(40px)`,
  };
}

/**
 * Renders drifting gradient bubbles with an optional interactive cursor follower.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 * - RGB triplets accept comma/space syntax; caller palette overrides are normalized
 *
 * @example
 * ```tsx
 * <BubbleBackground interactive />
 * ```
 *
 * @see {@link BubbleBackgroundProps} for available props
 */
function BubbleBackground({
  ref,
  loop,
  motionPaused,
  className,
  children,
  style: callerStyle,
  interactive = false,
  transition = defaultTransition,
  colors = defaultColors,
  ...props
}: Readonly<BubbleBackgroundProps>): React.JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const {paused} = useVisualEffectPolicy(containerRef, {loop, motionPaused});
  const setRefs = useMergedRefs(containerRef, ref);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, transition);
  const springY = useSpring(mouseY, transition);

  React.useEffect(() => {
    if (!interactive || paused) {
      mouseX.jump(0);
      mouseY.jump(0);
      springX.jump(0);
      springY.jump(0);
      return;
    }

    const currentContainer = containerRef.current;
    if (!currentContainer) {
      return;
    }

    const handleMouseMove = (event: MouseEvent): void => {
      const rect = currentContainer.getBoundingClientRect();
      if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
        throw new RangeError("BubbleBackground interactive geometry must be finite and non-empty.");
      }
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      mouseX.set(event.clientX - centerX);
      mouseY.set(event.clientY - centerY);
    };

    currentContainer.addEventListener("mousemove", handleMouseMove);

    return () => {
      currentContainer.removeEventListener("mousemove", handleMouseMove);
    };
  }, [interactive, mouseX, mouseY, paused, springX, springY]);

  const style = createBubbleStyle(colors, callerStyle, id);

  return (
    <div
      ref={setRefs}
      className={cn(styles.root, className)}
      style={style}
      {...props}
      data-motion={paused ? "paused" : "running"}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        className={styles.hiddenSvg}
        aria-hidden='true'>
        <defs>
          <filter id={`${id}-goo`}>
            <feGaussianBlur
              in='SourceGraphic'
              stdDeviation='10'
              result='blur'
            />
            <feColorMatrix
              in='blur'
              mode='matrix'
              values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8'
              result='goo'
            />
            <feBlend
              in='SourceGraphic'
              in2='goo'
            />
          </filter>
        </defs>
      </svg>

      <div
        className={styles.filterLayer}
        aria-hidden='true'>
        <motion.div
          className={cn(styles.bubble, styles.bubbleFirst)}
          initial={false}
          animate={paused ? {y: 0} : {y: [-50, 50, -50]}}
          transition={bubbleTransition(paused, 30, "easeInOut")}
        />

        <motion.div
          className={cn(styles.rotator, styles.rotatorSecond)}
          initial={false}
          animate={{rotate: paused ? 0 : 360}}
          transition={bubbleTransition(paused, 20, "linear", "reverse")}>
          <div className={cn(styles.bubble, styles.bubbleSecond)} />
        </motion.div>

        <motion.div
          className={cn(styles.rotator, styles.rotatorThird)}
          initial={false}
          animate={{rotate: paused ? 0 : 360}}
          transition={bubbleTransition(paused, 40, "linear")}>
          <div className={cn(styles.bubble, styles.bubbleThird)} />
        </motion.div>

        <motion.div
          className={cn(styles.bubble, styles.bubbleFourth)}
          initial={false}
          animate={paused ? {x: 0} : {x: [-50, 50, -50]}}
          transition={bubbleTransition(paused, 40, "easeInOut")}
        />

        <motion.div
          className={cn(styles.rotator, styles.rotatorFifth)}
          initial={false}
          animate={{rotate: paused ? 0 : 360}}
          transition={bubbleTransition(paused, 20, "linear")}>
          <div className={cn(styles.bubble, styles.bubbleFifth)} />
        </motion.div>

        {interactive ? (
          <motion.div
            className={cn(styles.bubble, styles.bubbleInteractive)}
            data-bubble='interactive'
            style={{x: paused ? 0 : springX, y: paused ? 0 : springY}}
          />
        ) : null}
      </div>

      {children === null || children === undefined ? null : <div className={styles.content}>{children}</div>}
    </div>
  );
}

BubbleBackground.displayName = "BubbleBackground";

export {BubbleBackground};
