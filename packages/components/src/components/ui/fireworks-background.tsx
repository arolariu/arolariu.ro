"use client";

import * as React from "react";
import {useInView} from "motion/react";

import {useReducedMotion} from "@/hooks/useReducedMotion";
import {cn} from "@/lib/utilities";
import styles from "./fireworks-background.module.css";

const rand = (min: number, max: number): number => Math.random() * (max - min) + min;
const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min) + min);
const randColor = (): string => `hsl(${randInt(0, 360)}, 100%, 50%)`;
type ValueRange = number | Readonly<{min: number; max: number}>;
const defaultFireworkSpeed: ValueRange = {min: 4, max: 8};
const defaultFireworkSize: ValueRange = {min: 2, max: 5};
const defaultParticleSpeed: ValueRange = {min: 2, max: 7};
const defaultParticleSize: ValueRange = {min: 1, max: 5};

function validateRange(value: ValueRange): void {
  const min = typeof value === "number" ? value : value.min;
  const max = typeof value === "number" ? value : value.max;
  if (![min, max].every((entry) => Number.isFinite(entry)) || min <= 0 || max < min) {
    throw new RangeError("FireworksBackground speed/size range must be finite, positive and ordered.");
  }
}

function validatePalette(color: string | ReadonlyArray<string> | undefined): void {
  if (color === undefined) return;
  const palette = typeof color === "string" ? [color] : color;
  if (palette.length === 0) throw new RangeError("FireworksBackground palette must contain colors.");
  for (const entry of palette) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new RangeError("FireworksBackground palette must contain non-empty color strings.");
    }
  }
}

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

interface ParticleType {
  x: number;
  y: number;
  color: string;
  speed: number;
  direction: number;
  vx: number;
  vy: number;
  gravity: number;
  friction: number;
  alpha: number;
  decay: number;
  size: number;
  update: () => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
  isAlive: () => boolean;
}

const createParticle = (
  x: number,
  y: number,
  color: string,
  speed: number,
  direction: number,
  gravity: number,
  friction: number,
  size: number,
): ParticleType => {
  const vx = Math.cos(direction) * speed;
  const vy = Math.sin(direction) * speed;
  const alpha = 1;
  const decay = rand(0.005, 0.02);

  return {
    x,
    y,
    color,
    speed,
    direction,
    vx,
    vy,
    gravity,
    friction,
    alpha,
    decay,
    size,
    update(): void {
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
    },
    draw(ctx: CanvasRenderingContext2D): void {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    },
    isAlive(): boolean {
      return this.alpha > 0;
    },
  };
};

interface FireworkType {
  x: number;
  y: number;
  targetY: number;
  color: string;
  speed: number;
  size: number;
  angle: number;
  vx: number;
  vy: number;
  trail: Array<{x: number; y: number}>;
  trailLength: number;
  exploded: boolean;
  update: () => boolean;
  explode: () => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

const createFirework = (
  x: number,
  y: number,
  targetY: number,
  color: string,
  speed: number,
  size: number,
  particleSpeed: ValueRange,
  particleSize: ValueRange,
  onExplode: (particles: ReadonlyArray<ParticleType>) => void,
): FireworkType => {
  const angle = -Math.PI / 2 + rand(-0.3, 0.3);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const trail: Array<{x: number; y: number}> = [];
  const trailLength = randInt(10, 25);

  return {
    x,
    y,
    targetY,
    color,
    speed,
    size,
    angle,
    vx,
    vy,
    trail,
    trailLength,
    exploded: false,
    update(): boolean {
      this.trail.push({x: this.x, y: this.y});
      if (this.trail.length > this.trailLength) {
        this.trail.shift();
      }
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.02;
      if (this.vy >= 0 || this.y <= this.targetY) {
        this.explode();
        return false;
      }
      return true;
    },
    explode(): void {
      const numberOfParticles = randInt(50, 150);
      const particles: Array<ParticleType> = [];
      for (let index = 0; index < numberOfParticles; index += 1) {
        const particleAngle = rand(0, Math.PI * 2);
        const localParticleSpeed = getValueByRange(particleSpeed);
        const localParticleSize = getValueByRange(particleSize);
        particles.push(createParticle(this.x, this.y, this.color, localParticleSpeed, particleAngle, 0.05, 0.98, localParticleSize));
      }
      onExplode(particles);
    },
    draw(ctx: CanvasRenderingContext2D): void {
      ctx.save();
      ctx.beginPath();
      if (this.trail.length > 1) {
        ctx.moveTo(this.trail[0]!.x, this.trail[0]!.y);
        for (const point of this.trail) {
          ctx.lineTo(point.x, point.y);
        }
      } else {
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y);
      }
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    },
  };
};

