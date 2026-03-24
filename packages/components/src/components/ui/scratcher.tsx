"use client";

import {motion, useAnimation} from "motion/react";
import React, {useEffect, useRef, useState} from "react";

import {cn} from "@/lib/utilities";
import styles from "./scratcher.module.css";

/** Props accepted by {@link Scratcher}. */
export interface ScratcherProps {
  /** Content revealed after the overlay is scratched away. @default undefined */
  children: React.ReactNode;
  /** Width of the scratch card surface in pixels. @default undefined */
  width: number;
  /** Height of the scratch card surface in pixels. @default undefined */
  height: number;
  /** Percentage of cleared pixels required before completion fires. @default 50 */
  minScratchPercentage?: number;
  /** Additional CSS classes merged with the scratch card container. @default undefined */
  className?: string;
  /** Callback invoked once the scratch completion threshold is reached. @default undefined */
  onComplete?: () => void;
  /** Three-stop gradient used for the scratchable overlay. @default ["#A97CF8", "#F38CB8", "#FDCC92"] */
  gradientColors?: [string, string, string];
}

const defaultGradientColors: [string, string, string] = ["#A97CF8", "#F38CB8", "#FDCC92"];
const ignoreAnimationError = (): null => null;

/**
 * Renders a scratch-card reveal surface with animated completion feedback.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<div>` element containing a `<canvas>`
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <Scratcher width={320} height={180}>Prize unlocked</Scratcher>
 * ```
 *
 * @see {@link ScratcherProps} for available props
 */
export const Scratcher = React.forwardRef<HTMLDivElement, ScratcherProps>(function Scratcher(
  {width, height, minScratchPercentage = 50, onComplete, children, className, gradientColors = defaultGradientColors},
  forwardedRef,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const controls = useAnimation();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    context.fillStyle = "#ccc";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, gradientColors[0]);
    gradient.addColorStop(0.5, gradientColors[1]);
    gradient.addColorStop(1, gradientColors[2]);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, [gradientColors]);

  const scratch = React.useCallback((clientX: number, clientY: number): void => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left + 16;
    const y = clientY - rect.top + 16;
    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(x, y, 30, 0, Math.PI * 2);
    context.fill();
  }, []);

  const startAnimation = React.useCallback(async (): Promise<void> => {
    await controls.start({
      scale: [1, 1.5, 1],
      rotate: [0, 10, -10, 10, -10, 0],
      transition: {duration: 0.5},
    });

    onComplete?.();
  }, [controls, onComplete]);

  const checkCompletion = React.useCallback((): void => {
    if (isComplete) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const totalPixels = pixels.length / 4;
    let clearPixels = 0;

    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] === 0) {
        clearPixels += 1;
      }
    }

    const percentage = (clearPixels / totalPixels) * 100;
    if (percentage >= minScratchPercentage) {
      setIsComplete(true);
      context.clearRect(0, 0, canvas.width, canvas.height);
      startAnimation().catch(ignoreAnimationError);
    }
  }, [isComplete, minScratchPercentage, startAnimation]);

  useEffect(() => {
    const handleDocumentMouseMove = (event: MouseEvent): void => {
      if (isScratching) {
        scratch(event.clientX, event.clientY);
      }
    };

    const handleDocumentTouchMove = (event: TouchEvent): void => {
      if (!isScratching) {
        return;
      }

      const [touch] = event.touches;
      if (!touch) {
        return;
      }

      scratch(touch.clientX, touch.clientY);
    };

    const handleDocumentPointerEnd = (): void => {
      setIsScratching(false);
      checkCompletion();
    };

    globalThis.document.addEventListener("mousemove", handleDocumentMouseMove);
    globalThis.document.addEventListener("touchmove", handleDocumentTouchMove);
    globalThis.document.addEventListener("mouseup", handleDocumentPointerEnd);
    globalThis.document.addEventListener("touchend", handleDocumentPointerEnd);
    globalThis.document.addEventListener("touchcancel", handleDocumentPointerEnd);

    return () => {
      globalThis.document.removeEventListener("mousemove", handleDocumentMouseMove);
      globalThis.document.removeEventListener("touchmove", handleDocumentTouchMove);
      globalThis.document.removeEventListener("mouseup", handleDocumentPointerEnd);
      globalThis.document.removeEventListener("touchend", handleDocumentPointerEnd);
      globalThis.document.removeEventListener("touchcancel", handleDocumentPointerEnd);
    };
  }, [checkCompletion, isScratching, scratch]);

  return (
    <motion.div
      ref={forwardedRef}
      className={cn(styles.root, className)}
      style={{
        width,
        height,
        cursor:
          "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNSIgc3R5bGU9ImZpbGw6I2ZmZjtzdHJva2U6IzAwMDtzdHJva2Utd2lkdGg6MXB4OyIgLz4KPC9zdmc+'), auto",
      }}
      animate={controls}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={styles.canvas}
        onMouseDown={() => setIsScratching(true)}
        onTouchStart={() => setIsScratching(true)}
      />
      {children}
    </motion.div>
  );
});

Scratcher.displayName = "Scratcher";
