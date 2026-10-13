"use client";

import {motion, useAnimation, useInView} from "motion/react";
import * as React from "react";

import {useReducedMotion} from "@/hooks/useReducedMotion";
import {cn} from "@/lib/utilities";
import styles from "./scratcher.module.css";

/** Props accepted by {@link Scratcher}. */
export interface ScratcherProps {
  /** Always-mounted content. This visual reveal is not a security or accessibility gate. */
  readonly children: React.ReactNode;
  /** Positive finite surface width in CSS pixels. */
  readonly width: number;
  /** Positive finite surface height in CSS pixels. */
  readonly height: number;
  /** Cleared-pixel completion threshold in 0–100. @default 50 */
  readonly minScratchPercentage?: number;
  /** Additional root classes. */
  readonly className?: string;
  /** Called once per card after feedback completes, or immediately when motion is paused. */
  readonly onComplete?: () => void;
  /** Overlay gradient stops; changing their values resets the card. */
  readonly gradientColors?: readonly [string, string, string];
  /** Accessible native reveal button label; callers may localize it. @default "Reveal content" */
  readonly revealLabel?: string;
  /** Accessible completion announcement; callers may localize it. @default "Content revealed" */
  readonly completedLabel?: string;
}

const defaultGradientColors: readonly [string, string, string] = ["#A97CF8", "#F38CB8", "#FDCC92"];
type ScratchStyle = React.CSSProperties & {
  readonly "--ac-scratcher-width": string;
  readonly "--ac-scratcher-height": string;
};

function useMotionPaused(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const reduced = useReducedMotion();
  const preference = React.useMemo(() => {
    const media = typeof window === "undefined" ? null : globalThis.matchMedia("(prefers-reduced-motion: reduce)");
    return {
      subscribe(notify: () => void): () => void {
        media?.addEventListener("change", notify);
        document.addEventListener("visibilitychange", notify);
        return (): void => {
          media?.removeEventListener("change", notify);
          document.removeEventListener("visibilitychange", notify);
        };
      },
      snapshot: (): boolean => (media?.matches ?? reduced !== false) || document.visibilityState === "hidden",
    };
  }, [reduced]);
  const paused = React.useSyncExternalStore(preference.subscribe, preference.snapshot, () => true);
  const visible = useInView(ref, {initial: true});
  return paused || !visible;
}

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Scratcher requires a 2D canvas rendering context.");
  return context;
}