const getValueByRange = (range: ValueRange): number => {
  if (typeof range === "number") {
    return range;
  }

  return rand(range.min, range.max);
};

const getColor = (color: string | ReadonlyArray<string> | undefined): string => {
  if (Array.isArray(color)) {
    const selected = color[randInt(0, color.length)];
    if (typeof selected !== "string" || selected.trim().length === 0) {
      throw new RangeError("FireworksBackground palette must contain non-empty color strings.");
    }
    return selected;
  }

  if (typeof color === "string") {
    return color;
  }

  return randColor();
};

/** Props accepted by {@link FireworksBackground}. */
export interface FireworksBackgroundProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  /** HTML attributes forwarded to the internal `<canvas>` element. @default undefined */
  readonly canvasProps?: React.HTMLAttributes<HTMLCanvasElement>;
  /** Nonnegative finite launch frequency; zero enables click-only launches. Timers are bounded to at least 100ms. @default 1 */
  readonly population?: number;
  /** Fixed color or palette used for generated fireworks and particles. @default undefined */
  readonly color?: string | ReadonlyArray<string>;
  /** Launch velocity or range used for ascending fireworks. @default {min: 4, max: 8} */
  readonly fireworkSpeed?: ValueRange;
  /** Stroke width or range used for the ascending firework trail. @default {min: 2, max: 5} */
  readonly fireworkSize?: ValueRange;
  /** Velocity or range used for explosion particles. @default {min: 2, max: 7} */
  readonly particleSpeed?: ValueRange;
  /** Size or range used for explosion particles. @default {min: 1, max: 5} */
  readonly particleSize?: ValueRange;
}

/**
 * Renders an auto-launching fireworks display inside a clickable background canvas.
 *
 * @remarks
 * - Native canvas physics, capped at 16 trails and 2048 particles
 * - Element-sized DPR backing bitmap, with a static starburst when motion is paused
 * - Renders a `<div>` element containing a `<canvas>`
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <FireworksBackground population={2} />
 * ```
 *
 * @see {@link FireworksBackgroundProps} for available props
 * @throws {RangeError} If population, speed/size ranges, palette or measured geometry is invalid.
 * @throws {Error} If a 2D canvas context is unavailable.
 */
