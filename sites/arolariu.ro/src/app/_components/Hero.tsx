"use client";

import {Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {TbBrandGithub, TbRocket} from "react-icons/tb";
import TechSphere from "../_effects/TechSphere";

/**
 * Minimal hero section with animated visuals and clean typography.
 */
export default function HeroSection(): React.JSX.Element {
  const t = useTranslations("Home.hero");

  return (
    <section className='relative flex min-h-[90vh] w-full items-center justify-center overflow-hidden px-4'>
      {/* Animated background orbs */}
      <div className='pointer-events-none absolute inset-0'>
        <motion.div
          className='absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-3xl'
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{duration: 15, repeat: Infinity, ease: "easeInOut"}}
        />
        <motion.div
          className='absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl'
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
            y: [0, 30, 0],
          }}
          transition={{duration: 18, repeat: Infinity, ease: "easeInOut"}}
        />
      </div>

      {/* Content */}
      <div className='relative z-10 grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2'>
        {/* Left: Text content */}
        <motion.div
          className='flex flex-col items-center text-center lg:items-start lg:text-left'
          initial={{opacity: 0, y: 30}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.8}}>
          {/* Title */}
          <motion.h1
            className='mb-4 text-5xl font-bold sm:text-6xl lg:text-7xl'
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.2, duration: 0.6}}>
            <span className='bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent'>
              {t("title")}
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            className='text-muted-foreground mb-8 text-xl font-medium sm:text-2xl'
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.4, duration: 0.6}}>
            {t("tagline")}
          </motion.p>

          {/* Buttons */}
          <motion.div
            className='flex flex-col gap-4 sm:flex-row'
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.6, duration: 0.5}}>
            <Button
              asChild
              size='lg'
              className='group min-w-[160px]'>
              <Link href='/domains'>
                <TbRocket className='mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5' />
                {t("cta")}
              </Link>
            </Button>
            <Button
              asChild
              variant='outline'
              size='lg'
              className='min-w-[160px]'>
              <a
                href='https://github.com/arolariu/arolariu.ro'
                target='_blank'
                rel='noopener noreferrer'>
                <TbBrandGithub className='mr-2 h-5 w-5' />
                {t("github")}
              </a>
            </Button>
          </motion.div>
        </motion.div>

        {/* Right: Tech Sphere */}
        <motion.div
          className='relative flex items-center justify-center'
          initial={{opacity: 0, scale: 0.8}}
          animate={{opacity: 1, scale: 1}}
          transition={{delay: 0.3, duration: 0.8}}>
          <div className='relative h-[400px] w-[400px]'>
            {/* Glow effects */}
            <motion.div
              className='absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 blur-3xl'
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{duration: 4, repeat: Infinity, ease: "easeInOut"}}
            />

            {/* Tech sphere - hidden on mobile */}
            <div className='hidden lg:block'>
              <TechSphere />
            </div>

            {/* Mobile: Animated gradient orb */}
            <div className='flex h-full w-full items-center justify-center lg:hidden'>
              <motion.div
                className='h-48 w-48 rounded-full bg-gradient-to-br from-cyan-500/40 via-purple-500/40 to-pink-500/40 blur-xl'
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{duration: 10, repeat: Infinity, ease: "linear"}}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className='absolute bottom-8 left-1/2 -translate-x-1/2'
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{delay: 1, duration: 0.5}}>
        <motion.div
          className='bg-muted-foreground h-10 w-6 rounded-full border-2 border-current p-1'
          animate={{y: [0, 5, 0]}}
          transition={{duration: 1.5, repeat: Infinity}}>
          <motion.div
            className='bg-muted-foreground mx-auto h-2 w-1 rounded-full'
            animate={{y: [0, 8, 0], opacity: [1, 0.3, 1]}}
            transition={{duration: 1.5, repeat: Infinity}}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
