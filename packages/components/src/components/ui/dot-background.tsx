"use client";

import {motion} from "motion/react";
import React, {useEffect, useId, useRef, useState} from "react";

import {cn} from "@/lib/utilities";
import styles from "./dot-background.module.css";

/** Props accepted by {@link DotBackground}. */
export interface DotBackgroundProps extends React.SVGProps<SVGSVGElement> {
  /** Horizontal spacing between generated dots. @default 16 */
  width?: number;
  /** Vertical spacing between generated dots. @default 16 */
  height?: number;
  /** Horizontal offset applied to the dot grid. @default 0 */
  x?: number;
  /** Vertical offset applied to the dot grid. @default 0 */
  y?: number;
  /** Horizontal center offset for each generated circle. @default 1 */
  cx?: number;
  /** Vertical center offset for each generated circle. @default 1 */
  cy?: number;
  /** Radius used for each generated dot. @default 1 */
  cr?: number;
  /** Additional CSS classes merged with the root SVG element. @default undefined */
  className?: string;
  /** Enables pulsing radial glow animation for every dot. @default false */
  glow?: boolean;
  [key: string]: unknown;
}

/**
 * Renders an animated dot grid with an optional glowing pulse effect.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders an `<svg>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <DotBackground glow />
 * ```
 *
 * @see {@link DotBackgroundProps} for available props
 */
const DotBackground = React.forwardRef<SVGSVGElement, DotBackgroundProps>(
  (
    {width = 16, height = 16, x = 0, y = 0, cx = 1, cy = 1, cr = 1, className, glow = false, ...props}: Readonly<DotBackgroundProps>,
    ref,
  ): React.JSX.Element => {
    const id = useId();
    const containerRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({width: 0, height: 0});

    const setRefs = React.useCallback(
      (node: SVGSVGElement | null): void => {
        containerRef.current = node;

        if (typeof ref === "function") {
          ref(node);
          return;
        }

        if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    useEffect(() => {
      const updateDimensions = (): void => {
        if (!containerRef.current) {
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect -- resize observer style update is the hook's purpose
        setDimensions({width: rect.width, height: rect.height});
      };

      updateDimensions();
      globalThis.window.addEventListener("resize", updateDimensions);
      return () => globalThis.window.removeEventListener("resize", updateDimensions);
    }, []);

    const totalColumns = Math.ceil(dimensions.width / width);
    const dots = Array.from(
      {
        length: totalColumns * Math.ceil(dimensions.height / height),
      },
      (_, index) => {
        const column = index % Math.max(totalColumns, 1);
        const row = Math.floor(index / Math.max(totalColumns, 1));
        return {
          x: x + column * width + cx,
          y: y + row * height + cy,
          delay: Math.random() * 5,
          duration: Math.random() * 3 + 2,
        };
      },
    );

    return (
      <svg
        ref={setRefs}
        aria-hidden='true'
        className={cn(styles.root, className)}
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
        {dots.map((dot) => (
          <motion.circle
            key={`${dot.x}-${dot.y}`}
            cx={dot.x}
            cy={dot.y}
            r={cr}
            fill={glow ? `url(#${id}-gradient)` : "currentColor"}
            className={styles.dot}
            initial={glow ? {opacity: 0.4, scale: 1} : {}}
            animate={
              glow
                ? {
                    opacity: [0.4, 1, 0.4],
                    scale: [1, 1.5, 1],
                  }
                : {}
            }
            transition={
              glow
                ? {
                    duration: dot.duration,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: dot.delay,
                    ease: "easeInOut",
                  }
                : {}
            }
          />
        ))}
      </svg>
    );
  },
);
DotBackground.displayName = "DotBackground";

export {DotBackground};
