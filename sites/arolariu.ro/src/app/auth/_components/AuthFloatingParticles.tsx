"use client";

import {motion} from "motion/react";
import {useMemo} from "react";

export type AuthFloatingParticlesProps = Readonly<{
  count?: number;
  className?: string;
}>;

type Particle = Readonly<{
  id: number;
  size: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  opacity: number;
}>;

/**
 * Animated floating particles for authentication page backgrounds.
 *
 * @remarks
 * **Rendering Context**: Client Component with CSS animations via Motion.
 *
 * **Features**:
 * - Randomized particle positions and sizes
 * - Smooth floating animations with staggered delays
 * - Gradient blur effects for depth
 * - Performance optimized with CSS transforms
 *
 * @param props - Component properties
 * @param props.count - Number of particles to render (default: 20)
 * @param props.className - Additional CSS classes
 *
 * @returns Animated floating particle elements
 *
 * @example
 * ```tsx
 * <AuthFloatingParticles count={15} className="opacity-50" />
 * ```
 */
export default function AuthFloatingParticles({count = 20, className}: AuthFloatingParticlesProps): React.JSX.Element {
  const particles: ReadonlyArray<Particle> = useMemo(
    () =>
      Array.from({length: count}, (_, i) => ({
        id: i,
        size: 2 + Math.random() * 6,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 8 + Math.random() * 12,
        opacity: 0.1 + Math.random() * 0.3,
      })),
    [count],
  );

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      aria-hidden='true'>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className='bg-primary/50 absolute rounded-full blur-sm'
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: particle.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, -10, 0],
            scale: [1, 1.2, 1],
            opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Larger gradient orbs */}
      <motion.div
        className='bg-primary/10 absolute -top-20 -left-20 h-64 w-64 rounded-full blur-3xl'
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className='bg-secondary/10 absolute -right-20 -bottom-20 h-80 w-80 rounded-full blur-3xl'
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          delay: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className='bg-accent/10 absolute top-1/4 right-1/4 h-48 w-48 rounded-full blur-3xl'
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 20, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 12,
          delay: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
