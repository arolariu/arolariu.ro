"use client";

import {motion} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import styles from "./hole-background.module.css";
import {useVisualEffectPolicy} from "./_visual-effects";

/** Props accepted by {@link HoleBackground}. */
export interface HoleBackgroundProps extends React.HTMLAttributes<HTMLCanvasElement> {
  /** Stroke color used for the wireframe discs and line work. @default "#737373" */
  readonly strokeColor?: string;
  /** Positive integer radial line count, bounded to 256. @default 50 */
  readonly numberOfLines?: number;
  /** Positive integer depth-disc count, bounded to 256. @default 50 */
  readonly numberOfDiscs?: number;
  /** RGB tuple used to tint the floating particle field. @default [255, 255, 255] */
  readonly particleRGBColor?: readonly [number, number, number];
}

const defaultParticleRGB: readonly [number, number, number] = [255, 255, 255];

interface Disc {
  p: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  sx: number;
  dx: number;
  y: number;
  vy: number;
  p: number;
  r: number;
  c: string;
}

interface ClipState {
  disc: Disc;
  i: number;
  path: Path2D | null;
}

interface RectState {
  width: number;
  height: number;
}

interface RenderState {
  bitmapWidth: number;
  bitmapHeight: number;
  scaleX: number;
  scaleY: number;
}

interface ParticleArea {
  sx: number;
  sw: number;
  ex: number;
  ew: number;
  h: number;
}

interface HoleState {
  discs: Array<Disc>;
  lines: Array<Array<Point>>;
  particles: Array<Particle>;
  clip: ClipState;
  startDisc: Disc;
  endDisc: Disc;
  rect: RectState;
  render: RenderState;
  particleArea: ParticleArea;
  linesCanvas: HTMLCanvasElement | null;
}

const linear = (progress: number): number => progress;
const easeInExpo = (progress: number): number => (progress === 0 ? 0 : 2 ** (10 * (progress - 1)));

const createEmptyDisc = (): Disc => ({p: 0, x: 0, y: 0, w: 0, h: 0});
const createEmptyParticleArea = (): ParticleArea => ({sx: 0, sw: 0, ex: 0, ew: 0, h: 0});
const createInitialState = (): HoleState => ({
  discs: [],
  lines: [],
  particles: [],
  clip: {disc: createEmptyDisc(), i: 0, path: null},
  startDisc: createEmptyDisc(),
  endDisc: createEmptyDisc(),
  rect: {width: 0, height: 0},
  render: {bitmapWidth: 0, bitmapHeight: 0, scaleX: 1, scaleY: 1},
  particleArea: createEmptyParticleArea(),
  linesCanvas: null,
});

/**
 * Renders a vortex-style tunnel animation with discs, scanlines, and particles.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<div>` element containing a `<canvas>`
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <HoleBackground />
 * ```
 *
 * @see {@link HoleBackgroundProps} for available props
 * @throws {RangeError} If counts, RGB channels or measured geometry are invalid.
 * @throws {Error} If a 2D canvas context is unavailable.
 */
