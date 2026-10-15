"use client";

import {motion} from "motion/react";
import * as React from "react";

import {useMergedRefs} from "@/hooks/useMergedRefs";
import {cn} from "@/lib/utilities";
import styles from "./dot-background.module.css";
import {useVisualEffectPolicy, type VisualEffectOptions} from "./_visual-effects";

/** Props accepted by {@link DotBackground}. Width/height are dot spacing, not SVG dimensions. */
export interface DotBackgroundProps extends React.SVGProps<SVGSVGElement>, VisualEffectOptions {
  /** Positive finite horizontal spacing. @default 16 */
  readonly width?: number;
  /** Positive finite vertical spacing. @default 16 */
  readonly height?: number;
  /** Finite horizontal grid offset. @default 0 */
  readonly x?: number;
  /** Finite vertical grid offset. @default 0 */
  readonly y?: number;
  /** Finite circle-center horizontal offset. @default 1 */
  readonly cx?: number;
  /** Finite circle-center vertical offset. @default 1 */
  readonly cy?: number;
  /** Positive finite dot radius. @default 1 */
  readonly cr?: number;
  /** Enables pulsing dots while visible and motion is permitted. @default false */
  readonly glow?: boolean;
}

function isDecorativeSvg(children: React.ReactNode): boolean {
  return children === null || children === undefined;
}

/**
 * Renders a decorative element-sized dot grid, capped at 4096 dots.
 *
 * @remarks Dense requests are evenly downsampled. Glow has a static reduced-motion/offscreen alternative.
 * @throws {RangeError} If spacing, radius, offsets, or measured geometry are invalid.
 */
function DotBackground({
  ref,
  loop,
  motionPaused,
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  children,
  glow = false,
  ...props
}: Readonly<DotBackgroundProps>): React.JSX.Element {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError("DotBackground spacing must be positive and finite.");
  }
  if (!Number.isFinite(cr) || cr <= 0) throw new RangeError("DotBackground radius must be positive and finite.");
  if (![x, y, cx, cy].every((value) => Number.isFinite(value))) throw new RangeError("DotBackground offsets must be finite.");
  const id = React.useId();
  const containerRef = React.useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = React.useState({width: 0, height: 0});
  const {paused} = useVisualEffectPolicy(containerRef, {loop, motionPaused});
  const setRefs = useMergedRefs(containerRef, ref);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let active = true;
    const resize = (): void => {
      if (!active) return;
      const rect = element.getBoundingClientRect();
      if (![rect.width, rect.height].every((value) => Number.isFinite(value)) || rect.width <= 0 || rect.height <= 0) {
        throw new RangeError("DotBackground measured geometry must be finite and non-empty.");
      }
      setDimensions((previous) =>
        previous.width === rect.width && previous.height === rect.height ? previous : {width: rect.width, height: rect.height},
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener("resize", resize);
    return (): void => {
      active = false;
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  const requestedColumns = dimensions.width === 0 ? 0 : Math.max(1, Math.min(4096, Math.ceil(dimensions.width / width)));
  const requestedRows = dimensions.height === 0 ? 0 : Math.max(1, Math.min(4096, Math.ceil(dimensions.height / height)));
  const stride = Math.max(1, Math.ceil(Math.sqrt((requestedColumns * requestedRows) / 4096)));
  const columns = Math.min(4096, Math.ceil(requestedColumns / stride));
  const rows = Math.min(Math.floor(4096 / Math.max(columns, 1)), Math.ceil(requestedRows / stride));
  const horizontalStep = Math.max(width, dimensions.width / Math.max(columns, 1));
  const verticalStep = Math.max(height, dimensions.height / Math.max(rows, 1));
  const dots = Array.from({length: columns * rows}, (_, index) => ({
    x: x + (index % columns) * horizontalStep + cx,
    y: y + Math.floor(index / columns) * verticalStep + cy,
    delay: ((index * 37) % 50) / 10,
    duration: 2 + ((index * 13) % 30) / 10,
  }));
  return (
    <svg
      ref={setRefs}
      aria-hidden={isDecorativeSvg(children) ? true : undefined}
      focusable='false'
      className={cn(styles.root, className)}
      data-motion={paused ? "paused" : "running"}
      {...props}>
      <defs>
        <radialGradient id={`${id}-gradient`}>
          <stop
            offset='0%'
            stopColor='currentColor'
            stopOpacity='1'
          />
          <stop
            offset='100%'
            stopColor='currentColor'
            stopOpacity='0'
          />
        </radialGradient>
      </defs>
      {dots.map((dot, index) => (
        <motion.circle
          aria-hidden='true'
          key={`dot-${index}`}
          cx={dot.x}
          cy={dot.y}
          r={cr}
          fill={glow ? `url(#${id}-gradient)` : "currentColor"}
          className={styles.dot}
          initial={false}
          animate={glow && !paused ? {opacity: [0.4, 1, 0.4], scale: [1, 1.5, 1]} : {opacity: glow ? 0.4 : 1, scale: 1}}
          transition={
            glow && !paused
              ? {duration: dot.duration, repeat: Infinity, repeatType: "reverse", delay: dot.delay, ease: "easeInOut"}
              : {duration: 0}
          }
        />
      ))}
      {children}
    </svg>
  );
}
DotBackground.displayName = "DotBackground";
export {DotBackground};