const FireworksBackground = React.forwardRef<HTMLDivElement, FireworksBackgroundProps>(
  (
    {
      className,
      children,
      canvasProps,
      population = 1,
      color,
      fireworkSpeed = defaultFireworkSpeed,
      fireworkSize = defaultFireworkSize,
      particleSpeed = defaultParticleSpeed,
      particleSize = defaultParticleSize,
      ...props
    }: Readonly<FireworksBackgroundProps>,
    ref,
  ): React.JSX.Element => {
    if (!Number.isFinite(population) || population < 0)
      throw new RangeError("FireworksBackground population must be finite and nonnegative.");
    for (const range of [fireworkSpeed, fireworkSize, particleSpeed, particleSize]) validateRange(range);
    validatePalette(color);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const paused = useMotionPaused(containerRef);
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null): void | (() => void) => {
        containerRef.current = node;
        if (typeof ref === "function") {
          const callback: React.RefCallback<HTMLDivElement> = ref;
          const cleanup = callback(node);
          if (typeof cleanup === "function")
            return (): void => {
              containerRef.current = null;
              cleanup();
            };
        } else if (ref) ref.current = node;
      },
      [ref],
    );

    React.useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("FireworksBackground requires a 2D canvas rendering context.");
      }

      let active = true;
      let maxX = 0;
      let maxY = 0;
      let launchTimeoutId: number | null = null;
      let animationFrameId: number | null = null;

      const setCanvasSize = (): void => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio;
        if (![rect.width, rect.height, dpr].every((entry) => Number.isFinite(entry)) || rect.width <= 0 || rect.height <= 0 || dpr <= 0) {
          throw new RangeError("FireworksBackground geometry and DPR must be finite and positive.");
        }
        const scale = Math.min(dpr, 4096 / rect.width, 4096 / rect.height);
        maxX = Math.max(1, Math.round(rect.width * scale));
        maxY = Math.max(1, Math.round(rect.height * scale));
        canvas.width = maxX;
        canvas.height = maxY;
      };

      const explosions: Array<ParticleType> = [];
      const fireworks: Array<FireworkType> = [];

      const handleExplosion = (particles: ReadonlyArray<ParticleType>): void => {
        if (active) explosions.push(...particles.slice(0, Math.max(0, 2048 - explosions.length)));
      };

      const launchFirework = (): void => {
        if (!active || paused || population === 0) return;
        if (fireworks.length < 16) {
          fireworks.push(
            createFirework(
              rand(maxX * 0.1, maxX * 0.9),
              maxY,
              rand(maxY * 0.1, maxY * 0.4),
              getColor(color),
              getValueByRange(fireworkSpeed),
              getValueByRange(fireworkSize),
              particleSpeed,
              particleSize,
              handleExplosion,
            ),
          );
        }
        const timeout = Math.min(60_000, Math.max(100, rand(300, 800) / population));
        launchTimeoutId = globalThis.window.setTimeout(launchFirework, timeout);
      };

      const animate = (): void => {
        if (!active || paused) return;
        context.clearRect(0, 0, maxX, maxY);

        for (let index = fireworks.length - 1; index >= 0; index -= 1) {
          const firework = fireworks[index]!;
          if (firework.update()) {
            firework.draw(context);
          } else {
            fireworks.splice(index, 1);
          }
        }

        for (let index = explosions.length - 1; index >= 0; index -= 1) {
          const particle = explosions[index]!;
          particle.update();
          if (particle.isAlive()) {
            particle.draw(context);
          } else {
            explosions.splice(index, 1);
          }
        }

        animationFrameId = globalThis.requestAnimationFrame(animate);
      };

      const drawStatic = (): void => {
        context.clearRect(0, 0, maxX, maxY);
        const staticColor = getColor(color ?? "#a855f7");
        for (let index = 0; index < 24; index += 1) {
          const angle = (index / 24) * Math.PI * 2;
          const radius = Math.min(maxX, maxY) * 0.25;
          const particle = createParticle(
            maxX * 0.5 + Math.cos(angle) * radius,
            maxY * 0.4 + Math.sin(angle) * radius,
            staticColor,
            0,
            angle,
            0,
            1,
            getValueByRange(particleSize),
          );
          particle.draw(context);
        }
      };
      const resize = (): void => {
        if (!active) return;
        setCanvasSize();
        fireworks.length = 0;
        explosions.length = 0;
        if (paused) drawStatic();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      globalThis.window.addEventListener("resize", resize);
      if (!paused) {
        launchFirework();
        animate();
      }

      const handleClick = (event: MouseEvent): void => {
        if (!active || paused || event.defaultPrevented || fireworks.length >= 16) return;
        const rect = canvas.getBoundingClientRect();
        if (![rect.width, rect.height].every((entry) => Number.isFinite(entry)) || rect.width <= 0 || rect.height <= 0) {
          throw new RangeError("FireworksBackground click geometry must be finite and non-empty.");
        }
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);
        const fireworkColor = getColor(color);
        const speed = getValueByRange(fireworkSpeed);
        const size = getValueByRange(fireworkSize);
        fireworks.push(createFirework(x, maxY, y, fireworkColor, speed, size, particleSpeed, particleSize, handleExplosion));
      };

      container.addEventListener("click", handleClick);

      return () => {
        active = false;
        observer.disconnect();
        globalThis.window.removeEventListener("resize", resize);
        container.removeEventListener("click", handleClick);
        if (launchTimeoutId !== null) globalThis.window.clearTimeout(launchTimeoutId);
        if (animationFrameId !== null) globalThis.cancelAnimationFrame(animationFrameId);
        fireworks.length = 0;
        explosions.length = 0;
      };
    }, [color, fireworkSize, fireworkSpeed, particleSize, particleSpeed, population, paused]);

    return (
      <div
        ref={setRefs}
        className={cn(styles.root, className)}
        {...props}
        data-motion={paused ? "paused" : "running"}>
        <canvas
          aria-hidden='true'
          {...canvasProps}
          ref={canvasRef}
          className={cn(styles.canvas, canvasProps?.className)}
        />
        {children}
      </div>
    );
  },
);

FireworksBackground.displayName = "FireworksBackground";

export {FireworksBackground};
