"use client";

import {motion} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./hole-background.module.css";

export interface HoleBackgroundProps extends React.HTMLAttributes<HTMLCanvasElement> {
  strokeColor?: string;
  numberOfLines?: number;
  numberOfDiscs?: number;
  particleRGBColor?: [number, number, number];
}

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
  width: number;
  height: number;
  dpi: number;
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
  render: {width: 0, height: 0, dpi: 1},
  particleArea: createEmptyParticleArea(),
  linesCanvas: null,
});

const HoleBackground = React.forwardRef<HTMLCanvasElement, HoleBackgroundProps>(
  (
    {strokeColor = "#737373", numberOfLines = 50, numberOfDiscs = 50, particleRGBColor = [255, 255, 255], className, children, ...props},
    ref,
  ) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const animationFrameIdRef = React.useRef(0);
    const stateRef = React.useRef<HoleState>(createInitialState());

    React.useImperativeHandle(ref, () => canvasRef.current!, []);

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
      stateRef.current.rect = {width: rect.width, height: rect.height};
      stateRef.current.render = {
        width: rect.width,
        height: rect.height,
        dpi: globalThis.window.devicePixelRatio || 1,
      };
      canvas.width = stateRef.current.render.width * stateRef.current.render.dpi;
      canvas.height = stateRef.current.render.height * stateRef.current.render.dpi;
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

      for (let index = 0; index < numberOfDiscs; index += 1) {
        const progress = index / numberOfDiscs;
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
    }, [numberOfDiscs, tweenDisc]);

    const setLines = React.useCallback((): void => {
      const {width, height} = stateRef.current.rect;
      stateRef.current.lines = [];
      const linesAngle = (Math.PI * 2) / numberOfLines;
      for (let index = 0; index < numberOfLines; index += 1) {
        stateRef.current.lines.push([]);
      }

      stateRef.current.discs.forEach((disc) => {
        for (let index = 0; index < numberOfLines; index += 1) {
          const angle = index * linesAngle;
          const point: Point = {
            x: disc.x + Math.cos(angle) * disc.w,
            y: disc.y + Math.sin(angle) * disc.h,
          };
          stateRef.current.lines[index]!.push(point);
        }
      });

      const offCanvas = globalThis.document.createElement("canvas");
      offCanvas.width = width;
      offCanvas.height = height;
      const context = offCanvas.getContext("2d");
      const clipPath = stateRef.current.clip.path;
      if (!context || !clipPath) {
        return;
      }

      stateRef.current.lines.forEach((line) => {
        context.save();
        let lineIsIn = false;
        line.forEach((point, lineIndex) => {
          if (lineIndex === 0) {
            return;
          }

          const previousPoint = line[lineIndex - 1]!;
          if (!lineIsIn && (context.isPointInPath(clipPath, point.x, point.y) || context.isPointInStroke(clipPath, point.x, point.y))) {
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
    }, [numberOfLines, strokeColor]);

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
          c: `rgba(${particleRGBColor[0]}, ${particleRGBColor[1]}, ${particleRGBColor[2]}, ${Math.random()})`,
        };
      },
      [particleRGBColor],
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
        context.drawImage(stateRef.current.linesCanvas, 0, 0);
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
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.scale(stateRef.current.render.dpi, stateRef.current.render.dpi);
      moveDiscs();
      moveParticles();
      drawDiscs(context);
      drawLines(context);
      drawParticles(context);
      context.restore();
      animationFrameIdRef.current = globalThis.requestAnimationFrame(tick);
    }, [drawDiscs, drawLines, drawParticles, moveDiscs, moveParticles]);

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

      init();
      tick();

      const handleResize = (): void => {
        setSize();
        setDiscs();
        setLines();
        setParticles();
      };

      globalThis.window.addEventListener("resize", handleResize);
      return () => {
        globalThis.window.removeEventListener("resize", handleResize);
        globalThis.cancelAnimationFrame(animationFrameIdRef.current);
      };
    }, [init, setDiscs, setLines, setParticles, setSize, tick]);

    return (
      <div className={cn(styles.root, className)}>
        {children}
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          {...props}
        />
        <motion.div
          aria-hidden='true'
          className={styles.glow}
          animate={{backgroundPosition: "0% 300%"}}
          transition={{duration: 5, ease: "linear", repeat: Infinity}}
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