const HoleBackground = React.forwardRef<HTMLCanvasElement, HoleBackgroundProps>(
  (
    {
      strokeColor = "#737373",
      numberOfLines = 50,
      numberOfDiscs = 50,
      particleRGBColor = defaultParticleRGB,
      className,
      children,
      ...props
    }: Readonly<HoleBackgroundProps>,
    ref,
  ): React.JSX.Element => {
    if (![numberOfLines, numberOfDiscs].every((count) => Number.isSafeInteger(count) && count > 0)) {
      throw new RangeError("HoleBackground line/disc count must be a positive finite integer.");
    }
    const lineCount = Math.min(numberOfLines, 256);
    const discCount = Math.min(numberOfDiscs, 256);
    const [red, green, blue] = particleRGBColor;
    if (![red, green, blue].every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255)) {
      throw new RangeError("HoleBackground RGB channels must be finite and in 0–255.");
    }
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const stateRef = React.useRef<HoleState>(createInitialState());
    const {paused} = useVisualEffectPolicy(canvasRef);
    const setRefs = useMergedRefs(canvasRef, ref);

    const tweenValue = React.useCallback((start: number, end: number, progress: number, ease: "inExpo" | null = null): number => {
      const delta = end - start;
      const easeFunction = ease === "inExpo" ? easeInExpo : linear;
      return start + delta * easeFunction(progress);
    }, []);

    const tweenDisc = React.useCallback(
      (disc: Disc): void => {
        const {startDisc, endDisc} = stateRef.current;
        disc.x = tweenValue(startDisc.x, endDisc.x, disc.p);
        disc.y = tweenValue(startDisc.y, endDisc.y, disc.p, "inExpo");
        disc.w = tweenValue(startDisc.w, endDisc.w, disc.p);
        disc.h = tweenValue(startDisc.h, endDisc.h, disc.p);
      },
      [tweenValue],
    );

    const setSize = React.useCallback((): void => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio;
      if (![rect.width, rect.height, dpr].every((entry) => Number.isFinite(entry)) || rect.width <= 0 || rect.height <= 0 || dpr <= 0) {
        throw new RangeError("HoleBackground geometry and DPR must be finite and positive.");
      }
      stateRef.current.rect = {width: rect.width, height: rect.height};
      const requestedScale = Math.min(dpr, 4096 / rect.width, 4096 / rect.height);
      const bitmapWidth = Math.max(1, Math.min(4096, Math.round(rect.width * requestedScale)));
      const bitmapHeight = Math.max(1, Math.min(4096, Math.round(rect.height * requestedScale)));
      const scaleX = bitmapWidth / rect.width;
      const scaleY = bitmapHeight / rect.height;
      if (![scaleX, scaleY].every((scale) => Number.isFinite(scale) && scale > 0)) {
        throw new RangeError("HoleBackground geometry cannot produce a finite backing-space transform.");
      }
      stateRef.current.render = {
        bitmapWidth,
        bitmapHeight,
        scaleX,
        scaleY,
      };
      canvas.width = bitmapWidth;
      canvas.height = bitmapHeight;
    }, []);

    const setDiscs = React.useCallback((): void => {
      const {width, height} = stateRef.current.rect;
      stateRef.current.discs = [];
      stateRef.current.startDisc = {
        x: width * 0.5,
        y: height * 0.45,
        w: width * 0.75,
        h: height * 0.7,
        p: 0,
      };
      stateRef.current.endDisc = {
        x: width * 0.5,
        y: height * 0.95,
        w: 0,
        h: 0,
        p: 0,
      };

      let previousBottom = height;
      stateRef.current.clip = {disc: createEmptyDisc(), i: 0, path: null};

      for (let index = 0; index < discCount; index += 1) {
        const progress = index / discCount;
        const disc: Disc = {p: progress, x: 0, y: 0, w: 0, h: 0};
        tweenDisc(disc);
        const bottom = disc.y + disc.h;
        if (bottom <= previousBottom) {
          stateRef.current.clip = {disc: {...disc}, i: index, path: null};
        }
        previousBottom = bottom;
        stateRef.current.discs.push(disc);
      }

      const clipPath = new globalThis.Path2D();
      const {disc} = stateRef.current.clip;
      clipPath.ellipse(disc.x, disc.y, disc.w, disc.h, 0, 0, Math.PI * 2);
      clipPath.rect(disc.x - disc.w, 0, disc.w * 2, disc.y);
      stateRef.current.clip.path = clipPath;
    }, [discCount, tweenDisc]);

    const setLines = React.useCallback((): void => {
      stateRef.current.lines = [];
      const linesAngle = (Math.PI * 2) / lineCount;
      for (let index = 0; index < lineCount; index += 1) {
        stateRef.current.lines.push([]);
      }

      stateRef.current.discs.forEach((disc) => {
        for (let index = 0; index < lineCount; index += 1) {
          const angle = index * linesAngle;
          const point: Point = {
            x: disc.x + Math.cos(angle) * disc.w,
            y: disc.y + Math.sin(angle) * disc.h,
          };
          stateRef.current.lines[index]!.push(point);
        }
      });

      const offCanvas = globalThis.document.createElement("canvas");
      const {bitmapWidth, bitmapHeight, scaleX, scaleY} = stateRef.current.render;
      offCanvas.width = bitmapWidth;
      offCanvas.height = bitmapHeight;
      const context = offCanvas.getContext("2d");
      const clipPath = stateRef.current.clip.path;
      if (!context || !clipPath) {
        throw new Error("HoleBackground requires a 2D line-cache context and initialized clip path.");
      }
      context.scale(scaleX, scaleY);

      stateRef.current.lines.forEach((line) => {
        context.save();
        let lineIsIn = false;
        line.forEach((point, lineIndex) => {
          if (lineIndex === 0) {
            return;
          }

          const previousPoint = line[lineIndex - 1]!;
          if (
            !lineIsIn
            && (context.isPointInPath(clipPath, point.x * scaleX, point.y * scaleY)
              || context.isPointInStroke(clipPath, point.x * scaleX, point.y * scaleY))
          ) {
            lineIsIn = true;
          } else if (lineIsIn) {
            context.clip(clipPath);
          }

          context.beginPath();
          context.moveTo(previousPoint.x, previousPoint.y);
          context.lineTo(point.x, point.y);
          context.strokeStyle = strokeColor;
          context.lineWidth = 2;
          context.stroke();
          context.closePath();
        });
        context.restore();
      });

      stateRef.current.linesCanvas = offCanvas;
    }, [lineCount, strokeColor]);

    const initParticle = React.useCallback(
      (start = false): Particle => {
        const {particleArea} = stateRef.current;
        const sx = particleArea.sx + particleArea.sw * Math.random();
        const ex = particleArea.ex + particleArea.ew * Math.random();
        const dx = ex - sx;
        const y = start ? particleArea.h * Math.random() : particleArea.h;
        const radius = 0.5 + Math.random() * 4;
        const vy = 0.5 + Math.random();

        return {
          x: sx,
          sx,
          dx,
          y,
          vy,
          p: 0,
          r: radius,
          c: `rgb(${red} ${green} ${blue} / ${Math.random()})`,
        };
      },
      [red, green, blue],
    );

    const setParticles = React.useCallback((): void => {
      const {width, height} = stateRef.current.rect;
      stateRef.current.particles = [];
      const {disc} = stateRef.current.clip;
      stateRef.current.particleArea = {
        sx: (width - disc.w * 0.5) / 2,
        sw: disc.w * 0.5,
        ex: (width - disc.w * 2) / 2,
        ew: disc.w * 2,
        h: height * 0.85,
      };

      for (let index = 0; index < 100; index += 1) {
        stateRef.current.particles.push(initParticle(true));
      }
    }, [initParticle]);

    const drawDiscs = React.useCallback(
      (context: CanvasRenderingContext2D): void => {
        context.strokeStyle = strokeColor;
        context.lineWidth = 2;
        const outerDisc = stateRef.current.startDisc;
        context.beginPath();
        context.ellipse(outerDisc.x, outerDisc.y, outerDisc.w, outerDisc.h, 0, 0, Math.PI * 2);
        context.stroke();
        context.closePath();

        const clipPath = stateRef.current.clip.path;
        stateRef.current.discs.forEach((disc, index) => {
          if (index % 5 !== 0) {
            return;
          }

          if (clipPath && disc.w < stateRef.current.clip.disc.w - 5) {
            context.save();
            context.clip(clipPath);
          }

          context.beginPath();
          context.ellipse(disc.x, disc.y, disc.w, disc.h, 0, 0, Math.PI * 2);
          context.stroke();
          context.closePath();

          if (clipPath && disc.w < stateRef.current.clip.disc.w - 5) {
            context.restore();
          }
        });
      },
      [strokeColor],
    );

    const drawLines = React.useCallback((context: CanvasRenderingContext2D): void => {
      if (stateRef.current.linesCanvas) {
        context.drawImage(stateRef.current.linesCanvas, 0, 0, stateRef.current.rect.width, stateRef.current.rect.height);
      }
    }, []);

    const drawParticles = React.useCallback((context: CanvasRenderingContext2D): void => {
      const clipPath = stateRef.current.clip.path;
      if (!clipPath) {
        return;
      }

      context.save();
      context.clip(clipPath);
      stateRef.current.particles.forEach((particle) => {
        context.fillStyle = particle.c;
        context.beginPath();
        context.rect(particle.x, particle.y, particle.r, particle.r);
        context.closePath();
        context.fill();
      });
      context.restore();
    }, []);

    const moveDiscs = React.useCallback((): void => {
      stateRef.current.discs.forEach((disc) => {
        disc.p = (disc.p + 0.001) % 1;
        tweenDisc(disc);
      });
    }, [tweenDisc]);

    const moveParticles = React.useCallback((): void => {
      stateRef.current.particles.forEach((particle, index) => {
        particle.p = 1 - particle.y / Math.max(stateRef.current.particleArea.h, 1);
        particle.x = particle.sx + particle.dx * particle.p;
        particle.y -= particle.vy;
        if (particle.y < 0) {
          stateRef.current.particles[index] = initParticle();
        }
      });
    }, [initParticle]);

    const tick = React.useCallback((): void => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("HoleBackground requires a 2D canvas rendering context.");
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.scale(stateRef.current.render.scaleX, stateRef.current.render.scaleY);
      if (!paused) {
        moveDiscs();
        moveParticles();
      }
      drawDiscs(context);
      drawLines(context);
      drawParticles(context);
      context.restore();
    }, [drawDiscs, drawLines, drawParticles, moveDiscs, moveParticles, paused]);

    const init = React.useCallback((): void => {
      setSize();
      setDiscs();
      setLines();
      setParticles();
    }, [setDiscs, setLines, setParticles, setSize]);

    React.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      let active = true;
      let animationFrameId: number | null = null;
      const state = stateRef.current;
      init();
      const animate = (): void => {
        if (!active) return;
        tick();
        if (!paused) animationFrameId = requestAnimationFrame(animate);
      };
      animate();

      const handleResize = (): void => {
        if (!active) return;
        setSize();
        setDiscs();
        setLines();
        setParticles();
        tick();
      };

      const observer = new ResizeObserver(handleResize);
      observer.observe(canvas);
      globalThis.window.addEventListener("resize", handleResize);
      return () => {
        active = false;
        observer.disconnect();
        globalThis.window.removeEventListener("resize", handleResize);
        if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
        state.linesCanvas = null;
      };
    }, [init, setDiscs, setLines, setParticles, setSize, tick, paused]);

    return (
      <div
        className={cn(styles.root, className)}
        data-motion={paused ? "paused" : "running"}>
        {children}
        <canvas
          ref={setRefs}
          aria-hidden='true'
          className={styles.canvas}
          {...props}
        />
        <motion.div
          aria-hidden='true'
          className={styles.glow}
          initial={paused ? false : {backgroundPosition: "0% 100%"}}
          animate={{backgroundPosition: paused ? "0% 100%" : "0% 300%"}}
          transition={paused ? {duration: 0} : {duration: 5, ease: "linear", repeat: Infinity}}
        />
        <div
          aria-hidden='true'
          className={styles.scanlines}
        />
      </div>
    );
  },
);

HoleBackground.displayName = "HoleBackground";

export {HoleBackground};