const ScratcherSurface = React.forwardRef<HTMLDivElement, ScratcherProps>(
  (
    {
      width,
      height,
      minScratchPercentage = 50,
      onComplete,
      children,
      className,
      gradientColors = defaultGradientColors,
      revealLabel = "Reveal content",
      completedLabel = "Content revealed",
    }: Readonly<ScratcherProps>,
    ref,
  ): React.JSX.Element => {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const completedRef = React.useRef(false);
    const notifiedRef = React.useRef(false);
    const pointerRef = React.useRef<number | null>(null);
    const callbackRef = React.useRef(onComplete);
    const [complete, setComplete] = React.useState(false);
    const [animationError, setAnimationError] = React.useState<Error | null>(null);
    const paused = useMotionPaused(rootRef);
    const controls = useAnimation();
    const [first, second, third] = gradientColors;
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null): void | (() => void) => {
        rootRef.current = node;
        if (typeof ref === "function") {
          const callback: React.RefCallback<HTMLDivElement> = ref;
          const cleanup = callback(node);
          if (typeof cleanup === "function")
            return (): void => {
              rootRef.current = null;
              cleanup();
            };
        } else if (ref) ref.current = node;
      },
      [ref],
    );

    React.useEffect(() => {
      callbackRef.current = onComplete;
    }, [onComplete]);

    React.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = requireContext(canvas);
      let active = true;
      let painted = false;
      const paint = (): void => {
        if (!active) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio;
        if (![rect.width, rect.height, dpr].every((entry) => Number.isFinite(entry)) || rect.width <= 0 || rect.height <= 0 || dpr <= 0) {
          throw new RangeError("Scratcher geometry and DPR must be finite and positive.");
        }
        const scale = Math.min(dpr, 2048 / rect.width, 2048 / rect.height);
        const bitmapWidth = Math.max(1, Math.round(rect.width * scale));
        const bitmapHeight = Math.max(1, Math.round(rect.height * scale));
        if (painted && canvas.width === bitmapWidth && canvas.height === bitmapHeight) return;
        canvas.width = bitmapWidth;
        canvas.height = bitmapHeight;
        context.globalCompositeOperation = "source-over";
        context.clearRect(0, 0, bitmapWidth, bitmapHeight);
        if (!completedRef.current) {
          const gradient = context.createLinearGradient(0, 0, bitmapWidth, bitmapHeight);
          gradient.addColorStop(0, first);
          gradient.addColorStop(0.5, second);
          gradient.addColorStop(1, third);
          context.fillStyle = gradient;
          context.fillRect(0, 0, bitmapWidth, bitmapHeight);
        }
        painted = true;
      };
      paint();
      const observer = new ResizeObserver(paint);
      observer.observe(canvas);
      window.addEventListener("resize", paint);
      return (): void => {
        active = false;
        observer.disconnect();
        window.removeEventListener("resize", paint);
      };
    }, [first, second, third]);

    const scratch = React.useCallback((clientX: number, clientY: number): void => {
      if (completedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (![rect.width, rect.height, clientX, clientY].every((entry) => Number.isFinite(entry)) || rect.width <= 0 || rect.height <= 0) {
        throw new RangeError("Scratcher pointer geometry must be finite and non-empty.");
      }
      const context = requireContext(canvas);
      const x = (clientX - rect.left) * (canvas.width / rect.width);
      const y = (clientY - rect.top) * (canvas.height / rect.height);
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.arc(x, y, 30 * (canvas.width / rect.width), 0, Math.PI * 2);
      context.fill();
    }, []);

    const reveal = React.useCallback((): void => {
      if (completedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      requireContext(canvas).clearRect(0, 0, canvas.width, canvas.height);
      completedRef.current = true;
      pointerRef.current = null;
      setComplete(true);
    }, []);

    const checkCompletion = React.useCallback((): void => {
      if (completedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pixels = requireContext(canvas).getImageData(0, 0, canvas.width, canvas.height).data;
      const totalPixels = canvas.width * canvas.height;
      if (totalPixels === 0 || pixels.length !== totalPixels * 4) throw new Error("Scratcher pixel buffer has invalid geometry.");
      let clearPixels = 0;
      for (let index = 3; index < pixels.length; index += 4) if (pixels[index] === 0) clearPixels += 1;
      if ((clearPixels / totalPixels) * 100 >= minScratchPercentage) reveal();
    }, [minScratchPercentage, reveal]);

    React.useEffect(() => {
      let active = true;
      const move = (event: PointerEvent): void => {
        if (active && pointerRef.current === event.pointerId && !event.defaultPrevented) scratch(event.clientX, event.clientY);
      };
      const end = (event: PointerEvent): void => {
        if (!active || pointerRef.current !== event.pointerId) return;
        pointerRef.current = null;
        checkCompletion();
      };
      const cancel = (event: PointerEvent): void => {
        if (pointerRef.current === event.pointerId) pointerRef.current = null;
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end);
      document.addEventListener("pointercancel", cancel);
      return (): void => {
        active = false;
        pointerRef.current = null;
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", end);
        document.removeEventListener("pointercancel", cancel);
      };
    }, [checkCompletion, scratch]);

    React.useEffect(() => {
      if (!complete) return;
      let active = true;
      const notify = (): void => {
        if (!active || notifiedRef.current) return;
        notifiedRef.current = true;
        callbackRef.current?.();
      };
      if (paused) {
        controls.stop();
        controls.set({scale: 1, rotate: 0});
        notify();
      } else {
        controls
          .start({
            scale: [1, 1.5, 1],
            rotate: [0, 10, -10, 10, -10, 0],
            transition: {duration: 0.5},
          })
          .then(notify)
          .catch((error: unknown): void => {
            if (active)
              setAnimationError(error instanceof Error ? error : new Error("Scratcher completion animation failed.", {cause: error}));
          });
      }
      return (): void => {
        active = false;
        controls.stop();
      };
    }, [complete, paused, controls]);

    if (animationError) throw animationError;
    const surfaceStyle: ScratchStyle = {"--ac-scratcher-width": `${width}px`, "--ac-scratcher-height": `${height}px`};
    return (
      <motion.div
        ref={setRefs}
        className={cn(styles.root, className)}
        style={surfaceStyle}
        animate={controls}
        data-state={complete ? "complete" : "covered"}
        data-motion={paused ? "paused" : "running"}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={styles.canvas}
          aria-hidden='true'
          onPointerDown={(event): void => {
            if (event.button !== 0 || event.defaultPrevented || completedRef.current) return;
            pointerRef.current = event.pointerId;
            scratch(event.clientX, event.clientY);
          }}
        />
        {children}
        <button
          type='button'
          className={styles.reveal}
          disabled={complete}
          onClick={reveal}>
          {revealLabel}
        </button>
        <span
          className={styles.status}
          role='status'>
          {complete ? completedLabel : ""}
        </span>
      </motion.div>
    );
  },
);
ScratcherSurface.displayName = "ScratcherSurface";

/**
 * Renders a pointer scratch-card with an equivalent keyboard reveal path.
 *
 * @remarks Dimensions/gradient changes reset the card. Children are always mounted and accessible;
 * do not put secrets or authorization gates behind this purely visual overlay.
 * @throws {RangeError} If dimensions or the completion threshold are invalid.
 */
export const Scratcher = React.forwardRef<HTMLDivElement, ScratcherProps>((props: Readonly<ScratcherProps>, ref): React.JSX.Element => {
  const {width, height, minScratchPercentage = 50, gradientColors = defaultGradientColors} = props;
  if (![width, height].every((dimension) => Number.isFinite(dimension) && dimension > 0)) {
    throw new RangeError("Scratcher dimensions must be positive and finite.");
  }
  if (!Number.isFinite(minScratchPercentage) || minScratchPercentage < 0 || minScratchPercentage > 100) {
    throw new RangeError("Scratcher completion percentage must be finite and in 0–100.");
  }
  return (
    <ScratcherSurface
      key={JSON.stringify([width, height, ...gradientColors])}
      {...props}
      ref={ref}
    />
  );
});
Scratcher.displayName = "Scratcher";
