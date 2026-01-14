"use client";

import {Button} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef} from "react";
import {TbBrandGithub, TbRocket} from "react-icons/tb";

/**
 * Final call-to-action section at the bottom of the homepage.
 */
export default function FinalCTA(): React.JSX.Element {
  const t = useTranslations("Home.finalCta");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full overflow-hidden px-4 py-24'>
      {/* Animated background */}
      <div className='pointer-events-none absolute inset-0'>
        <motion.div
          className='absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-3xl'
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className='absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl'
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <div className='relative mx-auto max-w-4xl text-center'>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='mb-4 text-4xl font-bold sm:text-5xl'>
            <span className='bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 bg-clip-text text-transparent'>{t("title")}</span>
          </h2>
          <p className='text-muted-foreground mx-auto mb-10 max-w-2xl text-lg leading-relaxed'>{t("subtitle")}</p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          className='flex flex-col items-center justify-center gap-4 sm:flex-row'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.2, duration: 0.5}}>
          <Button
            asChild
            size='lg'
            className='group min-w-[180px]'>
            <Link href='/domains'>
              <TbRocket className='mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5' />
              {t("primary")}
            </Link>
          </Button>
          <Button
            asChild
            variant='outline'
            size='lg'
            className='min-w-[180px]'>
            <a
              href='https://github.com/arolariu/arolariu.ro'
              target='_blank'
              rel='noopener noreferrer'>
              <TbBrandGithub className='mr-2 h-5 w-5' />
              {t("secondary")}
            </a>
          </Button>
        </motion.div>

        {/* Footer text */}
        <motion.p
          className='text-muted-foreground mt-12 text-sm'
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.4, duration: 0.5}}>
          {t("footer")}
        </motion.p>
      </div>
    </section>
  );
}
