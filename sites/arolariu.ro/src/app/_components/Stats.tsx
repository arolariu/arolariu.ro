"use client";

import {motion, useInView, useSpring, useTransform} from "motion/react";
import {useTranslations} from "next-intl";
import {useEffect, useRef} from "react";

const stats = ["uptime", "commits", "tech", "coverage"] as const;

/**
 * Animated counter component for stats.
 */
function AnimatedCounter({value, suffix}: {value: number; suffix: string}): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, {once: true});

  const spring = useSpring(0, {damping: 30, stiffness: 100});
  const display = useTransform(spring, (current) => Math.floor(current));

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  return (
    <span
      ref={ref}
      className='tabular-nums'>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

/**
 * Clean stats section with animated counting numbers.
 */
export default function Stats(): React.JSX.Element {
  const t = useTranslations("Home.stats");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full px-4 py-20'>
      {/* Background gradient */}
      <div className='from-background via-muted/30 to-background pointer-events-none absolute inset-0 bg-gradient-to-b' />

      <div className='relative mx-auto max-w-5xl'>
        {/* Stats grid */}
        <div className='grid grid-cols-2 gap-8 md:grid-cols-4'>
          {stats.map((stat, index) => (
            <motion.div
              key={stat}
              className='flex flex-col items-center text-center'
              initial={{opacity: 0, y: 20}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.1 + index * 0.1, duration: 0.5}}>
              {/* Number */}
              <div className='mb-2 text-4xl font-bold md:text-5xl'>
                <span className='bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent'>
                  <AnimatedCounter
                    value={Number.parseFloat(t(`${stat}.value`))}
                    suffix={t(`${stat}.suffix`)}
                  />
                </span>
              </div>

              {/* Label */}
              <span className='text-muted-foreground text-sm font-medium uppercase tracking-wider'>{t(`${stat}.label`)}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
