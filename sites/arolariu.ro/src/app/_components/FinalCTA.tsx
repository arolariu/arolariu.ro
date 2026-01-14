"use client";

import {Button} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef} from "react";
import {TbBrandGithub, TbRocket} from "react-icons/tb";

/**
 * Simple call-to-action section with animated background.
 */
export default function FinalCTA(): React.JSX.Element {
  const t = useTranslations("Home.cta");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full overflow-hidden px-4 py-24'>
      {/* Animated background */}
      <div className='pointer-events-none absolute inset-0'>
        <motion.div
          className='absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-3xl'
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Content */}
      <div className='relative mx-auto max-w-2xl text-center'>
        {/* Title */}
        <motion.h2
          className='mb-8 text-4xl font-bold sm:text-5xl'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <span className='bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent'>
            {t("title")}
          </span>
        </motion.h2>

        {/* Buttons */}
        <motion.div
          className='flex flex-col items-center justify-center gap-4 sm:flex-row'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.2, duration: 0.5}}>
          <Button
            asChild
            size='lg'
            className='group min-w-[160px]'>
            <Link href='/domains'>
              <TbRocket className='mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5' />
              {t("explore")}
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
              {t("source")}
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
