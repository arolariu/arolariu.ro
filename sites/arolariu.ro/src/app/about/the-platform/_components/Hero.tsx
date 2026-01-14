"use client";

import {BackgroundBeams} from "@arolariu/components/background-beams";
import {Button} from "@arolariu/components/button";
import {GradientText} from "@arolariu/components/gradient-text";
import {motion, useScroll, useTransform} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef} from "react";
import {TbArrowRight, TbBrandGithub, TbCode, TbRocket, TbSparkles} from "react-icons/tb";

/**
 * Hero component for the Platform page.
 * Features a stunning full-height hero with animated background beams,
 * gradient text, floating elements, and scroll-based parallax effects.
 * @returns The Hero component, CSR'ed.
 */
export default function Hero(): React.JSX.Element {
  const t = useTranslations("About.Platform.hero");
  const ref = useRef<HTMLElement>(null);
  const {scrollYProgress} = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section
      ref={ref}
      className='relative flex min-h-[90vh] items-center justify-center overflow-hidden'>
      {/* Background Layers */}
      <div className='absolute inset-0 -z-10'>
        {/* Gradient base */}
        <div className='from-background via-background to-primary/5 absolute inset-0 bg-gradient-to-b' />

        {/* Animated gradient orbs */}
        <motion.div
          className='absolute inset-0'
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{duration: 1.5}}>
          {/* Primary orb - top left */}
          <motion.div
            className='absolute top-1/4 left-1/6 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent blur-3xl'
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, -30, 0],
              rotate: [0, 10, 0],
            }}
            transition={{
              duration: 12,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />

          {/* Secondary orb - bottom right */}
          <motion.div
            className='absolute right-1/6 bottom-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-pink-500/15 via-purple-500/10 to-transparent blur-3xl'
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -60, 0],
              y: [0, 40, 0],
              rotate: [0, -15, 0],
            }}
            transition={{
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />

          {/* Accent orb - center */}
          <motion.div
            className='absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl'
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Grid pattern overlay */}
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:48px_48px]' />

        {/* Background beams */}
        <BackgroundBeams className='opacity-40' />
      </div>

      {/* Main Content */}
      <motion.div
        className='relative z-10 container mx-auto px-4 py-20'
        style={{y, opacity, scale}}>
        <div className='mx-auto max-w-5xl space-y-8 text-center'>
          {/* Status Badge */}
          <motion.div
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.1}}>
            <motion.span
              className='bg-primary/10 border-primary/20 text-primary inline-flex items-center gap-3 rounded-full border px-5 py-2 text-sm font-medium backdrop-blur-sm'
              whileHover={{
                scale: 1.05,
                backgroundColor: "rgba(var(--primary-rgb), 0.15)",
              }}
              transition={{duration: 0.2}}>
              <motion.span
                className='relative flex h-2.5 w-2.5'
                animate={{scale: [1, 1.2, 1]}}
                transition={{duration: 2, repeat: Number.POSITIVE_INFINITY}}>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75' />
                <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500' />
              </motion.span>
              <span>{t("statusBadge")}</span>
              <TbSparkles className='h-4 w-4' />
            </motion.span>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.2}}
            className='space-y-4'>
            <h1 className='text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl xl:text-8xl'>
              <motion.span
                className='mb-2 block'
                animate={{
                  color: ["hsl(var(--foreground))", "hsl(var(--primary))", "hsl(var(--foreground))"],
                }}
                transition={{duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut"}}>
                {t("title")}
              </motion.span>
              <GradientText
                text='arolariu.ro'
                neon
                className='text-6xl font-extrabold md:text-7xl lg:text-8xl xl:text-9xl'
                gradient='linear-gradient(90deg, #3b82f6 0%, #8b5cf6 25%, #d946ef 50%, #8b5cf6 75%, #3b82f6 100%)'
              />
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className='text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed md:text-xl lg:text-2xl'
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.3}}>
            {t("description")}
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            className='flex flex-wrap justify-center gap-3 pt-2'
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.4}}>
            {[
              {icon: TbCode, label: t("trust.openSource")},
              {icon: TbRocket, label: t("trust.privacyFirst")},
              {icon: TbSparkles, label: t("trust.freeForever")},
            ].map((pill, index) => (
              <motion.span
                key={pill.label}
                className='bg-muted/50 text-muted-foreground flex items-center gap-2 rounded-full px-4 py-2 text-sm backdrop-blur-sm'
                initial={{opacity: 0, scale: 0.8}}
                animate={{opacity: 1, scale: 1}}
                transition={{duration: 0.4, delay: 0.5 + index * 0.1}}
                whileHover={{
                  scale: 1.05,
                  backgroundColor: "rgba(var(--primary-rgb), 0.1)",
                }}>
                <pill.icon className='h-4 w-4' />
                {pill.label}
              </motion.span>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className='flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row'
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.6}}>
            <motion.div
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}>
              <Button
                asChild
                size='lg'
                className='group relative h-14 cursor-pointer gap-3 overflow-hidden px-8 text-lg font-semibold'>
                <Link href='/domains'>
                  <TbRocket className='h-5 w-5 transition-transform group-hover:rotate-12' />
                  <span>{t("cta.exploreFeatures")}</span>
                  <TbArrowRight className='h-5 w-5 transition-transform group-hover:translate-x-1' />
                  <motion.span
                    className='from-primary/20 to-primary/5 absolute inset-0 bg-gradient-to-r'
                    initial={{x: "-100%", opacity: 0}}
                    whileHover={{x: "100%", opacity: 1}}
                    transition={{duration: 0.6}}
                  />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}>
              <Button
                asChild
                size='lg'
                variant='outline'
                className='group relative h-14 gap-3 overflow-hidden px-8 text-lg font-semibold'>
                <Link
                  href='https://github.com/arolariu/arolariu.ro'
                  target='_blank'
                  rel='noopener noreferrer'>
                  <TbBrandGithub className='h-5 w-5 transition-transform group-hover:rotate-12' />
                  <span>{t("cta.viewSource")}</span>
                  <motion.span
                    className='bg-primary/5 absolute inset-0'
                    initial={{x: "-100%", opacity: 0}}
                    whileHover={{x: "100%", opacity: 1}}
                    transition={{duration: 0.6}}
                  />
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            className='pt-16'
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 0.6, delay: 1}}>
            <motion.div
              className='mx-auto flex flex-col items-center gap-2'
              animate={{y: [0, 10, 0]}}
              transition={{duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut"}}>
              <span className='text-muted-foreground text-xs uppercase tracking-widest'>{t("scrollIndicator")}</span>
              <div className='border-muted-foreground/30 h-10 w-6 rounded-full border-2 p-1'>
                <motion.div
                  className='bg-primary h-2 w-2 rounded-full'
                  animate={{y: [0, 16, 0]}}
                  transition={{duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut"}}
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className='from-background pointer-events-none absolute right-0 bottom-0 left-0 h-32 bg-gradient-to-t to-transparent' />
    </section>
  );
}
