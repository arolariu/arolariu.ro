"use client";

import {motion, type Variants} from "motion/react";
import Image from "next/image";
import AuthBulletList from "./AuthBulletList";
import AuthTrustBadgesRow from "./AuthTrustBadgesRow";

export type AuthMarketingPanelProps = Readonly<{
  title: string;
  subtitle: string;
  illustrationSrc: string;
  illustrationAlt: string;
  bullets: Readonly<[string, string, string]>;
  trustBadges?: ReadonlyArray<string>;
}>;

const containerVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: {opacity: 0, x: -20},
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const floatingAnimation = {
  y: [0, -10, 0],
  rotate: [0, 2, 0],
  transition: {
    duration: 5,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

/**
 * Enhanced marketing panel for authentication pages with animations.
 *
 * @remarks
 * **Rendering Context**: Client Component with motion animations.
 *
 * **Features**:
 * - Staggered entrance animations
 * - Floating illustration effect
 * - Gradient glow backgrounds
 * - Trust badge integration
 * - Animated bullet points
 *
 * @param props - Component properties
 *
 * @returns Animated marketing panel JSX element
 */
export default function AuthMarketingPanel(props: AuthMarketingPanelProps): React.JSX.Element {
  return (
    <motion.div
      className='relative space-y-8'
      variants={containerVariants}
      initial='hidden'
      animate='visible'>
      {/* Background glow effects */}
      <motion.div
        aria-hidden='true'
        className='bg-primary/10 pointer-events-none absolute top-1/4 -left-20 h-64 w-64 rounded-full blur-3xl'
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

      {/* Header section */}
      <motion.div
        className='relative space-y-4'
        variants={itemVariants}>
        <h1 className='from-foreground via-foreground/90 to-foreground/70 bg-linear-to-r bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl lg:text-5xl'>
          {props.title}
        </h1>
        <p className='text-muted-foreground text-base leading-relaxed sm:text-lg'>{props.subtitle}</p>

        {props.trustBadges && props.trustBadges.length > 0 ? (
          <motion.div variants={itemVariants}>
            <AuthTrustBadgesRow
              className='mt-4 flex flex-wrap items-center gap-2'
              badges={props.trustBadges}
            />
          </motion.div>
        ) : null}
      </motion.div>

      {/* Illustration card */}
      <motion.div
        variants={itemVariants}
        className='bg-card/40 border-border/50 relative mx-auto max-w-md overflow-hidden rounded-2xl border p-6 backdrop-blur-sm lg:mx-0'>
        {/* Gradient glows */}
        <motion.div
          aria-hidden='true'
          className='bg-primary/15 pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full blur-3xl'
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          aria-hidden='true'
          className='bg-secondary/15 pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full blur-3xl'
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 7,
            delay: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Floating illustration */}
        <motion.div
          animate={floatingAnimation}
          className='relative'>
          <Image
            src={props.illustrationSrc}
            alt={props.illustrationAlt}
            width={320}
            height={320}
            className='mx-auto h-48 w-48 object-contain drop-shadow-lg sm:h-56 sm:w-56'
            priority
          />
        </motion.div>

        {/* Animated bullet list */}
        <motion.div
          className='mt-6'
          variants={itemVariants}>
          <AuthBulletList
            className='text-muted-foreground space-y-3 text-sm'
            bullets={props.bullets}
            bulletAdornment={
              <motion.span
                className='bg-primary/70 mt-1.5 inline-block h-2 w-2 rounded-full'
                aria-hidden='true'
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            }
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
