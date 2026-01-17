"use client";

import {Badge, Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {TbChevronDown, TbRocket, TbSparkles} from "react-icons/tb";

/**
 * Hero section for the About hub page.
 * Features animated background, gradient text, and CTAs.
 */
export default function Hero(): React.JSX.Element {
  const t = useTranslations("About.Hub.hero");

  return (
    <section className='relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden px-4 py-20'>
      {/* Animated background orbs */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <motion.div
          className='absolute -top-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-3xl'
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className='absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl'
          animate={{
            x: [0, -40, 0],
            y: [0, -30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className='absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-500/10 to-blue-500/10 blur-3xl'
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className='pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(100,100,100,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(100,100,100,0.03)_1px,transparent_1px)] bg-[size:50px_50px]'
        aria-hidden='true'
      />

      {/* Content */}
      <motion.div
        className='relative z-10 flex max-w-4xl flex-col items-center text-center'
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.6}}>
        {/* Badge */}
        <motion.div
          initial={{opacity: 0, scale: 0.9}}
          animate={{opacity: 1, scale: 1}}
          transition={{delay: 0.2}}>
          <Badge
            variant='secondary'
            className='mb-6 px-4 py-1.5 text-sm font-medium'>
            <TbSparkles className='mr-2 h-4 w-4' />
            {t("badge")}
          </Badge>
        </motion.div>

        {/* Main title */}
        <motion.h1
          className='from-gradient-from via-gradient-via to-gradient-to mb-6 bg-gradient-to-r bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl lg:text-7xl'
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.3}}>
          {t("title")}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className='text-muted-foreground mb-10 max-w-2xl text-lg leading-relaxed sm:text-xl'
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.4}}>
          {t("subtitle")}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className='flex flex-col gap-4 sm:flex-row'
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.5}}>
          <Button
            asChild
            size='lg'
            className='group px-8'>
            <Link href='/about/the-platform'>
              <TbRocket className='mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5' />
              {t("ctaPrimary")}
            </Link>
          </Button>
          <Button
            asChild
            variant='outline'
            size='lg'
            className='px-8'>
            <Link href='/about/the-author'>{t("ctaSecondary")}</Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className='absolute bottom-8 left-1/2 -translate-x-1/2'
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{delay: 1}}>
        <motion.div
          animate={{y: [0, 8, 0]}}
          transition={{duration: 2, repeat: Infinity, ease: "easeInOut"}}>
          <TbChevronDown className='text-muted-foreground h-6 w-6' />
        </motion.div>
      </motion.div>
    </section>
  );
}
