"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./fireworks-background.module.css";

const rand = (min: number, max: number): number => Math.random() * (max - min) + min;
const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min) + min);
const randColor = (): string => `hsl(${randInt(0, 360)}, 100%, 50%)`;

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
    update() {
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
    },
    draw(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    },
    isAlive() {
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
  particleSpeed: {min: number; max: number} | number,
  particleSize: {min: number; max: number} | number,
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
    update() {
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
    explode() {
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
    draw(ctx: CanvasRenderingContext2D) {
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

const getValueByRange = (range: {min: number; max: number} | number): number => {
  if (typeof range === "number") {
    return range;
  }

  return rand(range.min, range.max);
};

const getColor = (color: string | ReadonlyArray<string> | undefined): string => {
  if (Array.isArray(color)) {
    return color[randInt(0, color.length)] ?? randColor();
  }

  if (typeof color === "string") {
    return color;
  }

  return randColor();
};

/** Props accepted by {@link FireworksBackground}. */
export interface FireworksBackgroundProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  /** HTML attributes forwarded to the internal `<canvas>` element. @default undefined */
  canvasProps?: React.HTMLAttributes<HTMLCanvasElement>;
  /** Relative launch frequency multiplier for automatic fireworks. @default 1 */
  population?: number;
  /** Fixed color or palette used for generated fireworks and particles. @default undefined */
  color?: string | ReadonlyArray<string>;
  /** Launch velocity or range used for ascending fireworks. @default {min: 4, max: 8} */
  fireworkSpeed?: {min: number; max: number} | number;
  /** Stroke width or range used for the ascending firework trail. @default {min: 2, max: 5} */
  fireworkSize?: {min: number; max: number} | number;
  /** Velocity or range used for explosion particles. @default {min: 2, max: 7} */
  particleSpeed?: {min: number; max: number} | number;
  /** Size or range used for explosion particles. @default {min: 1, max: 5} */
  particleSize?: {min: number; max: number} | number;
}

/**
 * Renders an auto-launching fireworks display inside a clickable background canvas.
 *
 * @remarks
 * - Animated component using the `motion` library
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
 */
const FireworksBackground = React.forwardRef<HTMLDivElement, FireworksBackgroundProps>(
  (
    {
      className,
      canvasProps,
      population = 1,
      color,
      fireworkSpeed = {min: 4, max: 8},
      fireworkSize = {min: 2, max: 5},
      particleSpeed = {min: 2, max: 7},
      particleSize = {min: 1, max: 5},
      ...props
    },
    ref,
  ) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => containerRef.current!, []);

    React.useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      let maxX = globalThis.window.innerWidth;
      let ratio = container.offsetHeight / Math.max(container.offsetWidth, 1);
      let maxY = maxX * ratio;
      let launchTimeoutId = 0;
      canvas.width = maxX;
      canvas.height = maxY;

      const setCanvasSize = (): void => {
        maxX = globalThis.window.innerWidth;
        ratio = container.offsetHeight / Math.max(container.offsetWidth, 1);
        maxY = maxX * ratio;
        canvas.width = maxX;
        canvas.height = maxY;
      };

      globalThis.window.addEventListener("resize", setCanvasSize);

      const explosions: Array<ParticleType> = [];
      const fireworks: Array<FireworkType> = [];

      const handleExplosion = (particles: ReadonlyArray<ParticleType>): void => {
        explosions.push(...particles);
      };

      const launchFirework = (): void => {
        const x = rand(maxX * 0.1, maxX * 0.9);
        const y = maxY;
        const targetY = rand(maxY * 0.1, maxY * 0.4);
        const fireworkColor = getColor(color);
        const speed = getValueByRange(fireworkSpeed);
        const size = getValueByRange(fireworkSize);
        fireworks.push(createFirework(x, y, targetY, fireworkColor, speed, size, particleSpeed, particleSize, handleExplosion));
        const timeout = rand(300, 800) / population;
        launchTimeoutId = globalThis.window.setTimeout(launchFirework, timeout);
      };

      launchFirework();

      let animationFrameId = 0;
      const animate = (): void => {
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

      animate();

      const handleClick = (event: MouseEvent): void => {
        const fireworkColor = getColor(color);
        const speed = getValueByRange(fireworkSpeed);
        const size = getValueByRange(fireworkSize);
        fireworks.push(
          createFirework(event.clientX, maxY, event.clientY, fireworkColor, speed, size, particleSpeed, particleSize, handleExplosion),
        );
      };

      container.addEventListener("click", handleClick);

      return () => {
        globalThis.window.removeEventListener("resize", setCanvasSize);
        container.removeEventListener("click", handleClick);
        globalThis.window.clearTimeout(launchTimeoutId);
        globalThis.cancelAnimationFrame(animationFrameId);
      };
    }, [color, fireworkSize, fireworkSpeed, particleSize, particleSpeed, population]);

    return (
      <div
        ref={containerRef}
        className={cn(styles.root, className)}
        {...props}>
        <canvas
          {...canvasProps}
          ref={canvasRef}
          className={cn(styles.canvas, canvasProps?.className)}
        />
      </div>
    );
  },
);

FireworksBackground.displayName = "FireworksBackground";

export {FireworksBackground};
